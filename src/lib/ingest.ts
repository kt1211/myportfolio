import "server-only";

import { chunkText, contentHash, type KnowledgeDocument } from "@/lib/portfolio-documents";
import { embedTexts, embeddingDimensions, embeddingModel } from "@/lib/gemini";
import { getSupabase, type StoredChunk } from "@/lib/supabase";

function hasReusableEmbedding(value: unknown, dimensions: number, visibility: "public" | "private") {
  let vector: unknown = value;
  if (typeof value === "string") {
    try { vector = JSON.parse(value); } catch { return false; }
  }
  if (!Array.isArray(vector) || vector.length !== dimensions || vector.some((item) => typeof item !== "number" || !Number.isFinite(item))) return false;
  const squaredNorm = vector.reduce<number>((sum, item) => sum + item * item, 0);
  return visibility === "private" ? squaredNorm === 0 : Number.isFinite(squaredNorm) && squaredNorm > 0;
}

export async function ingestDocuments(documents: KnowledgeDocument[]) {
  const supabase = getSupabase();
  const prepared = await Promise.all(documents.map(async (document) => {
    const chunks = chunkText(document.text);
    const { data: oldRows, error: readError } = await supabase
      .from("portfolio_documents")
      .select("chunk_index,content_hash,metadata,embedding")
      .eq("source_key", document.sourceKey);
    if (readError) throw new Error(`Could not read existing chunks: ${readError.message}`);
    const prior = new Map((oldRows ?? []).map((row) => [row.chunk_index as number, {
      hash: row.content_hash as string,
      visibility: (row.metadata as Record<string, unknown> | null)?.visibility,
      embeddingModel: (row.metadata as Record<string, unknown> | null)?.embedding_model,
      embeddingDimensions: (row.metadata as Record<string, unknown> | null)?.embedding_dimensions,
      embedding: row.embedding,
    }]));
    const visibility = document.metadata.visibility === "private" ? "private" : "public";
    const dirtyChunks = chunks.map((content, chunkIndex) => ({ content, chunkIndex, hash: contentHash(content) }))
      .filter((chunk) => {
        const existing = prior.get(chunk.chunkIndex);
        return existing?.hash !== chunk.hash
          || existing?.visibility !== visibility
          || existing?.embeddingModel !== embeddingModel
          || Number(existing?.embeddingDimensions) !== embeddingDimensions
          || !hasReusableEmbedding(existing?.embedding, embeddingDimensions, visibility);
      });
    return { document, chunks, prior, dirtyChunks, visibility };
  }));

  const changedChunks = prepared.flatMap(({ document, dirtyChunks, visibility }) => dirtyChunks.map((chunk) => ({ ...chunk, document, visibility })));
  const publicChunks = changedChunks.filter((chunk) => chunk.visibility === "public");
  const embeddingsByChunk = new Map<string, number[]>();
  for (let offset = 0; offset < publicChunks.length; offset += 100) {
    const batch = publicChunks.slice(offset, offset + 100);
    const embeddings = await embedTexts(batch.map((chunk) => chunk.content), "RETRIEVAL_DOCUMENT", batch.map((chunk) => chunk.document.title));
    batch.forEach((chunk, index) => embeddingsByChunk.set(`${chunk.document.sourceKey}:${chunk.chunkIndex}`, embeddings[index]));
  }

  let indexedChunks = 0;
  for (let offset = 0; offset < changedChunks.length; offset += 100) {
    const batch = changedChunks.slice(offset, offset + 100);
    const rows: StoredChunk[] = batch.map((chunk) => ({
      source_key: chunk.document.sourceKey,
      chunk_index: chunk.chunkIndex,
      title: chunk.document.title,
      source_name: chunk.document.sourceName,
      content: chunk.content,
      content_hash: chunk.hash,
      embedding: embeddingsByChunk.get(`${chunk.document.sourceKey}:${chunk.chunkIndex}`) ?? new Array(embeddingDimensions).fill(0),
      metadata: { ...chunk.document.metadata, visibility: chunk.visibility, embedding_model: embeddingModel, embedding_dimensions: embeddingDimensions },
    }));
    const { error } = await supabase.from("portfolio_documents").upsert(rows, { onConflict: "source_key,chunk_index" });
    if (error) throw new Error(`Could not store document chunks: ${error.message}`);
    indexedChunks += rows.length;
  }

  let deletedChunks = 0;
  for (const { document, chunks, prior, visibility } of prepared) {
    const validIndices = new Set(chunks.map((_, index) => index));
    const staleIndices = [...prior.keys()].filter((index) => !validIndices.has(index));
    if (staleIndices.length) {
      const { error } = await supabase.from("portfolio_documents").delete().eq("source_key", document.sourceKey).in("chunk_index", staleIndices);
      if (error) throw new Error(`Could not remove stale chunks: ${error.message}`);
      deletedChunks += staleIndices.length;
    }
    const { error: metadataError } = await supabase.from("portfolio_documents").update({
      title: document.title,
      source_name: document.sourceName,
      metadata: { ...document.metadata, visibility, embedding_model: embeddingModel, embedding_dimensions: embeddingDimensions },
    }).eq("source_key", document.sourceKey);
    if (metadataError) throw new Error(`Could not update document metadata: ${metadataError.message}`);
  }
  return { documents: documents.length, indexedChunks, reusedChunks: prepared.reduce((total, item) => total + item.chunks.length - item.dirtyChunks.length, 0), deletedChunks };
}

export async function reembedStoredPublicDocuments() {
  const supabase = getSupabase();
  const { data, error } = await supabase.from("portfolio_documents")
    .select("source_key,chunk_index,title,source_name,content,content_hash,metadata")
    .eq("metadata->>visibility", "public");
  if (error) throw new Error(`Could not inspect stored embedding versions: ${error.message}`);
  const staleRows = (data ?? []).filter((row) => {
    const metadata = row.metadata as Record<string, unknown> | null;
    return metadata?.embedding_model !== embeddingModel || Number(metadata?.embedding_dimensions) !== embeddingDimensions;
  });
  let reembeddedChunks = 0;
  for (let offset = 0; offset < staleRows.length; offset += 100) {
    const batch = staleRows.slice(offset, offset + 100);
    const embeddings = await embedTexts(batch.map((row) => row.content as string), "RETRIEVAL_DOCUMENT", batch.map((row) => row.title as string));
    const rows: StoredChunk[] = batch.map((row, index) => ({
      source_key: row.source_key as string,
      chunk_index: row.chunk_index as number,
      title: row.title as string,
      source_name: row.source_name as string,
      content: row.content as string,
      content_hash: row.content_hash as string,
      embedding: embeddings[index],
      metadata: { ...(row.metadata as Record<string, unknown>), embedding_model: embeddingModel, embedding_dimensions: embeddingDimensions },
    }));
    const result = await supabase.from("portfolio_documents").upsert(rows, { onConflict: "source_key,chunk_index" });
    if (result.error) throw new Error(`Could not update stored embeddings: ${result.error.message}`);
    reembeddedChunks += rows.length;
  }
  return reembeddedChunks;
}

export async function removeMissingPortfolioSources(currentSourceKeys: string[]) {
  const supabase = getSupabase();
  const { data, error } = await supabase.from("portfolio_documents").select("source_key").like("source_key", "portfolio:%");
  if (error) throw new Error(`Could not list existing portfolio sources: ${error.message}`);
  const current = new Set(currentSourceKeys);
  const stale = [...new Set((data ?? []).map((row) => row.source_key as string))].filter((key) => !current.has(key));
  let deleted = 0;
  for (let offset = 0; offset < stale.length; offset += 100) {
    const batch = stale.slice(offset, offset + 100);
    const result = await supabase.from("portfolio_documents").delete().in("source_key", batch);
    if (result.error) throw new Error(`Could not remove stale portfolio sources: ${result.error.message}`);
    deleted += batch.length;
  }
  return deleted;
}

import { createHash } from "node:crypto";
import { PDFParse } from "pdf-parse";
import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { ingestDocuments } from "@/lib/ingest";
import { cleanText, type KnowledgeDocument } from "@/lib/portfolio-documents";
import { checkRateLimit, requestAddress } from "@/lib/rate-limit";
import { readBoundedBody, RequestBodyTooLargeError } from "@/lib/request-body";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_FILES = 5;
const MAX_FILE_BYTES = 3 * 1024 * 1024;
const MAX_REQUEST_BYTES = 4 * 1024 * 1024;
const MAX_EXTRACTED_CHARS = 300_000;

async function extractText(file: File, extension: string) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (extension === ".pdf") {
    if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-") throw new Error(`${file.name}: file does not have a valid PDF signature.`);
    const parser = new PDFParse({ data: bytes });
    try {
      const result = await parser.getText();
      return cleanText(result.text).slice(0, MAX_EXTRACTED_CHARS);
    } finally {
      await parser.destroy();
    }
  }
  try {
    return cleanText(new TextDecoder("utf-8", { fatal: true }).decode(bytes)).slice(0, MAX_EXTRACTED_CHARS);
  } catch {
    throw new Error(`${file.name}: text files must use UTF-8 encoding.`);
  }
}

export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  let rate: Awaited<ReturnType<typeof checkRateLimit>>;
  try { rate = await checkRateLimit(`admin-ingest:${requestAddress(request)}`, 8, 60 * 60_000); }
  catch { return NextResponse.json({ error: "Rate-limit storage is not configured or unavailable." }, { status: 503 }); }
  if (!rate.allowed) return NextResponse.json({ error: "Too many upload requests." }, { status: 429, headers: { "Retry-After": String(rate.retryAfter) } });
  let form: FormData;
  try {
    const boundedBody = await readBoundedBody(request, MAX_REQUEST_BYTES);
    const boundedRequest = new Request(request.url, { method: "POST", headers: request.headers, body: boundedBody });
    form = await boundedRequest.formData();
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) return NextResponse.json({ error: "Uploads must total 4 MB or less per request." }, { status: 413 });
    return NextResponse.json({ error: "Send files as multipart form data." }, { status: 400 });
  }
    const files = form.getAll("files").filter((value): value is File => value instanceof File);
  if (!files.length) return NextResponse.json({ error: "Choose at least one PDF, TXT, or Markdown file." }, { status: 400 });
  if (files.length > MAX_FILES) return NextResponse.json({ error: `Upload at most ${MAX_FILES} files per request.` }, { status: 413 });

  try {
    const documents: KnowledgeDocument[] = [];
    const visibility = form.get("visibility") === "public" ? "public" : "private";
    for (const file of files) {
      if (file.size === 0) throw new Error(`${file.name}: file is empty.`);
      if (file.size > MAX_FILE_BYTES) throw new Error(`${file.name}: each file must be 3 MB or smaller.`);
      const safeName = file.name.split(/[\\/]/).pop()?.replace(/[\u0000-\u001f]/g, "").slice(0, 150) || "uploaded-document";
      const extension = safeName.toLowerCase().match(/\.(pdf|txt|md|markdown)$/)?.[0];
      if (!extension) throw new Error(`${safeName}: only PDF, TXT, and Markdown files are supported.`);
      const text = await extractText(file, extension);
      if (text.length < 40) throw new Error(`${safeName}: no useful text could be extracted.`);
      const digest = createHash("sha256").update(text).digest("hex");
      const title = safeName.replace(/\.(pdf|txt|md|markdown)$/i, "").replace(/[_-]+/g, " ").slice(0, 150);
      documents.push({ sourceKey: `manual:${digest}`, title, sourceName: safeName, text, metadata: { visibility, source_type: "manual", category: "uploaded_document", original_filename: safeName, file_extension: extension.slice(1) } });
    }
    const summary = await ingestDocuments(documents);
    return NextResponse.json({ ok: true, ...summary, uploadedFiles: files.length, visibility, message: visibility === "public" ? "Documents extracted and indexed for public portfolio answers." : "Documents extracted and stored privately; the public chatbot cannot retrieve them." });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Document ingestion failed.";
    if (errorMessage.startsWith("Missing ")) return NextResponse.json({ error: "Server configuration is incomplete. Check Gemini and Supabase environment variables." }, { status: 503 });
    if (error instanceof Error && !errorMessage.startsWith("Could not ") && !errorMessage.startsWith("Gemini ")) {
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }
    console.error("[api/admin/ingest] ingestion failed");
    return NextResponse.json({ error: "Document ingestion failed. Check server logs and retry." }, { status: 502 });
  }
}

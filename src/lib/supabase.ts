import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | undefined;

export function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error("Missing Supabase server environment variables.");
  client ??= createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (serviceKey.startsWith("sb_secret_")) {
          headers.set("apikey", serviceKey);
          headers.delete("authorization");
        }
        return fetch(input, {
          ...init,
          headers,
          signal: init?.signal ?? AbortSignal.timeout(15_000),
        });
      },
    },
  });
  return client;
}

export type StoredChunk = {
  source_key: string;
  chunk_index: number;
  title: string;
  source_name: string;
  content: string;
  content_hash: string;
  embedding: number[];
  metadata: Record<string, unknown>;
};

export async function searchPortfolio(embedding: number[], matchCount: number, threshold: number) {
  const { data, error } = await getSupabase().rpc("match_portfolio_documents", {
    query_embedding: embedding,
    match_count: matchCount,
    similarity_threshold: threshold,
  });
  if (error) {
    throw Object.assign(new Error("Supabase portfolio retrieval failed."), {
      upstream: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
    });
  }
  return (data ?? []) as Array<{
    title: string;
    source_name: string;
    content: string;
    metadata: Record<string, unknown>;
    similarity: number;
  }>;
}

import "server-only";

import { createHmac } from "node:crypto";
import { getSupabase } from "@/lib/supabase";

export async function checkRateLimit(key: string, limit: number, windowMs: number) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY environment variable.");
  const windowSeconds = Math.max(60, Math.ceil(windowMs / 1000));
  const bucketKey = createHmac("sha256", serviceKey).update(key).digest("hex");
  const { data, error } = await getSupabase().rpc("consume_portfolio_rate_limit", {
    client_key: bucketKey,
    max_requests: limit,
    window_seconds: windowSeconds,
  });
  if (error) {
    console.error("[rate-limit] consume RPC failed", {
      code: error.code,
    });
    throw new Error("Rate-limit storage is unavailable.");
  }
  const result = Array.isArray(data) ? data[0] : data;
  return { allowed: Boolean(result?.allowed), retryAfter: Number(result?.retry_after_seconds ?? windowSeconds) };
}

export function requestAddress(request: Request) {
  return request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "unknown";
}

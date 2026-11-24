import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { ingestDocuments, reembedStoredPublicDocuments, removeMissingPortfolioSources } from "@/lib/ingest";
import { portfolioKnowledge } from "@/lib/portfolio-documents";
import { checkRateLimit, requestAddress } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  let rate: Awaited<ReturnType<typeof checkRateLimit>>;
  try { rate = await checkRateLimit(`admin-sync:${requestAddress(request)}`, 5, 60 * 60_000); }
  catch { return NextResponse.json({ error: "Rate-limit storage is not configured or unavailable." }, { status: 503 }); }
  if (!rate.allowed) return NextResponse.json({ error: "Too many synchronization requests." }, { status: 429, headers: { "Retry-After": String(rate.retryAfter) } });

  try {
    const documents = portfolioKnowledge();
    const summary = await ingestDocuments(documents);
    const removedSources = await removeMissingPortfolioSources(documents.map((document) => document.sourceKey));
    const reembeddedChunks = await reembedStoredPublicDocuments();
    return NextResponse.json({ ok: true, ...summary, reembeddedChunks, removedSources, message: "Portfolio knowledge synchronized." });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "";
    if (errorMessage.startsWith("Missing ")) return NextResponse.json({ error: "Server configuration is incomplete. Check Gemini and Supabase environment variables." }, { status: 503 });
    console.error("[api/admin/sync-portfolio] ingestion failed");
    return NextResponse.json({ error: "Portfolio synchronization failed. Check server logs and retry; unchanged chunks will be reused." }, { status: 502 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { embedTexts, generateAnswer } from "@/lib/gemini";
import { searchPortfolio } from "@/lib/supabase";
import { checkRateLimit, requestAddress } from "@/lib/rate-limit";
import { readBoundedBody, RequestBodyTooLargeError } from "@/lib/request-body";

export const runtime = "nodejs";
export const maxDuration = 60;

type HistoryTurn = { role: "user" | "assistant"; content: string };
type ChatStage = "embedding" | "retrieval" | "generation";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function redactDiagnostic(value: unknown, sensitiveValues: string[]) {
  let message = typeof value === "string" ? value : "";
  for (const sensitive of sensitiveValues) {
    if (sensitive.length >= 4) message = message.replaceAll(sensitive, "[redacted]");
  }
  return message
    .replace(/\b(?:AIza[\w-]{20,}|AQ\.[\w.-]{16,}|sb_secret_[\w-]{8,})\b/g, "[redacted credential]")
    .replace(/\beyJ[\w-]{16,}(?:\.[\w-]{16,}){1,2}\b/g, "[redacted credential]")
    .replace(/Bearer\s+[^\s,;]+/gi, "Bearer [redacted]")
    .replace(/(?:authorization|x-goog-api-key|apikey)\s*[:=]\s*[^\s,;]+/gi, "[redacted header]")
    .slice(0, 600);
}

function getUpstreamFailure(error: unknown, sensitiveValues: string[]) {
  const value = isRecord(error) ? error : {};
  let response = isRecord(value.upstream) ? value.upstream : isRecord(value.error) ? value.error : {};
  if (Object.keys(response).length === 0 && typeof value.message === "string") {
    try {
      const parsed: unknown = JSON.parse(value.message);
      if (isRecord(parsed) && isRecord(parsed.error)) response = parsed.error;
    } catch {
      // SDK errors do not always include a JSON response body.
    }
  }
  const rawStatus = value.upstreamHttpStatus ?? value.status ?? value.statusCode ?? response.httpStatus ?? response.code;
  const httpStatus = typeof rawStatus === "number" && rawStatus >= 100 && rawStatus <= 599 ? rawStatus : undefined;
  const rawCode = response.status ?? response.code ?? value.upstreamCode ?? value.code;
  const code = typeof rawCode === "string" || typeof rawCode === "number" ? String(rawCode) : undefined;
  const rawMessage = response.message ?? value.upstreamMessage ?? value.message;
  const message = redactDiagnostic(rawMessage, sensitiveValues);
  const details = Array.isArray(response.details)
    ? response.details.slice(0, 3).map((detail) => {
        if (!isRecord(detail)) return undefined;
        const safe: Record<string, string> = {};
        for (const key of ["@type", "reason", "domain"]) {
          if (typeof detail[key] === "string") safe[key] = redactDiagnostic(detail[key], sensitiveValues);
        }
        return Object.keys(safe).length ? safe : undefined;
      }).filter((detail): detail is Record<string, string> => Boolean(detail))
    : undefined;
  return {
    name: typeof value.name === "string" ? value.name : "Error",
    httpStatus,
    code,
    bothModelsUnavailable: value.bothModelsUnavailable === true,
    message: message || "No upstream error message was provided.",
    ...(details?.length ? { responseDetails: details } : {}),
  };
}

export async function POST(request: NextRequest) {
  const address = requestAddress(request);
  let rate: Awaited<ReturnType<typeof checkRateLimit>>;
  try { rate = await checkRateLimit(`chat:${address}`, 24, 10 * 60_000); }
  catch { return NextResponse.json({ error: "The assistant is temporarily unavailable. Please try again shortly." }, { status: 503 }); }
  if (!rate.allowed) return NextResponse.json({ error: "Please wait a little before sending another message." }, { status: 429, headers: { "Retry-After": String(rate.retryAfter) } });
  let body: unknown;
  try { body = JSON.parse(new TextDecoder().decode(await readBoundedBody(request, 12_000))); }
  catch (error) {
    if (error instanceof RequestBodyTooLargeError) return NextResponse.json({ error: "The request is too large." }, { status: 413 });
    return NextResponse.json({ error: "Send a valid JSON request." }, { status: 400 });
  }
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Send a message to continue." }, { status: 400 });
  const candidate = body as { message?: unknown; history?: unknown };
  if (typeof candidate.message !== "string") return NextResponse.json({ error: "Message must be text." }, { status: 400 });
  const message = candidate.message.trim();
  if (!message) return NextResponse.json({ error: "Write a message first." }, { status: 400 });
  if (message.length > 1500) return NextResponse.json({ error: "Messages are limited to 1,500 characters." }, { status: 413 });
  const history: HistoryTurn[] = Array.isArray(candidate.history)
    ? candidate.history.slice(-8).filter((turn): turn is HistoryTurn => Boolean(turn) && typeof turn === "object"
      && (((turn as HistoryTurn).role === "user") || ((turn as HistoryTurn).role === "assistant"))
      && typeof (turn as HistoryTurn).content === "string")
      .map((turn) => ({ role: turn.role, content: turn.content.slice(0, 1000) }))
    : [];

  let stage: ChatStage = "embedding";
  const startedAt = Date.now();
  let retrievedContext = "";
  try {
    const [queryEmbedding] = await embedTexts([message], "RETRIEVAL_QUERY");
    stage = "retrieval";
    const configuredTopK = Number(process.env.RAG_TOP_K || 5);
    const configuredThreshold = Number(process.env.RAG_SIMILARITY_THRESHOLD || 0.42);
    const topK = Number.isFinite(configuredTopK) ? Math.max(1, Math.min(Math.trunc(configuredTopK), 8)) : 5;
    const threshold = Number.isFinite(configuredThreshold) ? Math.max(0, Math.min(configuredThreshold, 1)) : 0.42;
    const matches = await searchPortfolio(queryEmbedding, topK, threshold);
    if (matches.length === 0) {
      return NextResponse.json({ answer: "I don’t have enough portfolio information to answer that reliably. Please contact Kuldeep directly at kuldeepthakur48388@gmail.com for more details.", sources: [] });
    }
    retrievedContext = matches.map((match, index) => `Reference ${index + 1} [${match.title}; ${match.source_name}; similarity ${Number(match.similarity).toFixed(3)}]:\n${match.content}`).join("\n\n");
    stage = "generation";
    const answer = await generateAnswer(retrievedContext, message, history);
    const seen = new Set<string>();
    const sources = matches.filter((match) => {
      const key = `${match.title}:${match.source_name}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 4).map(({ title, source_name: sourceName, similarity }) => ({ title, source: sourceName, similarity: Number(similarity) }));
    return NextResponse.json({ answer, sources });
  } catch (error) {
    const sensitiveValues = [
      message,
      retrievedContext,
      ...history.map((turn) => turn.content),
      process.env.GEMINI_API_KEY || "",
      process.env.SUPABASE_SERVICE_ROLE_KEY || "",
    ];
    const failure = getUpstreamFailure(error, sensitiveValues);
    const service = stage === "retrieval" ? "supabase" : "gemini";
    const model = stage === "embedding" ? process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-001"
      : stage === "generation" ? process.env.GEMINI_CHAT_MODEL || "gemini-3.8-flash" : undefined;
    console.error(`[api/chat] upstream request failed ${JSON.stringify({
      stage,
      service,
      ...(model ? { model } : {}),
      durationMs: Date.now() - startedAt,
      ...failure,
    })}`);

    const missingConfig = failure.message.startsWith("Missing ");
    if (missingConfig) {
      const errorMessage = stage === "retrieval" ? "Portfolio search is not configured. Please contact Kuldeep."
        : "The AI assistant is not configured. Please contact Kuldeep.";
      return NextResponse.json({ error: errorMessage }, { status: 503 });
    }
    const temporarilyUnavailable = failure.httpStatus === 429 || failure.httpStatus === 503 || failure.httpStatus === 504;
    const responseStatus = temporarilyUnavailable ? 503 : 502;
    const statusText = failure.httpStatus ? ` (upstream HTTP ${failure.httpStatus})` : "";
    const responseMessage = failure.bothModelsUnavailable
      ? `Both configured Gemini generation models are temporarily unavailable${statusText}. Please retry shortly.`
      : stage === "retrieval"
      ? `Portfolio search is temporarily unavailable${statusText}. Please retry shortly.`
      : temporarilyUnavailable
        ? `Gemini ${stage} is temporarily unavailable${statusText}. Please retry shortly.`
        : `The ${service} ${stage} request failed${statusText}. Please retry shortly.`;
    return NextResponse.json({ error: responseMessage }, { status: responseStatus });
  }
}

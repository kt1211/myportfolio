import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "dotenv";
import { GoogleGenAI } from "@google/genai";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(scriptDirectory, "..", ".env.local");

function redactText(value, apiKey) {
  let text = String(value ?? "");
  if (apiKey) text = text.replaceAll(apiKey, "[redacted API key]");
  return text
    .replace(/\b(?:AIza[\w-]{20,}|AQ\.[\w.-]{16,}|sb_secret_[\w-]{8,})\b/g, "[redacted credential]")
    .replace(/\beyJ[\w-]{16,}(?:\.[\w-]{16,}){1,2}\b/g, "[redacted credential]")
    .replace(/Bearer\s+[^\s,;]+/gi, "Bearer [redacted]")
    .replace(/(authorization|x-goog-api-key|apikey)\s*[:=]\s*[^\s,;]+/gi, "$1=[redacted]")
    .slice(0, 2_000);
}

function sanitize(value, apiKey, depth = 0) {
  if (typeof value === "string") return redactText(value, apiKey);
  if (typeof value === "number" || typeof value === "boolean" || value === null) return value;
  if (Array.isArray(value)) return value.slice(0, 20).map((item) => sanitize(item, apiKey, depth + 1));
  if (typeof value !== "object" || depth >= 5) return undefined;

  return Object.fromEntries(Object.entries(value).slice(0, 40).map(([key, item]) => {
    if (/(?:api.?key|authorization|token|credential|header)/i.test(key)) return [key, "[redacted]"];
    return [key, sanitize(item, apiKey, depth + 1)];
  }).filter(([, item]) => item !== undefined));
}

function parseErrorBody(error) {
  if (error && typeof error === "object" && typeof error.body === "string") {
    try { return JSON.parse(error.body); } catch { return error.body; }
  }
  if (error && typeof error === "object" && error.error) return error.error;
  const message = error instanceof Error ? error.message : "";
  try { return JSON.parse(message); } catch { return undefined; }
}

try {
  const env = parse(await readFile(envPath, "utf8"));
  const apiKey = env.GEMINI_API_KEY?.trim();
  const model = process.argv[2]?.trim() || env.GEMINI_CHAT_MODEL?.trim();

  if (!apiKey) throw new Error("GEMINI_API_KEY is missing from .env.local.");
  if (!model) throw new Error("GEMINI_CHAT_MODEL is missing from .env.local.");

  console.log(`Model: ${model}`);
  let responseStatus;
  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      timeout: 30_000,
      retryOptions: { attempts: 1 },
      fetch: async (input, init) => {
        const response = await globalThis.fetch(input, init);
        responseStatus = response.status;
        return response;
      },
    },
  });

  try {
    const response = await ai.models.generateContent({
      model,
      contents: "Reply with exactly: Gemini connection successful",
    });
    const httpStatus = response.sdkHttpResponse?.responseInternal?.status ?? responseStatus;
    console.log(`HTTP status: ${typeof httpStatus === "number" ? httpStatus : "not exposed by SDK"}`);
    console.log(`Response: ${response.text?.trim() || "(empty response)"}`);
  } catch (error) {
    const responseBody = parseErrorBody(error);
    const numericStatus = error && typeof error === "object"
      ? (typeof error.status === "number" ? error.status
        : typeof error.statusCode === "number" ? error.statusCode
          : typeof responseBody === "object" && responseBody !== null && typeof responseBody.error?.code === "number"
            ? responseBody.error.code : responseStatus)
      : undefined;
    const details = {
      name: error instanceof Error ? error.name : "UnknownError",
      httpStatus: numericStatus ?? "not exposed by SDK",
      message: redactText(error instanceof Error ? error.message : error, apiKey),
      ...(responseBody !== undefined ? { apiResponse: sanitize(responseBody, apiKey) } : {}),
      ...(error && typeof error === "object" && error.cause instanceof Error
        ? { cause: { name: error.cause.name, message: redactText(error.cause.message, apiKey) } }
        : {}),
    };
    console.error("Gemini generation failed:");
    console.error(JSON.stringify(details, null, 2));
    process.exitCode = 1;
  }
} catch (error) {
  console.error(redactText(error instanceof Error ? error.message : error, ""));
  process.exitCode = 1;
}

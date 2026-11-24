# Portfolio RAG assistant setup

The portfolio now includes a text-only Gemini assistant backed by Supabase Postgres and pgvector. Public chat retrieves matching **public** chunks before generation. The profile, skills, project descriptions/case studies, experience, education, certifications, and existing portfolio FAQ data are converted from `src/data/portfolio.ts` during synchronization. Manual uploads are private by default; make an upload public only when its contents are intended for visitor-facing answers.

## Architecture and safeguards

```text
Portfolio data / approved documents
  → clean and overlapping chunking
  → Gemini embeddings (768 dimensions)
  → Supabase portfolio_documents (pgvector)
  → cosine-similarity RPC with top-K and threshold
  → Gemini answer grounded in retrieved context
  → answer with source titles
```

- Chat uses `POST /api/chat`; messages are limited to 1,500 characters and the route limits requests per hashed client address.
- Portfolio sync uses `POST /api/admin/sync-portfolio`; changed chunks are re-embedded, unchanged content hashes are reused, and removed portfolio sources are cleaned up.
- File ingestion uses `POST /api/admin/ingest`; it allows up to five PDF, TXT, or Markdown files, 3 MB each, and 4 MB total per request. Text extraction is capped at 300,000 characters per file.
- Admin calls require `Authorization: Bearer <ADMIN_INGEST_SECRET>`. The secret must be at least 32 characters.
- Rate-limit counters are stored in Supabase under an HMAC of the route and forwarded client address. The raw IP is not stored. If self-hosting behind a proxy, configure it to overwrite forwarded-address headers. This is a basic site-level limiter; also enable Vercel Firewall/rate controls if the site receives significant traffic.
- Server endpoints use Node.js Route Handlers. No Gemini or Supabase service-role key is sent to the browser.
- Manual uploads are **private by default**: their text is stored in Supabase with a zero-vector placeholder and is not sent to Gemini or retrieved by the public chat. Only when `visibility=public` is explicitly supplied are embeddings generated; matching public chunks may then be sent to Gemini to answer a visitor. Only mark documents public when that use is intended.

## 1. Create a Gemini API key

1. Open [Google AI Studio](https://aistudio.google.com/app/apikey) and create an API key.
2. Check that the configured chat and embedding model IDs are available to the project. Model access, quotas, data handling, and free usage can vary by account and change over time; review the [Gemini API model list](https://ai.google.dev/gemini-api/docs/models) and [pricing and data-use details](https://ai.google.dev/gemini-api/docs/pricing).
3. Keep the key server-side. Do not add a `NEXT_PUBLIC_` prefix.

Chat generation uses `gemini-3.8-flash` first and retries temporary 429/5xx failures twice with exponential backoff. If both primary attempts fail temporarily, it tries `gemini-3.5-flash-lite` up to twice. Invalid credentials, permission errors, and invalid model IDs do not trigger fallback. Both models receive the same retrieved context, instructions, and conversation history; changing the generation model does not re-embed documents. Text retrieval uses `gemini-embedding-001` with 768-dimensional vectors. If you change the embedding model or dimensions, update and apply the SQL vector column and RPC dimensions as needed, then run the portfolio sync to re-embed public chunks.

## 2. Create a Supabase project and enable pgvector

1. Create a project in [Supabase](https://supabase.com/dashboard).
2. In Project Settings → API, copy the Project URL and the `service_role` secret. The service-role key is privileged; keep it only in server environment variables.
3. Open SQL Editor, paste the contents of [`supabase/migrations/20261123000000_create_portfolio_documents.sql`](supabase/migrations/20261123000000_create_portfolio_documents.sql), and run it. It enables the `vector` extension, creates the vector and rate-limit tables and search functions, enables RLS, and limits access to the service role.

The SQL is also compatible with the Supabase CLI:

```powershell
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

Supabase's [pgvector guide](https://supabase.com/docs/guides/database/extensions/pgvector) explains the vector extension and similarity search.

## 3. Configure locally

From the repository root in PowerShell:

```powershell
Copy-Item .env.example .env.local
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Put the generated value in `ADMIN_INGEST_SECRET`, then fill in the Gemini key, Supabase Project URL, and Supabase `service_role` key in `.env.local`. Keep `.env.local` out of Git; `.gitignore` already excludes `.env*` while allowing `.env.example`.

Install dependencies and start the app:

```powershell
npm install
npm run dev
```

The site is served at `http://localhost:3000`. `next.config.ts` no longer sets `output: "export"`, because static export cannot run the RAG API routes. Other existing Next.js settings are retained.

## 4. Synchronize portfolio data

Run this after the database migration and after changing portfolio content:

```powershell
Invoke-RestMethod `
  -Uri "http://localhost:3000/api/admin/sync-portfolio" `
  -Method Post `
  -Headers @{ Authorization = "Bearer YOUR_ADMIN_INGEST_SECRET" } `
  -ContentType "application/json" `
  -Body "{}"
```

The response reports documents, newly indexed chunks, reused chunks, and removed sources. The endpoint is protected and should only be called by the site owner or a trusted deployment workflow.

## 5. Upload additional documents

Supported formats are PDF, TXT, `.md`, and `.markdown`. PowerShell users can call the route with `curl.exe` (not the PowerShell `curl` alias):

```powershell
curl.exe -X POST "http://localhost:3000/api/admin/ingest" `
  -H "Authorization: Bearer YOUR_ADMIN_INGEST_SECRET" `
  -F "files=@C:\path\to\resume.pdf"
```

Uploads are private by default, so the public chat cannot retrieve them. If the document is appropriate for public answers, explicitly mark it public:

```powershell
curl.exe -X POST "http://localhost:3000/api/admin/ingest" `
  -H "Authorization: Bearer YOUR_ADMIN_INGEST_SECRET" `
  -F "visibility=public" `
  -F "files=@C:\path\to\voicebot-case-study.md" `
  -F "files=@C:\path\to\technical-notes.txt"
```

The service extracts and normalizes text, chunks it with overlap, embeds only changed chunks, and stores source metadata. Re-uploading the same exact file reuses its content hash. Scanned/image-only PDFs need OCR before upload because this route extracts embedded text only.

## 6. Deploy to Vercel

1. Push the project to GitHub and import/connect that repository in Vercel, or use the existing Vercel project linked to the repository.
2. In Vercel Project Settings → Environment Variables, add `GEMINI_API_KEY`, `GEMINI_CHAT_MODEL`, `GEMINI_CHAT_FALLBACK_MODEL`, `GEMINI_EMBEDDING_MODEL`, `GEMINI_EMBEDDING_DIMENSIONS`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_INGEST_SECRET`, `RAG_SIMILARITY_THRESHOLD`, and `RAG_TOP_K` for the required environments.
3. Redeploy after adding/changing variables.
4. Run the SQL migration against the production Supabase project, then synchronize the production portfolio data:

```powershell
Invoke-RestMethod `
  -Uri "https://YOUR_DOMAIN/api/admin/sync-portfolio" `
  -Method Post `
  -Headers @{ Authorization = "Bearer YOUR_PRODUCTION_ADMIN_INGEST_SECRET" } `
  -ContentType "application/json" `
  -Body "{}"
```

Vercel serves the app and API routes as a Next.js application rather than a static export. The route handlers set Node.js runtime and a 60-second maximum duration; request limits are deliberately small for serverless deployment. Check the current Vercel plan's function duration and request-size limits before raising them.

## 7. Smoke checks

Check the chat route after syncing:

```powershell
Invoke-RestMethod `
  -Uri "http://localhost:3000/api/chat" `
  -Method Post `
  -ContentType "application/json" `
  -Body '{"message":"What technologies does Kuldeep work with?","history":[]}'
```

Try an unrelated question; the assistant should limit itself to the portfolio and say when the indexed information is insufficient. Test an invalid extension and an oversized upload; the endpoint should reject them. A missing or short admin secret returns `401`, and missing service settings return a configuration error rather than fabricated content.

## Troubleshooting

- **Chat reports not configured:** check `GEMINI_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY` in the current local/deployment environment. Restart local Next.js after editing `.env.local`.
- **Admin returns 401:** verify the `Authorization: Bearer` value and ensure `ADMIN_INGEST_SECRET` has at least 32 characters.
- **No retrieved sources:** apply the migration, run portfolio sync, verify the Gemini embedding model/dimension match the SQL vector size, and check `RAG_SIMILARITY_THRESHOLD`.
- **Model errors:** verify that the model IDs are enabled for the API key and that the project has quota. The defaults can be changed through environment variables without editing source files.
- **PDF extracts no text:** it may be scanned. OCR it locally and upload a text/Markdown export instead.
- **Supabase vector errors:** confirm the `vector` extension, `768` dimensions, RPC signature, and service-role credentials all match.
- **Vercel build works but endpoints fail:** confirm `output: "export"` is absent from `next.config.ts`, production environment variables are set, and the migration was run on the production database.

## Limitations and security notes

- Free quotas are provider/account dependent and can change. Embeddings and chat requests may incur charges or be subject to provider data-use rules; check current Google and Supabase terms and usage dashboards before indexing private material.
- The assistant has prompt-injection instructions and source filtering, but generative systems are not a formal confidentiality boundary. Keep sensitive documents private (the default) and never include credentials, secrets, or data that must not be sent to the configured Gemini service.
- Public answers are constrained by retrieved text, but model output still requires review. The UI returns source titles, not raw document chunks.
- Rate limiting is global in Supabase and uses an HMAC-derived client key. Configure Vercel Firewall or another edge protection for additional abuse control.
- This project does not include an admin web UI; ingestion is performed through the secret-protected APIs.

## References

- [Next.js Route Handlers](https://nextjs.org/docs/app/getting-started/route-handlers)
- [Gemini embeddings](https://ai.google.dev/gemini-api/docs/embeddings)
- [Supabase pgvector](https://supabase.com/docs/guides/database/extensions/pgvector)
- [pdf-parse usage and Node/Vercel support](https://github.com/mehmet-kozan/pdf-parse)

create extension if not exists vector with schema extensions;

create table if not exists public.portfolio_documents (
  id uuid primary key default gen_random_uuid(),
  source_key text not null,
  chunk_index integer not null check (chunk_index >= 0),
  title text not null,
  source_name text not null,
  content text not null,
  content_hash text not null,
  embedding extensions.vector(768) not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_key, chunk_index)
);

create index if not exists portfolio_documents_embedding_hnsw_idx
  on public.portfolio_documents using hnsw (embedding extensions.vector_cosine_ops);

create index if not exists portfolio_documents_source_key_idx
  on public.portfolio_documents (source_key);

create table if not exists public.portfolio_rate_limits (
  bucket_key text primary key,
  expires_at timestamptz not null,
  request_count integer not null check (request_count > 0)
);

create index if not exists portfolio_rate_limits_expires_at_idx
  on public.portfolio_rate_limits (expires_at);

alter table public.portfolio_documents enable row level security;
alter table public.portfolio_rate_limits enable row level security;
revoke all on table public.portfolio_documents from anon, authenticated;
revoke all on table public.portfolio_rate_limits from anon, authenticated;
grant all on table public.portfolio_documents to service_role;
grant all on table public.portfolio_rate_limits to service_role;

create or replace function public.match_portfolio_documents(
  query_embedding extensions.vector(768),
  match_count integer default 5,
  similarity_threshold real default 0.42
)
returns table (
  title text,
  source_name text,
  content text,
  metadata jsonb,
  similarity real
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    documents.title,
    documents.source_name,
    documents.content,
    documents.metadata,
    (1 - (documents.embedding OPERATOR(extensions.<=>) query_embedding))::real as similarity
  from public.portfolio_documents as documents
  where (1 - (documents.embedding OPERATOR(extensions.<=>) query_embedding)) >= greatest(0, least(similarity_threshold, 1))
    and documents.metadata ->> 'visibility' = 'public'
  order by documents.embedding OPERATOR(extensions.<=>) query_embedding
  limit greatest(1, least(match_count, 8));
$$;

revoke all on function public.match_portfolio_documents(extensions.vector, integer, real) from public, anon, authenticated;
grant execute on function public.match_portfolio_documents(extensions.vector, integer, real) to service_role;

create or replace function public.consume_portfolio_rate_limit(
  client_key text,
  max_requests integer,
  window_seconds integer
)
returns table (allowed boolean, retry_after_seconds integer)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  window_size integer := greatest(60, least(window_seconds, 86400));
  window_number bigint;
  bucket_end timestamptz;
  bucket_count integer;
  safe_limit integer := greatest(1, least(max_requests, 1000));
begin
  window_number := floor(extract(epoch from now()) / window_size)::bigint;
  bucket_end := to_timestamp((window_number + 1) * window_size);

  delete from public.portfolio_rate_limits where expires_at < now() - interval '1 hour';
  insert into public.portfolio_rate_limits (bucket_key, expires_at, request_count)
  values (client_key || ':' || window_number::text, bucket_end, 1)
  on conflict (bucket_key) do update
    set request_count = public.portfolio_rate_limits.request_count + 1
  returning request_count into bucket_count;

  return query select bucket_count <= safe_limit, greatest(0, ceil(extract(epoch from bucket_end - now()))::integer);
end;
$$;

revoke all on function public.consume_portfolio_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_portfolio_rate_limit(text, integer, integer) to service_role;

create or replace function public.set_portfolio_document_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_portfolio_document_updated_at on public.portfolio_documents;
create trigger set_portfolio_document_updated_at
  before update on public.portfolio_documents
  for each row execute function public.set_portfolio_document_updated_at();
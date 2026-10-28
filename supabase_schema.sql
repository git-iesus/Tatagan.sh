-- Schema Opcional Supabase para Tatagan.sh (Sincronização Mobile/Desktop)
-- Caso deseje conectar um projeto próprio do Supabase, execute este SQL no SQL Editor do Supabase
-- e defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY nas variáveis de ambiente da Vercel.

create table if not exists public.tatagan_user_sync (
  user_id text primary key,
  email text not null unique,
  password_hash text not null,
  payload jsonb not null default '{}'::jsonb,
  updated_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);

alter table public.tatagan_user_sync enable row level security;

create policy "Allow public read/write by authenticated hash"
  on public.tatagan_user_sync
  for all
  using (true)
  with check (true);

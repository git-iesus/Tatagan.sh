-- =====================================================================
-- RESET TOTAL E DEFINITIVO — Tatagan.sh
-- Execute no Supabase: Dashboard > SQL Editor > New query > Run
-- =====================================================================
-- Este script:
-- 1) Apaga tabelas antigas, triggers e funções existentes
-- 2) Apaga TODOS os usuários e sessões antigas de auth.users (começo do zero)
-- 3) Recria a tabela public.tatagan_items com primary key (user_id, collection, item_id)
-- 4) Configura permissões de acesso (GRANTs) completas
-- 5) Configura RLS UNIFICADO (FOR ALL) para evitar erro 42501 em UPSERTs
-- 6) Habilita Realtime e REPLICA IDENTITY FULL para sincronização instantânea
-- =====================================================================

-- 1) Remove a tabela da publicação Realtime se já estiver publicada
do $$
begin
  if exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'tatagan_items'
  ) then
    alter publication supabase_realtime drop table public.tatagan_items;
  end if;
exception when others then
  null;
end $$;

-- 2) Remove gatilhos, funções e a tabela antiga
drop trigger if exists tatagan_items_touch on public.tatagan_items;
drop function if exists public.tatagan_touch_updated_at();
drop table if exists public.tatagan_items cascade;

-- 3) Limpa todos os usuários cadastrados no Supabase Auth
--    (Apaga logins e sessões antigas/órfãs para reiniciar tudo 100% limpo)
delete from auth.users;

-- 4) Recria a tabela public.tatagan_items
create table public.tatagan_items (
  user_id     uuid not null references auth.users(id) on delete cascade,
  collection  text not null check (collection in ('settings','routine','workout','custom_exercise','measurement')),
  item_id     text not null,
  data        jsonb not null,
  sort_key    double precision not null default 0,
  updated_at  timestamptz not null default now(),
  primary key (user_id, collection, item_id)
);

-- Índices otimizados para busca e ordenação
create index idx_tatagan_items_lookup on public.tatagan_items (user_id, collection);
create index idx_tatagan_items_updated on public.tatagan_items (user_id, updated_at);

-- Replica Identity FULL (obrigatório para que UPDATEs e DELETEs funcionem no Realtime do Supabase)
alter table public.tatagan_items replica identity full;

-- 5) Função e Trigger para atualizar updated_at automaticamente
create or replace function public.tatagan_touch_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger tatagan_items_touch
  before update on public.tatagan_items
  for each row execute function public.tatagan_touch_updated_at();

-- 6) Concede permissões explícitas para as roles do Supabase
grant usage on schema public to anon, authenticated, service_role;
grant all on table public.tatagan_items to authenticated, service_role;
grant select on table public.tatagan_items to anon;

-- 7) Row Level Security (RLS) — CORREÇÃO DEFINITIVA DO ERRO 42501
alter table public.tatagan_items enable row level security;

-- Remove quaisquer políticas antigas
drop policy if exists "tatagan_items_select_own" on public.tatagan_items;
drop policy if exists "tatagan_items_insert_own" on public.tatagan_items;
drop policy if exists "tatagan_items_update_own" on public.tatagan_items;
drop policy if exists "tatagan_items_delete_own" on public.tatagan_items;
drop policy if exists "tatagan_items_user_all" on public.tatagan_items;
drop policy if exists "tatagan_items_policy" on public.tatagan_items;

-- Política ÚNICA e UNIFICADA:
-- Cobre SELECT, INSERT, UPDATE e DELETE de forma coesa sem subqueries aninhadas.
-- Permite que PostgREST execute UPSERTs sem violar a política de nova linha.
create policy "tatagan_items_policy"
  on public.tatagan_items
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 8) Habilita Realtime no Supabase
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'tatagan_items'
  ) then
    alter publication supabase_realtime add table public.tatagan_items;
  end if;
end $$;

-- 9) Verificação final do estado do banco
select 
  current_database() as banco_conectado,
  (select count(*) from auth.users) as total_usuarios,
  (select count(*) from public.tatagan_items) as total_itens;

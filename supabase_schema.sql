-- =====================================================================
-- Tatagan.sh — Schema do Supabase (Sincronização Smartphone <-> Computador)
-- Execute TODO este arquivo no Supabase: Dashboard > SQL Editor > New query > Run
-- Pode ser executado mais de uma vez com segurança (idempotente).
-- =====================================================================

-- 1) Tabela única de itens sincronizados por usuário
--    collection: 'settings' | 'routine' | 'workout' | 'custom_exercise' | 'measurement'
create table if not exists public.tatagan_items (
  user_id     uuid not null references auth.users(id) on delete cascade,
  collection  text not null check (collection in ('settings','routine','workout','custom_exercise','measurement')),
  item_id     text not null,
  data        jsonb not null,
  sort_key    double precision not null default 0,
  updated_at  timestamptz not null default now(),
  primary key (user_id, collection, item_id)
);

create index if not exists idx_tatagan_items_lookup
  on public.tatagan_items (user_id, collection);

create index if not exists idx_tatagan_items_updated
  on public.tatagan_items (user_id, updated_at);

-- Replica Identity FULL para suporte a Realtime
alter table public.tatagan_items replica identity full;

-- 2) Atualiza updated_at automaticamente
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

drop trigger if exists tatagan_items_touch on public.tatagan_items;
create trigger tatagan_items_touch
  before update on public.tatagan_items
  for each row execute function public.tatagan_touch_updated_at();

-- 3) Permissões de schema e tabela
grant usage on schema public to anon, authenticated, service_role;
grant all on table public.tatagan_items to authenticated, service_role;
grant select on table public.tatagan_items to anon;

-- 4) Row Level Security (RLS) — Política Unificada para evitar erro 42501 em UPSERT
alter table public.tatagan_items enable row level security;

drop policy if exists "tatagan_items_select_own" on public.tatagan_items;
drop policy if exists "tatagan_items_insert_own" on public.tatagan_items;
drop policy if exists "tatagan_items_update_own" on public.tatagan_items;
drop policy if exists "tatagan_items_delete_own" on public.tatagan_items;
drop policy if exists "tatagan_items_user_all" on public.tatagan_items;
drop policy if exists "tatagan_items_policy" on public.tatagan_items;

create policy "tatagan_items_policy"
  on public.tatagan_items
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 5) Habilita Realtime (alterações aparecem nos outros dispositivos instantaneamente)
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

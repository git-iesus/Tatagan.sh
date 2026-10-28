-- =====================================================================
-- Tatagan.sh — Schema do Supabase (Sincronização Smartphone <-> Computador)
-- Execute TODO este arquivo no Supabase: Dashboard > SQL Editor > New query > Run
-- Pode ser executado mais de uma vez com segurança (idempotente).
-- =====================================================================

-- 1) Tabela única de itens sincronizados por usuário
--    collection: 'settings' | 'routine' | 'workout' | 'custom_exercise' | 'measurement'
create table if not exists public.tatagan_items (
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  collection  text not null check (collection in ('settings','routine','workout','custom_exercise','measurement')),
  item_id     text not null,
  data        jsonb not null,
  sort_key    double precision not null default 0,
  updated_at  timestamptz not null default now(),
  primary key (user_id, collection, item_id)
);

create index if not exists tatagan_items_user_collection_idx
  on public.tatagan_items (user_id, collection);

-- 2) Atualiza updated_at automaticamente
create or replace function public.tatagan_touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
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

-- 3) Row Level Security: cada usuário só enxerga/edita os PRÓPRIOS dados
alter table public.tatagan_items enable row level security;

drop policy if exists "tatagan_items_select_own" on public.tatagan_items;
create policy "tatagan_items_select_own" on public.tatagan_items
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "tatagan_items_insert_own" on public.tatagan_items;
create policy "tatagan_items_insert_own" on public.tatagan_items
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "tatagan_items_update_own" on public.tatagan_items;
create policy "tatagan_items_update_own" on public.tatagan_items
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "tatagan_items_delete_own" on public.tatagan_items;
create policy "tatagan_items_delete_own" on public.tatagan_items
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- 4) Habilita Realtime (alterações aparecem nos outros dispositivos na hora)
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

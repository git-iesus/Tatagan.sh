-- =====================================================================
-- LIMPEZA GERAL DE USUÁRIOS E DADOS — Tatagan.sh
-- Execute no Supabase: Dashboard > SQL Editor > New query > Run
-- =====================================================================

-- 1) Limpa todos os dados sincronizados de rotinas, treinos e configurações
truncate table public.tatagan_items cascade;

-- 2) Apaga todas as contas de usuários cadastradas no Auth do Supabase
--    (Isso remove logins, senhas e sessões ativas com segurança)
delete from auth.users;

-- 3) Verificação: confirma que a tabela está 100% limpa e pronta para novos cadastros
select count(*) as total_itens_restantes from public.tatagan_items;

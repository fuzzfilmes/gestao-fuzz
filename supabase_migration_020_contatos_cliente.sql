-- ============================================================
-- Migração 020 — Contatos adicionais do cliente (nome + telefone),
-- pra suportar mais de um responsável por cliente
-- (rodar no Supabase SQL Editor)
-- ============================================================

alter table clientes add column if not exists contatos jsonb not null default '[]'::jsonb;

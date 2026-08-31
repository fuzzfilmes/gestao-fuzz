-- ============================================================
-- Migração 015 — Cliente em rascunho (criado via Gerador de
-- Propostas, só vira cliente "de verdade" quando a proposta é
-- confirmada)
-- (rodar no Supabase SQL Editor)
-- ============================================================

alter table clientes add column if not exists rascunho boolean not null default false;

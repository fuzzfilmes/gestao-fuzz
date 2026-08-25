-- ============================================================
-- Migração 008 — "Em andamento" nos vídeos de uma demanda
-- (rodar no Supabase SQL Editor)
-- ============================================================

alter table demanda_itens add column if not exists em_andamento boolean not null default false;

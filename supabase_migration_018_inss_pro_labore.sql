-- ============================================================
-- Migração 018 — % de INSS sobre o pró-labore
-- (rodar no Supabase SQL Editor)
-- ============================================================

alter table parametros_financeiros add column if not exists pct_inss numeric not null default 11;

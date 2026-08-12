-- ============================================================
-- Migração 006 — Ordem manual das demandas (arrastar pra reordenar)
-- (rodar no Supabase SQL Editor)
-- ============================================================

alter table demandas add column if not exists ordem integer not null default 0;

-- preenche a ordem inicial das demandas existentes com base na data de criação
-- (mais recentes primeiro, mesmo comportamento de hoje)
with ranked as (
  select id, row_number() over (partition by user_id order by created_at desc) as rn
  from demandas
)
update demandas set ordem = ranked.rn * 10
from ranked
where demandas.id = ranked.id;

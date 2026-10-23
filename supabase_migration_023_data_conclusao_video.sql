-- ============================================================
-- Migração 023 — Data de conclusão de cada vídeo (item da demanda),
-- pra o painel contar vídeos concluídos no mês em que foram finalizados
-- (rodar no Supabase SQL Editor)
-- ============================================================

alter table demanda_itens add column if not exists data_conclusao date;

-- ============================================================
-- Migração 014 — Status único do vídeo + data de entrega por vídeo
-- (rodar no Supabase SQL Editor)
-- ============================================================

alter table demanda_itens add column if not exists status text;
alter table demanda_itens add column if not exists data_entrega date;

-- Backfill: combina as colunas antigas status_producao + status_aprovacao
-- num único status, seguindo o novo fluxo de 7 etapas.
update demanda_itens
set status = case
  when status_aprovacao = 'Aprovado' then 'Aprovado'
  when status_aprovacao = 'Alteração solicitada' then 'Alteração solicitada'
  when status_aprovacao = 'Aguardando' and status_producao = 'Finalizada' then 'Aguardando aprovação'
  when status_producao = 'StandBy' then 'Standby'
  when status_producao = 'Em andamento' then 'Em andamento'
  when status_producao = 'Finalizada' then 'Enviado para aprovação'
  else 'Não iniciado'
end
where status is null;

alter table demanda_itens alter column status set default 'Não iniciado';

-- ============================================================
-- Migração 009 — Vídeos passam a usar o mesmo status de Produção
-- da demanda (Não iniciada/Em andamento/Finalizada/StandBy),
-- substituindo o campo separado de Enviado/Não enviado e o
-- checkbox "Em andamento" criado na migração 008.
-- (rodar no Supabase SQL Editor)
-- ============================================================

alter table demanda_itens rename column status_envio to status_producao;
alter table demanda_itens alter column status_producao set default 'Não iniciada';

update demanda_itens set status_producao = 'Não iniciada' where status_producao = 'Não enviado';
update demanda_itens set status_producao = 'Finalizada' where status_producao = 'Enviado';

alter table demanda_itens drop column if exists em_andamento;

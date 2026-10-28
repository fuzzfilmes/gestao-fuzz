-- ============================================================
-- Migração 024 — Nota emitida nas receitas
-- O mês em que a nota é emitida define a competência do faturamento
-- e do imposto (que vence dia 20 do mês seguinte).
-- (rodar no Supabase SQL Editor)
-- ============================================================

alter table transacoes add column if not exists nota_emitida boolean not null default false;
alter table transacoes add column if not exists data_nota_emitida date;

-- Histórico fica igual: receitas com vencimento até setembro/2026 contam
-- como emitidas no mês do vencimento (como o painel já contava).
-- De outubro/2026 em diante, a nota de cada receita é marcada à mão.
-- Retirada de poupança não é faturamento, então fica de fora.
update transacoes
set nota_emitida = true, data_nota_emitida = data
where tipo = 'Receita'
  and data is not null
  and data < '2026-10-01'
  and nota_emitida = false
  and coalesce(tipo_receita, '') <> 'Retirada de Reserva';

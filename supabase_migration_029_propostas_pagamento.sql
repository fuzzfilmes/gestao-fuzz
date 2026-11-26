-- ============================================================
-- Migração 029 — Propostas editáveis e condições de pagamento
-- (rodar no Supabase SQL Editor, o arquivo inteiro de uma vez)
--
-- * guarda a proposta completa, pra reabrir no gerador, editar e baixar
--   o PDF de novo;
-- * liga a proposta à demanda e às receitas que a aprovação cria;
-- * forma de pagamento nas receitas.
-- Só acrescenta colunas: nenhum dado existente é alterado.
-- ============================================================

begin;

alter table propostas add column if not exists dados jsonb;
alter table propostas add column if not exists demanda_id text;
alter table transacoes add column if not exists proposta_id text;
alter table transacoes add column if not exists forma_pagamento text;

commit;

-- Conferência: o esperado é UMA linha começando com "OK".
select case when (
  select count(*) from information_schema.columns
  where table_schema = 'public'
    and (table_name, column_name) in (('propostas', 'dados'), ('propostas', 'demanda_id'), ('transacoes', 'proposta_id'), ('transacoes', 'forma_pagamento'))
) = 4 then 'OK — propostas e pagamentos prontos' else 'ATENÇÃO — faltou coluna' end as resultado;

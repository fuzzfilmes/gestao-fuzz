-- ============================================================
-- Migração 019 — Data de confirmação da proposta (separada da
-- data de geração/envio, pra relatórios contarem pelo mês certo)
-- (rodar no Supabase SQL Editor)
-- ============================================================

alter table propostas add column if not exists data_confirmacao date;

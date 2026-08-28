-- ============================================================
-- Migração 011 — Parâmetros de saúde financeira (imposto,
-- pró-labore, reserva) pro resumo financeiro
-- (rodar no Supabase SQL Editor)
-- ============================================================

create table if not exists parametros_financeiros (
  user_id uuid primary key default auth.uid() references auth.users(id),
  pct_imposto numeric not null default 0,
  pro_labore numeric not null default 0,
  pct_reserva numeric not null default 0
);
alter table parametros_financeiros enable row level security;

drop policy if exists parametros_financeiros_select on parametros_financeiros;
create policy parametros_financeiros_select on parametros_financeiros for select using (user_id = auth.uid());
drop policy if exists parametros_financeiros_insert on parametros_financeiros;
create policy parametros_financeiros_insert on parametros_financeiros for insert with check (user_id = auth.uid());
drop policy if exists parametros_financeiros_update on parametros_financeiros;
create policy parametros_financeiros_update on parametros_financeiros for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============================================================
-- Migração 017 — Pró-labore mensal (substitui o valor fixo único
-- por um valor configurável por mês, igual às metas)
-- (rodar no Supabase SQL Editor)
-- ============================================================

create table if not exists pro_labore_mensal (
  user_id uuid not null default auth.uid() references auth.users(id),
  mes text not null,
  valor numeric not null default 0,
  primary key (user_id, mes)
);
alter table pro_labore_mensal enable row level security;

drop policy if exists pro_labore_mensal_select on pro_labore_mensal;
create policy pro_labore_mensal_select on pro_labore_mensal for select using (user_id = auth.uid());
drop policy if exists pro_labore_mensal_insert on pro_labore_mensal;
create policy pro_labore_mensal_insert on pro_labore_mensal for insert with check (user_id = auth.uid());
drop policy if exists pro_labore_mensal_update on pro_labore_mensal;
create policy pro_labore_mensal_update on pro_labore_mensal for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists pro_labore_mensal_delete on pro_labore_mensal;
create policy pro_labore_mensal_delete on pro_labore_mensal for delete using (user_id = auth.uid());

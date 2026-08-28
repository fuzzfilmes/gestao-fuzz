-- ============================================================
-- Migração 010 — Tipo de receita (separado do tipo de produção)
-- (rodar no Supabase SQL Editor)
-- ============================================================

create table if not exists tipos_receita (
  user_id uuid not null default auth.uid() references auth.users(id),
  nome text not null, ordem integer not null default 0,
  primary key (user_id, nome)
);
alter table tipos_receita enable row level security;

drop policy if exists tipos_receita_select on tipos_receita;
create policy tipos_receita_select on tipos_receita for select using (user_id = auth.uid());
drop policy if exists tipos_receita_insert on tipos_receita;
create policy tipos_receita_insert on tipos_receita for insert with check (user_id = auth.uid());
drop policy if exists tipos_receita_update on tipos_receita;
create policy tipos_receita_update on tipos_receita for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists tipos_receita_delete on tipos_receita;
create policy tipos_receita_delete on tipos_receita for delete using (user_id = auth.uid());

alter table transacoes add column if not exists tipo_receita text not null default '';

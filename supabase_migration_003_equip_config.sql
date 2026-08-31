-- ============================================================
-- Migração 003 — Quantidade de equipamentos, categorias de
-- equipamento e cores de status (rodar no Supabase SQL Editor)
-- ============================================================

alter table equipamentos add column if not exists quantidade integer not null default 1;

create table if not exists categorias_equipamento (
  user_id uuid not null default auth.uid() references auth.users(id),
  nome text not null, ordem integer not null default 0,
  primary key (user_id, nome)
);
alter table categorias_equipamento enable row level security;
drop policy if exists categorias_equipamento_select on categorias_equipamento;
create policy categorias_equipamento_select on categorias_equipamento for select using (user_id = auth.uid());
drop policy if exists categorias_equipamento_insert on categorias_equipamento;
create policy categorias_equipamento_insert on categorias_equipamento for insert with check (user_id = auth.uid());
drop policy if exists categorias_equipamento_update on categorias_equipamento;
create policy categorias_equipamento_update on categorias_equipamento for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists categorias_equipamento_delete on categorias_equipamento;
create policy categorias_equipamento_delete on categorias_equipamento for delete using (user_id = auth.uid());

create table if not exists cores_status (
  user_id uuid not null default auth.uid() references auth.users(id),
  chave text not null, cor text not null,
  primary key (user_id, chave)
);
alter table cores_status enable row level security;
drop policy if exists cores_status_select on cores_status;
create policy cores_status_select on cores_status for select using (user_id = auth.uid());
drop policy if exists cores_status_insert on cores_status;
create policy cores_status_insert on cores_status for insert with check (user_id = auth.uid());
drop policy if exists cores_status_update on cores_status;
create policy cores_status_update on cores_status for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists cores_status_delete on cores_status;
create policy cores_status_delete on cores_status for delete using (user_id = auth.uid());

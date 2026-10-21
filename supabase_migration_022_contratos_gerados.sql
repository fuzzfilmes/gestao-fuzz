-- ============================================================
-- Migração 022 — Contratos salvos (dados do formulário do Gerador
-- de Contrato), pra poder reabrir e alterar um contrato depois
-- (rodar no Supabase SQL Editor)
-- ============================================================

create table if not exists contratos_gerados (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id),
  cliente_id text references clientes(id) on delete set null,
  titulo text not null default '',
  dados jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table contratos_gerados enable row level security;
drop policy if exists contratos_gerados_select on contratos_gerados;
drop policy if exists contratos_gerados_insert on contratos_gerados;
drop policy if exists contratos_gerados_update on contratos_gerados;
drop policy if exists contratos_gerados_delete on contratos_gerados;
create policy contratos_gerados_select on contratos_gerados for select using (user_id = auth.uid());
create policy contratos_gerados_insert on contratos_gerados for insert with check (user_id = auth.uid());
create policy contratos_gerados_update on contratos_gerados for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy contratos_gerados_delete on contratos_gerados for delete using (user_id = auth.uid());

-- ============================================================
-- Migração 013 — Reservas e poupanças
-- (rodar no Supabase SQL Editor)
-- ============================================================

create table if not exists reservas (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id),
  nome text not null default '',
  valor_alvo numeric not null default 0,
  valor_atual numeric not null default 0,
  cor text not null default '#4FA8A0',
  criado_em date not null default current_date,
  created_at timestamptz not null default now()
);
alter table reservas enable row level security;

drop policy if exists reservas_select on reservas;
create policy reservas_select on reservas for select using (user_id = auth.uid());
drop policy if exists reservas_insert on reservas;
create policy reservas_insert on reservas for insert with check (user_id = auth.uid());
drop policy if exists reservas_update on reservas;
create policy reservas_update on reservas for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists reservas_delete on reservas;
create policy reservas_delete on reservas for delete using (user_id = auth.uid());

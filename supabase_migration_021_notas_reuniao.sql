-- ============================================================
-- Migração 021 — Notas de reunião / dossiê de cliente
-- (rodar no Supabase SQL Editor)
-- ============================================================

create table if not exists notas_reuniao (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id),
  cliente_id text references clientes(id) on delete set null,
  cliente_nome_livre text not null default '',
  titulo text not null default '',
  data date not null default current_date,
  conteudo text not null default '',
  created_at timestamptz not null default now()
);
alter table notas_reuniao enable row level security;
drop policy if exists notas_reuniao_select on notas_reuniao;
drop policy if exists notas_reuniao_insert on notas_reuniao;
drop policy if exists notas_reuniao_update on notas_reuniao;
drop policy if exists notas_reuniao_delete on notas_reuniao;
create policy notas_reuniao_select on notas_reuniao for select using (user_id = auth.uid());
create policy notas_reuniao_insert on notas_reuniao for insert with check (user_id = auth.uid());
create policy notas_reuniao_update on notas_reuniao for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy notas_reuniao_delete on notas_reuniao for delete using (user_id = auth.uid());

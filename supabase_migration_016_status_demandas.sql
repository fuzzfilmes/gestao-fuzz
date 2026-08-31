-- ============================================================
-- Migração 016 — Status único de demanda (substitui Produção +
-- Aprovação) numa lista própria e gerenciável, igual às
-- categorias de despesa
-- (rodar no Supabase SQL Editor)
-- ============================================================

create table if not exists status_demandas (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id),
  nome text not null default '',
  cor text not null default '#8a8f98',
  ordem integer not null default 0,
  created_at timestamptz not null default now()
);
alter table status_demandas enable row level security;

drop policy if exists status_demandas_select on status_demandas;
create policy status_demandas_select on status_demandas for select using (user_id = auth.uid());
drop policy if exists status_demandas_insert on status_demandas;
create policy status_demandas_insert on status_demandas for insert with check (user_id = auth.uid());
drop policy if exists status_demandas_update on status_demandas;
create policy status_demandas_update on status_demandas for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists status_demandas_delete on status_demandas;
create policy status_demandas_delete on status_demandas for delete using (user_id = auth.uid());

-- Seed dos status padrão pro usuário existente (auth.uid() não
-- funciona no SQL Editor, então busca o user_id diretamente).
insert into status_demandas (id, user_id, nome, cor, ordem)
select 'sd_' || v.ordem, (select id from auth.users limit 1), v.nome, v.cor, v.ordem
from (values
  ('Não iniciada', '#8a8f98', 0),
  ('Em andamento', '#4FA8A0', 1),
  ('Enviado para aprovação', '#5B9BD9', 2),
  ('Aguardando aprovação', '#D9A441', 3),
  ('Alteração solicitada', '#E2574C', 4),
  ('Standby', '#9B87C4', 5),
  ('Finalizada', '#6FBF73', 6)
) as v(nome, cor, ordem)
where not exists (
  select 1 from status_demandas s where s.user_id = (select id from auth.users limit 1) and s.nome = v.nome
);

alter table demandas add column if not exists status text;

-- Backfill: combina as colunas antigas status_producao +
-- status_aprovacao num único status.
update demandas
set status = case
  when status_aprovacao = 'Aprovado' then 'Finalizada'
  when status_aprovacao = 'Alteração solicitada' then 'Alteração solicitada'
  when status_producao = 'StandBy' then 'Standby'
  when status_aprovacao = 'Aguardando' and status_producao = 'Finalizada' then 'Aguardando aprovação'
  when status_producao = 'Em andamento' then 'Em andamento'
  when status_producao = 'Finalizada' then 'Enviado para aprovação'
  else 'Não iniciada'
end
where status is null;

alter table demandas alter column status set default 'Não iniciada';

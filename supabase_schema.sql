-- ============================================================
-- Fuzz Produtora — schema (rodar uma vez no Supabase SQL Editor)
-- ============================================================

create table clientes (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id),
  nome text not null default '', tipo text not null default 'Recorrente',
  contato_nome text not null default '', email text not null default '',
  telefone text not null default '', razao_social text not null default '',
  cnpj text not null default '', endereco text not null default '',
  bairro text not null default '', municipio text not null default '',
  estado text not null default '', cep text not null default '',
  drive_link text not null default '', capa_url text not null default '',
  observacoes text not null default '', criado_em date not null default current_date,
  created_at timestamptz not null default now()
);
alter table clientes enable row level security;
create policy clientes_select on clientes for select using (user_id = auth.uid());
create policy clientes_insert on clientes for insert with check (user_id = auth.uid());
create policy clientes_update on clientes for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy clientes_delete on clientes for delete using (user_id = auth.uid());

create table demandas (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id),
  projeto text not null default '', cliente_id text references clientes(id) on delete set null,
  tipo text not null default '', editor text not null default '',
  status_producao text not null default 'Não iniciada',
  status_aprovacao text not null default 'Não enviado',
  data_entrega date, data_envio_aprovacao date, data_aprovacao date,
  link text not null default '', observacoes text not null default '',
  created_at timestamptz not null default now()
);
alter table demandas enable row level security;
create policy demandas_select on demandas for select using (user_id = auth.uid());
create policy demandas_insert on demandas for insert with check (user_id = auth.uid());
create policy demandas_update on demandas for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy demandas_delete on demandas for delete using (user_id = auth.uid());

create table demanda_itens (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id),
  demanda_id text not null references demandas(id) on delete cascade,
  nome text not null default '',
  status_envio text not null default 'Não enviado',
  status_aprovacao text not null default 'Aguardando',
  ordem integer not null default 0
);
alter table demanda_itens enable row level security;
create policy demanda_itens_select on demanda_itens for select using (user_id = auth.uid());
create policy demanda_itens_insert on demanda_itens for insert with check (user_id = auth.uid());
create policy demanda_itens_update on demanda_itens for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy demanda_itens_delete on demanda_itens for delete using (user_id = auth.uid());
create index demanda_itens_demanda_id_idx on demanda_itens(demanda_id);

create table propostas (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id),
  numero text not null default '', titulo text not null default '',
  tipo text not null default '', cliente_id text references clientes(id) on delete set null,
  cliente_nome text not null default '', valor_total numeric not null default 0,
  data_geracao date not null default current_date, status text not null default 'Pendente',
  created_at timestamptz not null default now()
);
alter table propostas enable row level security;
create policy propostas_select on propostas for select using (user_id = auth.uid());
create policy propostas_insert on propostas for insert with check (user_id = auth.uid());
create policy propostas_update on propostas for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy propostas_delete on propostas for delete using (user_id = auth.uid());

create table kanban_tasks (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id),
  titulo text not null default '', data date not null, concluida boolean not null default false,
  cliente_id text references clientes(id) on delete set null, notas text not null default '',
  created_at timestamptz not null default now()
);
alter table kanban_tasks enable row level security;
create policy kanban_tasks_select on kanban_tasks for select using (user_id = auth.uid());
create policy kanban_tasks_insert on kanban_tasks for insert with check (user_id = auth.uid());
create policy kanban_tasks_update on kanban_tasks for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy kanban_tasks_delete on kanban_tasks for delete using (user_id = auth.uid());

create table tags (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id),
  nome text not null, cor text not null default '',
  created_at timestamptz not null default now()
);
alter table tags enable row level security;
create policy tags_select on tags for select using (user_id = auth.uid());
create policy tags_insert on tags for insert with check (user_id = auth.uid());
create policy tags_update on tags for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy tags_delete on tags for delete using (user_id = auth.uid());
create unique index tags_user_nome_lower_idx on tags (user_id, lower(nome));

create table transacoes (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id),
  tipo text not null, descricao text not null default '', categoria text not null default '',
  natureza text not null default 'Variável', valor numeric not null default 0, data date,
  status_pagamento text not null default 'Pendente',
  demanda_id text references demandas(id) on delete set null,
  cliente_id text references clientes(id) on delete set null,
  observacoes text not null default '', parcela_grupo_id text,
  parcela_atual integer, parcela_total integer,
  created_at timestamptz not null default now()
);
alter table transacoes enable row level security;
create policy transacoes_select on transacoes for select using (user_id = auth.uid());
create policy transacoes_insert on transacoes for insert with check (user_id = auth.uid());
create policy transacoes_update on transacoes for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy transacoes_delete on transacoes for delete using (user_id = auth.uid());
create index transacoes_parcela_grupo_idx on transacoes(parcela_grupo_id);

create table transacao_tags (
  transacao_id text not null references transacoes(id) on delete cascade,
  tag_id text not null references tags(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id),
  primary key (transacao_id, tag_id)
);
alter table transacao_tags enable row level security;
create policy transacao_tags_select on transacao_tags for select using (user_id = auth.uid());
create policy transacao_tags_insert on transacao_tags for insert with check (user_id = auth.uid());
create policy transacao_tags_update on transacao_tags for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy transacao_tags_delete on transacao_tags for delete using (user_id = auth.uid());

create table equipamentos (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id),
  nome text not null default '', categoria text not null default '',
  status text not null default 'Disponível', numero_serie text not null default '',
  responsavel text not null default '', local text not null default '',
  valor_compra numeric, data_compra date, observacoes text not null default '',
  criado_em date not null default current_date,
  created_at timestamptz not null default now()
);
alter table equipamentos enable row level security;
create policy equipamentos_select on equipamentos for select using (user_id = auth.uid());
create policy equipamentos_insert on equipamentos for insert with check (user_id = auth.uid());
create policy equipamentos_update on equipamentos for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy equipamentos_delete on equipamentos for delete using (user_id = auth.uid());

create table tipos_producao (
  user_id uuid not null default auth.uid() references auth.users(id),
  nome text not null, ordem integer not null default 0,
  primary key (user_id, nome)
);
alter table tipos_producao enable row level security;
create policy tipos_producao_select on tipos_producao for select using (user_id = auth.uid());
create policy tipos_producao_insert on tipos_producao for insert with check (user_id = auth.uid());
create policy tipos_producao_update on tipos_producao for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy tipos_producao_delete on tipos_producao for delete using (user_id = auth.uid());

create table metas_mensais (
  user_id uuid not null default auth.uid() references auth.users(id),
  mes text not null, valor numeric not null default 0, primary key (user_id, mes)
);
alter table metas_mensais enable row level security;
create policy metas_mensais_select on metas_mensais for select using (user_id = auth.uid());
create policy metas_mensais_insert on metas_mensais for insert with check (user_id = auth.uid());
create policy metas_mensais_update on metas_mensais for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy metas_mensais_delete on metas_mensais for delete using (user_id = auth.uid());

create table metas_anuais (
  user_id uuid not null default auth.uid() references auth.users(id),
  ano text not null, valor numeric not null default 0, primary key (user_id, ano)
);
alter table metas_anuais enable row level security;
create policy metas_anuais_select on metas_anuais for select using (user_id = auth.uid());
create policy metas_anuais_insert on metas_anuais for insert with check (user_id = auth.uid());
create policy metas_anuais_update on metas_anuais for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy metas_anuais_delete on metas_anuais for delete using (user_id = auth.uid());

create table metas_clientes_mensais (
  user_id uuid not null default auth.uid() references auth.users(id),
  mes text not null, valor integer not null default 0, primary key (user_id, mes)
);
alter table metas_clientes_mensais enable row level security;
create policy metas_clientes_mensais_select on metas_clientes_mensais for select using (user_id = auth.uid());
create policy metas_clientes_mensais_insert on metas_clientes_mensais for insert with check (user_id = auth.uid());
create policy metas_clientes_mensais_update on metas_clientes_mensais for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy metas_clientes_mensais_delete on metas_clientes_mensais for delete using (user_id = auth.uid());

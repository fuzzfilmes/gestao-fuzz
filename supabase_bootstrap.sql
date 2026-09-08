-- ============================================================
-- Fuzz Produtora — BOOTSTRAP consolidado (rodar UMA VEZ, de uma
-- vez só, no SQL Editor de um projeto Supabase novo e vazio)
-- ============================================================
--
-- O que é este arquivo:
--   Este script cria o estado FINAL/atual de todo o schema —
--   equivalente a rodar supabase_schema.sql seguido de todas as
--   migrações supabase_migration_002_*.sql até
--   supabase_migration_018_*.sql, em ordem, numa base vazia.
--   Foi gerado lendo esses 18 arquivos por inteiro mais
--   src/lib/api.js (fonte da verdade sobre o que o app realmente
--   lê/escreve hoje).
--
--   Os arquivos numerados (supabase_schema.sql +
--   supabase_migration_002 a 018) continuam sendo o registro
--   histórico da evolução do schema e NÃO devem ser apagados —
--   eles são a referência de como o banco da Fuzz (produção)
--   chegou ao estado atual, incluindo os backfills de dados que
--   só faziam sentido pra migrar linhas já existentes.
--
-- O que este script NÃO inclui (de propósito):
--   - UPDATEs de backfill de dados antigos (ex.: recalcular
--     `ordem` de linhas existentes, combinar colunas antigas de
--     status em linhas já existentes) — não fazem sentido numa
--     base zerada, sem histórico.
--   - Colunas legadas que foram substituídas por uma coluna/tabela
--     nova e que o app (api.js) não lê nem escreve mais hoje
--     (ex.: demandas.status_producao/status_aprovacao,
--     demanda_itens.status_producao/status_aprovacao, e
--     parametros_financeiros.pro_labore) — ver relatório enviado
--     junto com este arquivo pra detalhes de cada uma.
--
-- Idempotência:
--   Todo `create table`, `create index` e `alter table ... add
--   column` usa `if not exists`, e toda `create policy` é
--   precedida de `drop policy if exists` — rodar este script mais
--   de uma vez não deve gerar erro.
--
-- Sobre os INSERTs de seed (categorias de despesa padrão e status
-- de demanda padrão), veja o comentário logo acima de cada um mais
-- abaixo: eles dependem de já existir pelo menos 1 usuário
-- cadastrado (auth.users) pra saber de quem são as linhas — numa
-- base recém-criada isso só acontece depois do primeiro login.
-- ============================================================


-- ============================================================
-- clientes
-- ============================================================
create table if not exists clientes (
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
  created_at timestamptz not null default now(),
  rascunho boolean not null default false
);
alter table clientes enable row level security;
drop policy if exists clientes_select on clientes;
create policy clientes_select on clientes for select using (user_id = auth.uid());
drop policy if exists clientes_insert on clientes;
create policy clientes_insert on clientes for insert with check (user_id = auth.uid());
drop policy if exists clientes_update on clientes;
create policy clientes_update on clientes for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists clientes_delete on clientes;
create policy clientes_delete on clientes for delete using (user_id = auth.uid());


-- ============================================================
-- demandas
-- (status_producao/status_aprovacao do schema original foram
-- substituídas pela coluna única `status`, que referencia a
-- tabela status_demandas pelo nome — api.js só lê/escreve `status`)
-- ============================================================
create table if not exists demandas (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id),
  projeto text not null default '', cliente_id text references clientes(id) on delete set null,
  tipo text not null default '', editor text not null default '',
  status text not null default 'Não iniciada',
  data_entrega date, data_envio_aprovacao date, data_aprovacao date,
  link text not null default '', observacoes text not null default '',
  ordem integer not null default 0,
  created_at timestamptz not null default now()
);
alter table demandas enable row level security;
drop policy if exists demandas_select on demandas;
create policy demandas_select on demandas for select using (user_id = auth.uid());
drop policy if exists demandas_insert on demandas;
create policy demandas_insert on demandas for insert with check (user_id = auth.uid());
drop policy if exists demandas_update on demandas;
create policy demandas_update on demandas for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists demandas_delete on demandas;
create policy demandas_delete on demandas for delete using (user_id = auth.uid());


-- ============================================================
-- demanda_itens
-- (status_envio/status_producao/status_aprovacao e o boolean
-- em_andamento do schema original foram substituídos pela coluna
-- única `status` + `data_entrega` — api.js só lê/escreve essas)
-- ============================================================
create table if not exists demanda_itens (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id),
  demanda_id text not null references demandas(id) on delete cascade,
  nome text not null default '',
  status text not null default 'Não iniciado',
  data_entrega date,
  ordem integer not null default 0
);
alter table demanda_itens enable row level security;
drop policy if exists demanda_itens_select on demanda_itens;
create policy demanda_itens_select on demanda_itens for select using (user_id = auth.uid());
drop policy if exists demanda_itens_insert on demanda_itens;
create policy demanda_itens_insert on demanda_itens for insert with check (user_id = auth.uid());
drop policy if exists demanda_itens_update on demanda_itens;
create policy demanda_itens_update on demanda_itens for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists demanda_itens_delete on demanda_itens;
create policy demanda_itens_delete on demanda_itens for delete using (user_id = auth.uid());
create index if not exists demanda_itens_demanda_id_idx on demanda_itens(demanda_id);


-- ============================================================
-- propostas
-- ============================================================
create table if not exists propostas (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id),
  numero text not null default '', titulo text not null default '',
  tipo text not null default '', cliente_id text references clientes(id) on delete set null,
  cliente_nome text not null default '', valor_total numeric not null default 0,
  data_geracao date not null default current_date, status text not null default 'Pendente',
  created_at timestamptz not null default now()
);
alter table propostas enable row level security;
drop policy if exists propostas_select on propostas;
create policy propostas_select on propostas for select using (user_id = auth.uid());
drop policy if exists propostas_insert on propostas;
create policy propostas_insert on propostas for insert with check (user_id = auth.uid());
drop policy if exists propostas_update on propostas;
create policy propostas_update on propostas for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists propostas_delete on propostas;
create policy propostas_delete on propostas for delete using (user_id = auth.uid());


-- ============================================================
-- kanban_tasks
-- (coluna `data` é opcional desde a migração 007 — nota rápida
-- sem dia definido)
-- ============================================================
create table if not exists kanban_tasks (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id),
  titulo text not null default '', data date, concluida boolean not null default false,
  cliente_id text references clientes(id) on delete set null, notas text not null default '',
  created_at timestamptz not null default now()
);
alter table kanban_tasks enable row level security;
drop policy if exists kanban_tasks_select on kanban_tasks;
create policy kanban_tasks_select on kanban_tasks for select using (user_id = auth.uid());
drop policy if exists kanban_tasks_insert on kanban_tasks;
create policy kanban_tasks_insert on kanban_tasks for insert with check (user_id = auth.uid());
drop policy if exists kanban_tasks_update on kanban_tasks;
create policy kanban_tasks_update on kanban_tasks for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists kanban_tasks_delete on kanban_tasks;
create policy kanban_tasks_delete on kanban_tasks for delete using (user_id = auth.uid());


-- ============================================================
-- tags
-- (hoje reaproveitadas também como categorias de despesa —
-- ver seed logo abaixo do bloco de transacoes)
-- ============================================================
create table if not exists tags (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id),
  nome text not null, cor text not null default '',
  created_at timestamptz not null default now()
);
alter table tags enable row level security;
drop policy if exists tags_select on tags;
create policy tags_select on tags for select using (user_id = auth.uid());
drop policy if exists tags_insert on tags;
create policy tags_insert on tags for insert with check (user_id = auth.uid());
drop policy if exists tags_update on tags;
create policy tags_update on tags for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists tags_delete on tags;
create policy tags_delete on tags for delete using (user_id = auth.uid());
create unique index if not exists tags_user_nome_lower_idx on tags (user_id, lower(nome));


-- ============================================================
-- transacoes
-- (tipo_receita adicionada na migração 010)
-- ============================================================
create table if not exists transacoes (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id),
  tipo text not null, descricao text not null default '', categoria text not null default '',
  tipo_receita text not null default '',
  natureza text not null default 'Variável', valor numeric not null default 0, data date,
  status_pagamento text not null default 'Pendente',
  demanda_id text references demandas(id) on delete set null,
  cliente_id text references clientes(id) on delete set null,
  observacoes text not null default '', parcela_grupo_id text,
  parcela_atual integer, parcela_total integer,
  created_at timestamptz not null default now()
);
alter table transacoes enable row level security;
drop policy if exists transacoes_select on transacoes;
create policy transacoes_select on transacoes for select using (user_id = auth.uid());
drop policy if exists transacoes_insert on transacoes;
create policy transacoes_insert on transacoes for insert with check (user_id = auth.uid());
drop policy if exists transacoes_update on transacoes;
create policy transacoes_update on transacoes for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists transacoes_delete on transacoes;
create policy transacoes_delete on transacoes for delete using (user_id = auth.uid());
create index if not exists transacoes_parcela_grupo_idx on transacoes(parcela_grupo_id);


-- ============================================================
-- transacao_tags
-- (tabela do schema original para múltiplas tags por transação;
-- api.js não lê nem escreve nela hoje — a categorização de
-- despesas passou a usar transacoes.categoria diretamente, desde
-- a migração 012. Mantida por completude não-destrutiva; veja
-- relatório para detalhes.)
-- ============================================================
create table if not exists transacao_tags (
  transacao_id text not null references transacoes(id) on delete cascade,
  tag_id text not null references tags(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id),
  primary key (transacao_id, tag_id)
);
alter table transacao_tags enable row level security;
drop policy if exists transacao_tags_select on transacao_tags;
create policy transacao_tags_select on transacao_tags for select using (user_id = auth.uid());
drop policy if exists transacao_tags_insert on transacao_tags;
create policy transacao_tags_insert on transacao_tags for insert with check (user_id = auth.uid());
drop policy if exists transacao_tags_update on transacao_tags;
create policy transacao_tags_update on transacao_tags for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists transacao_tags_delete on transacao_tags;
create policy transacao_tags_delete on transacao_tags for delete using (user_id = auth.uid());


-- ============================================================
-- equipamentos
-- (quantidade adicionada na migração 003)
-- ============================================================
create table if not exists equipamentos (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id),
  nome text not null default '', categoria text not null default '',
  status text not null default 'Disponível', numero_serie text not null default '',
  responsavel text not null default '', local text not null default '',
  valor_compra numeric, quantidade integer not null default 1,
  data_compra date, observacoes text not null default '',
  criado_em date not null default current_date,
  created_at timestamptz not null default now()
);
alter table equipamentos enable row level security;
drop policy if exists equipamentos_select on equipamentos;
create policy equipamentos_select on equipamentos for select using (user_id = auth.uid());
drop policy if exists equipamentos_insert on equipamentos;
create policy equipamentos_insert on equipamentos for insert with check (user_id = auth.uid());
drop policy if exists equipamentos_update on equipamentos;
create policy equipamentos_update on equipamentos for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists equipamentos_delete on equipamentos;
create policy equipamentos_delete on equipamentos for delete using (user_id = auth.uid());


-- ============================================================
-- tipos_producao
-- (lista padrão é semeada automaticamente pelo próprio app no
-- primeiro carregamento — seedTiposProducaoSeVazio em api.js —
-- não precisa de seed SQL aqui)
-- ============================================================
create table if not exists tipos_producao (
  user_id uuid not null default auth.uid() references auth.users(id),
  nome text not null, ordem integer not null default 0,
  primary key (user_id, nome)
);
alter table tipos_producao enable row level security;
drop policy if exists tipos_producao_select on tipos_producao;
create policy tipos_producao_select on tipos_producao for select using (user_id = auth.uid());
drop policy if exists tipos_producao_insert on tipos_producao;
create policy tipos_producao_insert on tipos_producao for insert with check (user_id = auth.uid());
drop policy if exists tipos_producao_update on tipos_producao;
create policy tipos_producao_update on tipos_producao for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists tipos_producao_delete on tipos_producao;
create policy tipos_producao_delete on tipos_producao for delete using (user_id = auth.uid());


-- ============================================================
-- tipos_receita (migração 010)
-- (lista padrão é semeada automaticamente pelo app — ver
-- seedTiposReceitaSeVazio em api.js)
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


-- ============================================================
-- categorias_equipamento (migração 003)
-- (lista padrão é semeada automaticamente pelo app — ver
-- seedCategoriasEquipamentoSeVazio em api.js)
-- ============================================================
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


-- ============================================================
-- cores_status (migração 003)
-- (cores padrão vivem só no front-end — DEFAULT_CORES_STATUS em
-- App.jsx — a tabela só recebe linhas quando o usuário customiza
-- uma cor, então não há seed SQL aqui)
-- ============================================================
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


-- ============================================================
-- status_demandas (migração 016)
-- (lista de status configurável usada pela coluna demandas.status
-- e demanda_itens.status, pelo nome. O próprio app também semeia
-- essa tabela automaticamente no primeiro carregamento —
-- seedStatusDemandasSeVazio em api.js — mas o seed SQL abaixo é
-- mantido também, replicando o padrão da migração original, e é
-- inofensivo/idempotente de qualquer forma)
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


-- ============================================================
-- metas_mensais / metas_anuais / metas_clientes_mensais
-- ============================================================
create table if not exists metas_mensais (
  user_id uuid not null default auth.uid() references auth.users(id),
  mes text not null, valor numeric not null default 0, primary key (user_id, mes)
);
alter table metas_mensais enable row level security;
drop policy if exists metas_mensais_select on metas_mensais;
create policy metas_mensais_select on metas_mensais for select using (user_id = auth.uid());
drop policy if exists metas_mensais_insert on metas_mensais;
create policy metas_mensais_insert on metas_mensais for insert with check (user_id = auth.uid());
drop policy if exists metas_mensais_update on metas_mensais;
create policy metas_mensais_update on metas_mensais for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists metas_mensais_delete on metas_mensais;
create policy metas_mensais_delete on metas_mensais for delete using (user_id = auth.uid());

create table if not exists metas_anuais (
  user_id uuid not null default auth.uid() references auth.users(id),
  ano text not null, valor numeric not null default 0, primary key (user_id, ano)
);
alter table metas_anuais enable row level security;
drop policy if exists metas_anuais_select on metas_anuais;
create policy metas_anuais_select on metas_anuais for select using (user_id = auth.uid());
drop policy if exists metas_anuais_insert on metas_anuais;
create policy metas_anuais_insert on metas_anuais for insert with check (user_id = auth.uid());
drop policy if exists metas_anuais_update on metas_anuais;
create policy metas_anuais_update on metas_anuais for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists metas_anuais_delete on metas_anuais;
create policy metas_anuais_delete on metas_anuais for delete using (user_id = auth.uid());

create table if not exists metas_clientes_mensais (
  user_id uuid not null default auth.uid() references auth.users(id),
  mes text not null, valor integer not null default 0, primary key (user_id, mes)
);
alter table metas_clientes_mensais enable row level security;
drop policy if exists metas_clientes_mensais_select on metas_clientes_mensais;
create policy metas_clientes_mensais_select on metas_clientes_mensais for select using (user_id = auth.uid());
drop policy if exists metas_clientes_mensais_insert on metas_clientes_mensais;
create policy metas_clientes_mensais_insert on metas_clientes_mensais for insert with check (user_id = auth.uid());
drop policy if exists metas_clientes_mensais_update on metas_clientes_mensais;
create policy metas_clientes_mensais_update on metas_clientes_mensais for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists metas_clientes_mensais_delete on metas_clientes_mensais;
create policy metas_clientes_mensais_delete on metas_clientes_mensais for delete using (user_id = auth.uid());


-- ============================================================
-- pro_labore_mensal (migração 017)
-- (substitui o valor fixo único parametros_financeiros.pro_labore
-- por um valor configurável por mês — ver nota no bloco de
-- parametros_financeiros abaixo)
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


-- ============================================================
-- parametros_financeiros (migração 011 + pct_inss da 018)
-- (a coluna `pro_labore` original do schema-011 foi substituída
-- pela tabela pro_labore_mensal na migração 017 e não é mais
-- lida/escrita pelo app — omitida aqui de propósito; ver relatório)
-- ============================================================
create table if not exists parametros_financeiros (
  user_id uuid primary key default auth.uid() references auth.users(id),
  pct_imposto numeric not null default 0,
  pct_reserva numeric not null default 0,
  pct_inss numeric not null default 11
);
alter table parametros_financeiros enable row level security;
drop policy if exists parametros_financeiros_select on parametros_financeiros;
create policy parametros_financeiros_select on parametros_financeiros for select using (user_id = auth.uid());
drop policy if exists parametros_financeiros_insert on parametros_financeiros;
create policy parametros_financeiros_insert on parametros_financeiros for insert with check (user_id = auth.uid());
drop policy if exists parametros_financeiros_update on parametros_financeiros;
create policy parametros_financeiros_update on parametros_financeiros for update using (user_id = auth.uid()) with check (user_id = auth.uid());
-- (sem policy de delete — igual ao original da migração 011: linha
-- por usuário é sempre upsert, nunca apagada pelo app)


-- ============================================================
-- reservas (migração 013)
-- (tabela criada para reservas/poupanças com meta e valor atual,
-- mas api.js não tem nenhuma função list/sync pra ela — o recurso
-- "Reserva" hoje no app é implementado via transacoes.categoria =
-- 'Reserva', não por esta tabela. Mantida por completude
-- não-destrutiva; parece funcionalidade morta/nunca finalizada —
-- ver relatório.)
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


-- ============================================================
-- processos_categorias (migração 002)
-- (lista padrão é semeada automaticamente pelo app — ver
-- seedProcessosCategoriasSeVazio em api.js)
-- ============================================================
create table if not exists processos_categorias (
  user_id uuid not null default auth.uid() references auth.users(id),
  nome text not null, ordem integer not null default 0,
  primary key (user_id, nome)
);
alter table processos_categorias enable row level security;
drop policy if exists processos_categorias_select on processos_categorias;
create policy processos_categorias_select on processos_categorias for select using (user_id = auth.uid());
drop policy if exists processos_categorias_insert on processos_categorias;
create policy processos_categorias_insert on processos_categorias for insert with check (user_id = auth.uid());
drop policy if exists processos_categorias_update on processos_categorias;
create policy processos_categorias_update on processos_categorias for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists processos_categorias_delete on processos_categorias;
create policy processos_categorias_delete on processos_categorias for delete using (user_id = auth.uid());


-- ============================================================
-- processos_documentos (migração 002)
-- ============================================================
create table if not exists processos_documentos (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id),
  categoria text not null default '',
  titulo text not null default '',
  conteudo_texto text,
  arquivo_path text,
  arquivo_nome text,
  observacoes text not null default '',
  created_at timestamptz not null default now()
);
alter table processos_documentos enable row level security;
drop policy if exists processos_documentos_select on processos_documentos;
create policy processos_documentos_select on processos_documentos for select using (user_id = auth.uid());
drop policy if exists processos_documentos_insert on processos_documentos;
create policy processos_documentos_insert on processos_documentos for insert with check (user_id = auth.uid());
drop policy if exists processos_documentos_update on processos_documentos;
create policy processos_documentos_update on processos_documentos for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists processos_documentos_delete on processos_documentos;
create policy processos_documentos_delete on processos_documentos for delete using (user_id = auth.uid());


-- ============================================================
-- arquivos_cliente (migração 004)
-- ============================================================
create table if not exists arquivos_cliente (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id),
  cliente_id text not null references clientes(id) on delete cascade,
  tipo text not null default '',
  nome text not null default '',
  arquivo_path text not null,
  created_at timestamptz not null default now()
);
alter table arquivos_cliente enable row level security;
drop policy if exists arquivos_cliente_select on arquivos_cliente;
create policy arquivos_cliente_select on arquivos_cliente for select using (user_id = auth.uid());
drop policy if exists arquivos_cliente_insert on arquivos_cliente;
create policy arquivos_cliente_insert on arquivos_cliente for insert with check (user_id = auth.uid());
drop policy if exists arquivos_cliente_update on arquivos_cliente;
create policy arquivos_cliente_update on arquivos_cliente for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists arquivos_cliente_delete on arquivos_cliente;
create policy arquivos_cliente_delete on arquivos_cliente for delete using (user_id = auth.uid());
create index if not exists arquivos_cliente_cliente_id_idx on arquivos_cliente(cliente_id);


-- ============================================================
-- Storage buckets (usados via supabase.storage.from(...) em
-- src/lib/api.js) + policies de storage.objects
-- ============================================================

-- processos-internos (privado) — migração 002
insert into storage.buckets (id, name, public)
select 'processos-internos', 'processos-internos', false
where not exists (select 1 from storage.buckets where id = 'processos-internos');

drop policy if exists processos_storage_select on storage.objects;
create policy processos_storage_select on storage.objects for select
  using (bucket_id = 'processos-internos' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists processos_storage_insert on storage.objects;
create policy processos_storage_insert on storage.objects for insert
  with check (bucket_id = 'processos-internos' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists processos_storage_update on storage.objects;
create policy processos_storage_update on storage.objects for update
  using (bucket_id = 'processos-internos' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists processos_storage_delete on storage.objects;
create policy processos_storage_delete on storage.objects for delete
  using (bucket_id = 'processos-internos' and (storage.foldername(name))[1] = auth.uid()::text);

-- arquivos-cliente (privado) — migração 004
insert into storage.buckets (id, name, public)
select 'arquivos-cliente', 'arquivos-cliente', false
where not exists (select 1 from storage.buckets where id = 'arquivos-cliente');

drop policy if exists arquivos_cliente_storage_select on storage.objects;
create policy arquivos_cliente_storage_select on storage.objects for select
  using (bucket_id = 'arquivos-cliente' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists arquivos_cliente_storage_insert on storage.objects;
create policy arquivos_cliente_storage_insert on storage.objects for insert
  with check (bucket_id = 'arquivos-cliente' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists arquivos_cliente_storage_update on storage.objects;
create policy arquivos_cliente_storage_update on storage.objects for update
  using (bucket_id = 'arquivos-cliente' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists arquivos_cliente_storage_delete on storage.objects;
create policy arquivos_cliente_storage_delete on storage.objects for delete
  using (bucket_id = 'arquivos-cliente' and (storage.foldername(name))[1] = auth.uid()::text);

-- capas-cliente (público — a foto de capa é exibida direto via URL
-- pública no card do cliente) — migração 005
insert into storage.buckets (id, name, public)
select 'capas-cliente', 'capas-cliente', true
where not exists (select 1 from storage.buckets where id = 'capas-cliente');

drop policy if exists capas_cliente_storage_select on storage.objects;
create policy capas_cliente_storage_select on storage.objects for select
  using (bucket_id = 'capas-cliente');
drop policy if exists capas_cliente_storage_insert on storage.objects;
create policy capas_cliente_storage_insert on storage.objects for insert
  with check (bucket_id = 'capas-cliente' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists capas_cliente_storage_update on storage.objects;
create policy capas_cliente_storage_update on storage.objects for update
  using (bucket_id = 'capas-cliente' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists capas_cliente_storage_delete on storage.objects;
create policy capas_cliente_storage_delete on storage.objects for delete
  using (bucket_id = 'capas-cliente' and (storage.foldername(name))[1] = auth.uid()::text);


-- ============================================================
-- Seeds de dados de referência padrão (migrações 012 e 016)
--
-- IMPORTANTE: estes dois blocos só têm efeito se já existir pelo
-- menos 1 usuário cadastrado em auth.users no momento em que este
-- script é colado no SQL Editor. Numa base Supabase recém-criada
-- não existe usuário nenhum até alguém se cadastrar pela primeira
-- vez no app — então, se você rodar este bootstrap ANTES do
-- primeiro login/cadastro, estes dois blocos não inserem nada (e
-- não dão erro). Depois do primeiro login, rode só estes dois
-- blocos de novo (são idempotentes — pode rodar quantas vezes
-- quiser) pra popular as categorias/status padrão.
-- ============================================================

-- Categorias de despesa padrão, seedadas como `tags` (reaproveitadas
-- como categorias de despesa desde a migração 012).
insert into tags (id, user_id, nome, cor)
select 'tag_seed_' || lower(regexp_replace(cat, '[^a-zA-Z0-9]+', '_', 'g')),
       (select id from auth.users limit 1), cat, '#8a8f98'
from unnest(array['Freelancer','Equipamento','Software','Escritório','Transporte','Imposto','Outro']) as cat
where exists (select 1 from auth.users)
  and not exists (
    select 1 from tags t
    where t.user_id = (select id from auth.users limit 1) and t.nome = cat
  );

-- Status de demanda padrão (o app também semeia isso sozinho no
-- primeiro carregamento via seedStatusDemandasSeVazio em api.js;
-- este bloco só existe como reforço/precedente da migração 016 e
-- é inofensivo caso o app já tenha semeado).
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
where exists (select 1 from auth.users)
  and not exists (
    select 1 from status_demandas s
    where s.user_id = (select id from auth.users limit 1) and s.nome = v.nome
  );

-- ============================================================
-- Fim do bootstrap.
-- ============================================================

-- =====================================================================
-- Ferramentas — banco de dados (Supabase)
-- Rode este arquivo inteiro no SQL Editor de um projeto Supabase NOVO,
-- separado do projeto do Painel de Gestão da Fuzz.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. ACESSOS — quem comprou o quê
--    Uma linha por (transação, produto). Um combo gera várias linhas com
--    a mesma transação. Reembolso de uma compra revoga só aquela compra,
--    sem mexer em outra compra do mesmo cliente.
-- ---------------------------------------------------------------------
create table if not exists public.acessos (
  transacao      text        not null,
  produto        text        not null,          -- ex: 'calculadora', 'propostas'
  email          text        not null,          -- sempre minúsculo
  nome           text,
  status         text        not null default 'ativo'
                   check (status in ('ativo', 'revogado')),
  origem         text        not null default 'hotmart',
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now(),
  primary key (transacao, produto)
);

create index if not exists acessos_email_idx on public.acessos (lower(email));

alter table public.acessos enable row level security;

-- cada pessoa logada enxerga só os próprios acessos (pelo e-mail do login)
drop policy if exists "ver os próprios acessos" on public.acessos;
create policy "ver os próprios acessos" on public.acessos
  for select to authenticated
  using (lower(email) = lower(auth.jwt() ->> 'email'));

-- ninguém escreve aqui pelo navegador — só o webhook (service role)


-- ---------------------------------------------------------------------
-- 2. Função de verificação usada pelas regras abaixo
-- ---------------------------------------------------------------------
create or replace function public.tem_acesso(p_produto text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.acessos
    where lower(email) = lower(auth.jwt() ->> 'email')
      and produto = p_produto
      and status = 'ativo'
  );
$$;


-- ---------------------------------------------------------------------
-- 3. CONFIGURAÇÕES — a calibragem de cada usuário, por ferramenta
--    (fica na nuvem: a pessoa entra de qualquer computador e está tudo lá)
-- ---------------------------------------------------------------------
create table if not exists public.configuracoes (
  user_id        uuid        not null default auth.uid()
                   references auth.users (id) on delete cascade,
  app            text        not null,          -- ex: 'calculadora'
  dados          jsonb       not null,
  atualizado_em  timestamptz not null default now(),
  primary key (user_id, app)
);

alter table public.configuracoes enable row level security;

drop policy if exists "ler a própria configuração" on public.configuracoes;
create policy "ler a própria configuração" on public.configuracoes
  for select to authenticated
  using (user_id = auth.uid() and public.tem_acesso(app));

drop policy if exists "criar a própria configuração" on public.configuracoes;
create policy "criar a própria configuração" on public.configuracoes
  for insert to authenticated
  with check (user_id = auth.uid() and public.tem_acesso(app));

drop policy if exists "editar a própria configuração" on public.configuracoes;
create policy "editar a própria configuração" on public.configuracoes
  for update to authenticated
  using (user_id = auth.uid() and public.tem_acesso(app))
  with check (user_id = auth.uid() and public.tem_acesso(app));


-- ---------------------------------------------------------------------
-- 4. REGISTRO DOS AVISOS DA HOTMART — pra suporte e conferência
--    (sem regra de leitura: só você vê, pelo painel do Supabase)
-- ---------------------------------------------------------------------
create table if not exists public.eventos_hotmart (
  id            bigserial   primary key,
  evento        text,
  transacao     text,
  email         text,
  produto_id    text,
  resultado     text,
  payload       jsonb,
  recebido_em   timestamptz not null default now()
);

alter table public.eventos_hotmart enable row level security;


-- ---------------------------------------------------------------------
-- 5. Liberar acesso manualmente (cortesia, parceiro, teste)
--    Exemplo — descomente e troque o e-mail:
-- ---------------------------------------------------------------------
-- insert into public.acessos (transacao, produto, email, origem)
-- values ('CORTESIA-001', 'calculadora', 'fulano@email.com', 'manual');

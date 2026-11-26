-- ============================================================
-- Migração 025 — Equipe: acessos, painel do cliente, materiais de apoio,
-- cronograma mensal e recados
-- (rodar no Supabase SQL Editor, o arquivo inteiro de uma vez)
--
-- Ideia de segurança: quem é da equipe NÃO ganha acesso direto a nenhuma
-- tabela. As regras atuais (cada conta só vê o que é dela) não mudam.
-- A equipe lê só pela função painel_equipe() e grava só pelas funções
-- equipe_*, que conferem quem é a pessoa e o que está liberado pra ela.
-- Financeiro, propostas e contratos não aparecem em nenhuma delas.
-- ============================================================

begin;

-- ---------------- Acessos ----------------
create table if not exists equipe_membros (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nome text not null default '',
  email text not null,
  papel text not null check (papel in ('editor', 'social')),
  clientes_ids text[] not null default '{}',   -- usado pelo papel 'social'
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);
create unique index if not exists equipe_membros_email_uniq on equipe_membros (lower(email));
alter table equipe_membros enable row level security;

-- Atribuição da demanda a quem edita.
alter table demandas add column if not exists editor_membro_id uuid references equipe_membros(id) on delete set null;

-- ---------------- Materiais de apoio do cliente (links e textos) ----------------
create table if not exists materiais_cliente (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  cliente_id text not null references clientes(id) on delete cascade,
  titulo text not null default '',
  link text not null default '',
  texto text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists materiais_cliente_cliente_idx on materiais_cliente (cliente_id);
alter table materiais_cliente enable row level security;

-- ---------------- Cronograma do cliente ----------------
create table if not exists agenda_cliente (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  cliente_id text not null references clientes(id) on delete cascade,
  tipo text not null check (tipo in ('postagem', 'gravacao', 'reuniao')),
  titulo text not null default '',
  data date not null,
  hora text not null default '',            -- 'HH:MM' ou vazio
  rede text not null default '',            -- onde vai a postagem
  descricao text not null default '',       -- legenda, local, pauta…
  link text not null default '',
  status text not null default 'planejado' check (status in ('planejado', 'agendado', 'concluido')),
  autor_nome text not null default 'Fuzz',
  created_at timestamptz not null default now()
);
create index if not exists agenda_cliente_data_idx on agenda_cliente (user_id, data);
alter table agenda_cliente enable row level security;

-- ---------------- Recados ----------------
-- de_membro_id nulo = enviado pelo dono.
-- para_todos = false e para_membro_id nulo = enviado ao dono.
create table if not exists recados (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  de_membro_id uuid references equipe_membros(id) on delete cascade,
  para_membro_id uuid references equipe_membros(id) on delete cascade,
  para_todos boolean not null default false,
  cliente_id text references clientes(id) on delete set null,
  texto text not null,
  lido_por text[] not null default '{}',    -- 'dono' ou o id do membro
  created_at timestamptz not null default now()
);
alter table recados enable row level security;

-- ---------------- Autor das notas de reunião ----------------
alter table notas_reuniao add column if not exists autor_membro_id uuid references equipe_membros(id) on delete set null;
alter table notas_reuniao add column if not exists autor_nome text not null default '';

-- ---------------- Quem é o usuário logado ----------------
-- Id do membro (null = dono do próprio painel). Quem já tem clientes ou
-- demandas próprias nunca é tratado como membro: assim ninguém consegue
-- "sequestrar" o seu login cadastrando o seu email.
create or replace function equipe_membro_id_atual()
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select m.id
  from public.equipe_membros m
  join auth.users u on lower(u.email) = lower(m.email)
  where u.id = auth.uid()
    and u.email_confirmed_at is not null
    and m.owner_id <> u.id
    and not exists (select 1 from public.demandas d where d.user_id = u.id)
    and not exists (select 1 from public.clientes c where c.user_id = u.id)
  limit 1
$$;

-- Membro ativo logado; dá erro se não for um. Uso interno das funções equipe_*.
create or replace function equipe_membro_ativo()
returns public.equipe_membros
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  m public.equipe_membros%rowtype;
begin
  select * into m from public.equipe_membros where id = public.equipe_membro_id_atual() and ativo;
  if not found then
    raise exception 'Acesso não permitido' using errcode = '42501';
  end if;
  return m;
end
$$;

-- Clientes que o membro pode ver: social = os liberados;
-- editor = os das demandas atribuídas a ele.
create or replace function equipe_clientes_visiveis(p_membro uuid)
returns text[]
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(array_agg(c.id), '{}')
  from public.equipe_membros m
  join public.clientes c on c.user_id = m.owner_id and not c.rascunho
  where m.id = p_membro
    and (
      (m.papel = 'social' and c.id = any (m.clientes_ids))
      or (m.papel = 'editor' and exists (
        select 1 from public.demandas d
        where d.user_id = m.owner_id and d.cliente_id = c.id and d.editor_membro_id = m.id
      ))
    )
$$;

-- ---------------- Regras de acesso direto (só o dono) ----------------
drop policy if exists equipe_membros_select on equipe_membros;
create policy equipe_membros_select on equipe_membros for select
  using (owner_id = auth.uid());
drop policy if exists equipe_membros_insert on equipe_membros;
create policy equipe_membros_insert on equipe_membros for insert
  with check (
    owner_id = auth.uid()
    and equipe_membro_id_atual() is null
    and lower(email) <> lower(coalesce(auth.jwt() ->> 'email', ''))
  );
drop policy if exists equipe_membros_update on equipe_membros;
create policy equipe_membros_update on equipe_membros for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid() and lower(email) <> lower(coalesce(auth.jwt() ->> 'email', '')));
drop policy if exists equipe_membros_delete on equipe_membros;
create policy equipe_membros_delete on equipe_membros for delete
  using (owner_id = auth.uid());

drop policy if exists materiais_cliente_dono on materiais_cliente;
create policy materiais_cliente_dono on materiais_cliente for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists agenda_cliente_dono on agenda_cliente;
create policy agenda_cliente_dono on agenda_cliente for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists recados_dono on recados;
create policy recados_dono on recados for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------- Leitura da equipe ----------------
create or replace function painel_equipe()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  m public.equipe_membros%rowtype;
  visiveis text[];
  eu jsonb;
begin
  select * into m from public.equipe_membros where id = public.equipe_membro_id_atual();
  if not found then
    return null;
  end if;

  eu := jsonb_build_object('id', m.id, 'nome', m.nome, 'papel', m.papel, 'ativo', m.ativo);
  if not m.ativo then
    return jsonb_build_object('membro', eu, 'status', '[]'::jsonb, 'trabalhos', '[]'::jsonb,
      'clientes', '[]'::jsonb, 'agenda', '[]'::jsonb, 'recados', '[]'::jsonb, 'pessoas', '[]'::jsonb);
  end if;

  visiveis := public.equipe_clientes_visiveis(m.id);

  return jsonb_build_object(
    'membro', eu,

    'status', coalesce((
      select jsonb_agg(jsonb_build_object('nome', s.nome, 'cor', s.cor) order by s.ordem)
      from public.status_demandas s
      where s.user_id = m.owner_id
    ), '[]'::jsonb),

    'trabalhos', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', d.id,
        'projeto', d.projeto,
        'clienteId', coalesce(d.cliente_id, ''),
        'clienteNome', coalesce(c.nome, ''),
        'tipo', d.tipo,
        'editor', d.editor,
        'status', d.status,
        'dataEntrega', coalesce(d.data_entrega::text, ''),
        'dataEnvioAprovacao', coalesce(d.data_envio_aprovacao::text, ''),
        'dataAprovacao', coalesce(d.data_aprovacao::text, ''),
        'link', d.link,
        'observacoes', case when m.papel = 'editor' then d.observacoes else '' end,
        'itens', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', it.id,
            'nome', it.nome,
            'status', it.status,
            'dataEntrega', coalesce(it.data_entrega::text, ''),
            'dataConclusao', coalesce(it.data_conclusao::text, '')
          ) order by it.ordem)
          from public.demanda_itens it
          where it.demanda_id = d.id and it.user_id = m.owner_id
        ), '[]'::jsonb)
      ) order by d.data_entrega nulls last, d.projeto)
      from public.demandas d
      left join public.clientes c on c.id = d.cliente_id and c.user_id = m.owner_id
      where d.user_id = m.owner_id
        and (
          (m.papel = 'editor' and d.editor_membro_id = m.id)
          or (m.papel = 'social' and d.cliente_id = any (visiveis))
        )
    ), '[]'::jsonb),

    -- Painel do cliente: contatos, Drive, dados cadastrais, materiais e notas.
    'clientes', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', c.id,
        'nome', c.nome,
        'tipo', c.tipo,
        'capaUrl', c.capa_url,
        'contatoNome', c.contato_nome,
        'telefone', c.telefone,
        'contatos', c.contatos,
        'email', c.email,
        'razaoSocial', c.razao_social,
        'cnpj', c.cnpj,
        'endereco', c.endereco,
        'bairro', c.bairro,
        'municipio', c.municipio,
        'estado', c.estado,
        'cep', c.cep,
        'observacoes', c.observacoes,
        'driveLink', c.drive_link,
        'materiais', coalesce((
          select jsonb_agg(jsonb_build_object('id', mc.id, 'titulo', mc.titulo, 'link', mc.link, 'texto', mc.texto) order by mc.created_at)
          from public.materiais_cliente mc
          where mc.cliente_id = c.id and mc.user_id = m.owner_id
        ), '[]'::jsonb),
        'notas', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', n.id,
            'titulo', n.titulo,
            'data', coalesce(n.data::text, ''),
            'conteudo', n.conteudo,
            'autorNome', n.autor_nome,
            'minha', coalesce(n.autor_membro_id = m.id, false)
          ) order by n.data desc, n.created_at desc)
          from public.notas_reuniao n
          where n.cliente_id = c.id and n.user_id = m.owner_id
        ), '[]'::jsonb)
      ) order by c.nome)
      from public.clientes c
      where c.user_id = m.owner_id and c.id = any (visiveis)
    ), '[]'::jsonb),

    'agenda', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', a.id, 'clienteId', a.cliente_id, 'tipo', a.tipo, 'titulo', a.titulo,
        'data', a.data::text, 'hora', a.hora, 'rede', a.rede, 'descricao', a.descricao,
        'link', a.link, 'status', a.status, 'autorNome', a.autor_nome
      ) order by a.data, a.hora)
      from public.agenda_cliente a
      where a.user_id = m.owner_id and a.cliente_id = any (visiveis)
    ), '[]'::jsonb),

    'recados', coalesce((
      select jsonb_agg(r.item order by r.created_at desc)
      from (
        select r.created_at, jsonb_build_object(
          'id', r.id,
          'texto', r.texto,
          'deNome', coalesce(de.nome, 'Fuzz'),
          'paraNome', case when r.para_todos then 'Todos' else coalesce(para.nome, 'Fuzz') end,
          'clienteNome', case when r.cliente_id = any (visiveis) then coalesce(c.nome, '') else '' end,
          'criadoEm', r.created_at,
          'enviadoPorMim', coalesce(r.de_membro_id = m.id, false),
          'lido', m.id::text = any (r.lido_por)
        ) as item
        from public.recados r
        left join public.equipe_membros de on de.id = r.de_membro_id
        left join public.equipe_membros para on para.id = r.para_membro_id
        left join public.clientes c on c.id = r.cliente_id and c.user_id = m.owner_id
        where r.user_id = m.owner_id
          and (r.para_todos or r.para_membro_id = m.id or r.de_membro_id = m.id)
        order by r.created_at desc
        limit 200
      ) r
    ), '[]'::jsonb),

    -- Pra quem dá pra mandar recado (sem emails).
    'pessoas', jsonb_build_array(jsonb_build_object('id', 'dono', 'nome', 'Fuzz')) || coalesce((
      select jsonb_agg(jsonb_build_object('id', p.id, 'nome', p.nome) order by p.nome)
      from public.equipe_membros p
      where p.owner_id = m.owner_id and p.ativo and p.id <> m.id
    ), '[]'::jsonb)
  );
end
$$;

-- ---------------- Gravações da equipe ----------------

-- Cronograma: só social media, só nos clientes liberados.
create or replace function equipe_salvar_agenda(p jsonb)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  m public.equipe_membros%rowtype;
  visiveis text[];
begin
  m := public.equipe_membro_ativo();
  if m.papel <> 'social' then
    raise exception 'Seu acesso não permite editar o cronograma' using errcode = '42501';
  end if;
  visiveis := public.equipe_clientes_visiveis(m.id);
  if not coalesce((p ->> 'clienteId') = any (visiveis), false) then
    raise exception 'Cliente não liberado' using errcode = '42501';
  end if;
  if coalesce(trim(p ->> 'titulo'), '') = '' or coalesce(p ->> 'data', '') = '' then
    raise exception 'Informe título e data';
  end if;

  if coalesce(p ->> 'id', '') = '' then
    insert into public.agenda_cliente (user_id, cliente_id, tipo, titulo, data, hora, rede, descricao, link, status, autor_nome)
    values (m.owner_id, p ->> 'clienteId', p ->> 'tipo', trim(p ->> 'titulo'), (p ->> 'data')::date,
      coalesce(p ->> 'hora', ''), coalesce(p ->> 'rede', ''), coalesce(p ->> 'descricao', ''),
      coalesce(p ->> 'link', ''), coalesce(nullif(p ->> 'status', ''), 'planejado'), m.nome);
  else
    update public.agenda_cliente set
      cliente_id = p ->> 'clienteId', tipo = p ->> 'tipo', titulo = trim(p ->> 'titulo'),
      data = (p ->> 'data')::date, hora = coalesce(p ->> 'hora', ''), rede = coalesce(p ->> 'rede', ''),
      descricao = coalesce(p ->> 'descricao', ''), link = coalesce(p ->> 'link', ''),
      status = coalesce(nullif(p ->> 'status', ''), 'planejado')
    where id = p ->> 'id' and user_id = m.owner_id and cliente_id = any (visiveis);
    if not found then
      raise exception 'Item não encontrado' using errcode = '42501';
    end if;
  end if;
end
$$;

create or replace function equipe_excluir_agenda(p_id text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  m public.equipe_membros%rowtype;
begin
  m := public.equipe_membro_ativo();
  if m.papel <> 'social' then
    raise exception 'Seu acesso não permite editar o cronograma' using errcode = '42501';
  end if;
  delete from public.agenda_cliente
  where id = p_id and user_id = m.owner_id and cliente_id = any (public.equipe_clientes_visiveis(m.id));
  if not found then
    raise exception 'Item não encontrado' using errcode = '42501';
  end if;
end
$$;

-- Notas de reunião: social media cria nos clientes liberados e só altera as próprias.
create or replace function equipe_salvar_nota(p jsonb)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  m public.equipe_membros%rowtype;
  visiveis text[];
begin
  m := public.equipe_membro_ativo();
  if m.papel <> 'social' then
    raise exception 'Seu acesso não permite criar notas' using errcode = '42501';
  end if;
  visiveis := public.equipe_clientes_visiveis(m.id);
  if not coalesce((p ->> 'clienteId') = any (visiveis), false) then
    raise exception 'Cliente não liberado' using errcode = '42501';
  end if;
  if coalesce(trim(p ->> 'titulo'), '') = '' and coalesce(trim(p ->> 'conteudo'), '') = '' then
    raise exception 'A nota está vazia';
  end if;

  if coalesce(p ->> 'id', '') = '' then
    insert into public.notas_reuniao (id, user_id, cliente_id, titulo, data, conteudo, autor_membro_id, autor_nome)
    values ('nr_' || replace(gen_random_uuid()::text, '-', ''), m.owner_id, p ->> 'clienteId',
      coalesce(p ->> 'titulo', ''), coalesce(nullif(p ->> 'data', '')::date, current_date),
      coalesce(p ->> 'conteudo', ''), m.id, m.nome);
  else
    update public.notas_reuniao set
      titulo = coalesce(p ->> 'titulo', ''),
      data = coalesce(nullif(p ->> 'data', '')::date, data),
      conteudo = coalesce(p ->> 'conteudo', '')
    where id = p ->> 'id' and user_id = m.owner_id and autor_membro_id = m.id and cliente_id = any (visiveis);
    if not found then
      raise exception 'Você só pode alterar as suas notas' using errcode = '42501';
    end if;
  end if;
end
$$;

create or replace function equipe_excluir_nota(p_id text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  m public.equipe_membros%rowtype;
begin
  m := public.equipe_membro_ativo();
  delete from public.notas_reuniao
  where id = p_id and user_id = m.owner_id and autor_membro_id = m.id
    and cliente_id = any (public.equipe_clientes_visiveis(m.id));
  if not found then
    raise exception 'Você só pode excluir as suas notas' using errcode = '42501';
  end if;
end
$$;

-- Recado de um membro. destino: 'dono', 'todos' ou o id de outro membro.
create or replace function equipe_enviar_recado(p jsonb)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  m public.equipe_membros%rowtype;
  destino text := coalesce(p ->> 'destino', '');
  alvo uuid := null;
  cliente text := nullif(p ->> 'clienteId', '');
begin
  m := public.equipe_membro_ativo();
  if coalesce(trim(p ->> 'texto'), '') = '' then
    raise exception 'O recado está vazio';
  end if;
  if destino not in ('dono', 'todos') then
    select id into alvo from public.equipe_membros
    where id::text = destino and owner_id = m.owner_id and ativo and id <> m.id;
    if alvo is null then
      raise exception 'Destinatário inválido' using errcode = '42501';
    end if;
  end if;
  if cliente is not null and not coalesce(cliente = any (public.equipe_clientes_visiveis(m.id)), false) then
    raise exception 'Cliente não liberado' using errcode = '42501';
  end if;

  insert into public.recados (user_id, de_membro_id, para_membro_id, para_todos, cliente_id, texto)
  values (m.owner_id, m.id, alvo, destino = 'todos', cliente, left(trim(p ->> 'texto'), 4000));
end
$$;

-- Marca um recado como lido (vale pro dono e pra equipe, só quem é destinatário).
create or replace function marcar_recado_lido(p_id text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  m public.equipe_membros%rowtype;
begin
  if public.equipe_membro_id_atual() is null then
    update public.recados set lido_por = array_append(lido_por, 'dono')
    where id = p_id and user_id = auth.uid() and not ('dono' = any (lido_por))
      and (para_todos or para_membro_id is null);
  else
    m := public.equipe_membro_ativo();
    update public.recados set lido_por = array_append(lido_por, m.id::text)
    where id = p_id and user_id = m.owner_id and not (m.id::text = any (lido_por))
      and (para_todos or para_membro_id = m.id);
  end if;
end
$$;

-- ---------------- Quem pode chamar o quê ----------------
revoke all on function equipe_membro_id_atual() from public, anon;
grant execute on function equipe_membro_id_atual() to authenticated;

-- Só usadas por dentro das outras funções.
revoke all on function equipe_membro_ativo() from public, anon, authenticated;
revoke all on function equipe_clientes_visiveis(uuid) from public, anon, authenticated;

revoke all on function painel_equipe() from public, anon;
revoke all on function equipe_salvar_agenda(jsonb) from public, anon;
revoke all on function equipe_excluir_agenda(text) from public, anon;
revoke all on function equipe_salvar_nota(jsonb) from public, anon;
revoke all on function equipe_excluir_nota(text) from public, anon;
revoke all on function equipe_enviar_recado(jsonb) from public, anon;
revoke all on function marcar_recado_lido(text) from public, anon;
grant execute on function painel_equipe() to authenticated;
grant execute on function equipe_salvar_agenda(jsonb) to authenticated;
grant execute on function equipe_excluir_agenda(text) to authenticated;
grant execute on function equipe_salvar_nota(jsonb) to authenticated;
grant execute on function equipe_excluir_nota(text) to authenticated;
grant execute on function equipe_enviar_recado(jsonb) to authenticated;
grant execute on function marcar_recado_lido(text) to authenticated;

commit;

-- Conferência de segurança: o resultado esperado é NENHUMA linha.
-- Se aparecer alguma, mande um print antes de criar acessos pra equipe.
select 'tabela sem proteção (RLS)' as problema, c.relname::text as onde
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity
union all
select 'regra que não filtra por usuário', schemaname || '.' || tablename || ' → ' || policyname
from pg_policies
where schemaname in ('public', 'storage')
  and coalesce(qual, '') || coalesce(with_check, '') not like '%auth.uid()%'
  and policyname <> 'capas_cliente_storage_select'
union all
select 'view pública (ignora a proteção)', viewname::text
from pg_views where schemaname = 'public';

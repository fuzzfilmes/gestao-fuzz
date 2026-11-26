-- ============================================================
-- Migração 028 — Aprovação de vídeos pela equipe
-- (rodar no Supabase SQL Editor, o arquivo inteiro de uma vez,
--  depois da 025, 026 e 027)
--
-- * link por vídeo;
-- * a social media marca "Aprovado" ou "Alteração solicitada" (com o
--   que precisa mudar), e o dono e quem edita recebem um recado;
-- * cria esses dois status na sua lista, se ainda não existirem.
-- ============================================================

begin;

alter table demanda_itens add column if not exists link text default '';
alter table demanda_itens add column if not exists retorno text;
alter table demanda_itens add column if not exists retorno_por text;
alter table demanda_itens add column if not exists retorno_em timestamptz;
-- usados quando a demanda não tem lista de vídeos
alter table demandas add column if not exists retorno text;
alter table demandas add column if not exists retorno_por text;
alter table demandas add column if not exists retorno_em timestamptz;

insert into status_demandas (id, user_id, nome, cor, ordem)
select 'sd_' || replace(gen_random_uuid()::text, '-', ''), s.user_id, novo.nome, novo.cor, max(s.ordem) + novo.posicao
from status_demandas s
cross join (values ('Aprovado', '#5CCBA8', 1), ('Alteração solicitada', '#E8536F', 2)) as novo(nome, cor, posicao)
where not exists (select 1 from status_demandas x where x.user_id = s.user_id and x.nome = novo.nome)
group by s.user_id, novo.nome, novo.cor, novo.posicao;

-- ---------------- Leitura da equipe (agora com link e retorno) ----------------
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
        'retorno', coalesce(d.retorno, ''),
        'retornoPor', coalesce(d.retorno_por, ''),
        'retornoEm', d.retorno_em,
        'observacoes', case when m.papel = 'editor' then d.observacoes else '' end,
        'itens', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', it.id,
            'nome', it.nome,
            'status', it.status,
            'dataEntrega', coalesce(it.data_entrega::text, ''),
            'dataConclusao', coalesce(it.data_conclusao::text, ''),
            'link', coalesce(it.link, ''),
            'retorno', coalesce(it.retorno, ''),
            'retornoPor', coalesce(it.retorno_por, ''),
            'retornoEm', it.retorno_em
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

-- ---------------- Aprovar ou pedir alteração ----------------
-- p: { demandaId, itemId ('' quando a demanda não tem vídeos), decisao: 'aprovar' | 'alterar', comentario }
create or replace function equipe_responder_video(p jsonb)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  m public.equipe_membros%rowtype;
  d public.demandas%rowtype;
  v_item text := nullif(p ->> 'itemId', '');
  v_decisao text := p ->> 'decisao';
  v_comentario text := left(trim(coalesce(p ->> 'comentario', '')), 2000);
  v_novo text;
  v_atual text;
  v_nome text;
  v_texto text;
begin
  m := public.equipe_membro_ativo();
  if m.papel <> 'social' then
    raise exception 'Seu acesso não permite aprovar vídeos' using errcode = '42501';
  end if;
  if v_decisao is null or v_decisao not in ('aprovar', 'alterar') then
    raise exception 'Resposta inválida';
  end if;
  if v_decisao = 'alterar' and v_comentario = '' then
    raise exception 'Descreva o que precisa mudar';
  end if;

  select * into d from public.demandas
  where id = p ->> 'demandaId' and user_id = m.owner_id
    and cliente_id = any (public.equipe_clientes_visiveis(m.id))
  for update;
  if not found then
    raise exception 'Demanda não liberada' using errcode = '42501';
  end if;
  if d.status in ('Finalizada', 'Standby') then
    raise exception 'Essa demanda está % e não recebe aprovação', lower(d.status);
  end if;

  if v_item is null then
    if exists (select 1 from public.demanda_itens i where i.demanda_id = d.id) then
      raise exception 'Escolha o vídeo';
    end if;
    v_atual := d.status;
    v_nome := d.projeto;
  else
    select i.status, i.nome into v_atual, v_nome from public.demanda_itens i
    where i.id = v_item and i.demanda_id = d.id and i.user_id = m.owner_id
    for update;
    if not found then
      raise exception 'Vídeo não encontrado' using errcode = '42501';
    end if;
  end if;

  if v_atual is null or v_atual not in ('Aguardando aprovação', 'Alteração solicitada') then
    raise exception 'Esse vídeo não está aguardando aprovação. Atualize a página.';
  end if;
  v_novo := case when v_decisao = 'aprovar' then 'Aprovado' else 'Alteração solicitada' end;

  if v_item is null then
    update public.demandas
    set status = v_novo, retorno = v_comentario, retorno_por = m.nome, retorno_em = now()
    where id = d.id;
  else
    update public.demanda_itens
    set status = v_novo, retorno = v_comentario, retorno_por = m.nome, retorno_em = now()
    where id = v_item;
  end if;

  -- Avisa o dono e, se a demanda estiver atribuída, quem edita.
  v_texto := case when v_decisao = 'aprovar' then '✅ Vídeo aprovado: ' else '✏️ Alteração solicitada: ' end
    || coalesce(nullif(v_nome, ''), 'vídeo sem nome')
    || case when v_item is not null then ' (' || d.projeto || ')' else '' end
    || case when v_comentario <> '' then E'\n' || v_comentario else '' end;

  insert into public.recados (user_id, de_membro_id, para_membro_id, para_todos, cliente_id, texto)
  values (m.owner_id, m.id, null, false, d.cliente_id, v_texto);

  insert into public.recados (user_id, de_membro_id, para_membro_id, para_todos, cliente_id, texto)
  select m.owner_id, m.id, e.id, false, d.cliente_id, v_texto
  from public.equipe_membros e
  where e.id = d.editor_membro_id and e.owner_id = m.owner_id and e.ativo and e.id <> m.id;
end
$$;

revoke all on function equipe_responder_video(jsonb) from public, anon;
grant execute on function equipe_responder_video(jsonb) to authenticated;
revoke all on function painel_equipe() from public, anon;
grant execute on function painel_equipe() to authenticated;

commit;

-- Conferência: o esperado é UMA linha começando com "OK".
select case
  when to_regprocedure('public.equipe_responder_video(jsonb)') is not null
   and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'demanda_itens' and column_name = 'link')
  then 'OK — aprovação de vídeos pronta'
  else 'ATENÇÃO — algo não foi criado' end as resultado;

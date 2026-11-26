-- ============================================================
-- Migração 027 — Travas extras da equipe
-- (rodar no Supabase SQL Editor, o arquivo inteiro de uma vez,
--  depois da 025 e da 026)
--
-- 1) Conta criada por convite não lê nem grava NADA direto em tabelas ou
--    arquivos, nem registros próprios. Ela só usa as funções da equipe, e
--    nunca vira "dona" de um painel nem cadastra outras pessoas.
-- 2) A lista de capas de clientes deixa de ser pública: só o dono lista.
--    As imagens continuam aparecendo pelo link, como antes.
--
-- ATENÇÃO pra quem criar tabela nova no futuro: ela também precisa da
-- regra "bloqueia_conta_convidada" (basta rodar este arquivo de novo).
-- ============================================================

begin;

create or replace function equipe_conta_convidada()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (select 1 from public.equipe_contas c where c.conta_id = auth.uid())
$$;
revoke all on function equipe_conta_convidada() from public, anon;
grant execute on function equipe_conta_convidada() to authenticated;

-- Regra "restritiva": vale por cima de todas as outras e só tira acesso.
do $$
declare
  t record;
begin
  for t in
    select c.relname
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r'
  loop
    execute format('drop policy if exists bloqueia_conta_convidada on public.%I', t.relname);
    execute format(
      'create policy bloqueia_conta_convidada on public.%I as restrictive for all to authenticated
         using (not (select public.equipe_conta_convidada()))
         with check (not (select public.equipe_conta_convidada()))',
      t.relname
    );
  end loop;
end
$$;

drop policy if exists bloqueia_conta_convidada on storage.objects;
create policy bloqueia_conta_convidada on storage.objects as restrictive for all to authenticated
  using (not (select public.equipe_conta_convidada()))
  with check (not (select public.equipe_conta_convidada()));

-- Conta convidada é sempre membro, aconteça o que acontecer.
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
    and (
      public.equipe_conta_convidada()
      or (
        not exists (select 1 from public.demandas d where d.user_id = u.id)
        and not exists (select 1 from public.clientes c where c.user_id = u.id)
      )
    )
  limit 1
$$;

-- Gerar código: recusa também qualquer conta convidada.
create or replace function equipe_gerar_codigo(p_membro uuid, p_redefinir boolean default false)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  m public.equipe_membros%rowtype;
  conta uuid;
  bruto text;
begin
  select * into m from public.equipe_membros
  where id = p_membro
    and owner_id = auth.uid()
    and public.equipe_membro_id_atual() is null
    and not public.equipe_conta_convidada()
  for update;
  if not found then
    raise exception 'Acesso não permitido' using errcode = '42501';
  end if;

  select u.id into conta from auth.users u where lower(u.email) = lower(m.email);
  if conta is not null then
    if not exists (select 1 from public.equipe_contas c where c.conta_id = conta and c.membro_id = m.id) then
      raise exception 'Esse email já tem um login criado fora do primeiro acesso. A pessoa entra com a senha atual, ou use outro email.';
    end if;
    if not p_redefinir then
      raise exception 'Essa pessoa já criou a senha. Use "Redefinir senha".';
    end if;
    delete from auth.users where id = conta;
    delete from public.equipe_contas where conta_id = conta;
  end if;

  bruto := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
  update public.equipe_membros
  set convite_hash = public.equipe_hash_codigo(bruto), convite_expira = now() + interval '7 days', acesso_criado_em = null
  where id = m.id;

  return substr(bruto, 1, 5) || '-' || substr(bruto, 6, 5);
end
$$;

-- Capas: listar só a própria pasta. (O balde continua público, então o link
-- direto de cada imagem segue funcionando no painel.)
drop policy if exists capas_cliente_storage_select on storage.objects;
create policy capas_cliente_storage_select on storage.objects for select
  using (bucket_id = 'capas-cliente' and (storage.foldername(name))[1] = auth.uid()::text);

commit;

-- Conferência: o esperado é UMA linha começando com "OK".
with faltando as (
  select 'tabela ' || c.relname as item
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r'
    and not exists (
      select 1 from pg_policies p
      where p.schemaname = 'public' and p.tablename = c.relname
        and p.policyname = 'bloqueia_conta_convidada' and p.permissive = 'RESTRICTIVE'
    )
  union all
  select 'arquivos (storage)' where not exists (
    select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'bloqueia_conta_convidada' and permissive = 'RESTRICTIVE'
  )
  union all
  select 'lista de capas ainda pública' where not exists (
    select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'capas_cliente_storage_select' and qual like '%auth.uid()%'
  )
)
select case when count(*) = 0 then 'OK — travas aplicadas'
  else 'ATENÇÃO — faltou: ' || string_agg(item, ', ') end as resultado
from faltando;

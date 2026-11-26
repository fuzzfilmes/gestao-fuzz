-- ============================================================
-- Migração 026 — Primeiro acesso da equipe com código
-- (rodar no Supabase SQL Editor, o arquivo inteiro de uma vez,
--  depois da 025 e ANTES de religar "Allow new users to sign up")
--
-- Como funciona: o dono cadastra a pessoa e gera um código. No primeiro
-- acesso ela informa email + código e cria a própria senha.
-- A trava fica no banco: NENHUMA conta nova é criada sem um convite válido,
-- por nenhum caminho (nem pelo botão "Add user" do Supabase). Contas que
-- já existem continuam entrando normalmente.
-- Pra remover a trava um dia:  drop trigger equipe_trava_cadastro on auth.users;
-- (nesse caso, desligue antes o cadastro aberto)
-- ============================================================

begin;

alter table equipe_membros add column if not exists convite_hash text;
alter table equipe_membros add column if not exists convite_expira timestamptz;
alter table equipe_membros add column if not exists acesso_criado_em timestamptz;

-- Contas criadas por convite. Sem nenhuma regra de acesso de propósito:
-- ninguém lê nem altera pela API, só as funções abaixo.
create table if not exists equipe_contas (
  conta_id uuid primary key,
  membro_id uuid not null,
  criada_em timestamptz not null default now()
);
alter table equipe_contas enable row level security;
revoke all on equipe_contas from anon, authenticated;

-- Código sem diferença de maiúsculas, traço ou espaço.
create or replace function equipe_hash_codigo(p text)
returns text
language sql
immutable
set search_path = public, pg_temp
as $$
  select encode(sha256(convert_to(upper(regexp_replace(coalesce(p, ''), '[^a-zA-Z0-9]', '', 'g')), 'UTF8')), 'hex')
$$;

-- ---------------- Trava de cadastro ----------------
create or replace function equipe_validar_cadastro()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  alvo uuid;
begin
  select m.id into alvo
  from public.equipe_membros m
  where lower(m.email) = lower(new.email)
    and m.ativo
    and m.convite_hash is not null
    and m.convite_expira > now()
    and m.convite_hash = public.equipe_hash_codigo(new.raw_user_meta_data ->> 'codigo_acesso')
  for update;

  if alvo is null then
    raise exception 'Cadastro permitido somente com convite válido';
  end if;

  -- O código vale uma vez só.
  update public.equipe_membros
  set convite_hash = null, convite_expira = null, acesso_criado_em = now()
  where id = alvo;
  insert into public.equipe_contas (conta_id, membro_id) values (new.id, alvo);

  new.raw_user_meta_data := coalesce(new.raw_user_meta_data, '{}'::jsonb) - 'codigo_acesso';
  return new;
end
$$;

drop trigger if exists equipe_trava_cadastro on auth.users;
create trigger equipe_trava_cadastro
  before insert on auth.users
  for each row execute function equipe_validar_cadastro();

-- ---------------- Gerar código (só o dono) ----------------
-- p_redefinir = true apaga o login criado por convite, pra pessoa criar
-- uma senha nova. Cronograma, notas e recados dela não são afetados.
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
  where id = p_membro and owner_id = auth.uid() and public.equipe_membro_id_atual() is null
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

-- ---------------- Excluir o acesso também apaga o login criado por convite ----------------
create or replace function equipe_apagar_login()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  delete from auth.users u
  using public.equipe_contas c
  where c.membro_id = old.id and u.id = c.conta_id and lower(u.email) = lower(old.email);
  delete from public.equipe_contas where membro_id = old.id;
  return old;
end
$$;

drop trigger if exists equipe_membros_apagar_login on equipe_membros;
create trigger equipe_membros_apagar_login
  before delete on equipe_membros
  for each row execute function equipe_apagar_login();

-- ---------------- Quem pode chamar o quê ----------------
revoke all on function equipe_hash_codigo(text) from public, anon, authenticated;
revoke all on function equipe_validar_cadastro() from public, anon, authenticated;
revoke all on function equipe_apagar_login() from public, anon, authenticated;
revoke all on function equipe_gerar_codigo(uuid, boolean) from public, anon;
grant execute on function equipe_gerar_codigo(uuid, boolean) to authenticated;

commit;

-- Conferência: o esperado é UMA linha dizendo "trava ativa".
select case when exists (
  select 1 from pg_trigger
  where tgname = 'equipe_trava_cadastro' and tgrelid = 'auth.users'::regclass and tgenabled <> 'D'
) then 'OK — trava ativa, pode religar o cadastro'
  else 'ATENÇÃO — trava NÃO ativa, não religue o cadastro' end as resultado;

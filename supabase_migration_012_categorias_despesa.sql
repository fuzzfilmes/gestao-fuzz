-- ============================================================
-- Migração 012 — Categorias de despesa (unifica com as antigas tags)
-- (rodar no Supabase SQL Editor)
-- ============================================================

-- Garante que as categorias antigas (hardcoded no código) existam como
-- "tags" (agora reaproveitadas como categorias de despesa), pra não
-- perder despesas já categorizadas com elas.
-- Observação: auth.uid() só funciona em requisições autenticadas feitas
-- pelo app — no SQL Editor ele retorna null, então buscamos o seu user_id
-- diretamente em auth.users (funciona pois só existe 1 usuário no sistema).
insert into tags (id, user_id, nome, cor)
select 'tag_seed_' || lower(regexp_replace(cat, '[^a-zA-Z0-9]+', '_', 'g')), (select id from auth.users limit 1), cat, '#8a8f98'
from unnest(array['Freelancer','Equipamento','Software','Escritório','Transporte','Imposto','Outro']) as cat
where not exists (
  select 1 from tags t where t.user_id = (select id from auth.users limit 1) and t.nome = cat
);

-- Para despesas que já tinham exatamente 1 tag vinculada (sistema antigo
-- de múltiplas tags por transação), usa o nome dessa tag como categoria.
update transacoes t
set categoria = tg.nome
from transacao_tags tt
join tags tg on tg.id = tt.tag_id
where t.id = tt.transacao_id
  and t.tipo = 'Despesa'
  and (select count(*) from transacao_tags tt2 where tt2.transacao_id = t.id) = 1;

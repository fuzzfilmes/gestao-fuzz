-- ============================================================
-- Migração 005 — Upload de foto de capa do cliente
-- (rodar no Supabase SQL Editor)
-- ============================================================

-- bucket público (a foto de capa é exibida direto via URL pública no card do cliente)
insert into storage.buckets (id, name, public) values ('capas-cliente', 'capas-cliente', true);

create policy capas_cliente_storage_select on storage.objects for select
  using (bucket_id = 'capas-cliente');
create policy capas_cliente_storage_insert on storage.objects for insert
  with check (bucket_id = 'capas-cliente' and (storage.foldername(name))[1] = auth.uid()::text);
create policy capas_cliente_storage_update on storage.objects for update
  using (bucket_id = 'capas-cliente' and (storage.foldername(name))[1] = auth.uid()::text);
create policy capas_cliente_storage_delete on storage.objects for delete
  using (bucket_id = 'capas-cliente' and (storage.foldername(name))[1] = auth.uid()::text);

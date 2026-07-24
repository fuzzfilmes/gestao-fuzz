-- ============================================================
-- Migração 004 — Arquivos anexados ao cliente (Proposta/Contrato)
-- (rodar no Supabase SQL Editor)
-- ============================================================

create table arquivos_cliente (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id),
  cliente_id text not null references clientes(id) on delete cascade,
  tipo text not null default '',
  nome text not null default '',
  arquivo_path text not null,
  created_at timestamptz not null default now()
);
alter table arquivos_cliente enable row level security;
create policy arquivos_cliente_select on arquivos_cliente for select using (user_id = auth.uid());
create policy arquivos_cliente_insert on arquivos_cliente for insert with check (user_id = auth.uid());
create policy arquivos_cliente_update on arquivos_cliente for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy arquivos_cliente_delete on arquivos_cliente for delete using (user_id = auth.uid());
create index arquivos_cliente_cliente_id_idx on arquivos_cliente(cliente_id);

-- bucket privado para os PDFs anexados
insert into storage.buckets (id, name, public) values ('arquivos-cliente', 'arquivos-cliente', false);

create policy arquivos_cliente_storage_select on storage.objects for select
  using (bucket_id = 'arquivos-cliente' and (storage.foldername(name))[1] = auth.uid()::text);
create policy arquivos_cliente_storage_insert on storage.objects for insert
  with check (bucket_id = 'arquivos-cliente' and (storage.foldername(name))[1] = auth.uid()::text);
create policy arquivos_cliente_storage_update on storage.objects for update
  using (bucket_id = 'arquivos-cliente' and (storage.foldername(name))[1] = auth.uid()::text);
create policy arquivos_cliente_storage_delete on storage.objects for delete
  using (bucket_id = 'arquivos-cliente' and (storage.foldername(name))[1] = auth.uid()::text);

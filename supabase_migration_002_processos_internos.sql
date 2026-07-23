-- ============================================================
-- Migração 002 — Processos internos (rodar no Supabase SQL Editor)
-- ============================================================

create table processos_categorias (
  user_id uuid not null default auth.uid() references auth.users(id),
  nome text not null, ordem integer not null default 0,
  primary key (user_id, nome)
);
alter table processos_categorias enable row level security;
create policy processos_categorias_select on processos_categorias for select using (user_id = auth.uid());
create policy processos_categorias_insert on processos_categorias for insert with check (user_id = auth.uid());
create policy processos_categorias_update on processos_categorias for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy processos_categorias_delete on processos_categorias for delete using (user_id = auth.uid());

create table processos_documentos (
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
create policy processos_documentos_select on processos_documentos for select using (user_id = auth.uid());
create policy processos_documentos_insert on processos_documentos for insert with check (user_id = auth.uid());
create policy processos_documentos_update on processos_documentos for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy processos_documentos_delete on processos_documentos for delete using (user_id = auth.uid());

-- bucket privado para os arquivos (imagem de pagamento, PDFs, etc.)
insert into storage.buckets (id, name, public) values ('processos-internos', 'processos-internos', false);

create policy processos_storage_select on storage.objects for select
  using (bucket_id = 'processos-internos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy processos_storage_insert on storage.objects for insert
  with check (bucket_id = 'processos-internos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy processos_storage_update on storage.objects for update
  using (bucket_id = 'processos-internos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy processos_storage_delete on storage.objects for delete
  using (bucket_id = 'processos-internos' and (storage.foldername(name))[1] = auth.uid()::text);

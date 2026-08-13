-- ============================================================
-- Migração 007 — Nota rápida (tarefas do Kanban sem dia definido)
-- (rodar no Supabase SQL Editor)
-- ============================================================

alter table kanban_tasks alter column data drop not null;

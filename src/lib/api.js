import { supabase } from "./supabaseClient.js";

function n(v) {
  return v === "" || v === null || v === undefined ? null : v;
}
function num(v, fallback = 0) {
  const p = parseFloat(v);
  return Number.isFinite(p) ? p : fallback;
}
function numOrNull(v) {
  if (v === "" || v === null || v === undefined) return null;
  const p = parseFloat(v);
  return Number.isFinite(p) ? p : null;
}
function intOrNull(v) {
  if (v === "" || v === null || v === undefined) return null;
  const p = parseInt(v, 10);
  return Number.isFinite(p) ? p : null;
}

function throwIfError({ error }) {
  if (error) throw error;
}

// Diffs a flat list of {id, ...} objects (in JS/camelCase shape) against a
// previous copy of the same list, and issues only the DB writes needed to
// bring the table in line: delete removed ids, upsert new/changed rows.
async function syncRows(table, prevList, nextList, toRow) {
  const prevMap = new Map(prevList.map((r) => [r.id, r]));
  const nextIds = new Set(nextList.map((r) => r.id));
  const toDelete = prevList.filter((r) => !nextIds.has(r.id)).map((r) => r.id);
  const toUpsert = nextList.filter((item) => {
    const prev = prevMap.get(item.id);
    return !prev || JSON.stringify(prev) !== JSON.stringify(item);
  });
  if (toDelete.length) {
    throwIfError(await supabase.from(table).delete().in("id", toDelete));
  }
  if (toUpsert.length) {
    throwIfError(await supabase.from(table).upsert(toUpsert.map(toRow)));
  }
}

// ---------------- Clientes ----------------

function clienteToRow(c) {
  return {
    id: c.id,
    nome: c.nome || "",
    tipo: c.tipo || "Recorrente",
    contato_nome: c.contatoNome || "",
    email: c.email || "",
    telefone: c.telefone || "",
    razao_social: c.razaoSocial || "",
    cnpj: c.cnpj || "",
    endereco: c.endereco || "",
    bairro: c.bairro || "",
    municipio: c.municipio || "",
    estado: c.estado || "",
    cep: c.cep || "",
    drive_link: c.driveLink || "",
    capa_url: c.capaUrl || "",
    observacoes: c.observacoes || "",
    criado_em: n(c.criadoEm),
  };
}
function clienteFromRow(r) {
  return {
    id: r.id,
    nome: r.nome,
    tipo: r.tipo,
    contatoNome: r.contato_nome,
    email: r.email,
    telefone: r.telefone,
    razaoSocial: r.razao_social,
    cnpj: r.cnpj,
    endereco: r.endereco,
    bairro: r.bairro,
    municipio: r.municipio,
    estado: r.estado,
    cep: r.cep,
    driveLink: r.drive_link,
    capaUrl: r.capa_url,
    observacoes: r.observacoes,
    criadoEm: r.criado_em,
  };
}
export async function listClientes() {
  const res = await supabase.from("clientes").select("*").order("created_at", { ascending: false });
  throwIfError(res);
  return res.data.map(clienteFromRow);
}
export async function syncClientes(prevList, nextList) {
  return syncRows("clientes", prevList, nextList, clienteToRow);
}

// ---------------- Demandas (+ demanda_itens) ----------------

function demandaToRow(d) {
  return {
    id: d.id,
    projeto: d.projeto || "",
    cliente_id: n(d.clienteId),
    tipo: d.tipo || "",
    editor: d.editor || "",
    status_producao: d.statusProducao || "",
    status_aprovacao: d.statusAprovacao || "",
    data_entrega: n(d.dataEntrega),
    data_envio_aprovacao: n(d.dataEnvioAprovacao),
    data_aprovacao: n(d.dataAprovacao),
    link: d.link || "",
    observacoes: d.observacoes || "",
  };
}
function itemToRow(demandaId, it, ordem) {
  return {
    id: it.id,
    demanda_id: demandaId,
    nome: it.nome || "",
    status_envio: it.statusEnvio || "Não enviado",
    status_aprovacao: it.statusAprovacao || "Aguardando",
    ordem,
  };
}
function demandaFromRow(r, itensByDemanda) {
  return {
    id: r.id,
    projeto: r.projeto,
    clienteId: r.cliente_id || "",
    tipo: r.tipo,
    editor: r.editor,
    statusProducao: r.status_producao,
    statusAprovacao: r.status_aprovacao,
    dataEntrega: r.data_entrega || "",
    dataEnvioAprovacao: r.data_envio_aprovacao || "",
    dataAprovacao: r.data_aprovacao || "",
    link: r.link,
    observacoes: r.observacoes,
    itens: (itensByDemanda.get(r.id) || []).map((it) => ({
      id: it.id,
      nome: it.nome,
      statusEnvio: it.status_envio,
      statusAprovacao: it.status_aprovacao,
    })),
  };
}
export async function listDemandas() {
  const [demandasRes, itensRes] = await Promise.all([
    supabase.from("demandas").select("*").order("created_at", { ascending: false }),
    supabase.from("demanda_itens").select("*").order("ordem", { ascending: true }),
  ]);
  throwIfError(demandasRes);
  throwIfError(itensRes);
  const itensByDemanda = new Map();
  for (const it of itensRes.data) {
    if (!itensByDemanda.has(it.demanda_id)) itensByDemanda.set(it.demanda_id, []);
    itensByDemanda.get(it.demanda_id).push(it);
  }
  return demandasRes.data.map((r) => demandaFromRow(r, itensByDemanda));
}
export async function syncDemandas(prevList, nextList) {
  await syncRows("demandas", prevList, nextList, demandaToRow);
  const prevMap = new Map(prevList.map((d) => [d.id, d]));
  for (const d of nextList) {
    const prevItens = prevMap.get(d.id)?.itens || [];
    const nextItens = d.itens || [];
    await syncRows(
      "demanda_itens",
      prevItens,
      nextItens,
      (it) => itemToRow(d.id, it, nextItens.indexOf(it))
    );
  }
}

// ---------------- Propostas ----------------

function propostaToRow(p) {
  return {
    id: p.id,
    numero: p.numero != null ? String(p.numero) : "",
    titulo: p.titulo || "",
    tipo: p.tipo || "",
    cliente_id: n(p.clienteId),
    cliente_nome: p.clienteNome || "",
    valor_total: num(p.valorTotal),
    data_geracao: n(p.dataGeracao),
    status: p.status || "Pendente",
  };
}
function propostaFromRow(r) {
  return {
    id: r.id,
    numero: r.numero,
    titulo: r.titulo,
    tipo: r.tipo,
    clienteId: r.cliente_id || "",
    clienteNome: r.cliente_nome,
    valorTotal: Number(r.valor_total) || 0,
    dataGeracao: r.data_geracao,
    status: r.status,
  };
}
export async function listPropostas() {
  const res = await supabase.from("propostas").select("*").order("created_at", { ascending: false });
  throwIfError(res);
  return res.data.map(propostaFromRow);
}
export async function syncPropostas(prevList, nextList) {
  return syncRows("propostas", prevList, nextList, propostaToRow);
}

// ---------------- Kanban tasks ----------------

function kanbanToRow(t) {
  return {
    id: t.id,
    titulo: t.titulo || "",
    data: t.data,
    concluida: !!t.concluida,
    cliente_id: n(t.clienteId),
    notas: t.notas || "",
  };
}
function kanbanFromRow(r) {
  return {
    id: r.id,
    titulo: r.titulo,
    data: r.data,
    concluida: r.concluida,
    clienteId: r.cliente_id || "",
    notas: r.notas,
  };
}
export async function listKanbanTasks() {
  const res = await supabase.from("kanban_tasks").select("*").order("created_at", { ascending: true });
  throwIfError(res);
  return res.data.map(kanbanFromRow);
}
export async function syncKanbanTasks(prevList, nextList) {
  return syncRows("kanban_tasks", prevList, nextList, kanbanToRow);
}

// ---------------- Tags ----------------

function tagToRow(tg) {
  return { id: tg.id, nome: tg.nome || "", cor: tg.cor || "" };
}
function tagFromRow(r) {
  return { id: r.id, nome: r.nome, cor: r.cor };
}
export async function listTags() {
  const res = await supabase.from("tags").select("*").order("created_at", { ascending: true });
  throwIfError(res);
  return res.data.map(tagFromRow);
}
export async function syncTags(prevList, nextList) {
  return syncRows("tags", prevList, nextList, tagToRow);
}

// ---------------- Transacoes (+ transacao_tags) ----------------

function transacaoToRow(t) {
  return {
    id: t.id,
    tipo: t.tipo,
    descricao: t.descricao || "",
    categoria: t.categoria || "",
    natureza: t.natureza || "Variável",
    valor: num(t.valor),
    data: n(t.data),
    status_pagamento: t.statusPagamento || "Pendente",
    demanda_id: n(t.demandaId),
    cliente_id: n(t.clienteId),
    observacoes: t.observacoes || "",
    parcela_grupo_id: n(t.parcelaGrupoId),
    parcela_atual: t.parcelaAtual != null ? t.parcelaAtual : null,
    parcela_total: t.parcelaTotal != null ? t.parcelaTotal : null,
  };
}
function transacaoFromRow(r, tagsByTransacao) {
  return {
    id: r.id,
    tipo: r.tipo,
    descricao: r.descricao,
    categoria: r.categoria,
    natureza: r.natureza,
    valor: String(r.valor),
    data: r.data || "",
    statusPagamento: r.status_pagamento,
    demandaId: r.demanda_id || "",
    clienteId: r.cliente_id || "",
    observacoes: r.observacoes,
    parcelaGrupoId: r.parcela_grupo_id || "",
    parcelaAtual: r.parcela_atual,
    parcelaTotal: r.parcela_total,
    tags: tagsByTransacao.get(r.id) || [],
  };
}
export async function listTransacoes() {
  const [transacoesRes, tagsRes] = await Promise.all([
    supabase.from("transacoes").select("*").order("created_at", { ascending: false }),
    supabase.from("transacao_tags").select("*"),
  ]);
  throwIfError(transacoesRes);
  throwIfError(tagsRes);
  const tagsByTransacao = new Map();
  for (const row of tagsRes.data) {
    if (!tagsByTransacao.has(row.transacao_id)) tagsByTransacao.set(row.transacao_id, []);
    tagsByTransacao.get(row.transacao_id).push(row.tag_id);
  }
  return transacoesRes.data.map((r) => transacaoFromRow(r, tagsByTransacao));
}
export async function syncTransacoes(prevList, nextList) {
  await syncRows("transacoes", prevList, nextList, transacaoToRow);
  const prevMap = new Map(prevList.map((t) => [t.id, t]));
  for (const t of nextList) {
    const prevTags = prevMap.get(t.id)?.tags || [];
    const nextTags = t.tags || [];
    const added = nextTags.filter((id) => !prevTags.includes(id));
    const removed = prevTags.filter((id) => !nextTags.includes(id));
    if (added.length) {
      throwIfError(
        await supabase.from("transacao_tags").insert(added.map((tagId) => ({ transacao_id: t.id, tag_id: tagId })))
      );
    }
    if (removed.length) {
      throwIfError(
        await supabase.from("transacao_tags").delete().eq("transacao_id", t.id).in("tag_id", removed)
      );
    }
  }
}

// ---------------- Equipamentos ----------------

function equipamentoToRow(e) {
  return {
    id: e.id,
    nome: e.nome || "",
    categoria: e.categoria || "",
    status: e.status || "Disponível",
    numero_serie: e.numeroSerie || "",
    responsavel: e.responsavel || "",
    local: e.local || "",
    valor_compra: numOrNull(e.valorCompra),
    data_compra: n(e.dataCompra),
    observacoes: e.observacoes || "",
    criado_em: n(e.criadoEm),
  };
}
function equipamentoFromRow(r) {
  return {
    id: r.id,
    nome: r.nome,
    categoria: r.categoria,
    status: r.status,
    numeroSerie: r.numero_serie,
    responsavel: r.responsavel,
    local: r.local,
    valorCompra: r.valor_compra != null ? String(r.valor_compra) : "",
    dataCompra: r.data_compra || "",
    observacoes: r.observacoes,
    criadoEm: r.criado_em,
  };
}
export async function listEquipamentos() {
  const res = await supabase.from("equipamentos").select("*").order("created_at", { ascending: false });
  throwIfError(res);
  return res.data.map(equipamentoFromRow);
}
export async function syncEquipamentos(prevList, nextList) {
  return syncRows("equipamentos", prevList, nextList, equipamentoToRow);
}

// ---------------- Tipos de produção ----------------

export async function listTiposProducao() {
  const res = await supabase.from("tipos_producao").select("*").order("ordem", { ascending: true });
  throwIfError(res);
  return res.data.map((r) => r.nome);
}
export async function seedTiposProducaoSeVazio(defaults) {
  const atuais = await listTiposProducao();
  if (atuais.length) return atuais;
  throwIfError(
    await supabase.from("tipos_producao").insert(defaults.map((nome, i) => ({ nome, ordem: i })))
  );
  return defaults;
}
export async function syncTiposProducao(prevList, nextList) {
  const prevSet = new Set(prevList);
  const nextSet = new Set(nextList);
  const toDelete = prevList.filter((nomeItem) => !nextSet.has(nomeItem));
  const toInsert = nextList
    .filter((nomeItem) => !prevSet.has(nomeItem))
    .map((nomeItem) => ({ nome: nomeItem, ordem: nextList.indexOf(nomeItem) }));
  if (toDelete.length) {
    throwIfError(await supabase.from("tipos_producao").delete().in("nome", toDelete));
  }
  if (toInsert.length) {
    throwIfError(await supabase.from("tipos_producao").insert(toInsert));
  }
}

// ---------------- Metas (period-keyed) ----------------

async function listMetas(table, keyCol) {
  const res = await supabase.from(table).select("*");
  throwIfError(res);
  const obj = {};
  for (const row of res.data) obj[row[keyCol]] = row.valor;
  return obj;
}
async function syncMetas(table, keyCol, prevObj, nextObj, parse) {
  const changedKeys = Object.keys(nextObj).filter((k) => String(nextObj[k]) !== String(prevObj[k]));
  if (!changedKeys.length) return;
  const rows = changedKeys.map((k) => ({ [keyCol]: k, valor: parse(nextObj[k]) }));
  throwIfError(await supabase.from(table).upsert(rows, { onConflict: `user_id,${keyCol}` }));
}

export const listMetasMensais = () => listMetas("metas_mensais", "mes");
export const listMetasAnuais = () => listMetas("metas_anuais", "ano");
export const listMetasClientesMensais = () => listMetas("metas_clientes_mensais", "mes");

export const syncMetasMensais = (prev, next) => syncMetas("metas_mensais", "mes", prev, next, (v) => num(v));
export const syncMetasAnuais = (prev, next) => syncMetas("metas_anuais", "ano", prev, next, (v) => num(v));
export const syncMetasClientesMensais = (prev, next) =>
  syncMetas("metas_clientes_mensais", "mes", prev, next, (v) => intOrNull(v) ?? 0);

// ---------------- Processos internos ----------------

export async function listProcessosCategorias() {
  const res = await supabase.from("processos_categorias").select("*").order("ordem", { ascending: true });
  throwIfError(res);
  return res.data.map((r) => r.nome);
}
export async function seedProcessosCategoriasSeVazio(defaults) {
  const atuais = await listProcessosCategorias();
  if (atuais.length) return atuais;
  throwIfError(
    await supabase.from("processos_categorias").insert(defaults.map((nome, i) => ({ nome, ordem: i })))
  );
  return defaults;
}
export async function syncProcessosCategorias(prevList, nextList) {
  const prevSet = new Set(prevList);
  const nextSet = new Set(nextList);
  const toDelete = prevList.filter((nomeItem) => !nextSet.has(nomeItem));
  const toInsert = nextList
    .filter((nomeItem) => !prevSet.has(nomeItem))
    .map((nomeItem) => ({ nome: nomeItem, ordem: nextList.indexOf(nomeItem) }));
  if (toDelete.length) {
    throwIfError(await supabase.from("processos_categorias").delete().in("nome", toDelete));
  }
  if (toInsert.length) {
    throwIfError(await supabase.from("processos_categorias").insert(toInsert));
  }
}

function processoDocToRow(d) {
  return {
    id: d.id,
    categoria: d.categoria || "",
    titulo: d.titulo || "",
    conteudo_texto: d.conteudoTexto || null,
    arquivo_path: d.arquivoPath || null,
    arquivo_nome: d.arquivoNome || null,
    observacoes: d.observacoes || "",
  };
}
function processoDocFromRow(r) {
  return {
    id: r.id,
    categoria: r.categoria,
    titulo: r.titulo,
    conteudoTexto: r.conteudo_texto || "",
    arquivoPath: r.arquivo_path || "",
    arquivoNome: r.arquivo_nome || "",
    observacoes: r.observacoes,
  };
}
export async function listProcessosDocumentos() {
  const res = await supabase.from("processos_documentos").select("*").order("created_at", { ascending: false });
  throwIfError(res);
  return res.data.map(processoDocFromRow);
}
export async function syncProcessosDocumentos(prevList, nextList) {
  return syncRows("processos_documentos", prevList, nextList, processoDocToRow);
}

export async function uploadProcessoArquivo(userId, documentoId, file) {
  const path = `${userId}/${documentoId}-${file.name}`;
  const res = await supabase.storage.from("processos-internos").upload(path, file, { upsert: true });
  throwIfError(res);
  return { path, nome: file.name };
}
export async function downloadProcessoArquivo(path) {
  const res = await supabase.storage.from("processos-internos").download(path);
  throwIfError(res);
  return res.data;
}
export async function deleteProcessoArquivo(path) {
  throwIfError(await supabase.storage.from("processos-internos").remove([path]));
}

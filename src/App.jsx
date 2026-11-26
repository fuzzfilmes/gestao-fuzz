import React, { useState, useEffect, useMemo, useRef } from "react";
import { statusEfetivoDoItem, unidadesDoTrabalho, urgenciaDaUnidade, getUrgencia, videoProgress, TONE_CLASS, ehNaoIniciado, statsDeProducao } from "./lib/trabalhos.js";
import { APP_CSS } from "./appStyle.js";
import { MENU } from "./equipe/menu.js";
import { AlternarVisao, ListaClientes, CamposCliente } from "./equipe/Clientes.jsx";
import EquipeAcessos from "./EquipeAcessos.jsx";
import Calendario from "./equipe/Calendario.jsx";
import AvisosCronograma from "./equipe/Avisos.jsx";
import Recados, { Recado, recadosNaoLidos } from "./equipe/Recados.jsx";
import MateriaisCliente from "./equipe/MateriaisCliente.jsx";
import Janela from "./equipe/Janela.jsx";
import { calcularPainelFinanceiro, ehProLabore, proLaboreTotalDoMes, CATEGORIA_SEM } from "./lib/financeiro.js";
import { Film, Users, Plus, Pencil, Trash2, X, AlertTriangle, Clock, CheckCircle2, PauseCircle, ExternalLink, Archive, FileText, Calculator, CheckCircle, DollarSign, Settings, LayoutGrid, ChevronLeft, ChevronRight, GripVertical, Target, Search, Bell, CreditCard, TrendingUp, Wallet, Eye, EyeOff, Camera, Image as ImageIcon, Home, Wrench, Package, LogOut, Download, Copy, Calendar, FileSignature, Filter, StickyNote, PiggyBank, MessageCircle, NotebookText, MoreHorizontal } from "lucide-react";
import { PROPOSTA_HTML, CALCULADORA_HTML, CONTRATO_HTML } from "./embeddedTools.js";
import { supabase } from "./lib/supabaseClient.js";
import * as api from "./lib/api.js";
import * as googleCal from "./lib/googleCalendar.js";
import fuzzLogo from "./assets/fuzz-logo.png";

let xlsxModulePromise = null;
function loadXLSX() {
  if (!xlsxModulePromise) xlsxModulePromise = import("xlsx");
  return xlsxModulePromise;
}

const VIDEO_STATUS = ["Não iniciado", "Em andamento", "Enviado para aprovação", "Aguardando aprovação", "Alteração solicitada", "Standby", "Aprovado"];

const DEFAULT_STATUS_DEMANDAS = [
  { nome: "Não iniciada", cor: "#8a8f98" },
  { nome: "Em andamento", cor: "#4FA8A0" },
  { nome: "Enviado para aprovação", cor: "#5B9BD9" },
  { nome: "Aguardando aprovação", cor: "#D9A441" },
  { nome: "Alteração solicitada", cor: "#E2574C" },
  { nome: "Standby", cor: "#9B87C4" },
  { nome: "Finalizada", cor: "#6FBF73" },
];

const DEFAULT_CORES_STATUS = {
  "video:Não iniciado": "#8a8f98",
  "video:Em andamento": "#4FA8A0",
  "video:Enviado para aprovação": "#5B9BD9",
  "video:Aguardando aprovação": "#D9A441",
  "video:Alteração solicitada": "#E2574C",
  "video:Standby": "#9B87C4",
  "video:Aprovado": "#6FBF73",
};

function corDoStatusComMapa(mapa, tipo, valor) {
  const chave = tipo + ":" + valor;
  return (mapa && mapa[chave]) || DEFAULT_CORES_STATUS[chave] || "#8a8f98";
}
const DEFAULT_TIPOS = ["Produção Comercial", "Institucional", "Podcast", "Motion", "Outro"];
const DEFAULT_TIPOS_RECEITA = ["Prestação de serviço", "Deslocamento", "Reembolso", "Outro"];
const DEFAULT_PROCESSOS_CATEGORIAS = ["Mensagens padrão", "Dados de pagamento", "Termos de uso de imagem", "Captação", "Edição", "Treinamentos"];
const PROCESSO_ARQUIVO_MAX_BYTES = 25 * 1024 * 1024;

const TAB_LABELS = {
  inicio: "Início",
  clientes: "Clientes",
  "propostas-lista": "Propostas",
  demandas: "Demandas",
  reunioes: "Reuniões",
  kanban: "Kanban semanal",
  financeiro: "Financeiro",
  metas: "Metas",
  relatorios: "Relatórios",
  equipamentos: "Equipamentos",
  processos: "Processos internos",
  calculadora: "Calculadora",
  propostas: "Gerador de Propostas",
  contratos: "Gerador de Contratos",
  config: "Configurações",
};
const RETENCAO_DIAS = 30;

const CATEGORIA_DESPESA_RESERVA = "Reserva";
const TIPO_RECEITA_RETIRADA_RESERVA = "Retirada de Reserva";
const STATUS_PAGAMENTO = ["Pendente", "Pago"];
const NATUREZA_DESPESA = ["Variável", "Fixa"];
const FREQUENCIA_LABEL = { mensal: "mensais", semanal: "semanais", semestral: "semestrais", anual: "anuais" };
const TAG_COLORS = ["#D9A441", "#4FA8A0", "#E2574C", "#9B87C4", "#6FBF73", "#5B9BD9", "#E07BB5", "#B0B4BB"];

const emptyTag = (nome, cor) => ({
  id: "tg_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
  nome: nome.trim(),
  cor,
});

const DEFAULT_CATEGORIAS_EQUIP = ["Câmeras", "Lentes", "Áudio", "Iluminação", "Drones", "Acessórios", "Informática", "Outro"];
const STATUS_EQUIP = ["Disponível", "Em uso", "Em manutenção", "Emprestado", "Danificado"];

const emptyEquipamento = () => ({
  id: "eq_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
  nome: "",
  categoria: DEFAULT_CATEGORIAS_EQUIP[0],
  status: "Disponível",
  numeroSerie: "",
  responsavel: "",
  local: "",
  valorCompra: "",
  quantidade: 1,
  dataCompra: "",
  observacoes: "",
  criadoEm: todayISO(),
});

function normalizeHeader(h) {
  return String(h || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

const EQUIP_HEADER_MAP = {
  nome: "nome",
  item: "nome",
  equipamento: "nome",
  categoria: "categoria",
  status: "status",
  situacao: "status",
  numserie: "numeroSerie",
  nserie: "numeroSerie",
  numerodeserie: "numeroSerie",
  ndeserie: "numeroSerie",
  serial: "numeroSerie",
  numeroserie: "numeroSerie",
  responsavel: "responsavel",
  local: "local",
  localizacao: "local",
  valor: "valorCompra",
  valordecompra: "valorCompra",
  valorcompra: "valorCompra",
  preco: "valorCompra",
  quantidade: "quantidade",
  qtd: "quantidade",
  qtde: "quantidade",
  data: "dataCompra",
  datadecompra: "dataCompra",
  datacompra: "dataCompra",
  observacoes: "observacoes",
  observacao: "observacoes",
  obs: "observacoes",
};

function parseValorCell(v) {
  if (typeof v === "number") return Number.isFinite(v) ? v : "";
  const s = String(v || "").trim();
  if (!s) return "";
  let limpo = s.replace(/[^\d,.\-]/g, "");
  if (limpo.includes(",") && limpo.includes(".")) {
    limpo = limpo.replace(/\./g, "").replace(",", ".");
  } else if (limpo.includes(",")) {
    limpo = limpo.replace(",", ".");
  } else if (/^\d{1,3}(\.\d{3})+$/.test(limpo)) {
    // só pontos, em grupos de milhar (ex: "2.000") — não é separador decimal
    limpo = limpo.replace(/\./g, "");
  }
  const n = parseFloat(limpo);
  return Number.isFinite(n) ? n : "";
}

function parseDataCell(v) {
  if (!v) return "";
  if (v instanceof Date) {
    return v.getUTCFullYear() + "-" + String(v.getUTCMonth() + 1).padStart(2, "0") + "-" + String(v.getUTCDate()).padStart(2, "0");
  }
  const s = String(v).trim();
  if (!s) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (m) {
    let [, d, mo, y] = m;
    if (y.length === 2) y = "20" + y;
    return y + "-" + mo.padStart(2, "0") + "-" + d.padStart(2, "0");
  }
  return "";
}

// Detecta planilhas onde a linha 1 é uma nota/instrução (não o cabeçalho real) e o
// cabeçalho verdadeiro (Nome, Categoria...) está nos VALORES da primeira linha de dados.
// Nesse caso, usa essa linha como cabeçalho e descarta ela do conjunto de dados.
function corrigirCabecalhoDeslocado(rows) {
  if (!rows.length) return rows;
  const primeira = rows[0];
  const chaves = Object.keys(primeira);
  const reconhecidos = chaves.filter((k) => EQUIP_HEADER_MAP[normalizeHeader(primeira[k])]).length;
  if (reconhecidos < 2) return rows;
  return rows.slice(1).map((row) => {
    const nova = {};
    chaves.forEach((k) => { nova[primeira[k]] = row[k]; });
    return nova;
  });
}

function parseEquipamentosSheet(rowsBrutas, categoriasValidas) {
  const rows = corrigirCabecalhoDeslocado(rowsBrutas);
  const categorias = categoriasValidas && categoriasValidas.length ? categoriasValidas : ["Outro"];
  const novos = [];
  let ignoradas = 0;
  rows.forEach((row) => {
    const campos = {};
    for (const key of Object.keys(row)) {
      const campo = EQUIP_HEADER_MAP[normalizeHeader(key)];
      if (campo) campos[campo] = row[key];
    }
    const nome = String(campos.nome || "").trim();
    if (!nome || nome.toUpperCase() === "TOTAL") {
      ignoradas++;
      return;
    }
    const categoria = categorias.includes(campos.categoria) ? campos.categoria : categorias[0];
    const status = STATUS_EQUIP.includes(campos.status) ? campos.status : "Disponível";
    const valor = parseValorCell(campos.valorCompra);
    const quantidade = Math.max(1, parseInt(campos.quantidade, 10) || 1);
    novos.push({
      ...emptyEquipamento(),
      id: "eq_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7) + "_" + novos.length,
      nome,
      categoria,
      status,
      numeroSerie: String(campos.numeroSerie || "").trim(),
      responsavel: String(campos.responsavel || "").trim(),
      local: String(campos.local || "").trim(),
      valorCompra: valor === "" ? "" : String(valor),
      quantidade,
      dataCompra: parseDataCell(campos.dataCompra),
      observacoes: String(campos.observacoes || "").trim(),
    });
  });
  return { novos, ignoradas };
}

async function baixarModeloEquipamentos() {
  const XLSX = await loadXLSX();
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([
    ["Nome", "Categoria", "Status", "Nº de Série", "Responsável", "Local", "Quantidade", "Valor de Compra", "Data de Compra", "Observações"],
    ["Ex: Câmera Sony A7III", "Câmeras", "Disponível", "SN123456", "Vítor", "Armário 2, prateleira B", "1", "12500.00", "2024-03-15", ""],
  ]);
  XLSX.utils.book_append_sheet(wb, ws, "Equipamentos");
  XLSX.writeFile(wb, "modelo-equipamentos.xlsx");
}

const emptyTransacao = (tipo = "Receita") => ({
  id: "t_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
  tipo,
  descricao: "",
  categoria: "",
  tipoReceita: "",
  natureza: "Variável",
  valor: "",
  data: "",
  statusPagamento: "Pendente",
  demandaId: "",
  clienteId: "",
  observacoes: "",
  parcelaGrupoId: "",
  parcelaAtual: null,
  parcelaTotal: null,
  notaEmitida: false,
  dataNotaEmitida: "",
});

function getStatusPagamentoEfetivo(t) {
  if (t.statusPagamento === "Pago") return "Pago";
  if (t.data && new Date(t.data + "T00:00:00") < new Date(todayISO() + "T00:00:00")) return "Atrasado";
  return "Pendente";
}

function mesRef(iso) {
  return iso ? iso.slice(0, 7) : "";
}
function addMonthsISO(mesISO, n) {
  const [y, m] = mesISO.split("-").map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
}
function mesLabel(mesISO) {
  const [y, m] = mesISO.split("-").map(Number);
  return MONTH_LABELS_SHORT[m - 1] + "/" + String(y).slice(2);
}

const emptyDemand = () => ({
  id: "d_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
  projeto: "",
  clienteId: "",
  tipo: DEFAULT_TIPOS[0],
  editor: "",
  status: DEFAULT_STATUS_DEMANDAS[0].nome,
  dataEntrega: "",
  dataEnvioAprovacao: "",
  dataAprovacao: "",
  link: "",
  observacoes: "",
  itens: [],
  ordem: 0,
});

const emptyVideoItem = () => ({ id: "v_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6), nome: "", status: VIDEO_STATUS[0], dataEntrega: "", dataConclusao: "" });

const emptyClient = () => ({
  id: "c_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
  nome: "",
  tipo: "Recorrente",
  contatoNome: "",
  email: "",
  telefone: "",
  contatos: [],
  razaoSocial: "",
  cnpj: "",
  endereco: "",
  bairro: "",
  municipio: "",
  estado: "",
  cep: "",
  driveLink: "",
  capaUrl: "",
  observacoes: "",
  criadoEm: todayISO(),
  rascunho: false,
});

const emptyNotaReuniao = (clienteId = "") => ({
  id: "nr_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
  clienteId,
  clienteNomeLivre: "",
  titulo: "",
  data: todayISO(),
  conteudo: "",
});

function fmtDate(iso) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function todayISO() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

// ---------- Nota emitida: competência do faturamento e do imposto ----------
// O mês em que a nota é emitida define o faturado; o imposto dele vence dia 20 do mês seguinte.
const CATEGORIA_IMPOSTO = "Impostos e Tributos";
const IMPOSTO_AUTO_DESDE = "2026-10";

function receitaFaturada(t) {
  return t.tipo === "Receita" && t.tipoReceita !== TIPO_RECEITA_RETIRADA_RESERVA && !!t.notaEmitida && !!t.dataNotaEmitida;
}

function faturadoDoMes(list, mes) {
  return list
    .filter((t) => receitaFaturada(t) && mesRef(t.dataNotaEmitida) === mes)
    .reduce((s, t) => s + (parseFloat(t.valor) || 0), 0);
}

function vencimentoTributosDoMes(mes) {
  return addMonthsISO(mes, 1) + "-20";
}

function ehDespesaTributoAutomatica(t) {
  return t.tipo === "Despesa" && (t.id.startsWith("imposto_") || t.id.startsWith("inss_"));
}

// Mantém em dia as despesas automáticas: o INSS do pró-labore vence dia 20 do mês seguinte e o
// imposto de cada mês de nota (a partir de IMPOSTO_AUTO_DESDE) é % x notas emitidas, vencendo dia 20
// do mês seguinte. Despesas já pagas nunca são alteradas. Idempotente: sem mudança, devolve a mesma lista.
function reconciliarAutomaticos(list, pctImposto, pctInss) {
  let mudou = false;
  let out = list.map((t) => {
    if (t.tipo !== "Despesa" || !t.id.startsWith("inss_") || t.statusPagamento === "Pago") return t;
    const data = vencimentoTributosDoMes(t.id.slice(5));
    if (t.data === data) return t;
    mudou = true;
    return { ...t, data };
  });
  const pctI = parseFloat(pctInss) || 0;
  // A base do INSS é a soma de TODOS os pró-labores que vencem no mês (fixos ou variáveis).
  const mesesProLabore = new Set(out.filter(ehProLabore).map((t) => mesRef(t.data)).filter((m) => m >= IMPOSTO_AUTO_DESDE));
  mesesProLabore.forEach((mes) => {
    const id = "inss_" + mes;
    const existente = out.find((t) => t.id === id);
    if (existente && existente.statusPagamento === "Pago") return;
    const valor = Math.round(proLaboreTotalDoMes(out, mes) * pctI) / 100;
    if (valor <= 0) {
      if (existente) {
        out = out.filter((t) => t.id !== id);
        mudou = true;
      }
      return;
    }
    const dados = { descricao: "INSS " + mesLabel(mes), categoria: "INSS", natureza: "Fixa", valor: String(valor), data: vencimentoTributosDoMes(mes) };
    if (!existente) {
      out = [{ ...emptyTransacao("Despesa"), id, ...dados, statusPagamento: "Pendente" }, ...out];
      mudou = true;
    } else if (existente.data !== dados.data || Math.abs((parseFloat(existente.valor) || 0) - valor) > 0.001) {
      out = out.map((t) => (t.id === id ? { ...t, ...dados } : t));
      mudou = true;
    }
  });
  const pct = parseFloat(pctImposto) || 0;
  const meses = new Set(
    out.filter(receitaFaturada).map((t) => mesRef(t.dataNotaEmitida)).filter((m) => m >= IMPOSTO_AUTO_DESDE)
  );
  out.filter((t) => t.tipo === "Despesa" && t.id.startsWith("imposto_")).forEach((t) => meses.add(t.id.slice(8)));
  meses.forEach((mes) => {
    const id = "imposto_" + mes;
    const existente = out.find((t) => t.id === id);
    if (existente && existente.statusPagamento === "Pago") return;
    const valor = Math.round(faturadoDoMes(out, mes) * pct) / 100;
    if (valor <= 0) {
      if (existente) {
        out = out.filter((t) => t.id !== id);
        mudou = true;
      }
      return;
    }
    const dados = {
      descricao: "Imposto — notas de " + mesLabel(mes),
      categoria: CATEGORIA_IMPOSTO,
      natureza: "Variável",
      valor: String(valor),
      data: vencimentoTributosDoMes(mes),
    };
    if (!existente) {
      out = [{ ...emptyTransacao("Despesa"), id, ...dados, statusPagamento: "Pendente" }, ...out];
      mudou = true;
    } else if (existente.data !== dados.data || Math.abs((parseFloat(existente.valor) || 0) - valor) > 0.001 || existente.descricao !== dados.descricao) {
      out = out.map((t) => (t.id === id ? { ...t, ...dados } : t));
      mudou = true;
    }
  });
  return { list: mudou ? out : list, mudou };
}

function demandaPeso(d) {
  return d.itens && d.itens.length > 0 ? d.itens.length : 1;
}

function corStatusVideo(v, coresStatus) {
  if (v.status === "Não iniciado") return null;
  return corDoStatusComMapa(coresStatus, "video", v.status);
}

function linkWhatsApp(telefone) {
  const digitos = (telefone || "").replace(/\D/g, "");
  if (!digitos) return "";
  const comDDI = digitos.length <= 11 ? "55" + digitos : digitos;
  return "https://wa.me/" + comDDI;
}

const FOLLOWUP_DIAS = 7;
const MESES_RESERVA_IDEAL = 6;

function diasDesde(dataISO) {
  if (!dataISO) return 0;
  const today = new Date(todayISO() + "T00:00:00");
  const d = new Date(dataISO + "T00:00:00");
  return Math.round((today - d) / 86400000);
}

function precisaFollowUp(p) {
  return p.status === "Pendente" && diasDesde(p.dataGeracao) >= FOLLOWUP_DIAS;
}

function StatsCarousel({ panels }) {
  const [index, setIndex] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dragStartX = useRef(0);
  const trackRef = useRef(null);

  useEffect(() => {
    if (dragging || panels.length <= 1) return;
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % panels.length);
    }, 7000);
    return () => clearInterval(timer);
  }, [dragging, index, panels.length]);

  useEffect(() => {
    if (index >= panels.length) setIndex(0);
  }, [panels.length, index]);

  function onPointerDown(e) {
    setDragging(true);
    dragStartX.current = e.clientX;
    if (trackRef.current) trackRef.current.setPointerCapture(e.pointerId);
  }
  function onPointerMove(e) {
    if (!dragging) return;
    setDragOffset(e.clientX - dragStartX.current);
  }
  function endDrag() {
    if (!dragging) return;
    const width = trackRef.current ? trackRef.current.offsetWidth / panels.length : 300;
    const threshold = width * 0.18;
    if (dragOffset < -threshold) setIndex((i) => Math.min(i + 1, panels.length - 1));
    else if (dragOffset > threshold) setIndex((i) => Math.max(i - 1, 0));
    setDragging(false);
    setDragOffset(0);
  }

  return (
    <div className="carousel">
      <div
        className="carousel-viewport"
        ref={trackRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
        onPointerCancel={endDrag}
      >
        <div
          className={"carousel-track" + (dragging ? " dragging" : "")}
          style={{ transform: `translateX(calc(-${index * 100}% + ${dragOffset}px))` }}
        >
          {panels.map((p) => (
            <div className="carousel-slide" key={p.key}>
              {p.content}
            </div>
          ))}
        </div>
      </div>
      <div className="carousel-dots">
        {panels.map((p, i) => (
          <button
            key={p.key}
            className={"carousel-dot" + (i === index ? " active" : "")}
            onClick={() => setIndex(i)}
            aria-label={p.label}
            title={p.label}
          />
        ))}
      </div>
    </div>
  );
}

const DAY_LABELS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const DAY_LABELS_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MESES_LONGOS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const MONTH_LABELS_SHORT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function sundayOfWeek(iso) {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().slice(0, 10);
}
function addDaysISO(iso, n) {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}
function fmtDiaMes(iso) {
  const d = new Date(iso + "T00:00:00");
  return d.getDate() + " " + MONTH_LABELS_SHORT[d.getMonth()];
}

function FilterMenu({ id, openId, setOpenId, activeCount = 0, align = "left", children }) {
  const open = openId === id;
  return (
    <div className="filter-menu">
      <button
        type="button"
        className={"filter-menu-btn" + (activeCount > 0 ? " has-active" : "")}
        onClick={(e) => { e.stopPropagation(); setOpenId(open ? null : id); }}
        title="Filtros"
      >
        <Filter size={14} />
        {activeCount > 0 && <span className="filter-menu-badge">{activeCount}</span>}
      </button>
      {open && (
        <div className={"filter-menu-popover" + (align === "right" ? " align-right" : "")} onClick={(e) => e.stopPropagation()}>
          {children}
        </div>
      )}
    </div>
  );
}


function GoalGauge({ pct, size = 128, label, sublabel }) {
  const stroke = 11;
  const r = size / 2 - stroke;
  const circumference = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, pct));
  const offset = circumference * (1 - clamped / 100);
  const over = pct >= 100;
  return (
    <div className="gauge-wrap">
      <svg width={size} height={size} viewBox={"0 0 " + size + " " + size}>
        <circle cx={size / 2} cy={size / 2} r={r} className="gauge-track" fill="none" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          className={"gauge-fill" + (over ? " over" : "")}
          fill="none"
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={"rotate(-90 " + size / 2 + " " + size / 2 + ")"}
        />
        <text x="50%" y="47%" textAnchor="middle" dy="0.35em" className="gauge-pct">{pct.toFixed(0)}%</text>
        {sublabel && <text x="50%" y="66%" textAnchor="middle" className="gauge-sublabel">{sublabel}</text>}
      </svg>
      {label && <div className="gauge-label">{label}</div>}
    </div>
  );
}

function FinanceChart({ data }) {
  const width = 680;
  const height = 320;
  const padding = { top: 24, right: 16, bottom: 34, left: 60 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;
  const n = Math.max(data.length, 1);
  const groupW = chartW / n;
  const barGap = 4;
  const barW = Math.min(30, (groupW - barGap * 4) / 3);

  const allVals = data.flatMap((d) => [d.faturado, d.totalDespesas, d.meta || 0, d.margem]);
  const maxVal = Math.max(1, ...allVals);
  const minVal = Math.min(0, ...allVals);
  const range = maxVal - minVal || 1;
  const scaleY = (v) => padding.top + chartH - ((v - minVal) / range) * chartH;
  const zeroY = scaleY(0);

  const fmtK = (v) => {
    if (Math.abs(v) >= 1000) return (v / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + "k";
    return v.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
  };

  const ticks = 4;
  const tickVals = Array.from({ length: ticks + 1 }, (_, i) => minVal + (range * i) / ticks);

  return (
    <svg viewBox={"0 0 " + width + " " + height} className="finance-chart-svg" preserveAspectRatio="xMidYMid meet">
      {tickVals.map((v, i) => (
        <g key={i}>
          <line x1={padding.left} x2={width - padding.right} y1={scaleY(v)} y2={scaleY(v)} className="chart-gridline" />
          <text x={padding.left - 8} y={scaleY(v) + 3} textAnchor="end" className="chart-axis-label">{fmtK(v)}</text>
        </g>
      ))}
      <line x1={padding.left} x2={width - padding.right} y1={zeroY} y2={zeroY} className="chart-zeroline" />

      {data.map((d, i) => {
        const gx = padding.left + groupW * i;
        const cx = gx + groupW / 2;
        const x1 = cx - barW * 1.5 - barGap;
        const x2 = cx - barW / 2;
        const x3 = cx + barW / 2 + barGap;
        const margemPositiva = d.margem >= 0;
        return (
          <g key={d.mes}>
            {d.meta > 0 && (
              <line
                x1={x1 - 2} x2={x3 + barW + 2} y1={scaleY(d.meta)} y2={scaleY(d.meta)}
                className="chart-tick-meta"
              >
                <title>{"Meta " + mesLabel(d.mes) + ": R$ " + d.meta.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</title>
              </line>
            )}
            <rect
              x={x1} y={Math.min(scaleY(d.faturado), zeroY)} width={barW}
              height={Math.max(1, Math.abs(zeroY - scaleY(d.faturado)))}
              className="chart-bar-receita" rx="2"
            >
              <title>{"Faturado " + mesLabel(d.mes) + ": R$ " + d.faturado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</title>
            </rect>
            <rect
              x={x2} y={Math.min(scaleY(d.totalDespesas), zeroY)} width={barW}
              height={Math.max(1, Math.abs(zeroY - scaleY(d.totalDespesas)))}
              className="chart-bar-despesa" rx="2"
            >
              <title>{"Despesas " + mesLabel(d.mes) + ": R$ " + d.totalDespesas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</title>
            </rect>
            <rect
              x={x3} y={Math.min(scaleY(d.margem), zeroY)} width={barW}
              height={Math.max(1, Math.abs(zeroY - scaleY(d.margem)))}
              className={"chart-bar-margem" + (margemPositiva ? "" : " negativa")} rx="2"
            >
              <title>{"Margem " + mesLabel(d.mes) + ": R$ " + d.margem.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</title>
            </rect>
            <text x={cx} y={height - padding.bottom + 20} textAnchor="middle" className="chart-axis-label">{mesLabel(d.mes)}</text>
          </g>
        );
      })}
    </svg>
  );
}

function ReportSection({ title, subtitle, defaultOpen, children }) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <div className="report-section">
      <button className="report-section-head" onClick={() => setOpen(!open)}>
        <span className="report-section-titles">
          <span className="report-section-title">{title}</span>
          {subtitle && <span className="report-section-subtitle">{subtitle}</span>}
        </span>
        <ChevronRight size={16} className={"report-section-chevron" + (open ? " open" : "")} />
      </button>
      {open && <div className="report-section-body">{children}</div>}
    </div>
  );
}

function isImagemArquivo(nome) {
  return /\.(png|jpe?g|gif|webp|svg)$/i.test(nome || "");
}

function ProcessoImagePreview({ doc, cache }) {
  const [url, setUrl] = useState(cache.current.get(doc.id) || null);
  useEffect(() => {
    if (url || !doc.arquivoPath) return;
    let ativo = true;
    api
      .downloadProcessoArquivo(doc.arquivoPath)
      .then((blob) => {
        if (!ativo) return;
        const objUrl = URL.createObjectURL(blob);
        cache.current.set(doc.id, objUrl);
        setUrl(objUrl);
      })
      .catch((e) => console.error("Falha ao carregar preview", e));
    return () => {
      ativo = false;
    };
  }, [doc.id, doc.arquivoPath]);
  if (!url) return <div className="processo-img-loading">Carregando imagem…</div>;
  return <img src={url} alt={doc.titulo} className="processo-img-preview" />;
}

function buildMonthGrid(mesISO) {
  const firstOfMonth = mesISO + "-01";
  const firstWeekday = new Date(firstOfMonth + "T00:00:00").getDay();
  const gridStart = addDaysISO(firstOfMonth, -firstWeekday);
  const [y, m] = mesISO.split("-").map(Number);
  const totalDiasMes = new Date(y, m, 0).getDate();
  const lastOfMonth = mesISO + "-" + String(totalDiasMes).padStart(2, "0");
  const lastWeekday = new Date(lastOfMonth + "T00:00:00").getDay();
  const gridEnd = addDaysISO(lastOfMonth, 6 - lastWeekday);
  const dias = [];
  let cursor = gridStart;
  while (cursor <= gridEnd) {
    dias.push(cursor);
    cursor = addDaysISO(cursor, 1);
  }
  return dias;
}

function AgendaBoard({ token, calendarId, onTokenExpired }) {
  const [modo, setModo] = useState("semana");
  const [weekAnchor, setWeekAnchor] = useState(todayISO());
  const [monthAnchorAgenda, setMonthAnchorAgenda] = useState(mesRef(todayISO()));
  const [eventos, setEventos] = useState([]);
  const [loadingEventos, setLoadingEventos] = useState(false);
  const [eventoForm, setEventoForm] = useState(null);
  const [confirmDeleteEvento, setConfirmDeleteEvento] = useState(null);
  const [erro, setErro] = useState("");

  const sunday = sundayOfWeek(weekAnchor);
  const weekDates = useMemo(() => Array.from({ length: 7 }, (_, i) => addDaysISO(sunday, i)), [sunday]);
  const monthDates = useMemo(() => buildMonthGrid(monthAnchorAgenda), [monthAnchorAgenda]);
  const visibleDates = modo === "semana" ? weekDates : monthDates;
  const today = todayISO();

  const eventosPorDia = useMemo(() => {
    const map = new Map();
    for (const ev of eventos) {
      const d = (ev.start?.dateTime || ev.start?.date || "").slice(0, 10);
      if (!map.has(d)) map.set(d, []);
      map.get(d).push(ev);
    }
    for (const arr of map.values()) arr.sort((a, b) => (a.start?.dateTime || "").localeCompare(b.start?.dateTime || ""));
    return map;
  }, [eventos]);

  async function carregarEventos(datas) {
    if (!token || !calendarId || !datas.length) return;
    setLoadingEventos(true);
    setErro("");
    try {
      const timeMin = new Date(datas[0] + "T00:00:00").toISOString();
      const timeMax = new Date(addDaysISO(datas[datas.length - 1], 1) + "T00:00:00").toISOString();
      const items = await googleCal.listEvents(token, calendarId, timeMin, timeMax);
      setEventos(items);
    } catch (e) {
      console.error("Falha ao carregar eventos", e);
      if (e.status === 401) onTokenExpired();
      else setErro(e.message || "Falha ao carregar eventos do Google Agenda.");
    } finally {
      setLoadingEventos(false);
    }
  }

  useEffect(() => {
    carregarEventos(visibleDates);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, calendarId, modo, sunday, monthAnchorAgenda]);

  async function salvarEvento(form) {
    try {
      const body = googleCal.formToGoogleEvent(form);
      if (form.id) await googleCal.updateEvent(token, calendarId, form.id, body);
      else await googleCal.createEvent(token, calendarId, body);
      setEventoForm(null);
      carregarEventos(visibleDates);
    } catch (e) {
      console.error("Falha ao salvar compromisso", e);
      if (e.status === 401) onTokenExpired();
      else setErro(e.message || "Falha ao salvar compromisso.");
    }
  }

  async function excluirEvento(id) {
    try {
      await googleCal.deleteEvent(token, calendarId, id);
      setConfirmDeleteEvento(null);
      carregarEventos(visibleDates);
    } catch (e) {
      console.error("Falha ao excluir compromisso", e);
      if (e.status === 401) onTokenExpired();
      else setErro(e.message || "Falha ao excluir compromisso.");
    }
  }

  function novoEventoEm(date) {
    setEventoForm({ titulo: "", data: date, horaInicio: "09:00", horaFim: "10:00", local: "", descricao: "" });
  }

  function irParaAnterior() {
    if (modo === "semana") setWeekAnchor(addDaysISO(sunday, -7));
    else setMonthAnchorAgenda(addMonthsISO(monthAnchorAgenda, -1));
  }
  function irParaProximo() {
    if (modo === "semana") setWeekAnchor(addDaysISO(sunday, 7));
    else setMonthAnchorAgenda(addMonthsISO(monthAnchorAgenda, 1));
  }
  function irParaHoje() {
    setWeekAnchor(today);
    setMonthAnchorAgenda(mesRef(today));
  }

  return (
    <div className="kanban">
      <div className="kanban-header">
        <button className="icon-btn" onClick={irParaAnterior}><ChevronLeft size={14} /></button>
        <div className="kanban-range">
          {modo === "semana" ? fmtDiaMes(weekDates[0]) + " — " + fmtDiaMes(weekDates[6]) : mesLabel(monthAnchorAgenda)}
        </div>
        <button className="icon-btn" onClick={irParaProximo}><ChevronRight size={14} /></button>
        <button className="btn-ghost kanban-today-btn" onClick={irParaHoje}>Hoje</button>
        <div className="agenda-modo-toggle">
          <button className={"btn-ghost" + (modo === "semana" ? " active" : "")} onClick={() => setModo("semana")}>Semana</button>
          <button className={"btn-ghost" + (modo === "mes" ? " active" : "")} onClick={() => setModo("mes")}>Mês</button>
        </div>
        {loadingEventos && <span className="lock-note" style={{ marginLeft: 10 }}>Carregando…</span>}
      </div>
      {erro && <div className="empty" style={{ color: "var(--red)" }}>{erro}</div>}

      {modo === "semana" ? (
        <div className="kanban-board">
          {weekDates.map((date, i) => {
            const dayEventos = eventosPorDia.get(date) || [];
            const isToday = date === today;
            return (
              <div key={date} className={"kanban-col" + (isToday ? " today" : "")}>
                <div className="kanban-col-header">
                  <span className="kanban-col-day">{DAY_LABELS_SHORT[i]}</span>
                  <span className="kanban-col-date">{fmtDiaMes(date)}</span>
                </div>
                <div className="kanban-col-body">
                  {dayEventos.map((ev) => {
                    const horaIni = (ev.start?.dateTime || "").slice(11, 16);
                    return (
                      <div key={ev.id} className="kanban-card" onClick={() => setEventoForm(googleCal.googleEventToForm(ev))}>
                        <span className="kanban-card-title">
                          {horaIni && <span className="mono" style={{ marginRight: 6, fontSize: 11, color: "var(--text-dim)" }}>{horaIni}</span>}
                          {ev.summary || "(sem título)"}
                        </span>
                        <button className="kanban-card-del" onClick={(e) => { e.stopPropagation(); setConfirmDeleteEvento(ev); }}>
                          <X size={12} />
                        </button>
                      </div>
                    );
                  })}
                  <button className="kanban-add-btn" onClick={() => novoEventoEm(date)}>
                    <Plus size={12} /> adicionar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="agenda-month-grid">
          {DAY_LABELS_SHORT.map((d) => (
            <div key={d} className="agenda-month-weekday">{d}</div>
          ))}
          {monthDates.map((date) => {
            const inMonth = date.slice(0, 7) === monthAnchorAgenda;
            const dayEventos = eventosPorDia.get(date) || [];
            const isToday = date === today;
            const visiveis = dayEventos.slice(0, 3);
            return (
              <div
                key={date}
                className={"agenda-month-day" + (inMonth ? "" : " outside") + (isToday ? " today" : "")}
                onClick={() => novoEventoEm(date)}
              >
                <div className="agenda-month-day-num">{Number(date.slice(8, 10))}</div>
                {visiveis.map((ev) => (
                  <div
                    key={ev.id}
                    className="agenda-month-event-chip"
                    onClick={(e) => { e.stopPropagation(); setEventoForm(googleCal.googleEventToForm(ev)); }}
                  >
                    {ev.summary || "(sem título)"}
                  </div>
                ))}
                {dayEventos.length > 3 && <div className="agenda-month-more">+{dayEventos.length - 3} mais</div>}
              </div>
            );
          })}
        </div>
      )}

      {eventoForm && (
        <div className="overlay" onClick={() => setEventoForm(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>
              {eventoForm.id ? "Editar compromisso" : "Novo compromisso"}
              <X size={18} style={{ cursor: "pointer" }} onClick={() => setEventoForm(null)} />
            </h3>
            <div className="field">
              <label>Título</label>
              <input value={eventoForm.titulo} onChange={(e) => setEventoForm({ ...eventoForm, titulo: e.target.value })} />
            </div>
            <div className="field">
              <label>Data</label>
              <input type="date" value={eventoForm.data} onChange={(e) => setEventoForm({ ...eventoForm, data: e.target.value })} />
            </div>
            <div className="grid2">
              <div className="field">
                <label>Início</label>
                <input type="time" value={eventoForm.horaInicio} onChange={(e) => setEventoForm({ ...eventoForm, horaInicio: e.target.value })} />
              </div>
              <div className="field">
                <label>Fim</label>
                <input type="time" value={eventoForm.horaFim} onChange={(e) => setEventoForm({ ...eventoForm, horaFim: e.target.value })} />
              </div>
            </div>
            <div className="field">
              <label>Local</label>
              <input value={eventoForm.local} onChange={(e) => setEventoForm({ ...eventoForm, local: e.target.value })} />
            </div>
            <div className="field">
              <label>Descrição</label>
              <textarea value={eventoForm.descricao} onChange={(e) => setEventoForm({ ...eventoForm, descricao: e.target.value })} />
            </div>
            <div className="modal-actions">
              <button className="btn-ghost" onClick={() => setEventoForm(null)}>Cancelar</button>
              <button className="btn-primary" style={{ marginLeft: 0 }} onClick={() => salvarEvento(eventoForm)}>Salvar</button>
            </div>
          </div>
        </div>
      )}

      {confirmDeleteEvento && (
        <div className="overlay" onClick={() => setConfirmDeleteEvento(null)}>
          <div className="modal" style={{ width: 380 }} onClick={(e) => e.stopPropagation()}>
            <h3>Excluir compromisso <AlertTriangle size={18} color="var(--red)" /></h3>
            <p style={{ fontSize: 13.5, color: "var(--text-dim)" }}>
              Tem certeza que quer excluir "{confirmDeleteEvento.summary || "sem título"}"? Essa ação não pode ser desfeita.
            </p>
            <div className="modal-actions">
              <button className="btn-ghost" onClick={() => setConfirmDeleteEvento(null)}>Cancelar</button>
              <button className="btn-danger" onClick={() => excluirEvento(confirmDeleteEvento.id)}>Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function KanbanBoard({ tasks, clients, onAdd, onToggle, onDelete, onMove, onUpdate }) {
  const [weekAnchor, setWeekAnchor] = useState(todayISO());
  const [addingDay, setAddingDay] = useState(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [dragOverDay, setDragOverDay] = useState(null);
  const [detailTask, setDetailTask] = useState(null);
  const [copyLabel, setCopyLabel] = useState("Copiar texto");

  const sunday = sundayOfWeek(weekAnchor);
  const weekDates = useMemo(() => Array.from({ length: 7 }, (_, i) => addDaysISO(sunday, i)), [sunday]);
  const today = todayISO();

  function confirmAdd(date) {
    if (draftTitle.trim()) onAdd(date, draftTitle);
    setDraftTitle("");
    setAddingDay(null);
  }

  function handleDrop(e, date) {
    e.preventDefault();
    setDragOverDay(null);
    const id = e.dataTransfer.getData("text/plain");
    if (id) onMove(id, date);
  }

  function openDetail(t) {
    setDetailTask({ ...t, notas: t.notas || "" });
    setCopyLabel("Copiar texto");
  }

  function saveDetail() {
    onUpdate(detailTask.id, { titulo: detailTask.titulo, notas: detailTask.notas });
    setDetailTask(null);
  }

  function copyNotas() {
    const text = detailTask.notas || "";
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        () => { setCopyLabel("Copiado!"); setTimeout(() => setCopyLabel("Copiar texto"), 1600); },
        () => setCopyLabel("Não foi possível copiar")
      );
    }
  }

  return (
    <div className="kanban">
      <div className="kanban-header">
        <button className="icon-btn" onClick={() => setWeekAnchor(addDaysISO(sunday, -7))}><ChevronLeft size={14} /></button>
        <div className="kanban-range">{fmtDiaMes(weekDates[0])} — {fmtDiaMes(weekDates[6])}</div>
        <button className="icon-btn" onClick={() => setWeekAnchor(addDaysISO(sunday, 7))}><ChevronRight size={14} /></button>
        <button className="btn-ghost kanban-today-btn" onClick={() => setWeekAnchor(today)}>Hoje</button>
      </div>
      {(() => {
        const notasNaoDirecionadas = tasks.filter((t) => !t.data);
        return (
          <div
            className={"kanban-inbox-bar" + (dragOverDay === "" ? " drag-over" : "")}
            onDragOver={(e) => { e.preventDefault(); setDragOverDay(""); }}
            onDragLeave={() => setDragOverDay((d) => (d === "" ? null : d))}
            onDrop={(e) => handleDrop(e, "")}
          >
            <span className="kanban-inbox-label"><StickyNote size={13} /> Notas rápidas</span>
            <div className="kanban-inbox-chips">
              {notasNaoDirecionadas.map((t) => (
                <div
                  key={t.id}
                  className={"kanban-chip" + (t.concluida ? " done" : "")}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("text/plain", t.id)}
                  onClick={() => openDetail(t)}
                >
                  <GripVertical size={11} className="kanban-chip-grip" onClick={(e) => e.stopPropagation()} />
                  <input
                    type="checkbox"
                    checked={t.concluida}
                    onClick={(e) => e.stopPropagation()}
                    onChange={() => onToggle(t.id)}
                  />
                  <span className="kanban-chip-title">{t.titulo}</span>
                  <button
                    className="kanban-chip-del"
                    onClick={(e) => { e.stopPropagation(); onDelete(t.id); }}
                  >
                    <X size={11} />
                  </button>
                </div>
              ))}
              {addingDay === "" ? (
                <input
                  className="kanban-inbox-input"
                  autoFocus
                  value={draftTitle}
                  onChange={(e) => setDraftTitle(e.target.value)}
                  placeholder="Nova nota…"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") confirmAdd("");
                    if (e.key === "Escape") { setAddingDay(null); setDraftTitle(""); }
                  }}
                  onBlur={() => confirmAdd("")}
                />
              ) : (
                <button className="kanban-chip-add" onClick={() => { setAddingDay(""); setDraftTitle(""); }}>
                  <Plus size={12} /> nota
                </button>
              )}
            </div>
          </div>
        );
      })()}
      {(() => {
        const sundayAtual = sundayOfWeek(today);
        const pendencias = tasks.filter((t) => !t.concluida && t.data && t.data < sundayAtual);
        if (pendencias.length === 0) return null;
        return (
          <div className="kanban-inbox-bar pendencias">
            <span className="kanban-inbox-label"><AlertTriangle size={13} /> Pendências</span>
            <div className="kanban-inbox-chips">
              {pendencias.map((t) => (
                <div
                  key={t.id}
                  className="kanban-chip"
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("text/plain", t.id)}
                  onClick={() => openDetail(t)}
                >
                  <GripVertical size={11} className="kanban-chip-grip" onClick={(e) => e.stopPropagation()} />
                  <input
                    type="checkbox"
                    checked={t.concluida}
                    onClick={(e) => e.stopPropagation()}
                    onChange={() => onToggle(t.id)}
                  />
                  <span className="kanban-chip-title">{t.titulo}</span>
                  <span className="kanban-chip-date">{fmtDiaMes(t.data)}</span>
                  <button
                    className="kanban-chip-del"
                    onClick={(e) => { e.stopPropagation(); onDelete(t.id); }}
                  >
                    <X size={11} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      })()}
      <div className="kanban-board">
        {weekDates.map((date, i) => {
          const dayTasks = tasks.filter((t) => t.data === date);
          const isToday = date === today;
          return (
            <div
              key={date}
              className={"kanban-col" + (isToday ? " today" : "") + (dragOverDay === date ? " drag-over" : "")}
              onDragOver={(e) => { e.preventDefault(); setDragOverDay(date); }}
              onDragLeave={() => setDragOverDay((d) => (d === date ? null : d))}
              onDrop={(e) => handleDrop(e, date)}
            >
              <div className="kanban-col-header">
                <span className="kanban-col-day">{DAY_LABELS_SHORT[i]}</span>
                <span className="kanban-col-date">{fmtDiaMes(date)}</span>
              </div>
              <div className="kanban-col-body">
                {dayTasks.map((t) => (
                  <div
                    key={t.id}
                    className={"kanban-card" + (t.concluida ? " done" : "")}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData("text/plain", t.id)}
                    onClick={() => openDetail(t)}
                  >
                    <GripVertical size={12} className="kanban-card-grip" onClick={(e) => e.stopPropagation()} />
                    <input
                      type="checkbox"
                      checked={t.concluida}
                      onClick={(e) => e.stopPropagation()}
                      onChange={() => onToggle(t.id)}
                    />
                    <span className="kanban-card-title">
                      {t.titulo}
                      {t.notas && <FileText size={11} className="kanban-card-note-icon" />}
                    </span>
                    <button
                      className="kanban-card-del"
                      onClick={(e) => { e.stopPropagation(); onDelete(t.id); }}
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
                {addingDay === date ? (
                  <div className="kanban-add-form">
                    <input
                      autoFocus
                      value={draftTitle}
                      onChange={(e) => setDraftTitle(e.target.value)}
                      placeholder="Nova atividade…"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") confirmAdd(date);
                        if (e.key === "Escape") { setAddingDay(null); setDraftTitle(""); }
                      }}
                      onBlur={() => confirmAdd(date)}
                    />
                  </div>
                ) : (
                  <button className="kanban-add-btn" onClick={() => { setAddingDay(date); setDraftTitle(""); }}>
                    <Plus size={12} /> adicionar
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {detailTask && (
        <div className="overlay" onClick={() => setDetailTask(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>
              Atividade
              <X size={18} style={{ cursor: "pointer" }} onClick={() => setDetailTask(null)} />
            </h3>
            <div className="field">
              <label>Título</label>
              <input
                value={detailTask.titulo}
                onChange={(e) => setDetailTask({ ...detailTask, titulo: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Texto / mensagem (opcional — deixe pronto para copiar depois)</label>
              <textarea
                className="kanban-notas-textarea"
                value={detailTask.notas}
                onChange={(e) => setDetailTask({ ...detailTask, notas: e.target.value })}
                placeholder="Ex: mensagem pronta para enviar ao cliente…"
              />
              {detailTask.notas && (
                <button className="btn-ghost kanban-copy-btn" onClick={copyNotas}>{copyLabel}</button>
              )}
            </div>
            <div className="modal-actions" style={{ justifyContent: "space-between" }}>
              <button
                className="btn-danger"
                onClick={() => { onDelete(detailTask.id); setDetailTask(null); }}
              >
                Excluir
              </button>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn-ghost" onClick={() => setDetailTask(null)}>Cancelar</button>
                <button className="btn-primary" style={{ marginLeft: 0 }} onClick={saveDetail}>Salvar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const GOOGLE_TOKEN_STORAGE_KEY = "fuzz_google_token";

function loadStoredGoogleToken() {
  try {
    const raw = sessionStorage.getItem(GOOGLE_TOKEN_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed.accessToken || !parsed.expiresAt || parsed.expiresAt <= Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveStoredGoogleToken(accessToken, expiresAt) {
  try {
    sessionStorage.setItem(GOOGLE_TOKEN_STORAGE_KEY, JSON.stringify({ accessToken, expiresAt }));
  } catch {
    // sessionStorage indisponível (ex: modo privado) — segue só em memória
  }
}

function clearStoredGoogleToken() {
  try {
    sessionStorage.removeItem(GOOGLE_TOKEN_STORAGE_KEY);
  } catch {
    // ignora
  }
}

export default function App() {
  const [tab, setTab] = useState("inicio");
  const [loading, setLoading] = useState(true);
  const [demands, setDemands] = useState([]);
  const [clients, setClients] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [transacoes, setTransacoes] = useState([]);
  const [notasReuniao, setNotasReuniao] = useState([]);
  const [contratosGerados, setContratosGerados] = useState([]);
  const [tiposProducao, setTiposProducao] = useState(DEFAULT_TIPOS);
  const [tiposReceita, setTiposReceita] = useState(DEFAULT_TIPOS_RECEITA);
  const [categoriasEquipamento, setCategoriasEquipamento] = useState(DEFAULT_CATEGORIAS_EQUIP);
  const [coresStatus, setCoresStatus] = useState({});
  const [statusDemandas, setStatusDemandas] = useState([]);
  const [kanbanTasks, setKanbanTasks] = useState([]);
  const [quickNoteInput, setQuickNoteInput] = useState("");
  const [demandForm, setDemandForm] = useState(null);
  const [clientForm, setClientForm] = useState(null);
  const [capaUploading, setCapaUploading] = useState(false);
  const [transacaoForm, setTransacaoForm] = useState(null);
  const [retiradaReservaForm, setRetiradaReservaForm] = useState(null);
  const [notaReuniaoForm, setNotaReuniaoForm] = useState(null);
  const [notaReuniaoFiltroCliente, setNotaReuniaoFiltroCliente] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [filterCliente, setFilterCliente] = useState("");
  const [demandTipoFilter, setDemandTipoFilter] = useState("");
  const [demandStatusFilter, setDemandStatusFilter] = useState("");
  const [demandDataInicio, setDemandDataInicio] = useState("");
  const [demandDataFim, setDemandDataFim] = useState("");
  const [draggedDemandId, setDraggedDemandId] = useState(null);
  const [demandSortKey, setDemandSortKey] = useState(null);
  const [demandSortDir, setDemandSortDir] = useState("asc");
  const [proposalClienteFilter, setProposalClienteFilter] = useState("");
  const [proposalStatusFilter, setProposalStatusFilter] = useState("Pendente");
  const [proposalValorSort, setProposalValorSort] = useState(null);
  const [clientView, setClientView] = useState("grade");
  const [clientViewInfo, setClientViewInfo] = useState(null);
  const [clientArquivos, setClientArquivos] = useState([]);
  const [mostrarClientesRascunho, setMostrarClientesRascunho] = useState(false);
  const [expandedDemands, setExpandedDemands] = useState(() => new Set());
  const [mostrarFinalizadas, setMostrarFinalizadas] = useState(false);
  const [draggedVideoId, setDraggedVideoId] = useState(null);
  const [mostrarVideosAprovados, setMostrarVideosAprovados] = useState(false);
  const [relatorioMes, setRelatorioMes] = useState(() => mesRef(todayISO()));
  const [relatorioEntregasAberto, setRelatorioEntregasAberto] = useState(false);
  const [relatorioDemandaClienteFiltro, setRelatorioDemandaClienteFiltro] = useState("");
  const [relatorioDemandaTipoFiltro, setRelatorioDemandaTipoFiltro] = useState("");
  const [financeClienteFilter, setFinanceClienteFilter] = useState("");
  const [despesasPagasOcultas, setDespesasPagasOcultas] = useState(() => {
    try { return localStorage.getItem("fin_despesas_pagas_ocultas") === "1"; } catch { return false; }
  });
  const [monthAnchor, setMonthAnchor] = useState(mesRef(todayISO()));
  const [parcelasInput, setParcelasInput] = useState(1);
  const [repeticaoFreq, setRepeticaoFreq] = useState("mensal");
  const [metas, setMetas] = useState({});
  const [metasAnuais, setMetasAnuais] = useState({});
  const [metasClientesNovos, setMetasClientesNovos] = useState({});
  const [tags, setTags] = useState([]);
  const [openFilterMenu, setOpenFilterMenu] = useState(null);
  const [metaInputValue, setMetaInputValue] = useState("");
  const [metaAnualInputValue, setMetaAnualInputValue] = useState("");
  const [metaClientesInputValue, setMetaClientesInputValue] = useState("");
  const [parametrosFinanceiros, setParametrosFinanceiros] = useState({ pctImposto: 0, pctReserva: 0, pctInss: 11 });
  const parametrosFinanceirosRef = useRef(parametrosFinanceiros);
  parametrosFinanceirosRef.current = parametrosFinanceiros;
  const [pctImpostoInput, setPctImpostoInput] = useState("");
  const [pctReservaInput, setPctReservaInput] = useState("");
  const [pctInssInput, setPctInssInput] = useState("");
  const [proLaborePorMes, setProLaborePorMes] = useState({});
  const [proLaboreMesInput, setProLaboreMesInput] = useState("");

  useEffect(() => {
    setPctImpostoInput(parametrosFinanceiros.pctImposto ? String(parametrosFinanceiros.pctImposto) : "");
    setPctReservaInput(parametrosFinanceiros.pctReserva ? String(parametrosFinanceiros.pctReserva) : "");
    setPctInssInput(parametrosFinanceiros.pctInss != null ? String(parametrosFinanceiros.pctInss) : "");
  }, [parametrosFinanceiros]);

  useEffect(() => {
    setProLaboreMesInput(proLaborePorMes[monthAnchor] ? String(proLaborePorMes[monthAnchor]) : "");
  }, [monthAnchor, proLaborePorMes]);

  useEffect(() => {
    if (!clientViewInfo) {
      setClientArquivos([]);
      return;
    }
    let cancelado = false;
    api
      .listArquivosCliente(clientViewInfo.id)
      .then((lista) => {
        if (!cancelado) setClientArquivos(lista);
      })
      .catch((e) => console.error("Falha ao carregar arquivos do cliente", e));
    return () => {
      cancelado = true;
    };
  }, [clientViewInfo]);

  useEffect(() => {
    setMetaInputValue(metas[monthAnchor] ? String(metas[monthAnchor]) : "");
    setMetaClientesInputValue(metasClientesNovos[monthAnchor] ? String(metasClientesNovos[monthAnchor]) : "");
  }, [monthAnchor, metas, metasClientesNovos]);

  useEffect(() => {
    const ano = monthAnchor.slice(0, 4);
    setMetaAnualInputValue(metasAnuais[ano] ? String(metasAnuais[ano]) : "");
  }, [monthAnchor, metasAnuais]);
  const [novoTipoInput, setNovoTipoInput] = useState("");
  const [configSecaoAtiva, setConfigSecaoAtiva] = useState(null);
  const [equipeMembros, setEquipeMembros] = useState([]);
  const [equipeErro, setEquipeErro] = useState("");
  const [materiais, setMateriais] = useState([]);
  const [agendaCliente, setAgendaCliente] = useState([]);
  const [recadosRows, setRecadosRows] = useState([]);
  const [colabErro, setColabErro] = useState("");
  const [cronogramaAberto, setCronogramaAberto] = useState(null); // null | { clienteId } (cronograma de um cliente)
  const [tipoEditando, setTipoEditando] = useState(null);
  const [tipoEditValue, setTipoEditValue] = useState("");
  const [novoTipoReceitaInput, setNovoTipoReceitaInput] = useState("");
  const [tipoReceitaEditando, setTipoReceitaEditando] = useState(null);
  const [tipoReceitaEditValue, setTipoReceitaEditValue] = useState("");
  const [novaCategoriaDespesaInput, setNovaCategoriaDespesaInput] = useState("");
  const [categoriaDespesaEditando, setCategoriaDespesaEditando] = useState(null);
  const [categoriaDespesaEditValue, setCategoriaDespesaEditValue] = useState("");
  const [novoStatusDemandaInput, setNovoStatusDemandaInput] = useState("");
  const [statusDemandaEditando, setStatusDemandaEditando] = useState(null);
  const [statusDemandaEditValue, setStatusDemandaEditValue] = useState("");
  const [novaCategoriaEquipInput, setNovaCategoriaEquipInput] = useState("");
  const [categoriaEquipEditando, setCategoriaEquipEditando] = useState(null);
  const [categoriaEquipEditValue, setCategoriaEquipEditValue] = useState("");
  const [hideValues, setHideValues] = useState(false);
  const [railCollapsed, setRailCollapsed] = useState(() => {
    try {
      return localStorage.getItem("railCollapsed") === "1";
    } catch {
      return false;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem("railCollapsed", railCollapsed ? "1" : "0");
    } catch {
      // ignora — localStorage indisponível não deve quebrar o app
    }
  }, [railCollapsed]);
  const [dismissedNotifications, setDismissedNotifications] = useState(() => new Set());
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [equipamentos, setEquipamentos] = useState([]);
  const [equipamentoForm, setEquipamentoForm] = useState(null);
  const [equipFiltroCategoria, setEquipFiltroCategoria] = useState("");
  const [equipFiltroStatus, setEquipFiltroStatus] = useState("");
  const equipFileInputRef = useRef(null);
  const [processosCategorias, setProcessosCategorias] = useState([]);
  const [processosDocumentos, setProcessosDocumentos] = useState([]);
  const [processoForm, setProcessoForm] = useState(null);
  const [processoNovoArquivo, setProcessoNovoArquivo] = useState(null);
  const [novaCategoriaProcessoInput, setNovaCategoriaProcessoInput] = useState("");
  const [processoFiltroCategoria, setProcessoFiltroCategoria] = useState("");
  const processoPreviewUrls = useRef(new Map());
  const processoFileInputRef = useRef(null);
  const [googleToken, setGoogleToken] = useState(() => loadStoredGoogleToken()?.accessToken || null);
  const [googleCalendarId, setGoogleCalendarId] = useState(() => (loadStoredGoogleToken() ? "primary" : ""));
  const [googleConectando, setGoogleConectando] = useState(false);
  const [googleErro, setGoogleErro] = useState("");
  const [googleEventosHoje, setGoogleEventosHoje] = useState([]);
  const [googleEventosHojeCarregando, setGoogleEventosHojeCarregando] = useState(false);
  const contratoImportPendenteRef = useRef(null);

  const [search, setSearch] = useState("");
  const [toast, setToast] = useState(null);
  const clientsRef = useRef(clients);
  const demandsRef = useRef(demands);
  const proposalsRef = useRef(proposals);
  const transacoesRef = useRef(transacoes);
  const notasReuniaoRef = useRef(notasReuniao);
  const contratosGeradosRef = useRef(contratosGerados);
  const clientViewInfoRef = useRef(clientViewInfo);
  clientsRef.current = clients;
  demandsRef.current = demands;
  proposalsRef.current = proposals;
  transacoesRef.current = transacoes;
  notasReuniaoRef.current = notasReuniao;
  contratosGeradosRef.current = contratosGerados;
  clientViewInfoRef.current = clientViewInfo;

  useEffect(() => {
    (async () => {
      const load = (label, fn, setter, fallback) =>
        fn().catch(async (e) => {
          console.warn("Falha ao carregar " + label + ", tentando novamente…", e);
          await new Promise((r) => setTimeout(r, 700));
          return fn();
        }).then(setter, (e) => {
          console.error("Falha ao carregar " + label, e);
          setter(fallback);
        });
      await Promise.all([
        load("demandas", api.listDemandas, setDemands, []),
        carregarEquipe(),
        carregarColaboracao(),
        load("clientes", api.listClientes, setClients, []),
        load("propostas", api.listPropostas, setProposals, []),
        load("transações", api.listTransacoes, setTransacoes, []),
        load("notas de reunião", api.listNotasReuniao, setNotasReuniao, []),
        load("contratos salvos", api.listContratosGerados, setContratosGerados, []),
        load("tipos de produção", () => api.seedTiposProducaoSeVazio(DEFAULT_TIPOS), setTiposProducao, DEFAULT_TIPOS),
        load("tipos de receita", () => api.seedTiposReceitaSeVazio(DEFAULT_TIPOS_RECEITA), setTiposReceita, DEFAULT_TIPOS_RECEITA),
        load(
          "categorias de equipamento",
          () => api.seedCategoriasEquipamentoSeVazio(DEFAULT_CATEGORIAS_EQUIP),
          setCategoriasEquipamento,
          DEFAULT_CATEGORIAS_EQUIP
        ),
        load("cores de status", api.listCoresStatus, setCoresStatus, {}),
        load(
          "status de demandas",
          () => api.seedStatusDemandasSeVazio(DEFAULT_STATUS_DEMANDAS.map((s, i) => ({ id: "sd_" + i, ...s }))),
          setStatusDemandas,
          DEFAULT_STATUS_DEMANDAS.map((s, i) => ({ id: "sd_" + i, ...s }))
        ),
        load("tarefas do kanban", api.listKanbanTasks, setKanbanTasks, []),
        load("metas", api.listMetasMensais, setMetas, {}),
        load("metas anuais", api.listMetasAnuais, setMetasAnuais, {}),
        load("meta de clientes", api.listMetasClientesMensais, setMetasClientesNovos, {}),
        load("parâmetros financeiros", api.getParametrosFinanceiros, setParametrosFinanceiros, { pctImposto: 0, pctReserva: 0, pctInss: 11 }),
        load("pró-labore mensal", api.listProLaboreMensal, setProLaborePorMes, {}),
        load("tags", api.listTags, setTags, []),
        load("equipamentos", api.listEquipamentos, setEquipamentos, []),
        load(
          "categorias de processos",
          () => api.seedProcessosCategoriasSeVazio(DEFAULT_PROCESSOS_CATEGORIAS),
          setProcessosCategorias,
          DEFAULT_PROCESSOS_CATEGORIAS
        ),
        load("documentos de processos", api.listProcessosDocumentos, setProcessosDocumentos, []),
      ]);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    function computeProximoNumeroProposta() {
      let maior = 0;
      for (const p of proposalsRef.current) {
        const m = String(p.numero || "").match(/^(\d+)/);
        if (m) {
          const n = parseInt(m[1], 10);
          if (n > maior) maior = n;
        }
      }
      return String(maior + 1).padStart(3, "0");
    }

    function onMessage(ev) {
      if (!ev.data || !ev.data.type) return;
      if (ev.data.type === "fuzz:proposta-pronta") {
        if (ev.source) {
          ev.source.postMessage(
            {
              type: "fuzz:init-proposta",
              payload: {
                proximoNumero: computeProximoNumeroProposta(),
                clientes: clientsRef.current,
              },
            },
            "*"
          );
        }
        return;
      }
      if (ev.data.type === "fuzz:contrato-pronto") {
        if (ev.source) {
          const importar = contratoImportPendenteRef.current;
          contratoImportPendenteRef.current = null;
          ev.source.postMessage(
            {
              type: "fuzz:init-contrato",
              payload: {
                clientes: clientsRef.current,
                contratos: contratosGeradosRef.current,
                importar,
              },
            },
            "*"
          );
        }
        return;
      }
      if (ev.data.type === "fuzz:contrato-salvar") {
        const c = (ev.data.payload || {}).contrato;
        if (!c || !c.id) return;
        const atual = contratosGeradosRef.current;
        const existente = atual.find((x) => x.id === c.id);
        const salvo = { id: c.id, clienteId: c.clienteId || "", titulo: c.titulo || "", dados: c.dados || {}, atualizadoEm: new Date().toISOString() };
        const lista = existente ? atual.map((x) => (x.id === c.id ? salvo : x)) : [salvo, ...atual];
        persistContratosGerados(lista);
        if (ev.source) ev.source.postMessage({ type: "fuzz:contratos-atualizados", payload: { contratos: lista, salvoId: c.id } }, "*");
        setToast("Contrato salvo — dá pra reabrir e alterar em \"Contratos salvos\".");
        setTimeout(() => setToast(null), 5000);
        return;
      }
      if (ev.data.type === "fuzz:contrato-excluir") {
        const id = (ev.data.payload || {}).id;
        const lista = contratosGeradosRef.current.filter((x) => x.id !== id);
        persistContratosGerados(lista);
        if (ev.source) ev.source.postMessage({ type: "fuzz:contratos-atualizados", payload: { contratos: lista, salvoId: null } }, "*");
        return;
      }
      if (ev.data.type === "fuzz:anexar-cliente") {
        const payload = ev.data.payload || {};
        (async () => {
          try {
            const { data: { user } } = await supabase.auth.getUser();
            await api.uploadArquivoCliente(user.id, payload.clienteId, payload.tipo, payload.blob, payload.nome);
            if (clientViewInfoRef.current && clientViewInfoRef.current.id === payload.clienteId) {
              const lista = await api.listArquivosCliente(payload.clienteId);
              setClientArquivos(lista);
            }
            setToast("Cópia do " + (payload.tipo === "contrato" ? "contrato" : "proposta") + " salva no cadastro do cliente.");
            setTimeout(() => setToast(null), 6000);
          } catch (e) {
            console.error("Falha ao anexar arquivo ao cliente", e);
            setToast("Não consegui salvar a cópia no cliente: " + (e?.message || e?.error_description || JSON.stringify(e)));
            setTimeout(() => setToast(null), 12000);
          }
        })();
        return;
      }
      if (ev.data.type !== "fuzz:proposta-concluida") return;
      const p = ev.data.payload;
      const nomeCliente = (p.cliente.nome || "").trim();
      if (!nomeCliente) return;

      const cnpjDigits = (p.cliente.cnpj || "").replace(/\D/g, "");
      const currentClients = clientsRef.current;
      let match = null;
      if (cnpjDigits) {
        match = currentClients.find((c) => (c.cnpj || "").replace(/\D/g, "") === cnpjDigits && cnpjDigits.length > 0);
      }
      if (!match) {
        match = currentClients.find((c) => c.nome.trim().toLowerCase() === nomeCliente.toLowerCase());
      }

      let clientId;
      let clientList;
      if (match) {
        clientId = match.id;
        const updated = {
          ...match,
          nome: match.nome || nomeCliente,
          razaoSocial: match.razaoSocial || p.cliente.razaoSocial || "",
          cnpj: match.cnpj || p.cliente.cnpj || "",
          endereco: match.endereco || p.cliente.endereco || "",
          bairro: match.bairro || p.cliente.bairro || "",
          municipio: match.municipio || p.cliente.municipio || "",
          estado: match.estado || p.cliente.estado || "",
          cep: match.cep || p.cliente.cep || "",
          telefone: match.telefone || p.cliente.telefone || "",
        };
        clientList = currentClients.map((c) => (c.id === match.id ? updated : c));
      } else {
        const novo = {
          ...emptyClient(),
          nome: nomeCliente,
          razaoSocial: p.cliente.razaoSocial || "",
          cnpj: p.cliente.cnpj || "",
          endereco: p.cliente.endereco || "",
          bairro: p.cliente.bairro || "",
          municipio: p.cliente.municipio || "",
          estado: p.cliente.estado || "",
          cep: p.cliente.cep || "",
          telefone: p.cliente.telefone || "",
          observacoes: "Cliente criado automaticamente a partir da Proposta nº " + p.numero,
          rascunho: true,
        };
        clientId = novo.id;
        clientList = [novo, ...currentClients];
      }

      (async () => {
        try {
          // Aguarda o cliente ser salvo antes da proposta, já que ela referencia
          // cliente_id por chave estrangeira — salvar em paralelo arrisca a proposta
          // tentar gravar antes do cliente novo existir no banco e falhar silenciosamente.
          await persistClients(clientList);

          const novaProposta = {
            id: "p_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
            numero: p.numero,
            titulo: p.titulo || "Proposta sem título",
            tipo: p.tipo || DEFAULT_TIPOS[0],
            clienteId: clientId,
            clienteNome: nomeCliente,
            valorTotal: p.valorTotal || 0,
            dataGeracao: todayISO(),
            status: "Pendente",
          };
          await persistProposals([novaProposta, ...proposalsRef.current]);

          setToast(
            (match ? "Cliente atualizado" : "Cliente criado") +
              ": " + nomeCliente + " · proposta nº " + p.numero + " adicionada em Propostas."
          );
          setTimeout(() => setToast(null), 6000);
        } catch (e) {
          console.error("Falha ao salvar cliente/proposta do Gerador", e);
          setToast("Não consegui salvar a proposta no painel: " + (e?.message || e?.error_description || JSON.stringify(e)));
          setTimeout(() => setToast(null), 12000);
        }
      })();
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  async function persistProposals(list) {
    const prev = proposalsRef.current;
    setProposals(list);
    try {
      await api.syncPropostas(prev, list);
    } catch (e) {
      console.error("Falha ao salvar propostas", e);
    }
  }

  function confirmarProposta(prop) {
    const maiorOrdem = demandsRef.current.reduce((max, x) => Math.max(max, x.ordem || 0), 0);
    const novaDemanda = {
      ...emptyDemand(),
      projeto: prop.titulo,
      clienteId: prop.clienteId,
      tipo: prop.tipo,
      ordem: maiorOrdem + 10,
      observacoes: "Gerada a partir da Proposta nº " + prop.numero + (prop.valorTotal ? " — valor: R$ " + prop.valorTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : ""),
    };
    persistDemands([...demandsRef.current, novaDemanda]);
    persistProposals(proposalsRef.current.map((p) => (p.id === prop.id ? { ...p, status: "Confirmada", dataConfirmacao: todayISO() } : p)));

    const clienteVinculado = clientsRef.current.find((c) => c.id === prop.clienteId);
    if (clienteVinculado && clienteVinculado.rascunho) {
      persistClients(clientsRef.current.map((c) => (c.id === prop.clienteId ? { ...c, rascunho: false } : c)));
    }

    if (prop.valorTotal) {
      const novaReceita = {
        ...emptyTransacao("Receita"),
        descricao: prop.titulo,
        valor: String(prop.valorTotal),
        data: "",
        demandaId: novaDemanda.id,
        clienteId: prop.clienteId,
        tipoReceita: tiposReceita[0] || "",
        observacoes: "Gerada automaticamente a partir da Proposta nº " + prop.numero,
      };
      persistTransacoes([...transacoesRef.current, novaReceita]);
    }

    setToast("Proposta confirmada: demanda \"" + prop.titulo + "\" criada em Demandas" + (prop.valorTotal ? " e receita lançada em Financeiro." : "."));
    setTimeout(() => setToast(null), 6000);
  }

  function recusarProposta(prop) {
    persistProposals(proposalsRef.current.map((p) => (p.id === prop.id ? { ...p, status: "Recusada" } : p)));
  }

  function removeProposal(id) {
    persistProposals(proposalsRef.current.filter((p) => p.id !== id));
    setConfirmDelete(null);
  }

  function importarPropostaParaContrato(p) {
    contratoImportPendenteRef.current = {
      tipo: p.tipo,
      valor: p.valorTotal,
      clienteId: p.clienteId,
    };
    setTab("contratos");
  }

  async function persistTransacoes(listaOriginal) {
    const prev = transacoesRef.current;
    const { list } = reconciliarAutomaticos(listaOriginal, parametrosFinanceirosRef.current.pctImposto, parametrosFinanceirosRef.current.pctInss);
    setTransacoes(list);
    try {
      await api.syncTransacoes(prev, list);
    } catch (e) {
      console.error("Falha ao salvar transações", e);
    }
  }

  // Ao abrir o painel: acerta INSS/imposto automáticos que já existiam e garante a categoria do imposto.
  useEffect(() => {
    if (loading) return;
    const pct = parametrosFinanceirosRef.current.pctImposto;
    if (reconciliarAutomaticos(transacoesRef.current, pct, parametrosFinanceirosRef.current.pctInss).mudou) persistTransacoes(transacoesRef.current);
    if ((parseFloat(pct) || 0) > 0 && !tags.some((tg) => tg.nome === CATEGORIA_IMPOSTO)) createTag(CATEGORIA_IMPOSTO, "#D9A441");
  }, [loading]);

  function toggleNotaEmitida(t) {
    persistTransacoes(
      transacoesRef.current.map((x) =>
        x.id !== t.id ? x : x.notaEmitida ? { ...x, notaEmitida: false, dataNotaEmitida: "" } : { ...x, notaEmitida: true, dataNotaEmitida: todayISO() }
      )
    );
  }

  function retirarDaReserva() {
    const valor = parseFloat(retiradaReservaForm.valor) || 0;
    if (valor <= 0) return;
    addTipoReceita(TIPO_RECEITA_RETIRADA_RESERVA);
    const nova = {
      ...emptyTransacao("Receita"),
      categoria: "",
      tipoReceita: TIPO_RECEITA_RETIRADA_RESERVA,
      descricao: retiradaReservaForm.descricao.trim() || "Retirada da reserva",
      valor: String(valor),
      data: retiradaReservaForm.data || todayISO(),
      statusPagamento: "Pago",
    };
    persistTransacoes([nova, ...transacoesRef.current]);
    setRetiradaReservaForm(null);
    setToast("Retirada de R$ " + valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) + " lançada no financeiro.");
    setTimeout(() => setToast(null), 6000);
  }

  async function persistContratosGerados(list) {
    const prev = contratosGeradosRef.current;
    contratosGeradosRef.current = list;
    setContratosGerados(list);
    try {
      await api.syncContratosGerados(prev, list);
    } catch (e) {
      console.error("Falha ao salvar contratos", e);
      setToast("Não consegui salvar o contrato: " + (e?.message || e?.error_description || JSON.stringify(e)));
      setTimeout(() => setToast(null), 12000);
    }
  }

  async function persistNotasReuniao(list) {
    const prev = notasReuniaoRef.current;
    setNotasReuniao(list);
    try {
      await api.syncNotasReuniao(prev, list);
    } catch (e) {
      console.error("Falha ao salvar notas de reunião", e);
    }
  }

  function saveNotaReuniao(nota) {
    const limpa = { ...nota, conteudo: nota.conteudo.trim(), titulo: nota.titulo.trim(), clienteNomeLivre: nota.clienteNomeLivre.trim() };
    const exists = notasReuniaoRef.current.some((x) => x.id === limpa.id);
    persistNotasReuniao(exists ? notasReuniaoRef.current.map((x) => (x.id === limpa.id ? limpa : x)) : [limpa, ...notasReuniaoRef.current]);
    setNotaReuniaoForm(null);
  }

  function removeNotaReuniao(id) {
    persistNotasReuniao(notasReuniaoRef.current.filter((x) => x.id !== id));
    setConfirmDelete(null);
  }

  function addPeriodoToDate(iso, n, frequencia) {
    const d = new Date(iso + "T00:00:00");
    if (frequencia === "semanal") d.setDate(d.getDate() + n * 7);
    else if (frequencia === "semestral") d.setMonth(d.getMonth() + n * 6);
    else if (frequencia === "anual") d.setMonth(d.getMonth() + n * 12);
    else d.setMonth(d.getMonth() + n);
    return d.toISOString().slice(0, 10);
  }

  function saveTransacao(t, parcelas, frequencia) {
    const exists = transacoes.some((x) => x.id === t.id);
    if (!exists && parcelas && parcelas > 1 && t.data) {
      const grupoId = "grp_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6);
      const valorFormatado = (parseFloat(t.valor) || 0).toFixed(2);
      const novas = [];
      for (let i = 0; i < parcelas; i++) {
        novas.push({
          ...t,
          id: "t_" + Date.now() + "_" + i + "_" + Math.random().toString(36).slice(2, 5),
          valor: valorFormatado,
          data: addPeriodoToDate(t.data, i, frequencia || "mensal"),
          parcelaGrupoId: grupoId,
          parcelaAtual: i + 1,
          parcelaTotal: parcelas,
          notaEmitida: false,
          dataNotaEmitida: "",
        });
      }
      persistTransacoes([...novas, ...transacoes]);
    } else {
      const list = exists ? transacoes.map((x) => (x.id === t.id ? t : x)) : [t, ...transacoes];
      persistTransacoes(list);
    }
    setTransacaoForm(null);
    setParcelasInput(1);
    setRepeticaoFreq("mensal");
  }

  function removeTransacao(id, todasParcelas) {
    if (todasParcelas) {
      const alvo = transacoes.find((t) => t.id === id);
      if (alvo && alvo.parcelaGrupoId) {
        persistTransacoes(transacoes.filter((t) => t.parcelaGrupoId !== alvo.parcelaGrupoId));
        setConfirmDelete(null);
        return;
      }
    }
    persistTransacoes(transacoes.filter((t) => t.id !== id));
    setConfirmDelete(null);
  }

  async function persistMetas(obj) {
    const prev = metas;
    setMetas(obj);
    try {
      await api.syncMetasMensais(prev, obj);
    } catch (e) {
      console.error("Falha ao salvar metas", e);
    }
  }

  function setMetaDoMes(mes, valor) {
    persistMetas({ ...metas, [mes]: valor });
  }

  async function persistMetasAnuais(obj) {
    const prev = metasAnuais;
    setMetasAnuais(obj);
    try {
      await api.syncMetasAnuais(prev, obj);
    } catch (e) {
      console.error("Falha ao salvar metas anuais", e);
    }
  }

  function setMetaAnual(ano, valor) {
    persistMetasAnuais({ ...metasAnuais, [ano]: valor });
  }

  async function persistMetasClientes(obj) {
    const prev = metasClientesNovos;
    setMetasClientesNovos(obj);
    try {
      await api.syncMetasClientesMensais(prev, obj);
    } catch (e) {
      console.error("Falha ao salvar meta de clientes", e);
    }
  }

  function setMetaClientesDoMes(mes, valor) {
    persistMetasClientes({ ...metasClientesNovos, [mes]: valor });
  }

  async function salvarParametrosFinanceiros(partial) {
    // Mescla sobre o valor mais recente via ref (não sobre o estado capturado no
    // closure do botão) — assim, clicar em "Salvar" de dois campos em sequência
    // rápida não faz um sobrescrever o outro.
    const merged = { ...parametrosFinanceirosRef.current, ...partial };
    parametrosFinanceirosRef.current = merged;
    setParametrosFinanceiros(merged);
    if ("pctImposto" in partial || "pctInss" in partial) persistTransacoes(transacoesRef.current);
    try {
      await api.setParametrosFinanceiros(merged);
    } catch (e) {
      console.error("Falha ao salvar parâmetros financeiros", e);
    }
  }

  async function persistProLaborePorMes(obj) {
    const prev = proLaborePorMes;
    setProLaborePorMes(obj);
    try {
      await api.syncProLaboreMensal(prev, obj);
    } catch (e) {
      console.error("Falha ao salvar pró-labore mensal", e);
    }
  }

  function confirmarProLaboreMes(mes, valorStr) {
    const valor = parseFloat(valorStr) || 0;
    persistProLaborePorMes({ ...proLaborePorMes, [mes]: valor });
    const idProLabore = "prolabore_" + mes;
    const idInss = "inss_" + mes;
    let list = transacoesRef.current;
    if (valor <= 0) {
      persistTransacoes(list.filter((t) => t.id !== idProLabore && t.id !== idInss));
      return;
    }
    if (!tags.some((tg) => tg.nome === "Pró Labore")) createTag("Pró Labore", "#9B87C4");
    if (!tags.some((tg) => tg.nome === "INSS")) createTag("INSS", "#E07BB5");
    const existenteProLabore = list.find((t) => t.id === idProLabore);
    const dadosProLabore = {
      ...emptyTransacao("Despesa"),
      id: idProLabore,
      descricao: "Pró-labore " + mesLabel(mes),
      categoria: "Pró Labore",
      natureza: "Fixa",
      valor: String(valor),
      data: mes + "-05",
      statusPagamento: existenteProLabore ? existenteProLabore.statusPagamento : "Pendente",
    };
    list = existenteProLabore
      ? list.map((t) => (t.id === idProLabore ? { ...t, ...dadosProLabore } : t))
      : [dadosProLabore, ...list];

    const valorInss = (valor * (parseFloat(parametrosFinanceirosRef.current.pctInss) || 0)) / 100;
    const existenteInss = list.find((t) => t.id === idInss);
    if (valorInss <= 0) {
      list = list.filter((t) => t.id !== idInss);
    } else {
      const dadosInss = {
        ...emptyTransacao("Despesa"),
        id: idInss,
        descricao: "INSS " + mesLabel(mes),
        categoria: "INSS",
        natureza: "Fixa",
        valor: String(valorInss),
        data: vencimentoTributosDoMes(mes),
        statusPagamento: existenteInss ? existenteInss.statusPagamento : "Pendente",
      };
      list = existenteInss
        ? list.map((t) => (t.id === idInss ? { ...t, ...dadosInss } : t))
        : [dadosInss, ...list];
    }
    persistTransacoes(list);
  }

  async function persistTags(list) {
    const prev = tags;
    setTags(list);
    try {
      await api.syncTags(prev, list);
    } catch (e) {
      console.error("Falha ao salvar tags", e);
    }
  }

  function createTag(nome, cor) {
    const limpo = nome.trim();
    if (!limpo) return null;
    const existente = tags.find((tg) => tg.nome.toLowerCase() === limpo.toLowerCase());
    if (existente) return existente;
    const nova = emptyTag(limpo, cor || TAG_COLORS[tags.length % TAG_COLORS.length]);
    persistTags([...tags, nova]);
    return nova;
  }

  function deleteTag(id) {
    persistTags(tags.filter((tg) => tg.id !== id));
  }

  function renameTag(id, novoNome, novaCor) {
    const limpo = novoNome.trim();
    if (!limpo) return;
    const atual = tags.find((tg) => tg.id === id);
    if (!atual) return;
    persistTags(tags.map((tg) => (tg.id === id ? { ...tg, nome: limpo, cor: novaCor || tg.cor } : tg)));
    if (atual.nome !== limpo && transacoesRef.current.some((t) => t.tipo === "Despesa" && t.categoria === atual.nome)) {
      persistTransacoes(
        transacoesRef.current.map((t) => (t.tipo === "Despesa" && t.categoria === atual.nome ? { ...t, categoria: limpo } : t))
      );
    }
  }

  async function persistStatusDemandas(list) {
    const prev = statusDemandas;
    setStatusDemandas(list);
    try {
      await api.syncStatusDemandas(prev, list);
    } catch (e) {
      console.error("Falha ao salvar status de demandas", e);
    }
  }

  function createStatusDemanda(nome, cor) {
    const limpo = nome.trim();
    if (!limpo) return null;
    const existente = statusDemandas.find((s) => s.nome.toLowerCase() === limpo.toLowerCase());
    if (existente) return existente;
    const novo = { id: "sd_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6), nome: limpo, cor: cor || TAG_COLORS[statusDemandas.length % TAG_COLORS.length] };
    persistStatusDemandas([...statusDemandas, novo]);
    return novo;
  }

  function deleteStatusDemanda(id) {
    persistStatusDemandas(statusDemandas.filter((s) => s.id !== id));
  }

  function renameStatusDemanda(id, novoNome, novaCor) {
    const limpo = novoNome.trim();
    if (!limpo) return;
    const atual = statusDemandas.find((s) => s.id === id);
    if (!atual) return;
    persistStatusDemandas(statusDemandas.map((s) => (s.id === id ? { ...s, nome: limpo, cor: novaCor || s.cor } : s)));
    if (atual.nome !== limpo && demandsRef.current.some((d) => d.status === atual.nome)) {
      persistDemands(demandsRef.current.map((d) => (d.status === atual.nome ? { ...d, status: limpo } : d)));
    }
  }

  useEffect(() => {
    if (!openFilterMenu) return;
    function onDocClick() {
      setOpenFilterMenu(null);
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [openFilterMenu]);

  function toggleStatusPagamento(t) {
    persistTransacoes(transacoes.map((x) => (x.id === t.id ? { ...x, statusPagamento: x.statusPagamento === "Pago" ? "Pendente" : "Pago" } : x)));
  }


  async function persistTipos(list) {
    const prev = tiposProducao;
    setTiposProducao(list);
    try {
      await api.syncTiposProducao(prev, list);
    } catch (e) {
      console.error("Falha ao salvar tipos de produção", e);
    }
  }

  function addTipoProducao(nome) {
    const limpo = nome.trim();
    if (!limpo || tiposProducao.includes(limpo)) return;
    persistTipos([...tiposProducao, limpo]);
  }

  function removeTipoProducao(nome) {
    persistTipos(tiposProducao.filter((t) => t !== nome));
  }

  function renomearTipoProducao(nomeAntigo, nomeNovo) {
    const limpo = nomeNovo.trim();
    if (!limpo || limpo === nomeAntigo || tiposProducao.includes(limpo)) return;
    persistTipos(tiposProducao.map((t) => (t === nomeAntigo ? limpo : t)));
    if (demandsRef.current.some((d) => d.tipo === nomeAntigo)) {
      persistDemands(demandsRef.current.map((d) => (d.tipo === nomeAntigo ? { ...d, tipo: limpo } : d)));
    }
    if (proposalsRef.current.some((p) => p.tipo === nomeAntigo)) {
      persistProposals(proposalsRef.current.map((p) => (p.tipo === nomeAntigo ? { ...p, tipo: limpo } : p)));
    }
    if (transacoesRef.current.some((t) => t.tipo === "Receita" && t.categoria === nomeAntigo)) {
      persistTransacoes(
        transacoesRef.current.map((t) => (t.tipo === "Receita" && t.categoria === nomeAntigo ? { ...t, categoria: limpo } : t))
      );
    }
    const chaveAntiga = "tipo:" + nomeAntigo;
    if (coresStatus[chaveAntiga]) {
      const { [chaveAntiga]: cor, ...resto } = coresStatus;
      persistCoresStatus({ ...resto, ["tipo:" + limpo]: cor });
    }
  }

  async function persistTiposReceita(list) {
    const prev = tiposReceita;
    setTiposReceita(list);
    try {
      await api.syncTiposReceita(prev, list);
    } catch (e) {
      console.error("Falha ao salvar tipos de receita", e);
    }
  }

  function addTipoReceita(nome) {
    const limpo = nome.trim();
    if (!limpo || tiposReceita.includes(limpo)) return;
    persistTiposReceita([...tiposReceita, limpo]);
  }

  function removeTipoReceita(nome) {
    persistTiposReceita(tiposReceita.filter((t) => t !== nome));
  }

  function renomearTipoReceita(nomeAntigo, nomeNovo) {
    const limpo = nomeNovo.trim();
    if (!limpo || limpo === nomeAntigo || tiposReceita.includes(limpo)) return;
    persistTiposReceita(tiposReceita.map((t) => (t === nomeAntigo ? limpo : t)));
    if (transacoesRef.current.some((t) => t.tipo === "Receita" && t.tipoReceita === nomeAntigo)) {
      persistTransacoes(
        transacoesRef.current.map((t) => (t.tipo === "Receita" && t.tipoReceita === nomeAntigo ? { ...t, tipoReceita: limpo } : t))
      );
    }
  }

  async function persistCategoriasEquipamento(list) {
    const prev = categoriasEquipamento;
    setCategoriasEquipamento(list);
    try {
      await api.syncCategoriasEquipamento(prev, list);
    } catch (e) {
      console.error("Falha ao salvar categorias de equipamento", e);
    }
  }

  function addCategoriaEquipamento(nome) {
    const limpo = nome.trim();
    if (!limpo || categoriasEquipamento.includes(limpo)) return;
    persistCategoriasEquipamento([...categoriasEquipamento, limpo]);
  }

  function removeCategoriaEquipamento(nome) {
    persistCategoriasEquipamento(categoriasEquipamento.filter((c) => c !== nome));
  }

  function renomearCategoriaEquipamento(nomeAntigo, nomeNovo) {
    const limpo = nomeNovo.trim();
    if (!limpo || limpo === nomeAntigo || categoriasEquipamento.includes(limpo)) return;
    persistCategoriasEquipamento(categoriasEquipamento.map((c) => (c === nomeAntigo ? limpo : c)));
    if (equipamentos.some((eq) => eq.categoria === nomeAntigo)) {
      persistEquipamentos(equipamentos.map((eq) => (eq.categoria === nomeAntigo ? { ...eq, categoria: limpo } : eq)));
    }
  }

  async function persistCoresStatus(obj) {
    const prev = coresStatus;
    setCoresStatus(obj);
    try {
      await api.syncCoresStatus(prev, obj);
    } catch (e) {
      console.error("Falha ao salvar cores de status", e);
    }
  }

  function setCorStatus(chave, cor) {
    persistCoresStatus({ ...coresStatus, [chave]: cor });
  }

  async function persistKanbanTasks(list) {
    const prev = kanbanTasks;
    setKanbanTasks(list);
    try {
      await api.syncKanbanTasks(prev, list);
    } catch (e) {
      console.error("Falha ao salvar tarefas do kanban", e);
    }
  }

  function addKanbanTask(data, titulo) {
    const limpo = titulo.trim();
    if (!limpo) return;
    const nova = { id: "k_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7), titulo: limpo, data, concluida: false, clienteId: "", notas: "" };
    persistKanbanTasks([...kanbanTasks, nova]);
  }

  function handleAddQuickNote() {
    addKanbanTask("", quickNoteInput);
    setQuickNoteInput("");
  }

  function updateKanbanTask(id, fields) {
    persistKanbanTasks(kanbanTasks.map((t) => (t.id === id ? { ...t, ...fields } : t)));
  }

  function toggleKanbanTask(id) {
    persistKanbanTasks(kanbanTasks.map((t) => (t.id === id ? { ...t, concluida: !t.concluida } : t)));
  }

  function removeKanbanTask(id) {
    persistKanbanTasks(kanbanTasks.filter((t) => t.id !== id));
  }

  function moveKanbanTask(id, novaData) {
    persistKanbanTasks(kanbanTasks.map((t) => (t.id === id ? { ...t, data: novaData } : t)));
  }

  function toggleExpandDemand(id) {
    setExpandedDemands((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function updateVideoField(demandId, itemId, field, value) {
    const list = demandsRef.current.map((d) => {
      if (d.id !== demandId) return d;
      const itens = (d.itens || []).map((it) => {
        if (it.id !== itemId) return it;
        const novo = { ...it, [field]: value };
        if (field === "status") novo.dataConclusao = value === "Finalizada" ? it.dataConclusao || todayISO() : "";
        return novo;
      });
      let atualizado = { ...d, itens };
      if (field === "status" && (value === "Aguardando aprovação" || value === "Finalizada")) {
        atualizado.dataEnvioAprovacao = atualizado.dataEnvioAprovacao || todayISO();
      }
      if (field === "status" && itens.length > 0 && itens.every((it) => it.status === "Finalizada") && atualizado.status !== "Finalizada") {
        atualizado.status = "Finalizada";
        atualizado.dataAprovacao = atualizado.dataAprovacao || todayISO();
      }
      return atualizado;
    });
    persistDemands(list);
  }

  function updateDemandField(demandId, field, value) {
    const list = demandsRef.current.map((d) => {
      if (d.id !== demandId) return d;
      const atualizado = { ...d, [field]: value };
      if (field === "status" && (value === "Aguardando aprovação" || value === "Finalizada")) {
        atualizado.dataEnvioAprovacao = atualizado.dataEnvioAprovacao || todayISO();
      }
      if (field === "status" && value === "Finalizada") {
        atualizado.dataAprovacao = atualizado.dataAprovacao || todayISO();
      }
      return atualizado;
    });
    persistDemands(list);
  }

  async function persistDemands(list) {
    const prev = demandsRef.current;
    setDemands(list);
    try {
      await api.syncDemandas(prev, list);
    } catch (e) {
      console.error("Falha ao salvar demandas", e);
    }
  }

  async function persistClients(list) {
    const prev = clientsRef.current;
    setClients(list);
    try {
      await api.syncClientes(prev, list);
    } catch (e) {
      console.error("Falha ao salvar clientes", e);
    }
  }

  async function handleCapaClienteUpload(file) {
    if (!file) return;
    setCapaUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const url = await api.uploadCapaCliente(user.id, clientForm.id, file);
      setClientForm((f) => (f ? { ...f, capaUrl: url } : f));
    } catch (e) {
      console.error("Falha ao enviar imagem de capa", e);
      setToast("Não consegui enviar a imagem de capa.");
      setTimeout(() => setToast(null), 6000);
    } finally {
      setCapaUploading(false);
    }
  }

  async function carregarEquipe() {
    try {
      setEquipeMembros(await api.listEquipeMembros());
      setEquipeErro("");
    } catch (e) {
      console.error("Falha ao carregar equipe", e);
      setEquipeErro(e?.message || "erro desconhecido");
    }
  }

  async function carregarColaboracao() {
    try {
      const [mat, ag, rec] = await Promise.all([api.listMateriais(), api.listAgendaCliente(), api.listRecados()]);
      setMateriais(mat);
      setAgendaCliente(ag);
      setRecadosRows(rec);
      setColabErro("");
    } catch (e) {
      console.error("Falha ao carregar cronograma, materiais e recados", e);
      setColabErro(e?.message || "erro desconhecido");
    }
  }

  // A equipe grava coisas enquanto o painel está aberto: atualiza ao voltar pra aba e a cada minuto.
  useEffect(() => {
    if (loading) return undefined;
    async function atualizar() {
      carregarColaboracao();
      try {
        setNotasReuniao(await api.listNotasReuniao());
      } catch (e) {
        console.error("Falha ao atualizar notas de reunião", e);
      }
    }
    const timer = setInterval(carregarColaboracao, 60000);
    window.addEventListener("focus", atualizar);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", atualizar);
    };
  }, [loading]);

  const gravarColab = (fn) => async (arg) => {
    await fn(arg);
    await carregarColaboracao();
  };

  // Recados que o dono enviou ou recebeu.
  const nomeMembro = (id) => equipeMembros.find((m) => m.id === id)?.nome || "Equipe";
  const meusRecados = recadosRows
    .filter((r) => !r.de_membro_id || r.para_todos || !r.para_membro_id)
    .map((r) => ({
      id: r.id,
      texto: r.texto,
      deNome: r.de_membro_id ? nomeMembro(r.de_membro_id) : "Você",
      paraNome: r.para_todos ? "Todos" : r.para_membro_id ? nomeMembro(r.para_membro_id) : "Você",
      clienteNome: clients.find((c) => c.id === r.cliente_id)?.nome || "",
      criadoEm: r.created_at,
      enviadoPorMim: !r.de_membro_id,
      lido: (r.lido_por || []).includes("dono"),
    }));
  const recadosNovos = recadosNaoLidos(meusRecados);
  const pessoasRecado = equipeMembros.filter((m) => m.ativo).map((m) => ({ id: m.id, nome: m.nome }));
  const clientesAtivos = clients.filter((c) => !c.rascunho);

  // O banco já solta a atribuição ao excluir um acesso; aqui só acompanha na tela.
  function soltarDemandasDoMembro(membroId) {
    setDemands((lista) => lista.map((d) => (d.editorMembroId === membroId ? { ...d, editorMembroId: "" } : d)));
  }

  function saveDemand(d) {
    const exists = demands.some((x) => x.id === d.id);
    if (exists) {
      persistDemands(demands.map((x) => (x.id === d.id ? d : x)));
    } else {
      const menorOrdem = demands.reduce((min, x) => Math.min(min, x.ordem || 0), 0);
      persistDemands([{ ...d, ordem: menorOrdem - 10 }, ...demands]);
    }
    setDemandForm(null);
  }

  function reordenarDemandas(idArrastado, idAlvo) {
    if (idArrastado === idAlvo) return;
    const atual = [...demands].sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
    const fromIdx = atual.findIndex((d) => d.id === idArrastado);
    const toIdx = atual.findIndex((d) => d.id === idAlvo);
    if (fromIdx === -1 || toIdx === -1) return;
    const [moved] = atual.splice(fromIdx, 1);
    atual.splice(toIdx, 0, moved);
    const renumerado = atual.map((d, i) => ({ ...d, ordem: i * 10 }));
    persistDemands(renumerado);
  }

  function reordenarVideos(demandId, idArrastado, idAlvo) {
    if (idArrastado === idAlvo) return;
    const list = demands.map((d) => {
      if (d.id !== demandId) return d;
      const itens = [...(d.itens || [])];
      const fromIdx = itens.findIndex((v) => v.id === idArrastado);
      const toIdx = itens.findIndex((v) => v.id === idAlvo);
      if (fromIdx === -1 || toIdx === -1) return d;
      const [moved] = itens.splice(fromIdx, 1);
      itens.splice(toIdx, 0, moved);
      return { ...d, itens: itens.map((v, i) => ({ ...v, ordem: i })) };
    });
    persistDemands(list);
  }

  function toggleDemandSort(key) {
    if (demandSortKey !== key) {
      setDemandSortKey(key);
      setDemandSortDir("asc");
    } else if (demandSortDir === "asc") {
      setDemandSortDir("desc");
    } else {
      setDemandSortKey(null);
    }
  }

  function saveClient(c) {
    const exists = clients.some((x) => x.id === c.id);
    const list = exists ? clients.map((x) => (x.id === c.id ? c : x)) : [c, ...clients];
    persistClients(list);
    setClientForm(null);
  }

  function removeDemand(id) {
    persistDemands(demands.filter((d) => d.id !== id));
    setConfirmDelete(null);
  }

  function removeClient(id) {
    persistClients(clients.filter((c) => c.id !== id));
    setConfirmDelete(null);
  }

  async function persistEquipamentos(list) {
    const prev = equipamentos;
    setEquipamentos(list);
    try {
      await api.syncEquipamentos(prev, list);
    } catch (e) {
      console.error("Falha ao salvar equipamentos", e);
    }
  }

  function saveEquipamento(eq) {
    const exists = equipamentos.some((x) => x.id === eq.id);
    const list = exists ? equipamentos.map((x) => (x.id === eq.id ? eq : x)) : [eq, ...equipamentos];
    persistEquipamentos(list);
    setEquipamentoForm(null);
  }

  function removeEquipamento(id) {
    persistEquipamentos(equipamentos.filter((e) => e.id !== id));
    setConfirmDelete(null);
  }

  function importarEquipamentosArquivo(file) {
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const XLSX = await loadXLSX();
        const wb = XLSX.read(ev.target.result, { type: "array", cellDates: true });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: "", raw: true });
        const { novos, ignoradas } = parseEquipamentosSheet(rows, categoriasEquipamento);
        if (novos.length > 0) {
          persistEquipamentos([...novos, ...equipamentos]);
        }
        setToast(
          novos.length + " equipamento(s) importado(s)" + (ignoradas > 0 ? " · " + ignoradas + " linha(s) sem nome ignorada(s)" : "") + "."
        );
        setTimeout(() => setToast(null), 6000);
      } catch (e) {
        console.error("Falha ao importar planilha de equipamentos", e);
        setToast("Não consegui ler essa planilha. Confira se o arquivo é .xlsx, .xls ou .csv.");
        setTimeout(() => setToast(null), 6000);
      }
    };
    reader.readAsArrayBuffer(file);
  }

  async function persistProcessosCategorias(list) {
    const prev = processosCategorias;
    setProcessosCategorias(list);
    try {
      await api.syncProcessosCategorias(prev, list);
    } catch (e) {
      console.error("Falha ao salvar categorias de processos", e);
    }
  }

  function addProcessoCategoria(nome) {
    const limpo = nome.trim();
    if (!limpo || processosCategorias.includes(limpo)) return;
    persistProcessosCategorias([...processosCategorias, limpo]);
  }

  function removeProcessoCategoria(nome) {
    persistProcessosCategorias(processosCategorias.filter((c) => c !== nome));
    if (processoFiltroCategoria === nome) setProcessoFiltroCategoria("");
  }

  async function persistProcessosDocumentos(list) {
    const prev = processosDocumentos;
    setProcessosDocumentos(list);
    try {
      await api.syncProcessosDocumentos(prev, list);
    } catch (e) {
      console.error("Falha ao salvar documentos de processos", e);
    }
  }

  async function saveProcessoDocumento(doc, novoArquivo) {
    let arquivoPath = doc.arquivoPath;
    let arquivoNome = doc.arquivoNome;
    if (novoArquivo) {
      if (novoArquivo.size > PROCESSO_ARQUIVO_MAX_BYTES) {
        setToast("Arquivo maior que 25MB — escolha um arquivo menor.");
        setTimeout(() => setToast(null), 6000);
        return;
      }
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const antigo = arquivoPath;
        const up = await api.uploadProcessoArquivo(user.id, doc.id, novoArquivo);
        arquivoPath = up.path;
        arquivoNome = up.nome;
        if (antigo && antigo !== arquivoPath) await api.deleteProcessoArquivo(antigo);
      } catch (e) {
        console.error("Falha ao enviar arquivo", e);
        setToast("Não consegui enviar o arquivo: " + (e?.message || e?.error_description || JSON.stringify(e)));
        setTimeout(() => setToast(null), 12000);
        return;
      }
    }
    const registro = { ...doc, arquivoPath, arquivoNome };
    const exists = processosDocumentos.some((d) => d.id === registro.id);
    const list = exists ? processosDocumentos.map((d) => (d.id === registro.id ? registro : d)) : [registro, ...processosDocumentos];
    persistProcessosDocumentos(list);
    setProcessoForm(null);
    setProcessoNovoArquivo(null);
  }

  function removeProcessoDocumento(doc) {
    (async () => {
      if (doc.arquivoPath) {
        try {
          await api.deleteProcessoArquivo(doc.arquivoPath);
        } catch (e) {
          console.error("Falha ao remover arquivo do storage", e);
        }
      }
      persistProcessosDocumentos(processosDocumentos.filter((d) => d.id !== doc.id));
    })();
    setConfirmDelete(null);
  }

  async function baixarArquivoProcesso(doc) {
    try {
      const blob = await api.downloadProcessoArquivo(doc.arquivoPath);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.arquivoNome || "arquivo";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Falha ao baixar arquivo", e);
      setToast("Não consegui baixar esse arquivo.");
      setTimeout(() => setToast(null), 6000);
    }
  }

  async function baixarArquivoCliente(a) {
    try {
      const blob = await api.downloadArquivoCliente(a.arquivoPath);
      const url = URL.createObjectURL(blob);
      const el = document.createElement("a");
      el.href = url;
      el.download = a.nome || "arquivo.pdf";
      document.body.appendChild(el);
      el.click();
      el.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Falha ao baixar arquivo do cliente", e);
      setToast("Não consegui baixar esse arquivo.");
      setTimeout(() => setToast(null), 6000);
    }
  }

  async function removerArquivoCliente(a) {
    try {
      await api.deleteArquivoCliente(a.id, a.arquivoPath);
      setClientArquivos((lista) => lista.filter((x) => x.id !== a.id));
    } catch (e) {
      console.error("Falha ao remover arquivo do cliente", e);
      setToast("Não consegui remover esse arquivo.");
      setTimeout(() => setToast(null), 6000);
    }
  }

  function baixarTextoProcesso(doc) {
    const blob = new Blob([doc.conteudoTexto || ""], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = (doc.titulo || "documento").replace(/[^a-z0-9\-_ ]/gi, "") + ".txt";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function copiarTextoProcesso(doc) {
    navigator.clipboard.writeText(doc.conteudoTexto || "");
    setToast("Texto copiado.");
    setTimeout(() => setToast(null), 3000);
  }

  async function conectarGoogleAgenda() {
    setGoogleErro("");
    setGoogleConectando(true);
    try {
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      if (!clientId) throw new Error("Integração com Google Agenda não configurada (falta VITE_GOOGLE_CLIENT_ID).");
      const { accessToken, expiresIn } = await googleCal.requestGoogleToken(clientId);
      const expiresAt = Date.now() + expiresIn * 1000 - 60000;
      saveStoredGoogleToken(accessToken, expiresAt);
      setGoogleToken(accessToken);
      setGoogleCalendarId("primary");
    } catch (e) {
      console.error("Falha ao conectar Google Agenda", e);
      setGoogleErro(e.message || "Falha ao conectar com o Google Agenda.");
    } finally {
      setGoogleConectando(false);
    }
  }

  function reconectarGoogleAgenda() {
    clearStoredGoogleToken();
    setGoogleToken(null);
    setGoogleErro("Sua sessão do Google Agenda expirou. Clique em \"Conectar Google Agenda\" para continuar.");
  }

  useEffect(() => {
    if (!googleToken || !googleCalendarId) {
      setGoogleEventosHoje([]);
      return;
    }
    let ativo = true;
    setGoogleEventosHojeCarregando(true);
    const hoje = todayISO();
    const timeMin = new Date(hoje + "T00:00:00").toISOString();
    const timeMax = new Date(addDaysISO(hoje, 1) + "T00:00:00").toISOString();
    googleCal
      .listEvents(googleToken, googleCalendarId, timeMin, timeMax)
      .then((items) => { if (ativo) setGoogleEventosHoje(items); })
      .catch((e) => {
        console.error("Falha ao carregar compromissos de hoje", e);
        if (ativo && e.status === 401) reconectarGoogleAgenda();
      })
      .finally(() => { if (ativo) setGoogleEventosHojeCarregando(false); });
    return () => { ativo = false; };
  }, [googleToken, googleCalendarId]);

  const clientName = (id) => clients.find((c) => c.id === id)?.nome || "—";
  const corStatusDemanda = (nome) => statusDemandas.find((s) => s.nome === nome)?.cor || "#8a8f98";

  const notasReuniaoFiltradas = useMemo(() => {
    let list = notasReuniao;
    if (notaReuniaoFiltroCliente === "__sem_cliente__") list = list.filter((n) => !n.clienteId);
    else if (notaReuniaoFiltroCliente) list = list.filter((n) => n.clienteId === notaReuniaoFiltroCliente);
    return [...list].sort((a, b) => (b.data || "").localeCompare(a.data || ""));
  }, [notasReuniao, notaReuniaoFiltroCliente]);

  const filteredDemands = useMemo(() => {
    const list = demands.filter((d) => {
      if (!mostrarFinalizadas && d.status === "Finalizada") return false;
      if (filterCliente && d.clienteId !== filterCliente) return false;
      if (demandTipoFilter && d.tipo !== demandTipoFilter) return false;
      if (demandStatusFilter && d.status !== demandStatusFilter) return false;
      if (demandDataInicio && (!d.dataEntrega || d.dataEntrega < demandDataInicio)) return false;
      if (demandDataFim && (!d.dataEntrega || d.dataEntrega > demandDataFim)) return false;
      if (search && !d.projeto.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
    if (!demandSortKey) {
      return list.sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
    }
    const getValor = (d) => {
      switch (demandSortKey) {
        case "projeto": return d.projeto || "";
        case "cliente": return clientName(d.clienteId);
        case "status": return d.status || "";
        case "urgencia": return getUrgencia(d).label;
        case "entrega": return d.dataEntrega || "";
        default: return "";
      }
    };
    const dir = demandSortDir === "asc" ? 1 : -1;
    return list.sort((a, b) => getValor(a).localeCompare(getValor(b), "pt-BR", { numeric: true }) * dir);
  }, [demands, filterCliente, demandTipoFilter, demandStatusFilter, demandDataInicio, demandDataFim, search, mostrarFinalizadas, demandSortKey, demandSortDir]);

  const filteredProposals = useMemo(() => {
    let list = proposals.filter((p) => {
      if (proposalClienteFilter && p.clienteId !== proposalClienteFilter) return false;
      if (proposalStatusFilter && p.status !== proposalStatusFilter) return false;
      return true;
    });
    if (proposalValorSort) {
      list = [...list].sort((a, b) => {
        const diff = Number(a.valorTotal || 0) - Number(b.valorTotal || 0);
        return proposalValorSort === "asc" ? diff : -diff;
      });
    }
    return list;
  }, [proposals, proposalClienteFilter, proposalStatusFilter, proposalValorSort]);

  const relatorioStatsMes = useMemo(() => computeMonthStats(transacoes, relatorioMes), [transacoes, relatorioMes]);

  const relatorioReceitasPorTipo = useMemo(() => {
    const num = (v) => parseFloat(v) || 0;
    const doMes = transacoes.filter((t) => t.tipo === "Receita" && mesRef(t.data) === relatorioMes);
    const porTipo = {};
    let semTipo = 0;
    doMes.forEach((t) => {
      const chave = t.tipoReceita || "";
      if (!chave) { semTipo += num(t.valor); return; }
      porTipo[chave] = (porTipo[chave] || 0) + num(t.valor);
    });
    const linhas = Object.entries(porTipo)
      .map(([nome, valor]) => ({ nome, valor }))
      .sort((a, b) => b.valor - a.valor);
    if (semTipo > 0) linhas.push({ nome: "Sem tipo definido", valor: semTipo });
    return linhas;
  }, [transacoes, relatorioMes]);

  const relatorioPropostasDoMes = useMemo(
    () => proposals.filter((p) => mesRef(p.dataGeracao) === relatorioMes),
    [proposals, relatorioMes]
  );

  // Confirmadas contam pelo mês em que foram confirmadas, não pelo mês
  // em que a proposta foi enviada — uma proposta enviada em agosto e
  // confirmada em setembro entra no relatório de setembro. Propostas
  // confirmadas antes dessa mudança (sem dataConfirmacao salva) caem
  // de volta em dataGeracao, pra não sumirem dos relatórios antigos.
  const relatorioPropostasConfirmadasNoMes = useMemo(
    () => proposals.filter((p) => p.status === "Confirmada" && mesRef(p.dataConfirmacao || p.dataGeracao) === relatorioMes),
    [proposals, relatorioMes]
  );

  const relatorioPropostaStats = useMemo(() => {
    const pendentes = relatorioPropostasDoMes.filter((p) => p.status === "Pendente").length;
    const recusadas = relatorioPropostasDoMes.filter((p) => p.status === "Recusada").length;
    const confirmadas = relatorioPropostasConfirmadasNoMes.length;
    const decididas = confirmadas + recusadas;
    const taxaConversao = decididas > 0 ? Math.round((confirmadas / decididas) * 100) : 0;
    const valorConfirmado = relatorioPropostasConfirmadasNoMes.reduce((s, p) => s + Number(p.valorTotal || 0), 0);
    return { total: relatorioPropostasDoMes.length, pendentes, confirmadas, recusadas, taxaConversao, valorConfirmado };
  }, [relatorioPropostasDoMes, relatorioPropostasConfirmadasNoMes]);

  const relatorioDemandasDoMes = useMemo(() => {
    const set = new Set();
    demands.forEach((d) => {
      const prazoNoMes = mesRef(d.dataEntrega) === relatorioMes;
      const entregueNoMes = d.status === "Finalizada" && mesRef(d.dataAprovacao) === relatorioMes;
      if (prazoNoMes || entregueNoMes) set.add(d);
    });
    return Array.from(set);
  }, [demands, relatorioMes]);

  const relatorioEntregasDoMes = useMemo(
    () => relatorioDemandasDoMes.filter((d) => d.status === "Finalizada" && mesRef(d.dataAprovacao) === relatorioMes),
    [relatorioDemandasDoMes, relatorioMes]
  );

  const relatorioEntregasBreakdown = useMemo(() => {
    let noPrazo = 0, atraso = 0;
    relatorioEntregasDoMes.forEach((d) => {
      if (d.dataAprovacao && d.dataEntrega && d.dataAprovacao > d.dataEntrega) atraso += 1;
      else noPrazo += 1;
    });
    return { noPrazo, atraso };
  }, [relatorioEntregasDoMes]);

  const relatorioDemandaFiltroCount = useMemo(() => {
    if (!relatorioDemandaClienteFiltro && !relatorioDemandaTipoFiltro) return null;
    return relatorioDemandasDoMes.filter(
      (d) =>
        (!relatorioDemandaClienteFiltro || d.clienteId === relatorioDemandaClienteFiltro) &&
        (!relatorioDemandaTipoFiltro || d.tipo === relatorioDemandaTipoFiltro)
    ).length;
  }, [relatorioDemandasDoMes, relatorioDemandaClienteFiltro, relatorioDemandaTipoFiltro]);

  const stats = useMemo(() => statsDeProducao(demands), [demands]);

  const demandasStatsMes = useMemo(() => {
    let total = 0;
    let finalizadas = 0;
    demands.forEach((d) => {
      unidadesDoTrabalho(d).forEach((u) => {
        const prazoNoMes = mesRef(u.prazo) === monthAnchor;
        const entregueNoMes = u.status === "Finalizada" && mesRef(u.conclusao) === monthAnchor;
        if (prazoNoMes || entregueNoMes) total++;
        if (entregueNoMes) finalizadas++;
      });
    });
    return { total, finalizadas };
  }, [demands, monthAnchor]);

  const proposalStats = useMemo(() => {
    const pendentes = proposals.filter((p) => p.status === "Pendente").length;
    const confirmadas = proposals.filter((p) => p.status === "Confirmada").length;
    const recusadas = proposals.filter((p) => p.status === "Recusada").length;
    return { total: proposals.length, pendentes, confirmadas, recusadas };
  }, [proposals]);

  const followUps = useMemo(() => proposals.filter(precisaFollowUp), [proposals]);

  const notifications = useMemo(() => {
    const list = [];
    if (followUps.length > 0) {
      list.push({
        id: "followup",
        tone: "wait",
        text: followUps.length === 1
          ? "1 proposta sem resposta há mais de " + FOLLOWUP_DIAS + " dias — hora de um follow up."
          : followUps.length + " propostas sem resposta há mais de " + FOLLOWUP_DIAS + " dias — hora de um follow up.",
        goto: "propostas-lista",
        label: "Ver propostas",
      });
    }
    const contarUnidades = (lista, teste) => lista.reduce((s, d) => s + unidadesDoTrabalho(d).filter(teste).length, 0);
    const detalheVideos = (lista, teste) => {
      const unidades = contarUnidades(lista, teste);
      return unidades > lista.length ? " (" + unidades + " vídeos pendentes)" : "";
    };
    const unidadeAtrasada = (u) => urgenciaDaUnidade(u).tone === "late";
    const demandasAtrasadas = demands.filter((d) => unidadesDoTrabalho(d).some(unidadeAtrasada));
    if (demandasAtrasadas.length > 0) {
      list.push({
        id: "demandas-atrasadas",
        tone: "late",
        text: (demandasAtrasadas.length === 1 ? "1 demanda está atrasada" : demandasAtrasadas.length + " demandas estão atrasadas") + detalheVideos(demandasAtrasadas, unidadeAtrasada) + ".",
        goto: "demandas",
        label: "Ver demandas",
      });
    }
    const unidadeHoje = (u) => u.prazo === todayISO() && u.status !== "Finalizada";
    const demandasHoje = demands.filter((d) => unidadesDoTrabalho(d).some(unidadeHoje));
    if (demandasHoje.length > 0) {
      list.push({
        id: "demandas-hoje",
        tone: "urgent",
        text: (demandasHoje.length === 1 ? "1 demanda tem entrega hoje" : demandasHoje.length + " demandas têm entrega hoje") + detalheVideos(demandasHoje, unidadeHoje) + ".",
        goto: "demandas",
        label: "Ver demandas",
      });
    }
    const contasHoje = transacoes.filter((t) => t.data === todayISO() && t.statusPagamento === "Pendente");
    if (contasHoje.length > 0) {
      list.push({
        id: "contas-hoje",
        tone: "wait",
        text: contasHoje.length === 1 ? "1 conta vence hoje." : contasHoje.length + " contas vencem hoje.",
        goto: "financeiro",
        label: "Ver financeiro",
      });
    }
    const despesasAtrasadas = transacoes.filter((t) => t.tipo === "Despesa" && getStatusPagamentoEfetivo(t) === "Atrasado");
    if (despesasAtrasadas.length > 0) {
      list.push({
        id: "despesas-atrasadas",
        tone: "late",
        text: despesasAtrasadas.length === 1 ? "1 conta está atrasada." : despesasAtrasadas.length + " contas estão atrasadas.",
        goto: "financeiro",
        label: "Ver financeiro",
      });
    }
    const receitasPendentes = transacoes.filter((t) => t.tipo === "Receita" && getStatusPagamentoEfetivo(t) === "Atrasado");
    if (receitasPendentes.length > 0) {
      list.push({
        id: "receitas-pendentes",
        tone: "late",
        text: receitasPendentes.length === 1 ? "Um pagamento está pendente." : receitasPendentes.length + " pagamentos estão pendentes.",
        goto: "financeiro",
        label: "Ver financeiro",
      });
    }
    return list;
  }, [followUps, demands, transacoes]);

  function computeMonthStats(list, mes) {
    const num = (v) => parseFloat(v) || 0;
    const doMes = list.filter((t) => mesRef(t.data) === mes);
    const receitas = doMes.filter((t) => t.tipo === "Receita");
    const despesas = doMes.filter((t) => t.tipo === "Despesa");
    const totalReceita = receitas.reduce((s, t) => s + num(t.valor), 0);
    const recebido = receitas.filter((t) => t.statusPagamento === "Pago").reduce((s, t) => s + num(t.valor), 0);
    const totalDespesas = despesas.reduce((s, t) => s + num(t.valor), 0);
    const despesasFixas = despesas.filter((t) => t.natureza === "Fixa").reduce((s, t) => s + num(t.valor), 0);
    const despesasVariaveis = totalDespesas - despesasFixas;
    const proLaboreValor = despesas.filter((t) => t.id.startsWith("prolabore_") || t.categoria === "Pró Labore").reduce((s, t) => s + num(t.valor), 0);
    const faturado = faturadoDoMes(list, mes);
    const despesasTributosAuto = despesas.filter(ehDespesaTributoAutomatica).reduce((s, t) => s + num(t.valor), 0);
    const despesasOperacionais = totalDespesas - despesasTributosAuto;
    const margem = faturado - totalDespesas;
    const margemPct = faturado > 0 ? (margem / faturado) * 100 : 0;
    return { mes, totalReceita, faturado, recebido, aReceber: totalReceita - recebido, totalDespesas, despesasOperacionais, despesasFixas, despesasVariaveis, proLaboreValor, margem, margemPct };
  }

  const financeStats = useMemo(() => {
    const num = (v) => parseFloat(v) || 0;
    const receitas = transacoes.filter((t) => t.tipo === "Receita");
    const despesas = transacoes.filter((t) => t.tipo === "Despesa");
    const totalReceita = receitas.reduce((s, t) => s + num(t.valor), 0);
    const recebido = receitas.filter((t) => t.statusPagamento === "Pago").reduce((s, t) => s + num(t.valor), 0);
    const aReceber = totalReceita - recebido;
    const totalDespesas = despesas.reduce((s, t) => s + num(t.valor), 0);
    const despesasPagas = despesas.filter((t) => t.statusPagamento === "Pago").reduce((s, t) => s + num(t.valor), 0);
    const atrasadas = transacoes.filter((t) => getStatusPagamentoEfetivo(t) === "Atrasado").length;
    const saldo = totalReceita - totalDespesas;
    return { totalReceita, recebido, aReceber, totalDespesas, despesasPagas, atrasadas, saldo };
  }, [transacoes]);

  const financeStatsMes = useMemo(() => computeMonthStats(transacoes, monthAnchor), [transacoes, monthAnchor]);

  function computeUltimosMeses(anchorMes) {
    const meses = [];
    for (let i = 5; i >= 0; i--) meses.push(addMonthsISO(anchorMes, -i));
    return meses.map((m) => ({ ...computeMonthStats(transacoes, m), meta: metas[m] || 0 }));
  }
  const ultimosMeses = useMemo(() => computeUltimosMeses(monthAnchor), [transacoes, monthAnchor, metas]);
  const ultimosMesesRelatorio = useMemo(() => computeUltimosMeses(relatorioMes), [transacoes, relatorioMes, metas]);

  const anoAtual = monthAnchor.slice(0, 4);
  const faturamentoAnual = useMemo(() => {
    const num = (v) => parseFloat(v) || 0;
    return transacoes
      .filter((t) => receitaFaturada(t) && t.dataNotaEmitida.slice(0, 4) === anoAtual)
      .reduce((s, t) => s + num(t.valor), 0);
  }, [transacoes, anoAtual]);

  const novosClientesMes = useMemo(
    () => clients.filter((c) => !c.rascunho && mesRef(c.criadoEm) === monthAnchor).length,
    [clients, monthAnchor]
  );

  const metasResumoItems = useMemo(() => {
    const items = [];
    const metaFin = parseFloat(metas[monthAnchor]) || 0;
    items.push({
      key: "meta-financeira",
      label: metaFin > 0 ? "da meta financeira do mês" : "faturado no mês",
      display: metaFin > 0
        ? Math.round((financeStatsMes.faturado / metaFin) * 100) + "%"
        : (hideValues ? "R$ ••••" : "R$ " + financeStatsMes.faturado.toLocaleString("pt-BR", { minimumFractionDigits: 0 })),
    });
    const metaNovos = parseFloat(metasClientesNovos[monthAnchor]) || 0;
    items.push({
      key: "meta-novos-clientes",
      label: metaNovos > 0 ? "da meta de novos clientes" : "novos clientes no mês",
      display: metaNovos > 0 ? Math.round((novosClientesMes / metaNovos) * 100) + "%" : String(novosClientesMes),
    });
    return items;
  }, [metas, metasClientesNovos, monthAnchor, financeStatsMes, novosClientesMes, hideValues]);

  const taxaConversaoPropostas = useMemo(() => {
    const decididas = proposalStats.confirmadas + proposalStats.recusadas;
    return decididas > 0 ? Math.round((proposalStats.confirmadas / decididas) * 100) : 0;
  }, [proposalStats]);

  function computeResumoPorCategoria(mes) {
    const num = (v) => parseFloat(v) || 0;
    const doMes = transacoes.filter((t) => t.tipo === "Despesa" && mesRef(t.data) === mes);
    const porCategoria = {};
    doMes.forEach((t) => {
      const chave = t.categoria || "Sem categoria";
      porCategoria[chave] = (porCategoria[chave] || 0) + num(t.valor);
    });
    const linhas = Object.entries(porCategoria).map(([nome, total]) => {
      const tg = tags.find((x) => x.nome === nome);
      return { id: nome, nome, cor: tg?.cor || "#6b7078", total };
    });
    linhas.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
    return linhas;
  }
  const resumoPorCategoria = useMemo(() => computeResumoPorCategoria(monthAnchor), [transacoes, tags, monthAnchor]);
  const relatorioResumoPorCategoria = useMemo(() => computeResumoPorCategoria(relatorioMes), [transacoes, tags, relatorioMes]);

  const clientesVisiveis = useMemo(
    () => (mostrarClientesRascunho ? clients : clients.filter((c) => !c.rascunho)),
    [clients, mostrarClientesRascunho]
  );

  const filteredEquipamentos = useMemo(() => {
    let list = equipamentos;
    if (equipFiltroCategoria) list = list.filter((e) => e.categoria === equipFiltroCategoria);
    if (equipFiltroStatus) list = list.filter((e) => e.status === equipFiltroStatus);
    return list;
  }, [equipamentos, equipFiltroCategoria, equipFiltroStatus]);

  const equipStats = useMemo(() => {
    const num = (s) => equipamentos.filter((e) => e.status === s).length;
    return {
      total: equipamentos.length,
      disponivel: num("Disponível"),
      emUso: num("Em uso"),
      manutencao: num("Em manutenção"),
      emprestado: num("Emprestado"),
      danificado: num("Danificado"),
    };
  }, [equipamentos]);

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    const results = [];
    clients.forEach((c) => {
      if ((c.nome || "").toLowerCase().includes(q)) {
        results.push({
          type: "cliente",
          id: c.id,
          typeLabel: "Cliente",
          label: c.nome,
          sublabel: c.contatoNome || "",
          action: () => { setTab("clientes"); setClientForm(c); },
        });
      }
    });
    demands.forEach((d) => {
      if ((d.projeto || "").toLowerCase().includes(q)) {
        results.push({
          type: "demanda",
          id: d.id,
          typeLabel: "Demanda",
          label: d.projeto,
          sublabel: clientName(d.clienteId),
          action: () => { setTab("demandas"); setDemandForm(d); },
        });
      }
    });
    proposals.forEach((p) => {
      const nome = (p.cliente && p.cliente.nome) || "";
      if (nome.toLowerCase().includes(q) || (p.titulo || "").toLowerCase().includes(q)) {
        results.push({
          type: "proposta",
          id: p.id,
          typeLabel: "Proposta",
          label: p.titulo || nome,
          sublabel: nome,
          action: () => { setTab("propostas-lista"); },
        });
      }
    });
    equipamentos.forEach((eq) => {
      if ((eq.nome || "").toLowerCase().includes(q)) {
        results.push({
          type: "equipamento",
          id: eq.id,
          typeLabel: "Equipamento",
          label: eq.nome,
          sublabel: eq.categoria,
          action: () => { setTab("equipamentos"); setEquipamentoForm(eq); },
        });
      }
    });
    return results.slice(0, 8);
  }, [searchQuery, clients, demands, proposals, equipamentos]);

  useEffect(() => {
    if (!searchOpen) return;
    function onDocClick() {
      setSearchOpen(false);
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [searchOpen]);

  const homeHoje = useMemo(() => {
    const hoje = todayISO();
    const entregas = demands.filter((d) => unidadesDoTrabalho(d).some((u) => u.prazo === hoje));
    const pagamentos = transacoes.filter((t) => t.data === hoje);
    const kanbanHoje = kanbanTasks.filter((k) => k.data === hoje && !k.concluida);
    return { entregas, pagamentos, kanbanHoje };
  }, [demands, transacoes, kanbanTasks]);

  const notasRapidasPendentes = useMemo(
    () => kanbanTasks.filter((k) => !k.data && !k.concluida),
    [kanbanTasks]
  );

  // Lançamentos do mês (tudo que vence no mês), ordenados como na tela Financeiro:
  // receitas: atrasadas → a receber → recebidas; despesas: a pagar (atrasadas primeiro) e pagas.
  const ordemPorStatus = (t) => {
    const st = getStatusPagamentoEfetivo(t);
    return st === "Atrasado" ? 0 : st === "Pendente" ? 1 : 2;
  };
  const ordenarLancamentos = (list) =>
    [...list].sort((a, b) => ordemPorStatus(a) - ordemPorStatus(b) || (a.data || "").localeCompare(b.data || "") || (a.descricao || "").localeCompare(b.descricao || "", "pt-BR"));

  function computeSaldoAcumulado(ateMes) {
    const num = (v) => parseFloat(v) || 0;
    return transacoes.reduce((acc, t) => {
      if (t.statusPagamento !== "Pago") return acc;
      if (mesRef(t.data) > ateMes) return acc;
      return acc + (t.tipo === "Receita" ? num(t.valor) : -num(t.valor));
    }, 0);
  }
  const saldoAcumulado = useMemo(() => computeSaldoAcumulado(monthAnchor), [transacoes, monthAnchor]);
  const relatorioSaldoAcumulado = useMemo(() => computeSaldoAcumulado(relatorioMes), [transacoes, relatorioMes]);

  function computeReservaAcumulada(ateMes) {
    const num = (v) => parseFloat(v) || 0;
    return transacoes.reduce((acc, t) => {
      if (t.statusPagamento !== "Pago") return acc;
      if (mesRef(t.data) > ateMes) return acc;
      if (t.tipo === "Despesa" && t.categoria === CATEGORIA_DESPESA_RESERVA) return acc + num(t.valor);
      if (t.tipo === "Receita" && t.tipoReceita === TIPO_RECEITA_RETIRADA_RESERVA) return acc - num(t.valor);
      return acc;
    }, 0);
  }
  const reservaAcumulada = useMemo(() => computeReservaAcumulada(monthAnchor), [transacoes, monthAnchor]);
  const relatorioReservaAcumulada = useMemo(() => computeReservaAcumulada(relatorioMes), [transacoes, relatorioMes]);

  function computeReservaDoMes(mes) {
    const num = (v) => parseFloat(v) || 0;
    return transacoes
      .filter((t) => t.tipo === "Despesa" && t.categoria === CATEGORIA_DESPESA_RESERVA && t.statusPagamento === "Pago" && mesRef(t.data) === mes)
      .reduce((s, t) => s + num(t.valor), 0);
  }
  const reservaDoMes = useMemo(() => computeReservaDoMes(monthAnchor), [transacoes, monthAnchor]);
  const relatorioReservaDoMes = useMemo(() => computeReservaDoMes(relatorioMes), [transacoes, relatorioMes]);

  function corReservaDoMes(valorDoMes, valorSugerido) {
    if (valorDoMes <= 0) return "var(--red)";
    if (valorDoMes < valorSugerido) return "var(--amber)";
    return "var(--teal)";
  }

  function computeSaudeFinanceira(statsMes, saldoAcum, ultimosMesesArr) {
    const faturado = statsMes.faturado;
    const despesasOperacionais = statsMes.despesasOperacionais;
    const impostoValor = (faturado * (parseFloat(parametrosFinanceiros.pctImposto) || 0)) / 100;
    const reservaValor = (faturado * (parseFloat(parametrosFinanceiros.pctReserva) || 0)) / 100;
    const inssDoMes = transacoes.find((t) => t.id === "inss_" + statsMes.mes);
    const inssValor = inssDoMes ? parseFloat(inssDoMes.valor) || 0 : 0;
    const vencimentoTributos = vencimentoTributosDoMes(statsMes.mes);
    const sobraLivre = faturado - despesasOperacionais - impostoValor - inssValor;
    const mediaDespesas = ultimosMesesArr.reduce((s, m) => s + m.totalDespesas, 0) / (ultimosMesesArr.length || 1);
    const custoMensalTotal = mediaDespesas;
    const mesesGarantidos = custoMensalTotal > 0 ? saldoAcum / custoMensalTotal : null;
    const reservaIdealValor = custoMensalTotal * MESES_RESERVA_IDEAL;
    const pctDaReservaIdeal = reservaIdealValor > 0 ? (saldoAcum / reservaIdealValor) * 100 : null;
    const fatorRMinimo = faturado * 0.28;
    return { faturado, despesasOperacionais, impostoValor, reservaValor, sobraLivre, mediaDespesas, custoMensalTotal, mesesGarantidos, reservaIdealValor, pctDaReservaIdeal, inssValor, vencimentoTributos, fatorRMinimo };
  }
  const saudeFinanceiraMes = useMemo(
    () => computeSaudeFinanceira(financeStatsMes, saldoAcumulado, ultimosMeses),
    [financeStatsMes, parametrosFinanceiros, ultimosMeses, saldoAcumulado, transacoes]
  );
  const hojeISO = todayISO();
  const painelFin = useMemo(
    () =>
      calcularPainelFinanceiro({
        transacoes,
        mes: monthAnchor,
        hoje: hojeISO,
        caixaHoje: saldoAcumulado,
        faturadoNotas: financeStatsMes.faturado,
        mediaDespesas6m: saudeFinanceiraMes.mediaDespesas,
        pctImposto: parametrosFinanceiros.pctImposto,
        pctInss: parametrosFinanceiros.pctInss,
        pctReserva: parametrosFinanceiros.pctReserva,
        reservaDoMes,
      }),
    [transacoes, monthAnchor, hojeISO, saldoAcumulado, financeStatsMes, saudeFinanceiraMes, parametrosFinanceiros, reservaDoMes]
  );
  const finReceitasLista = useMemo(() => {
    const l = painelFin.receitas.filter((t) => !financeClienteFilter || t.clienteId === financeClienteFilter);
    return ordenarLancamentos(l);
  }, [painelFin, financeClienteFilter]);
  const finDespesasLista = useMemo(() => {
    const l = painelFin.despesas.filter((t) => !financeClienteFilter || t.clienteId === financeClienteFilter);
    return ordenarLancamentos(l);
  }, [painelFin, financeClienteFilter]);

  const relatorioSaudeFinanceira = useMemo(
    () => computeSaudeFinanceira(relatorioStatsMes, relatorioSaldoAcumulado, ultimosMesesRelatorio),
    [relatorioStatsMes, parametrosFinanceiros, ultimosMesesRelatorio, relatorioSaldoAcumulado, transacoes]
  );

  return (
    <div className="app">
      <style>{APP_CSS}</style>



      <div className="shell">
        <div className={"rail" + (railCollapsed ? " collapsed" : "")}>
          <div className="brand-block">
            <img src={fuzzLogo} alt="fuzz" className="brand-logo-img" />
          </div>
          <button
            className="rail-collapse-btn"
            onClick={() => setRailCollapsed(!railCollapsed)}
            title={railCollapsed ? "Expandir menu" : "Recolher menu"}
          >
            {railCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
          {MENU.map((item) => {
            if (item.divisor) return <div className="rail-divider" key={item.divisor} />;
            const aviso =
              item.id === "propostas-lista" ? followUps.length
              : item.id === "financeiro" ? financeStats.atrasadas
              : item.id === "recados" ? recadosNovos.length
              : 0;
            return (
              <button key={item.id} className={"rail-btn " + (tab === item.id ? "active" : "")} onClick={() => setTab(item.id)}>
                <item.Icone size={16} /> <span className="rail-label">{item.nome}</span>
                {aviso > 0 && <span className="rail-tag rail-tag-alert">{aviso}</span>}
              </button>
            );
          })}
        </div>

        <div className="right-col">
          <div className="topbar">
            <div>
              <p className="slate-title">Painel de Gestão</p>
            </div>
            <div className="topbar-icons">
              <button
                className={"icon-circle" + (hideValues ? " active" : "")}
                title={hideValues ? "Mostrar valores" : "Ocultar valores"}
                onClick={() => setHideValues(!hideValues)}
              >
                {hideValues ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
              <button
                className="icon-circle"
                title="Sair"
                onClick={() => supabase.auth.signOut()}
              >
                <LogOut size={16} />
              </button>
              <div className="topbar-search-wrap">
                <button
                  className={"icon-circle" + (searchOpen ? " active" : "")}
                  title="Buscar"
                  onClick={(e) => { e.stopPropagation(); setSearchOpen(!searchOpen); }}
                >
                  <Search size={16} />
                </button>
                {searchOpen && (
                  <div className="topbar-search-pop" onClick={(e) => e.stopPropagation()}>
                    <input
                      autoFocus
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Buscar clientes, demandas, propostas…"
                    />
                    {searchQuery.trim() && (
                      <div className="topbar-search-results">
                        {searchResults.length === 0 ? (
                          <div className="topbar-search-empty">Nada encontrado.</div>
                        ) : (
                          searchResults.map((r) => (
                            <button
                              key={r.type + r.id}
                              className="topbar-search-result"
                              onClick={() => { r.action(); setSearchOpen(false); setSearchQuery(""); }}
                            >
                              <span className="tsr-type">{r.typeLabel}</span>
                              <span className="tsr-label">{r.label}</span>
                              {r.sublabel && <span className="tsr-sub">{r.sublabel}</span>}
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="slate">
            {notifications.filter((n) => !dismissedNotifications.has(n.id)).length > 0 && (
              <div className="notifications-row">
                {notifications.filter((n) => !dismissedNotifications.has(n.id)).map((n) => (
                  <div key={n.id} className={"followup-banner tone-" + n.tone}>
                    <AlertTriangle size={13} />
                    <span>{n.text}</span>
                    <button className="followup-link" onClick={() => setTab(n.goto)}>{n.label}</button>
                    <button
                      className="followup-dismiss"
                      title="Remover notificação"
                      onClick={() => setDismissedNotifications((prev) => new Set(prev).add(n.id))}
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <StatsCarousel
              panels={[
                {
                  key: "producao",
                  label: "Resultados de produção",
                  content: (
                    <div className="stats-row">
                      <div className="stat"><div className="n">{stats.emAndamento}</div><div className="l">em andamento</div></div>
                      <div className="stat warn"><div className="n">{stats.atrasado}</div><div className="l">atrasadas</div></div>
                      <div className="stat wait"><div className="n">{stats.aguardando}</div><div className="l">aguard. cliente</div></div>
                    </div>
                  ),
                },
                {
                  key: "metas",
                  label: "Metas e conversão de propostas",
                  content: (
                    <div className="stats-row">
                      <div className="stat"><div className="n">{demandasStatsMes.finalizadas}/{demandasStatsMes.total}</div><div className="l">demandas no mês</div></div>
                      <div className="stat ready"><div className="n">{taxaConversaoPropostas}%</div><div className="l">conversão de propostas</div></div>
                      {metasResumoItems.map((m) => (
                        <div className="stat" key={m.key}><div className="n">{m.display}</div><div className="l">{m.label}</div></div>
                      ))}
                    </div>
                  ),
                },
              ]}
            />

            <div className="slate-stripe" />
          </div>

          <div className={"main" + (tab === "propostas" || tab === "calculadora" || tab === "contratos" ? " tool-frame-wrap" : "")}>
            {loading ? (
            <div className="empty">Carregando…</div>
          ) : tab === "inicio" ? (
            <>
              <div className="home-grid">
                <div className="home-left">
                  <h2 className="home-greeting">Bom trabalho, Vítor</h2>
                  <p className="home-date">{new Date(todayISO() + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}</p>
                  <div className="home-quick-stats">
                    <div className="stat warn"><div className="n">{stats.atrasado}</div><div className="l">demandas atrasadas</div></div>
                    <div className="stat wait"><div className="n">{followUps.length}</div><div className="l">propostas p/ follow up</div></div>
                    <div className="stat ready"><div className="n">{hideValues ? "••••" : "R$ " + financeStatsMes.recebido.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}</div><div className="l">recebido no mês</div></div>
                  </div>
                  <div className="home-quick-actions">
                    <button className="btn-ghost" onClick={() => { setTab("demandas"); setDemandForm(emptyDemand()); }}><Plus size={14} />Nova demanda</button>
                    <button className="btn-ghost" onClick={() => { setTab("clientes"); setClientForm(emptyClient()); }}><Plus size={14} />Novo cliente</button>
                    <button className="btn-ghost" onClick={() => { setTab("financeiro"); setTransacaoForm(emptyTransacao("Despesa")); }}><Plus size={14} />Nova despesa</button>
                    <button className="btn-ghost" onClick={() => { setTab("reunioes"); setNotaReuniaoForm(emptyNotaReuniao()); }}><Plus size={14} />Nota de reunião</button>
                  </div>
                </div>
                <div className="home-right">
                  {!colabErro && (
                    <>
                      <div className="home-card">
                        <h4><Calendar size={14} /> Cronograma dos clientes</h4>
                        <AvisosCronograma itens={agendaCliente} clientes={clients} onAbrir={() => setTab("cronograma")} />
                        <button className="btn-ghost" style={{ width: "100%", marginTop: 8 }} onClick={() => setTab("cronograma")}>Abrir cronograma</button>
                      </div>
                      <div className="home-card">
                        <h4><MessageCircle size={14} /> Recados{recadosNovos.length > 0 ? " · " + recadosNovos.length + (recadosNovos.length === 1 ? " novo" : " novos") : ""}</h4>
                        <div className="tm">
                          {recadosNovos.slice(0, 3).map((r) => (
                            <Recado key={r.id} r={r} onLido={(id) => gravarColab(api.marcarRecadoLido)(id).catch((e) => console.error("Falha ao marcar recado", e))} />
                          ))}
                          {recadosNovos.length === 0 && <div className="home-card-empty">Nenhum recado novo.</div>}
                        </div>
                        <button className="btn-ghost" style={{ width: "100%", marginTop: 8 }} onClick={() => setTab("recados")}>Escrever / ver todos</button>
                      </div>
                    </>
                  )}
                  <div className="home-card">
                    <h4><Calendar size={14} /> Compromissos de hoje</h4>
                    {!googleToken ? (
                      <div className="home-card-empty">
                        <button className="btn-ghost" style={{ fontSize: 11.5, padding: "5px 10px" }} onClick={conectarGoogleAgenda} disabled={googleConectando}>
                          {googleConectando ? "Conectando…" : "Conectar Google Agenda"}
                        </button>
                      </div>
                    ) : googleEventosHojeCarregando ? (
                      <div className="home-card-empty">Carregando…</div>
                    ) : googleEventosHoje.length === 0 ? (
                      <div className="home-card-empty">Nenhum compromisso na agenda hoje.</div>
                    ) : (
                      googleEventosHoje.map((ev) => {
                        const horaIni = (ev.start?.dateTime || "").slice(11, 16);
                        const horaFim = (ev.end?.dateTime || "").slice(11, 16);
                        return (
                          <div key={ev.id} className="home-row" onClick={() => setTab("agenda")}>
                            <span className="home-row-dot tone-ok" />
                            <span className="home-row-title">{ev.summary || "(sem título)"}</span>
                            <span className="home-row-sub">{horaIni ? horaIni + (horaFim ? " - " + horaFim : "") : "dia todo"}</span>
                          </div>
                        );
                      })
                    )}
                  </div>
                  <div className="home-card">
                    <h4><Film size={14} /> Entregas de hoje</h4>
                    {homeHoje.entregas.length === 0 ? (
                      <div className="home-card-empty">Nenhuma entrega marcada para hoje.</div>
                    ) : (
                      homeHoje.entregas.map((d) => (
                        <div key={d.id} className="home-row" onClick={() => setDemandForm(d)}>
                          <span className={"home-row-dot tone-" + getUrgencia(d).tone} />
                          <span className="home-row-title">{d.projeto}</span>
                          <span className="home-row-sub">
                            {clientName(d.clienteId)}
                            {videoProgress(d) ? " · " + videoProgress(d).done + "/" + videoProgress(d).total + " vídeos" : ""}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="home-card">
                    <h4><DollarSign size={14} /> Pagamentos de hoje</h4>
                    {homeHoje.pagamentos.length === 0 ? (
                      <div className="home-card-empty">Nenhum pagamento previsto para hoje.</div>
                    ) : (
                      homeHoje.pagamentos.map((t) => (
                        <div key={t.id} className="home-row" onClick={() => setTransacaoForm(t)}>
                          <span className={"home-row-dot tone-" + (t.tipo === "Receita" ? "ok" : "late")} />
                          <span className="home-row-title">{t.descricao || "(sem descrição)"}</span>
                          <span className="home-row-sub">{hideValues ? "••••" : "R$ " + (parseFloat(t.valor) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="home-card">
                    <h4><LayoutGrid size={14} /> Kanban de hoje</h4>
                    {homeHoje.kanbanHoje.length === 0 ? (
                      <div className="home-card-empty">Nenhuma tarefa pendente para hoje.</div>
                    ) : (
                      homeHoje.kanbanHoje.map((k) => (
                        <div key={k.id} className="home-row home-row-kanban">
                          <input
                            type="checkbox"
                            checked={false}
                            onChange={(e) => { e.stopPropagation(); toggleKanbanTask(k.id); }}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <span className="home-row-title" onClick={() => setTab("kanban")}>{k.titulo}</span>
                          <span className="home-row-sub">{clientName(k.clienteId)}</span>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="home-card">
                    <h4><StickyNote size={14} /> Nota rápida</h4>
                    <div className="home-quicknote-row">
                      <input
                        value={quickNoteInput}
                        onChange={(e) => setQuickNoteInput(e.target.value)}
                        placeholder="Anotar algo pra direcionar depois…"
                        onKeyDown={(e) => { if (e.key === "Enter") handleAddQuickNote(); }}
                      />
                      <button className="icon-btn" onClick={handleAddQuickNote} disabled={!quickNoteInput.trim()}>
                        <Plus size={14} />
                      </button>
                    </div>
                    {notasRapidasPendentes.length === 0 ? (
                      <div className="home-card-empty">Nenhuma nota pendente de direcionamento.</div>
                    ) : (
                      notasRapidasPendentes.map((n) => (
                        <div key={n.id} className="home-row" onClick={() => setTab("kanban")}>
                          <span className="home-row-dot tone-wait" />
                          <span className="home-row-title">{n.titulo}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : tab === "demandas" ? (
            <>
              <div className="toolbar">
                <input placeholder="Buscar projeto…" value={search} onChange={(e) => setSearch(e.target.value)} />
                <FilterMenu
                  id="demandas"
                  openId={openFilterMenu}
                  setOpenId={setOpenFilterMenu}
                  activeCount={[filterCliente, demandTipoFilter, demandStatusFilter, demandDataInicio, demandDataFim].filter(Boolean).length}
                >
                  <div className="filter-menu-field">
                    <label>Cliente</label>
                    <select value={filterCliente} onChange={(e) => setFilterCliente(e.target.value)}>
                      <option value="">Todos os clientes</option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>{c.nome}</option>
                      ))}
                    </select>
                  </div>
                  <div className="filter-menu-field">
                    <label>Tipo</label>
                    <select value={demandTipoFilter} onChange={(e) => setDemandTipoFilter(e.target.value)}>
                      <option value="">Todos os tipos</option>
                      {tiposProducao.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="filter-menu-field">
                    <label>Status</label>
                    <select value={demandStatusFilter} onChange={(e) => setDemandStatusFilter(e.target.value)}>
                      <option value="">Todos os status</option>
                      {statusDemandas.map((s) => <option key={s.id} value={s.nome}>{s.nome}</option>)}
                    </select>
                  </div>
                  <div className="filter-menu-row">
                    <div className="filter-menu-field">
                      <label>Entrega de</label>
                      <input type="date" value={demandDataInicio} onChange={(e) => setDemandDataInicio(e.target.value)} />
                    </div>
                    <div className="filter-menu-field">
                      <label>Entrega até</label>
                      <input type="date" value={demandDataFim} onChange={(e) => setDemandDataFim(e.target.value)} />
                    </div>
                  </div>
                  {(filterCliente || demandTipoFilter || demandStatusFilter || demandDataInicio || demandDataFim) && (
                    <button
                      className="filter-menu-clear"
                      onClick={() => { setFilterCliente(""); setDemandTipoFilter(""); setDemandStatusFilter(""); setDemandDataInicio(""); setDemandDataFim(""); }}
                    >
                      Limpar filtros
                    </button>
                  )}
                </FilterMenu>
                <button className="btn-primary" onClick={() => setDemandForm(emptyDemand())}>
                  <Plus size={15} /> Nova demanda
                </button>
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "var(--text-dim)", margin: "-6px 0 6px" }}>
                <input type="checkbox" checked={mostrarFinalizadas} onChange={(e) => setMostrarFinalizadas(e.target.checked)} />
                Mostrar demandas finalizadas
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "var(--text-dim)", margin: "0 0 12px" }}>
                <input type="checkbox" checked={mostrarVideosAprovados} onChange={(e) => setMostrarVideosAprovados(e.target.checked)} />
                Mostrar vídeos finalizados
              </label>

              {filteredDemands.length === 0 ? (
                <div className="empty">Nenhuma demanda cadastrada ainda. Crie a primeira.</div>
              ) : (
                <div className="table-scroll"><table>
                  <thead>
                    <tr>
                      <th style={{ width: 22 }}></th>
                      <th style={{ width: 30 }}></th>
                      <th className="sortable-th" onClick={() => toggleDemandSort("projeto")}>
                        Projeto {demandSortKey === "projeto" ? (demandSortDir === "asc" ? "▲" : "▼") : ""}
                      </th>
                      <th className="sortable-th" onClick={() => toggleDemandSort("cliente")}>
                        Cliente {demandSortKey === "cliente" ? (demandSortDir === "asc" ? "▲" : "▼") : ""}
                      </th>
                      <th className="sortable-th" onClick={() => toggleDemandSort("status")}>
                        Status {demandSortKey === "status" ? (demandSortDir === "asc" ? "▲" : "▼") : ""}
                      </th>
                      <th className="sortable-th" onClick={() => toggleDemandSort("urgencia")}>
                        Urgência {demandSortKey === "urgencia" ? (demandSortDir === "asc" ? "▲" : "▼") : ""}
                      </th>
                      <th className="sortable-th" onClick={() => toggleDemandSort("entrega")}>
                        Entrega {demandSortKey === "entrega" ? (demandSortDir === "asc" ? "▲" : "▼") : ""}
                      </th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDemands.map((d) => {
                      const urg = getUrgencia(d);
                      const prog = videoProgress(d);
                      const expanded = expandedDemands.has(d.id);
                      return (
                        <React.Fragment key={d.id}>
                          <tr
                            className={prog ? "clickable-row" : ""}
                            onClick={() => prog && toggleExpandDemand(d.id)}
                            onDragOver={(e) => { if (!demandSortKey && draggedDemandId) e.preventDefault(); }}
                            onDrop={(e) => { e.preventDefault(); if (!demandSortKey && draggedDemandId) { reordenarDemandas(draggedDemandId, d.id); setDraggedDemandId(null); } }}
                          >
                            <td onClick={(e) => e.stopPropagation()}>
                              <span
                                className={"demand-drag-handle" + (demandSortKey ? " disabled" : "")}
                                draggable={!demandSortKey}
                                onDragStart={() => !demandSortKey && setDraggedDemandId(d.id)}
                                onDragEnd={() => setDraggedDemandId(null)}
                                title={demandSortKey ? "Limpe a ordenação por coluna pra arrastar" : "Arrastar para reordenar"}
                              >
                                <GripVertical size={14} />
                              </span>
                            </td>
                            <td>
                              {prog && <span className="expand-btn" title="Ver vídeos">{expanded ? "▾" : "▸"}</span>}
                            </td>
                            <td className="proj">
                              {d.projeto || "(sem nome)"}
                              {prog && (
                                <span className="badge badge-neutral" style={{ marginLeft: 8, fontWeight: 500 }}>
                                  {prog.done}/{prog.total} vídeos
                                </span>
                              )}
                            </td>
                            <td>{clientName(d.clienteId)}</td>
                            <td onClick={(e) => e.stopPropagation()}>
                              <select
                                className="demand-status-select"
                                value={d.status}
                                onChange={(e) => updateDemandField(d.id, "status", e.target.value)}
                                style={{ borderLeft: "3px solid " + corStatusDemanda(d.status) }}
                              >
                                {statusDemandas.map((s) => <option key={s.id} value={s.nome}>{s.nome}</option>)}
                              </select>
                            </td>
                            <td><span className={"badge " + TONE_CLASS[urg.tone]}>{urg.label}</span></td>
                            <td className="mono">{fmtDate(d.dataEntrega)}</td>
                            <td onClick={(e) => e.stopPropagation()}>
                              <div className="row-actions">
                                <button className="icon-btn" onClick={() => setDemandForm(d)}><Pencil size={13} /></button>
                                <button className="icon-btn" onClick={() => setConfirmDelete({ type: "demand", id: d.id, label: d.projeto })}><Trash2 size={13} /></button>
                              </div>
                            </td>
                          </tr>
                          {expanded && prog && (
                            <tr className="video-subrow">
                              <td colSpan={8}>
                                <div className="video-sublist">
                                  {d.itens.map((v, idx) => {
                                    if (v.status === "Finalizada" && !mostrarVideosAprovados) return null;
                                    const cor = corStatusVideo(v, coresStatus);
                                    return (
                                      <div
                                        key={v.id}
                                        className="video-subrow-item"
                                        style={cor ? { background: `color-mix(in srgb, ${cor} 18%, transparent)` } : undefined}
                                        onDragOver={(e) => { if (draggedVideoId) e.preventDefault(); }}
                                        onDrop={(e) => { e.preventDefault(); if (draggedVideoId) { reordenarVideos(d.id, draggedVideoId, v.id); setDraggedVideoId(null); } }}
                                      >
                                        <span
                                          className="demand-drag-handle"
                                          draggable
                                          onDragStart={(e) => { e.stopPropagation(); setDraggedVideoId(v.id); }}
                                          onDragEnd={() => setDraggedVideoId(null)}
                                          onClick={(e) => e.stopPropagation()}
                                          title="Arrastar para reordenar"
                                        >
                                          <GripVertical size={14} />
                                        </span>
                                        <span className="video-subrow-name">{v.nome || "Vídeo " + (idx + 1)}</span>
                                        <input
                                          type="date"
                                          value={v.dataEntrega || ""}
                                          onChange={(e) => updateVideoField(d.id, v.id, "dataEntrega", e.target.value)}
                                          onClick={(e) => e.stopPropagation()}
                                          title="Data de entrega"
                                        />
                                        <select
                                          value={v.status}
                                          onChange={(e) => updateVideoField(d.id, v.id, "status", e.target.value)}
                                          onClick={(e) => e.stopPropagation()}
                                          style={{ borderLeft: "3px solid " + corDoStatusComMapa(coresStatus, "video", v.status) }}
                                        >
                                          {statusDemandas.map((s) => <option key={s.id} value={s.nome}>{s.nome}</option>)}
                                        </select>
                                      </div>
                                    );
                                  })}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table></div>
              )}
            </>
          ) : tab === "reunioes" ? (
            <>
              <div className="toolbar">
                <select value={notaReuniaoFiltroCliente} onChange={(e) => setNotaReuniaoFiltroCliente(e.target.value)}>
                  <option value="">Todos os clientes</option>
                  <option value="__sem_cliente__">Sem cliente vinculado</option>
                  {clients.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
                <button className="btn-primary" onClick={() => setNotaReuniaoForm(emptyNotaReuniao())}>
                  <Plus size={14} />Nova nota
                </button>
              </div>
              {notasReuniaoFiltradas.length === 0 ? (
                <div className="empty">Nenhuma nota registrada ainda.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {notasReuniaoFiltradas.map((nt) => (
                    <div key={nt.id} className="metas-card" style={{ cursor: "pointer" }} onClick={() => setNotaReuniaoForm(nt)}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                        <b>{nt.titulo || "Sem título"}</b>
                        <span style={{ fontSize: 12, color: "var(--text-dim)", flexShrink: 0 }}>{fmtDate(nt.data)}</span>
                      </div>
                      <div style={{ fontSize: 12.5, color: "var(--text-dim)", marginTop: 4 }}>
                        {nt.clienteId ? clientName(nt.clienteId) : (nt.clienteNomeLivre || "Sem cliente vinculado")}
                      </div>
                      {nt.conteudo && (
                        <div style={{ fontSize: 13, marginTop: 10, whiteSpace: "pre-wrap", color: "var(--text)" }}>{nt.conteudo}</div>
                      )}
                      <div style={{ display: "flex", justifyContent: "flex-end", gap: 4, marginTop: 10 }} onClick={(e) => e.stopPropagation()}>
                        <button className="icon-btn" onClick={() => setNotaReuniaoForm(nt)}><Pencil size={13} /></button>
                        <button className="icon-btn" onClick={() => setConfirmDelete({ type: "notaReuniao", id: nt.id, label: nt.titulo || "nota de reunião" })}><Trash2 size={13} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : tab === "cronograma" ? (
            <>
              {colabErro && <p className="config-hint" style={{ color: "var(--amber)" }}>Para salvar itens, rode a migração 025 no Supabase e recarregue a página.</p>}
              <Calendario
                itens={agendaCliente}
                clientes={clientesAtivos}
                podeEditar
                onSalvar={gravarColab(api.salvarAgenda)}
                onExcluir={gravarColab(api.excluirAgenda)}
              />
            </>
          ) : tab === "recados" ? (
            <div style={{ maxWidth: 720 }}>
              {colabErro ? (
                <p className="config-hint" style={{ color: "var(--amber)" }}>Para usar os recados, rode a migração 025 no Supabase e recarregue a página.</p>
              ) : (
                <Recados
                  recados={meusRecados}
                  pessoas={pessoasRecado}
                  clientes={clientesAtivos}
                  onEnviar={gravarColab(api.enviarRecadoDono)}
                  onLido={gravarColab(api.marcarRecadoLido)}
                  onExcluir={gravarColab(api.excluirRecado)}
                />
              )}
            </div>
          ) : tab === "clientes" ? (
            <>
              <div className="toolbar">
                <AlternarVisao visao={clientView} onMudar={setClientView} />
                <button className="btn-primary" onClick={() => setClientForm(emptyClient())}>
                  <Plus size={15} /> Novo cliente
                </button>
              </div>
              {clients.some((c) => c.rascunho) && (
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "var(--text-dim)", margin: "-6px 0 12px" }}>
                  <input type="checkbox" checked={mostrarClientesRascunho} onChange={(e) => setMostrarClientesRascunho(e.target.checked)} />
                  Mostrar clientes em rascunho (proposta ainda não confirmada)
                </label>
              )}
              {clientesVisiveis.length === 0 ? (
                <div className="empty">Nenhum cliente cadastrado ainda. Crie o primeiro.</div>
              ) : (
                <ListaClientes
                  clientes={clientesVisiveis}
                  visao={clientView}
                  totalDemandas={(id) => demands.filter((d) => d.clienteId === id).length}
                  onAbrir={setClientViewInfo}
                  acoesDaLinha={(c) => (
                    <div className="row-actions">
                      <button className="icon-btn" onClick={() => setClientForm(c)}><Pencil size={13} /></button>
                      <button className="icon-btn" onClick={() => setConfirmDelete({ type: "client", id: c.id, label: c.nome })}><Trash2 size={13} /></button>
                    </div>
                  )}
                />
              )}
            </>
          ) : tab === "propostas-lista" ? (
            <>
              {proposals.length === 0 ? (
                <div className="empty">Nenhuma proposta enviada do Gerador ainda. Ao clicar em "Salvar cliente e proposta no Painel" lá dentro, ela aparece aqui.</div>
              ) : (
                <>
                  <div className="toolbar">
                    <FilterMenu
                      id="propostas"
                      openId={openFilterMenu}
                      setOpenId={setOpenFilterMenu}
                      activeCount={(proposalClienteFilter ? 1 : 0) + (proposalStatusFilter !== "Pendente" ? 1 : 0)}
                    >
                      <div className="filter-menu-field">
                        <label>Cliente</label>
                        <select value={proposalClienteFilter} onChange={(e) => setProposalClienteFilter(e.target.value)}>
                          <option value="">Todos os clientes</option>
                          {clients.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                        </select>
                      </div>
                      <div className="filter-menu-field">
                        <label>Status</label>
                        <select value={proposalStatusFilter} onChange={(e) => setProposalStatusFilter(e.target.value)}>
                          <option value="Pendente">Aguardando</option>
                          <option value="Confirmada">Aprovadas</option>
                          <option value="Recusada">Recusadas</option>
                          <option value="">Todos os status</option>
                        </select>
                      </div>
                      {(proposalClienteFilter || proposalStatusFilter !== "Pendente") && (
                        <button className="filter-menu-clear" onClick={() => { setProposalClienteFilter(""); setProposalStatusFilter("Pendente"); }}>
                          Limpar filtros
                        </button>
                      )}
                    </FilterMenu>
                  </div>
                <div className="table-scroll"><table>
                  <thead>
                    <tr>
                      <th>Número</th>
                      <th>Cliente</th>
                      <th>Tipo</th>
                      <th>Data de geração</th>
                      <th
                        onClick={() => setProposalValorSort(proposalValorSort === "desc" ? "asc" : "desc")}
                        style={{ cursor: "pointer", userSelect: "none" }}
                        title="Ordenar por valor"
                      >
                        Valor {proposalValorSort === "asc" ? "▲" : proposalValorSort === "desc" ? "▼" : ""}
                      </th>
                      <th>Status</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProposals.length === 0 ? (
                      <tr><td colSpan={7} className="empty">Nenhuma proposta encontrada com esses filtros.</td></tr>
                    ) : filteredProposals.map((p) => {
                      const alerta = precisaFollowUp(p);
                      return (
                        <tr key={p.id}>
                          <td className="mono">{p.numero || "—"}</td>
                          <td className="proj">{p.clienteNome}</td>
                          <td>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                              <span style={{ width: 8, height: 8, borderRadius: "50%", background: corDoStatusComMapa(coresStatus, "tipo", p.tipo), flexShrink: 0 }} />
                              {p.tipo}
                            </span>
                          </td>
                          <td className="mono">{fmtDate(p.dataGeracao)}{alerta && <span className="badge badge-late" style={{ marginLeft: 8 }}>follow up</span>}</td>
                          <td className="mono">R$ {Number(p.valorTotal || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                          <td>
                            <span className={"badge " + (p.status === "Confirmada" ? "badge-done" : p.status === "Recusada" ? "badge-neutral" : "badge-wait")}>
                              {p.status}
                            </span>
                          </td>
                          <td>
                            <div className="row-actions">
                              {p.status === "Pendente" && (
                                <>
                                  <button className="icon-btn" title="Confirmar proposta" onClick={() => confirmarProposta(p)}><CheckCircle2 size={13} /></button>
                                  <button className="icon-btn" title="Recusar proposta" onClick={() => recusarProposta(p)}><X size={13} /></button>
                                </>
                              )}
                              <button
                                className="icon-btn"
                                title="Importar para contrato"
                                onClick={() => importarPropostaParaContrato(p)}
                              >
                                <FileSignature size={13} />
                              </button>
                              <button
                                className="icon-btn"
                                title="Excluir proposta"
                                onClick={() => setConfirmDelete({ type: "proposta", id: p.id, label: p.clienteNome + " — " + (p.numero || "sem número") })}
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table></div>
                </>
              )}
            </>
          ) : tab === "financeiro" ? (
            (() => {
              const brl = (v) => "R$ " + v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
              const brlSinal = (v) => (v < 0 ? "−" : "+") + brl(Math.abs(v));
              const fmtDM = (iso) => (iso ? iso.slice(8, 10) + "/" + iso.slice(5, 7) : "");
              const [anoSel, mesSel] = monthAnchor.split("-").map(Number);
              const mesLongo = MESES_LONGOS[mesSel - 1];
              const ehMesAtual = monthAnchor === mesRef(hojeISO);
              const p = painelFin;
              const pr = p.provisao;
              const mesSeguinteLongo = MESES_LONGOS[Number(pr.mesSeguinte.slice(5, 7)) - 1].toLowerCase();
              const negativo = p.saldoPrevisto < 0;
              const dep = p.dependencia;
              const corCategoria = (nome) => tags.find((x) => x.nome === nome)?.cor || "#6b7078";
              const pagasDespesas = finDespesasLista.filter((t) => t.statusPagamento === "Pago");
              const aPagarDespesas = finDespesasLista.filter((t) => t.statusPagamento !== "Pago");
              const somaLista = (l) => l.reduce((s, t) => s + (parseFloat(t.valor) || 0), 0);
              const abrirExcluir = (t) => setConfirmDelete({ type: "transacao", id: t.id, label: t.descricao, parcelaGrupoId: t.parcelaGrupoId });
              const transacaoPorId = (id) => transacoes.find((x) => x.id === id);

              function acaoAlerta(a) {
                const t = a.transacaoId ? transacaoPorId(a.transacaoId) : null;
                if (a.acao === "cobrar" && t) {
                  const cli = clients.find((c) => c.id === t.clienteId);
                  const link = cli ? linkWhatsApp(cli.telefone) : "";
                  if (link) {
                    const msg = "Olá! Tudo bem? Passando para lembrar do pagamento de " + (t.descricao || "nossa última entrega") + ", no valor de " + brl(parseFloat(t.valor) || 0) + " (vencimento " + fmtDate(t.data) + "). Qualquer dúvida é só falar!";
                    window.open(link + "?text=" + encodeURIComponent(msg), "_blank", "noopener");
                  } else {
                    setTransacaoForm(t);
                  }
                } else if (a.acao === "pagar" && t) {
                  toggleStatusPagamento(t);
                } else if (a.acao === "emitir-nota" && t) {
                  toggleNotaEmitida(t);
                } else if (a.acao === "categorizar" && t) {
                  setTransacaoForm(t);
                } else if (a.acao === "guardar") {
                  setTransacaoForm({
                    ...emptyTransacao("Despesa"),
                    categoria: CATEGORIA_DESPESA_RESERVA,
                    descricao: "Reserva " + mesLabel(monthAnchor),
                    valor: String(a.valor),
                    data: ehMesAtual ? hojeISO : monthAnchor + "-05",
                  });
                }
              }
              const ROTULO_ACAO = { cobrar: "Cobrar", pagar: "Pagar", "emitir-nota": "Emitir nota", categorizar: "Categorizar", guardar: "Guardar" };
              function subtituloAlerta(a) {
                if (a.id.startsWith("rec-atr-")) return [clientName(a.clienteId) !== "—" ? clientName(a.clienteId) : null, "há " + a.dias + (a.dias === 1 ? " dia" : " dias"), brl(a.valor)].filter(Boolean).join(" · ");
                if (a.id.startsWith("desp-atr-")) return "há " + a.dias + (a.dias === 1 ? " dia" : " dias") + " · " + brl(a.valor);
                if (a.id.startsWith("sem-nf-")) return [clientName(a.clienteId) !== "—" ? clientName(a.clienteId) : null, brl(a.valor) + " vence " + fmtDM(a.data)].filter(Boolean).join(" · ");
                if (a.id === "sem-categoria") return a.nomes.slice(0, 3).join(", ") + (a.nomes.length > 3 ? "…" : "") + " · " + brl(a.valor);
                if (a.id === "reserva") return "Sugestão: " + brl(a.valor) + " (" + a.pct.toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + "% do faturado)";
                return "";
              }

              function renderLinha(t, receita) {
                const st = getStatusPagamentoEfetivo(t);
                const pago = st === "Pago";
                const demanda = demands.find((d) => d.id === t.demandaId);
                const [, mm, dd] = (t.data || "--").split("-");
                const retirada = t.tipoReceita === TIPO_RECEITA_RETIRADA_RESERVA;
                const cliente = clientName(t.clienteId);
                const partesSub = [];
                if (receita) {
                  if (cliente !== "—") partesSub.push(cliente + (demanda ? " · " + demanda.projeto : ""));
                  else if (demanda) partesSub.push(demanda.projeto);
                  else if (retirada) partesSub.push("Retirada da reserva");
                }
                return (
                  <div key={t.id} className={"fz-lrow" + (pago ? " is-dim" : "")}>
                    <div className={"fz-date" + (st === "Atrasado" ? " late" : "")}>
                      <b>{dd || "—"}</b>
                      <span>{mm ? MONTH_LABELS_SHORT[Number(mm) - 1] : ""}</span>
                    </div>
                    <div className="fz-lmain">
                      <p className="fz-ttl">
                        {t.descricao || "(sem descrição)"}
                        {t.parcelaGrupoId && <span className="fz-parcela">{t.parcelaAtual}/{t.parcelaTotal}</span>}
                      </p>
                      <p className="fz-sub">
                        {receita ? (
                          <>
                            {partesSub.length > 0 && <span>{partesSub.join(" · ")}</span>}
                            {!retirada && (
                              <button
                                type="button"
                                className={"fz-nf " + (t.notaEmitida ? "ok" : "sem")}
                                onClick={() => toggleNotaEmitida(t)}
                                title={t.notaEmitida ? "Nota emitida em " + fmtDate(t.dataNotaEmitida) + " — clique para desmarcar" : "Clique para marcar a nota como emitida hoje"}
                              >
                                {t.notaEmitida ? "NF " + fmtDM(t.dataNotaEmitida) : "Sem NF"}
                              </button>
                            )}
                          </>
                        ) : (
                          <>
                            {t.categoria ? <span>{t.categoria}</span> : <span className="fz-sem-cat">{CATEGORIA_SEM}</span>}
                            {t.natureza === "Fixa" && <span> · fixa</span>}
                          </>
                        )}
                      </p>
                    </div>
                    <div className="fz-lvalor">{brl(parseFloat(t.valor) || 0)}</div>
                    <button
                      type="button"
                      className={"fz-chip " + (pago ? "ok" : st === "Atrasado" ? "late" : "wait")}
                      onClick={() => toggleStatusPagamento(t)}
                      title={receita ? "Clique para alternar recebido/pendente" : "Clique para alternar pago/pendente"}
                    >
                      {pago ? (receita ? "Recebido" : "Pago") : st === "Atrasado" ? "Atrasado" : receita ? "A receber" : "A pagar"}
                    </button>
                    <div className="fz-lactions">
                      <button className="icon-btn" onClick={() => setTransacaoForm(t)} title="Editar"><Pencil size={13} /></button>
                      <button className="icon-btn" onClick={() => abrirExcluir(t)} title="Excluir"><Trash2 size={13} /></button>
                    </div>
                  </div>
                );
              }

              return (
                <div className="fz-fin">
                  <div className="fz-head">
                    <div>
                      <div className="fz-eyebrow">Financeiro</div>
                      <div className="fz-title-row">
                        <button className="icon-btn" onClick={() => setMonthAnchor(addMonthsISO(monthAnchor, -1))} title="Mês anterior"><ChevronLeft size={14} /></button>
                        <h2 className="fz-title">{mesLongo} {anoSel}</h2>
                        <button className="icon-btn" onClick={() => setMonthAnchor(addMonthsISO(monthAnchor, 1))} title="Próximo mês"><ChevronRight size={14} /></button>
                        {!ehMesAtual && (
                          <button className="btn-ghost kanban-today-btn" onClick={() => setMonthAnchor(mesRef(hojeISO))}>Mês atual</button>
                        )}
                      </div>
                    </div>
                    <div className="fz-head-actions">
                      <FilterMenu
                        id="financeiro"
                        openId={openFilterMenu}
                        setOpenId={setOpenFilterMenu}
                        align="right"
                        activeCount={financeClienteFilter ? 1 : 0}
                      >
                        <div className="filter-menu-field">
                          <label>Cliente (só nas listas de lançamentos)</label>
                          <select value={financeClienteFilter} onChange={(e) => setFinanceClienteFilter(e.target.value)}>
                            <option value="">Todos os clientes</option>
                            {clients.map((c) => (
                              <option key={c.id} value={c.id}>{c.nome}</option>
                            ))}
                          </select>
                        </div>
                        {financeClienteFilter && (
                          <button className="filter-menu-clear" onClick={() => setFinanceClienteFilter("")}>Limpar filtros</button>
                        )}
                      </FilterMenu>
                      <button className="fz-btn fz-btn-in" onClick={() => setTransacaoForm({ ...emptyTransacao("Receita"), categoria: tiposProducao[0] || "", tipoReceita: tiposReceita[0] || "", data: monthAnchor + "-05" })}>
                        <Plus size={15} /> Receita
                      </button>
                      <button className="fz-btn fz-btn-out" onClick={() => setTransacaoForm({ ...emptyTransacao("Despesa"), data: monthAnchor + "-05" })}>
                        <span className="fz-minus">−</span> Despesa
                      </button>
                    </div>
                  </div>

                  {/* A conta do mês */}
                  <div className="fz-hero">
                    <div className="fz-card fz-hero-card">
                      <div className="fz-label">{ehMesAtual ? "Caixa hoje" : "Caixa acumulado"}</div>
                      <div className={"fz-big" + (p.caixaHoje < 0 ? " neg" : "")}>{brl(p.caixaHoje)}</div>
                      <div className="fz-hint">Saldo acumulado até {fmtDM(ehMesAtual ? hojeISO : p.fimMes)}</div>
                    </div>
                    <span className="fz-op">+</span>
                    <div className="fz-card fz-hero-card">
                      <div className="fz-label in">A receber</div>
                      <div className="fz-big in">{brl(p.aReceber)}</div>
                      <div className="fz-bar"><i className="in" style={{ width: p.pctRecebido + "%" }} /></div>
                      <div className="fz-hint">{brl(p.recebido)} recebido de {brl(p.totalReceitas)} ({p.pctRecebido}%)</div>
                    </div>
                    <span className="fz-op">−</span>
                    <div className="fz-card fz-hero-card">
                      <div className="fz-label out">A pagar</div>
                      <div className="fz-big out">{brl(p.aPagar)}</div>
                      <div className="fz-bar"><i className="out" style={{ width: p.pctPago + "%" }} /></div>
                      <div className="fz-hint">{brl(p.pago)} pago de {brl(p.totalDespesas)} ({p.pctPago}%)</div>
                    </div>
                    <span className="fz-op">=</span>
                    <div className={"fz-card fz-hero-card fz-hero-main" + (negativo ? " neg" : "")}>
                      <div className="fz-label">Saldo previsto em {fmtDM(p.fimMes)}</div>
                      <div className={"fz-big" + (negativo ? " neg" : "")}>{brl(p.saldoPrevisto)}</div>
                      <div className="fz-hint">
                        Resultado do mês: <b className={p.resultadoMes < 0 ? "out" : "in"}>{brlSinal(p.resultadoMes)}</b>
                      </div>
                      <div className="fz-hint">receitas {brl(p.totalReceitas)} − despesas {brl(p.totalDespesas)}</div>
                      {p.anterioresAbertos > 0 && (
                        <div className="fz-hint warn">Inclui {p.anterioresAbertos} {p.anterioresAbertos === 1 ? "lançamento aberto" : "lançamentos abertos"} de meses anteriores ({brlSinal(p.anterioresLiquido)})</div>
                      )}
                    </div>
                  </div>

                  {/* Agenda + atenção */}
                  <div className="fz-row-2">
                    <div className="fz-card">
                      <div className="fz-card-title">{ehMesAtual ? "Daqui até o fim do mês" : "Pendências até o fim do mês"}</div>
                      {dep && dep.tipo === "negativo" && (
                        <div className="fz-alert-box red">
                          O caixa fica negativo em <b>{fmtDM(dep.data)}</b>{dep.causa ? <>, quando sai <b>{dep.causa}</b></> : null}.
                        </div>
                      )}
                      {dep && dep.tipo === "depende" && (
                        <div className="fz-alert-box">
                          O mês depende da <b>{(dep.cliente && clientName(dep.cliente) !== "—" ? clientName(dep.cliente) : dep.descricao) + " (" + brl(dep.valor) + " em " + fmtDM(dep.dataReceita) + ")"}</b>. Se atrasar, o caixa fica negativo a partir de {fmtDM(dep.dataNegativo)}{dep.causa ? <>, quando sai <b>{dep.causa}</b></> : null}.
                        </div>
                      )}
                      {p.agenda.length === 0 ? (
                        <div className="empty">Nada pendente até o fim do mês.</div>
                      ) : (
                        <div className="fz-agenda">
                          <div className="fz-trow fz-thead">
                            <span>Data</span><span>Lançamento</span><span className="r">Valor</span><span className="r fz-col-saldo">Saldo após</span>
                          </div>
                          {p.agenda.map((a) => (
                            <div className="fz-trow" key={a.t.id}>
                              <span className={"num" + (a.atrasado ? " late" : " muted")}>{fmtDM(a.data)}</span>
                              <span className="fz-trow-desc">
                                {a.t.descricao || "(sem descrição)"}
                                {a.atrasado && <span className="fz-chip late fz-chip-sm">Atrasado</span>}
                              </span>
                              <span className={"num r " + (a.sinal > 0 ? "in" : "out")}>{brlSinal(a.sinal * a.valor)}</span>
                              <span className={"num r bal fz-col-saldo" + (a.saldoApos < 0 ? " neg" : "")}>{brl(a.saldoApos)}</span>
                            </div>
                          ))}
                          <div className="fz-trow fz-tfoot">
                            <span />
                            <span>Saldo previsto em {fmtDM(p.fimMes)}</span>
                            <span />
                            <span className={"num r bal fz-col-saldo" + (negativo ? " neg" : "")}>{brl(p.saldoPrevisto)}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="fz-card">
                      <div className="fz-card-title">Precisa de atenção</div>
                      {p.alertas.length === 0 ? (
                        <div className="fz-ok-state">Tudo em dia ✓</div>
                      ) : (
                        <div className="fz-alerts">
                          {p.alertas.map((a) => (
                            <div className="fz-alert" key={a.id}>
                              <i className={"fz-dot " + a.nivel} />
                              <div className="fz-alert-body">
                                <p className="fz-ttl">{a.titulo}</p>
                                <p className="fz-sub">{subtituloAlerta(a)}</p>
                              </div>
                              <button className="fz-alert-btn" onClick={() => acaoAlerta(a)}>{ROTULO_ACAO[a.acao]}</button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                  </div>

                  {/* Fôlego + categorias */}
                  <div className="fz-row-2 even">
                    <div className="fz-card">
                      <div className="fz-card-title fz-card-title-row">
                        <span>Fôlego da empresa</span>
                        <div className="filter-menu">
                          <button
                            type="button"
                            className="icon-btn"
                            title="Mais ações"
                            onClick={(e) => { e.stopPropagation(); setOpenFilterMenu(openFilterMenu === "folego-menu" ? null : "folego-menu"); }}
                          >
                            <MoreHorizontal size={14} />
                          </button>
                          {openFilterMenu === "folego-menu" && (
                            <div className="filter-menu-popover align-right" onClick={(e) => e.stopPropagation()}>
                              <button
                                className="btn-ghost"
                                style={{ width: "100%" }}
                                onClick={() => { setOpenFilterMenu(null); setRetiradaReservaForm({ valor: "", data: todayISO(), descricao: "" }); }}
                              >
                                Retirar da poupança
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      {p.folego.meses == null ? (
                        <div className="fz-hint">Ainda não há despesas suficientes nos últimos 6 meses para calcular.</div>
                      ) : (
                        <>
                          <p className="fz-folego-txt">
                            O caixa de hoje cobre <b>{p.folego.meses.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} {p.folego.meses >= 2 ? "meses" : "mês"}</b> de custos
                          </p>
                          <div className="fz-bar big"><i className={p.folego.pct >= 100 ? "in" : "amber"} style={{ width: p.folego.pct + "%" }} /></div>
                          <div className="fz-hint">
                            {brl(p.folego.caixa)} de {brl(p.folego.meta)} (meta de 6 meses · custo médio {brl(p.folego.media)}/mês)
                          </div>
                        </>
                      )}
                      <div className="fz-hint" style={{ marginTop: 8 }}>Guardado na reserva: {brl(reservaAcumulada)}</div>
                    </div>
                    <div className="fz-card">
                      <div className="fz-card-title">Separar para {mesSeguinteLongo}</div>
                      <div className="fz-prov">
                        <div className="fz-prov-line">
                          <div>
                            <p className="fz-ttl">Simples Nacional</p>
                            <p className="fz-sub">{pr.pctImposto.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}% de {brl(pr.faturadoNotas)} em notas · vence {fmtDM(pr.vencimento)}</p>
                          </div>
                          <b className="num">{brl(pr.simples)}</b>
                        </div>
                        <div className="fz-prov-line">
                          <div>
                            <p className="fz-ttl">INSS sobre pró-labore</p>
                            <p className="fz-sub">{pr.pctInss.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}% de {brl(pr.proLaboreTotal)} · vence {fmtDM(pr.vencimento)}</p>
                          </div>
                          <b className="num">{brl(pr.inss)}</b>
                        </div>
                        <div className="fz-prov-line total">
                          <p className="fz-ttl">Total a provisionar</p>
                          <b className="num">{brl(pr.total)}</b>
                        </div>
                        <div className={"fz-seal " + (pr.fatorROk ? "ok" : "bad")}>
                          {pr.fatorROk
                            ? "Fator R ok · pró-labore " + brl(pr.proLaboreTotal) + " ≥ " + brl(pr.fatorRMinimo) + " (28% das notas)"
                            : "Fator R abaixo do mínimo · faltam " + brl(pr.fatorRFalta) + " de pró-labore (28% das notas = " + brl(pr.fatorRMinimo) + ")"}
                        </div>
                      </div>
                      {!parametrosFinanceiros.pctImposto && (
                        <p className="config-hint" style={{ marginTop: 12 }}>Configure o imposto em Configurações → Saúde financeira para calcular a provisão.</p>
                      )}
                    </div>

                  </div>

                  {/* Lançamentos (+ provisão sob as receitas) */}
                  <div className="fz-row-2 even">
                    <div className="fz-col">
                      <div className="fz-card">
                        <div className="fz-card-title fz-card-title-row">
                          <span>Receitas</span>
                          <span className="fz-total in">{brl(somaLista(finReceitasLista))}</span>
                        </div>
                        {finReceitasLista.length === 0 ? (
                          <div className="empty">Nenhuma receita neste mês. Receitas de propostas confirmadas aparecem automaticamente.</div>
                        ) : (
                          <div className="fz-list">
                            {finReceitasLista.map((t) => renderLinha(t, true))}
                          </div>
                        )}
                      </div>


                    <div className="fz-card">
                      <div className="fz-card-title">Para onde vai o dinheiro</div>
                      {p.categorias.length === 0 ? (
                        <div className="empty">Sem despesas neste mês.</div>
                      ) : (
                        <div className="fz-cats">
                          {p.categorias.map((c) => {
                            const sem = c.nome === CATEGORIA_SEM;
                            return (
                              <div className="fz-cat" key={c.nome}>
                                <div className="fz-cat-head">
                                  <span className={"fz-cat-nome" + (sem ? " sem" : "")}>{c.nome}</span>
                                  <span className="fz-cat-val">{c.pct.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}% · {brl(c.total)}</span>
                                </div>
                                <div className="fz-bar"><i style={{ width: c.pct + "%", background: sem ? "var(--amber)" : corCategoria(c.nome) }} /></div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    </div>
                    <div className="fz-card">
                      <div className="fz-card-title fz-card-title-row">
                        <span>Despesas</span>
                        <span className="fz-total out">{brl(somaLista(finDespesasLista))}</span>
                      </div>
                      {finDespesasLista.length === 0 ? (
                        <div className="empty">Nenhuma despesa neste mês.</div>
                      ) : (
                        <>
                          {aPagarDespesas.length > 0 && (
                            <>
                              <div className="fz-group-head"><span>A pagar · {brl(somaLista(aPagarDespesas))}</span></div>
                              <div className="fz-list">
                                {aPagarDespesas.map((t) => renderLinha(t, false))}
                              </div>
                            </>
                          )}
                          {pagasDespesas.length > 0 && (
                            <>
                              <div className="fz-group-head">
                                <span>Pagas · {brl(somaLista(pagasDespesas))}</span>
                                <button
                                  type="button"
                                  className="fz-link-btn"
                                  onClick={() => {
                                    const novo = !despesasPagasOcultas;
                                    setDespesasPagasOcultas(novo);
                                    try { localStorage.setItem("fin_despesas_pagas_ocultas", novo ? "1" : "0"); } catch {}
                                  }}
                                >
                                  {despesasPagasOcultas ? "Mostrar" : "Ocultar"}
                                </button>
                              </div>
                              {!despesasPagasOcultas && (
                                <div className="fz-list">
                                  {pagasDespesas.map((t) => renderLinha(t, false))}
                                </div>
                              )}
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()
          ) : tab === "metas" ? (
            <>
              <div className="month-nav">
                <button className="icon-btn" onClick={() => setMonthAnchor(addMonthsISO(monthAnchor, -1))}><ChevronLeft size={14} /></button>
                <div className="month-nav-label">{mesLabel(monthAnchor)}</div>
                <button className="icon-btn" onClick={() => setMonthAnchor(addMonthsISO(monthAnchor, 1))}><ChevronRight size={14} /></button>
                <button className="btn-ghost kanban-today-btn" onClick={() => setMonthAnchor(mesRef(todayISO()))}>Mês atual</button>
              </div>

              {(() => {
                const metaValor = parseFloat(metas[monthAnchor]) || 0;
                const faturado = financeStatsMes.faturado;
                const pct = metaValor > 0 ? Math.min(999, (faturado / metaValor) * 100) : 0;
                const falta = Math.max(0, metaValor - faturado);
                const confirmadas = proposals.filter((p) => p.status === "Confirmada" && p.valorTotal > 0);
                const ticketMedio = confirmadas.length > 0 ? confirmadas.reduce((s, p) => s + p.valorTotal, 0) / confirmadas.length : 0;
                const projetosFaltantes = ticketMedio > 0 ? Math.ceil(falta / ticketMedio) : null;

                const metaAnualValor = parseFloat(metasAnuais[anoAtual]) || 0;
                const pctAnual = metaAnualValor > 0 ? Math.min(999, (faturamentoAnual / metaAnualValor) * 100) : 0;

                const metaClientesValor = parseInt(metasClientesNovos[monthAnchor]) || 0;
                const pctClientes = metaClientesValor > 0 ? Math.min(999, (novosClientesMes / metaClientesValor) * 100) : 0;

                return (
                  <div className="metas-grid">
                    <div className="metas-card">
                      <h4>Meta de faturamento — {mesLabel(monthAnchor)}</h4>
                      {metaValor > 0 ? (
                        <>
                          <GoalGauge pct={pct} size={132} />
                          <div style={{ marginTop: 14 }}>
                            <div className="metas-line"><span>Meta</span><b>R$ {metaValor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</b></div>
                            <div className="metas-line"><span>Faturado no mês</span><b>R$ {faturado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</b></div>
                            <div className="metas-line"><span>Já recebido</span><b>R$ {financeStatsMes.recebido.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</b></div>
                            <div className="metas-line"><span>Falta atingir a meta</span><b>R$ {falta.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</b></div>
                            {ticketMedio > 0 && falta > 0 && (
                              <div className="metas-line"><span>No ticket médio atual (R$ {ticketMedio.toLocaleString("pt-BR", { minimumFractionDigits: 0 })})</span><b>~{projetosFaltantes} projeto{projetosFaltantes === 1 ? "" : "s"}</b></div>
                            )}
                          </div>
                        </>
                      ) : (
                        <div className="empty" style={{ padding: "20px 0" }}>Nenhuma meta definida pra este mês. Defina em Configurações → Metas.</div>
                      )}
                    </div>

                    <div className="metas-card">
                      <h4>Receita, despesa e margem — últimos 6 meses</h4>
                      <FinanceChart data={ultimosMeses} />
                      <div className="chart-legend">
                        <span className="chart-legend-item"><span className="chart-legend-swatch" style={{ background: "var(--teal)" }} />Receita</span>
                        <span className="chart-legend-item"><span className="chart-legend-swatch" style={{ background: "var(--red)" }} />Despesas</span>
                        <span className="chart-legend-item"><span className="chart-legend-swatch" style={{ background: "var(--amber)" }} />Margem</span>
                        {ultimosMeses.some((d) => d.meta > 0) && (
                          <span className="chart-legend-item"><span className="chart-legend-swatch" style={{ background: "var(--violet)" }} />Meta</span>
                        )}
                      </div>
                    </div>

                    <div className="metas-card">
                      <h4>Faturamento anual — {anoAtual}</h4>
                      {metaAnualValor > 0 ? (
                        <>
                          <GoalGauge pct={pctAnual} size={132} />
                          <div style={{ marginTop: 14 }}>
                            <div className="metas-line"><span>Meta do ano</span><b>R$ {metaAnualValor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</b></div>
                            <div className="metas-line"><span>Faturado em {anoAtual}</span><b>R$ {faturamentoAnual.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</b></div>
                            <div className="metas-line"><span>Falta atingir</span><b>R$ {Math.max(0, metaAnualValor - faturamentoAnual).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</b></div>
                          </div>
                        </>
                      ) : (
                        <div className="empty" style={{ padding: "20px 0" }}>Nenhuma meta anual definida. Defina em Configurações → Metas.</div>
                      )}
                    </div>

                    <div className="metas-card">
                      <h4>Novos clientes — {mesLabel(monthAnchor)}</h4>
                      {metaClientesValor > 0 ? (
                        <>
                          <GoalGauge pct={pctClientes} size={132} />
                          <div style={{ marginTop: 14 }}>
                            <div className="metas-line"><span>Meta de novos clientes</span><b>{metaClientesValor}</b></div>
                            <div className="metas-line"><span>Novos clientes cadastrados no mês</span><b>{novosClientesMes}</b></div>
                          </div>
                        </>
                      ) : (
                        <div className="empty" style={{ padding: "20px 0" }}>
                          Nenhuma meta definida. Defina em Configurações → Metas.
                          <br />Novos clientes cadastrados no mês: <b>{novosClientesMes}</b>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </>
          ) : tab === "equipamentos" ? (
            <>
              <div className="finance-cards" style={{ marginBottom: 16 }}>
                <div className="stat"><div className="n">{equipStats.total}</div><div className="l">total</div></div>
                <div className="stat ready"><div className="n">{equipStats.disponivel}</div><div className="l">disponíveis</div></div>
                <div className="stat wait"><div className="n">{equipStats.emUso}</div><div className="l">em uso</div></div>
                <div className="stat warn"><div className="n">{equipStats.manutencao}</div><div className="l">em manutenção</div></div>
                <div className="stat"><div className="n">{equipStats.emprestado}</div><div className="l">emprestados</div></div>
              </div>
              <div className="toolbar">
                <FilterMenu
                  id="equipamentos"
                  openId={openFilterMenu}
                  setOpenId={setOpenFilterMenu}
                  activeCount={[equipFiltroCategoria, equipFiltroStatus].filter(Boolean).length}
                >
                  <div className="filter-menu-field">
                    <label>Categoria</label>
                    <select value={equipFiltroCategoria} onChange={(e) => setEquipFiltroCategoria(e.target.value)}>
                      <option value="">Todas as categorias</option>
                      {categoriasEquipamento.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="filter-menu-field">
                    <label>Status</label>
                    <select value={equipFiltroStatus} onChange={(e) => setEquipFiltroStatus(e.target.value)}>
                      <option value="">Todos os status</option>
                      {STATUS_EQUIP.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  {(equipFiltroCategoria || equipFiltroStatus) && (
                    <button className="filter-menu-clear" onClick={() => { setEquipFiltroCategoria(""); setEquipFiltroStatus(""); }}>
                      Limpar filtros
                    </button>
                  )}
                </FilterMenu>
                <button className="btn-ghost" onClick={baixarModeloEquipamentos}>
                  <FileText size={14} style={{ verticalAlign: "-2px", marginRight: 4 }} />Baixar modelo
                </button>
                <button className="btn-ghost" onClick={() => equipFileInputRef.current?.click()}>
                  <Archive size={14} style={{ verticalAlign: "-2px", marginRight: 4 }} />Importar planilha
                </button>
                <input
                  type="file"
                  ref={equipFileInputRef}
                  accept=".xlsx,.xls,.csv"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) importarEquipamentosArquivo(file);
                    e.target.value = "";
                  }}
                />
                <button className="btn-primary" onClick={() => setEquipamentoForm(emptyEquipamento())}>
                  <Plus size={15} /> Novo equipamento
                </button>
              </div>
              {filteredEquipamentos.length === 0 ? (
                <div className="empty">Nenhum equipamento cadastrado ainda.</div>
              ) : (
                <div className="table-scroll"><table>
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>Categoria</th>
                      <th>Status</th>
                      <th>Responsável / Local</th>
                      <th>Nº Série</th>
                      <th>Qtd.</th>
                      <th>Valor</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEquipamentos.map((eq) => (
                      <tr key={eq.id}>
                        <td className="proj">
                          <Package size={13} style={{ verticalAlign: "-2px", marginRight: 6, color: "var(--text-dim)" }} />
                          {eq.nome || "(sem nome)"}
                        </td>
                        <td>{eq.categoria}</td>
                        <td>
                          <span
                            className={
                              "badge " +
                              (eq.status === "Disponível" ? "badge-ready" : eq.status === "Em uso" ? "badge-wait" : eq.status === "Em manutenção" ? "badge-late" : eq.status === "Emprestado" ? "badge-standby" : "badge-late")
                            }
                          >
                            {eq.status}
                          </span>
                        </td>
                        <td>{eq.responsavel || eq.local || "—"}</td>
                        <td className="mono">{eq.numeroSerie || "—"}</td>
                        <td className="mono">{eq.quantidade || 1}</td>
                        <td className="mono">R$ {((parseFloat(eq.valorCompra) || 0) * (eq.quantidade || 1)).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                        <td>
                          <div className="row-actions">
                            <button className="icon-btn" onClick={() => setEquipamentoForm(eq)}><Pencil size={13} /></button>
                            <button className="icon-btn" onClick={() => setConfirmDelete({ type: "equipamento", id: eq.id, label: eq.nome })}><Trash2 size={13} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={6} style={{ textAlign: "right", fontWeight: 600 }}>Total do que está em visualização:</td>
                      <td className="mono" style={{ fontWeight: 700 }}>
                        R$ {filteredEquipamentos.reduce((s, eq) => s + (parseFloat(eq.valorCompra) || 0) * (eq.quantidade || 1), 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table></div>
              )}
            </>
          ) : tab === "kanban" ? (
            <KanbanBoard
              tasks={kanbanTasks}
              clients={clients}
              onAdd={addKanbanTask}
              onToggle={toggleKanbanTask}
              onDelete={removeKanbanTask}
              onMove={moveKanbanTask}
              onUpdate={updateKanbanTask}
            />
          ) : tab === "relatorios" ? (
            <>
              <div className="month-nav">
                <button className="icon-btn" onClick={() => setRelatorioMes(addMonthsISO(relatorioMes, -1))}><ChevronLeft size={14} /></button>
                <div className="month-nav-label">{mesLabel(relatorioMes)}</div>
                <button className="icon-btn" onClick={() => setRelatorioMes(addMonthsISO(relatorioMes, 1))}><ChevronRight size={14} /></button>
                <button className="btn-ghost kanban-today-btn" onClick={() => setRelatorioMes(mesRef(todayISO()))}>Mês atual</button>
              </div>

              <ReportSection
                title="Financeiro"
                subtitle={"R$ " + relatorioStatsMes.faturado.toLocaleString("pt-BR", { minimumFractionDigits: 0 }) + " faturado · margem de R$ " + relatorioStatsMes.margem.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}
                defaultOpen
              >
                <div className="metas-grid">
                  <div className="metas-card" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                    {(() => {
                      const metaValor = parseFloat(metas[relatorioMes]) || 0;
                      const faturado = relatorioStatsMes.faturado;
                      const pct = metaValor > 0 ? (faturado / metaValor) * 100 : 0;
                      return metaValor > 0 ? (
                        <>
                          <GoalGauge pct={pct} label="Meta financeira do mês" sublabel={"R$ " + faturado.toLocaleString("pt-BR", { minimumFractionDigits: 0 })} />
                          <div style={{ width: "100%" }}>
                            <div className="metas-line"><span>Meta</span><b>R$ {metaValor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</b></div>
                            <div className="metas-line"><span>Faturado</span><b>R$ {faturado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</b></div>
                            <div className="metas-line"><span>% da meta</span><b>{pct.toFixed(0)}%</b></div>
                          </div>
                        </>
                      ) : (
                        <div className="empty" style={{ padding: "20px 0" }}>Nenhuma meta definida pra {mesLabel(relatorioMes)}. Defina em Configurações → Metas.</div>
                      );
                    })()}
                  </div>
                  <div className="metas-card">
                    <h4>Margem de lucro — {mesLabel(relatorioMes)}</h4>
                    <div className="metas-line"><span>Faturado (notas emitidas)</span><b>R$ {relatorioStatsMes.faturado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</b></div>
                    <div className="metas-line"><span>Despesas</span><b>R$ {relatorioStatsMes.totalDespesas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</b></div>
                    {relatorioStatsMes.proLaboreValor > 0 && (
                      <div className="metas-line"><span>Pró-labore</span><b>R$ {relatorioStatsMes.proLaboreValor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</b></div>
                    )}
                    <div className="metas-line"><span>Margem</span><b>R$ {relatorioStatsMes.margem.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</b></div>
                  </div>
                </div>
                {relatorioReceitasPorTipo.length > 0 && (
                  <>
                    <h3 className="config-section-title" style={{ marginTop: 24 }}>Receitas por tipo</h3>
                    <div className="table-scroll"><table>
                      <thead><tr><th>Tipo de receita</th><th>Valor</th></tr></thead>
                      <tbody>
                        {relatorioReceitasPorTipo.map((r) => (
                          <tr key={r.nome}>
                            <td className="proj">{r.nome}</td>
                            <td className="mono">R$ {r.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table></div>
                  </>
                )}
              </ReportSection>

              <ReportSection
                title="Saúde financeira"
                subtitle={"sobra livre de R$ " + relatorioSaudeFinanceira.sobraLivre.toLocaleString("pt-BR", { minimumFractionDigits: 0 }) + " · " + (relatorioSaudeFinanceira.mesesGarantidos == null ? "sem saldo acumulado" : relatorioSaudeFinanceira.mesesGarantidos.toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + " meses garantidos")}
              >
                <div className="metas-grid">
                  <div className="metas-card">
                    <h4>Distribuição do faturamento</h4>
                    <div className="metas-line"><span>Faturado (notas emitidas)</span><b>R$ {relatorioSaudeFinanceira.faturado.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b></div>
                    <div className="metas-line"><span>Impostos ({parametrosFinanceiros.pctImposto || 0}% · vence {fmtDate(relatorioSaudeFinanceira.vencimentoTributos)})</span><b>- R$ {relatorioSaudeFinanceira.impostoValor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b></div>
                    <div className="metas-line"><span>Despesas</span><b>- R$ {relatorioSaudeFinanceira.despesasOperacionais.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b></div>
                    <div className="metas-line">
                      <span>Reserva (sugestão: R$ {relatorioSaudeFinanceira.reservaValor.toLocaleString("pt-BR", { minimumFractionDigits: 0 })})</span>
                      <b style={{ color: corReservaDoMes(relatorioReservaDoMes, relatorioSaudeFinanceira.reservaValor) }}>
                        R$ {relatorioReservaDoMes.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </b>
                    </div>
                    <div className="metas-line"><span>INSS ({parametrosFinanceiros.pctInss || 0}% do pró-labore · vence {fmtDate(relatorioSaudeFinanceira.vencimentoTributos)})</span><b>- R$ {relatorioSaudeFinanceira.inssValor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b></div>
                    <div className="metas-line"><span style={{ color: "var(--text-dim)" }}>Fator R — mínimo sugerido (28% do faturado)</span><b style={{ color: "var(--text-dim)" }}>R$ {relatorioSaudeFinanceira.fatorRMinimo.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b></div>
                    <div className="metas-line" style={{ borderTop: "1px solid var(--border)", marginTop: 6, paddingTop: 10 }}>
                      <span>Sobra livre</span>
                      <b style={{ color: relatorioSaudeFinanceira.sobraLivre >= 0 ? "var(--teal)" : "var(--red)" }}>
                        R$ {relatorioSaudeFinanceira.sobraLivre.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </b>
                    </div>
                  </div>
                  <div className="metas-card">
                    <h4>Fôlego financeiro</h4>
                    <div className="metas-line"><span>Saldo acumulado</span><b>R$ {relatorioSaldoAcumulado.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b></div>
                    <div className="metas-line"><span>Média de despesas (6 meses)</span><b>R$ {relatorioSaudeFinanceira.mediaDespesas.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b></div>
                    <div className="metas-line">
                      <span>Meses garantidos</span>
                      <b>{relatorioSaudeFinanceira.mesesGarantidos == null ? "—" : relatorioSaudeFinanceira.mesesGarantidos.toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + " meses"}</b>
                    </div>
                    <div className="metas-line">
                      <span>Reserva ideal ({MESES_RESERVA_IDEAL} meses de custo)</span>
                      <b>R$ {relatorioSaudeFinanceira.reservaIdealValor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b>
                    </div>
                    {relatorioSaudeFinanceira.pctDaReservaIdeal != null && (
                      <div className="metas-line">
                        <span>% da reserva ideal já garantido</span>
                        <b style={{ color: relatorioSaudeFinanceira.pctDaReservaIdeal >= 100 ? "var(--teal)" : "var(--amber)" }}>
                          {Math.min(999, relatorioSaudeFinanceira.pctDaReservaIdeal).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}%
                        </b>
                      </div>
                    )}
                    <div className="metas-line" style={{ borderTop: "1px solid var(--border)", marginTop: 6, paddingTop: 10 }}>
                      <span>Reserva destinada até {mesLabel(relatorioMes)}</span>
                      <b>R$ {relatorioReservaAcumulada.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b>
                    </div>
                  </div>
                </div>
                {relatorioResumoPorCategoria.length > 0 && (
                  <>
                    <h3 className="config-section-title" style={{ marginTop: 24 }}>Despesas por categoria — {mesLabel(relatorioMes)}</h3>
                    <div className="table-scroll"><table>
                      <thead><tr><th>Categoria</th><th>Total</th></tr></thead>
                      <tbody>
                        {relatorioResumoPorCategoria.map((c) => (
                          <tr key={c.id}>
                            <td className="proj"><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: c.cor, marginRight: 8 }} />{c.nome}</td>
                            <td className="mono">R$ {c.total.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table></div>
                  </>
                )}
              </ReportSection>

              <ReportSection
                title="Propostas"
                subtitle={relatorioPropostaStats.total + " propostas geradas · " + relatorioPropostaStats.taxaConversao + "% de conversão"}
              >
                <div className="stats-row">
                  <div className="stat"><div className="n">{relatorioPropostaStats.total}</div><div className="l">propostas geradas</div></div>
                  <div className="stat wait"><div className="n">{relatorioPropostaStats.pendentes}</div><div className="l">aguardando resposta</div></div>
                  <div className="stat ready"><div className="n">{relatorioPropostaStats.confirmadas}</div><div className="l">confirmadas</div></div>
                  <div className="stat warn"><div className="n">{relatorioPropostaStats.recusadas}</div><div className="l">recusadas</div></div>
                  <div className="stat"><div className="n">{relatorioPropostaStats.taxaConversao}%</div><div className="l">taxa de conversão</div></div>
                  <div className="stat"><div className="n">R$ {relatorioPropostaStats.valorConfirmado.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}</div><div className="l">valor confirmado</div></div>
                </div>
              </ReportSection>

              <ReportSection
                title="Demandas"
                subtitle={relatorioEntregasDoMes.length + " de " + relatorioDemandasDoMes.length + " entregues em " + mesLabel(relatorioMes)}
              >
                <div className="stats-row">
                  <div className="stat"><div className="n">{relatorioDemandasDoMes.length}</div><div className="l">demandas do mês</div></div>
                  <div
                    className="stat ready"
                    style={{ cursor: "pointer" }}
                    onClick={() => setRelatorioEntregasAberto((v) => !v)}
                    title="Ver detalhamento de no prazo x em atraso"
                  >
                    <div className="n">{relatorioEntregasDoMes.length}</div><div className="l">entregues {relatorioEntregasAberto ? "▾" : "▸"}</div>
                  </div>
                </div>
                {relatorioEntregasAberto && (
                  <div className="stats-row" style={{ marginTop: 10 }}>
                    <div className="stat ready"><div className="n">{relatorioEntregasBreakdown.noPrazo}</div><div className="l">no prazo</div></div>
                    <div className="stat warn"><div className="n">{relatorioEntregasBreakdown.atraso}</div><div className="l">em atraso</div></div>
                  </div>
                )}

                <div className="filter-menu-row" style={{ marginTop: 18, maxWidth: 420 }}>
                  <div className="filter-menu-field">
                    <label>Cliente</label>
                    <select value={relatorioDemandaClienteFiltro} onChange={(e) => setRelatorioDemandaClienteFiltro(e.target.value)}>
                      <option value="">Todos os clientes</option>
                      {clients.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                    </select>
                  </div>
                  <div className="filter-menu-field">
                    <label>Tipo de produção</label>
                    <select value={relatorioDemandaTipoFiltro} onChange={(e) => setRelatorioDemandaTipoFiltro(e.target.value)}>
                      <option value="">Todos os tipos</option>
                      {tiposProducao.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                {relatorioDemandaFiltroCount !== null && (
                  <div className="stats-row" style={{ marginTop: 12 }}>
                    <div className="stat"><div className="n">{relatorioDemandaFiltroCount}</div><div className="l">demandas com esse filtro</div></div>
                  </div>
                )}
              </ReportSection>
            </>
          ) : tab === "agenda" ? (
            !googleToken ? (
              <div className="empty" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "40px 20px" }}>
                <Calendar size={28} style={{ color: "var(--text-dim)" }} />
                <p style={{ margin: 0 }}>Conecte sua conta do Google para ver e criar compromissos aqui.</p>
                {googleErro && <p style={{ color: "var(--red)", fontSize: 12.5, maxWidth: 420, textAlign: "center" }}>{googleErro}</p>}
                <button className="btn-primary" style={{ marginLeft: 0 }} onClick={conectarGoogleAgenda} disabled={googleConectando}>
                  <Calendar size={15} /> {googleConectando ? "Conectando…" : "Conectar Google Agenda"}
                </button>
              </div>
            ) : (
              <AgendaBoard token={googleToken} calendarId={googleCalendarId} onTokenExpired={reconectarGoogleAgenda} />
            )
          ) : tab === "config" ? (
            configSecaoAtiva === null ? (
              <div className="config-cards">
                <button className="config-card" onClick={() => setConfigSecaoAtiva("tipos")}>
                  <Film size={20} />
                  <span className="config-card-title">Tipos de produção</span>
                  <span className="config-card-sub">{tiposProducao.length} cadastrados</span>
                </button>
                <button className="config-card" onClick={() => setConfigSecaoAtiva("tiposReceita")}>
                  <DollarSign size={20} />
                  <span className="config-card-title">Tipos de receita</span>
                  <span className="config-card-sub">{tiposReceita.length} cadastrados</span>
                </button>
                <button className="config-card" onClick={() => setConfigSecaoAtiva("categoriasDespesa")}>
                  <CreditCard size={20} />
                  <span className="config-card-title">Categorias de despesa</span>
                  <span className="config-card-sub">{tags.length} cadastradas</span>
                </button>
                <button className="config-card" onClick={() => setConfigSecaoAtiva("categoriasEquip")}>
                  <Camera size={20} />
                  <span className="config-card-title">Categorias de equipamentos</span>
                  <span className="config-card-sub">{categoriasEquipamento.length} cadastradas</span>
                </button>
                <button className="config-card" onClick={() => setConfigSecaoAtiva("statusDemandas")}>
                  <LayoutGrid size={20} />
                  <span className="config-card-title">Status de demandas</span>
                  <span className="config-card-sub">{statusDemandas.length} cadastrados</span>
                </button>
                <button className="config-card" onClick={() => setConfigSecaoAtiva("metas")}>
                  <Target size={20} />
                  <span className="config-card-title">Metas</span>
                  <span className="config-card-sub">Faturamento, anual e novos clientes</span>
                </button>
                <button className="config-card" onClick={() => setConfigSecaoAtiva("saudeFinanceira")}>
                  <TrendingUp size={20} />
                  <span className="config-card-title">Saúde financeira</span>
                  <span className="config-card-sub">Imposto, pró-labore e reserva</span>
                </button>
                <button className="config-card" onClick={() => setConfigSecaoAtiva("equipe")}>
                  <Users size={18} />
                  <span className="config-card-title">Equipe e acessos</span>
                  <span className="config-card-sub">{equipeMembros.length === 0 ? "Editores e social media" : equipeMembros.length + (equipeMembros.length === 1 ? " pessoa" : " pessoas")}</span>
                </button>
              </div>
            ) : configSecaoAtiva === "equipe" ? (
              <EquipeAcessos
                membros={equipeMembros}
                clientes={clients.filter((c) => !c.rascunho)}
                demandas={demands}
                status={statusDemandas}
                materiais={materiais}
                notas={notasReuniao}
                agenda={agendaCliente}
                erroCarga={equipeErro}
                onRecarregar={carregarEquipe}
                onExcluido={soltarDemandasDoMembro}
                onVoltar={() => setConfigSecaoAtiva(null)}
              />
            ) : configSecaoAtiva === "saudeFinanceira" ? (
              <div className="config-panel">
                <button className="config-back" onClick={() => setConfigSecaoAtiva(null)}><ChevronLeft size={14} /> Voltar</button>
                <h3 className="config-section-title">Saúde financeira</h3>
                <p className="config-hint">Esses parâmetros alimentam o resumo financeiro na aba Financeiro — deixe em branco (0) o que ainda não se aplica.</p>
                <div className="metas-grid">
                  <div className="metas-card">
                    <h4>Imposto sobre faturamento</h4>
                    <div className="metas-input-row">
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        placeholder="Ex: 6 (%)"
                        value={pctImpostoInput}
                        onChange={(e) => setPctImpostoInput(e.target.value)}
                      />
                      <button
                        className="btn-primary"
                        style={{ marginLeft: 0 }}
                        onClick={() => salvarParametrosFinanceiros({ pctImposto: parseFloat(pctImpostoInput) || 0 })}
                      >
                        Salvar
                      </button>
                    </div>
                    <p className="config-hint" style={{ marginTop: 8 }}>% do faturamento do mês reservado pro Simples Nacional / DAS.</p>
                  </div>
                  <div className="metas-card">
                    <h4>Reserva / investimento</h4>
                    <div className="metas-input-row">
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        placeholder="Ex: 10 (%)"
                        value={pctReservaInput}
                        onChange={(e) => setPctReservaInput(e.target.value)}
                      />
                      <button
                        className="btn-primary"
                        style={{ marginLeft: 0 }}
                        onClick={() => salvarParametrosFinanceiros({ pctReserva: parseFloat(pctReservaInput) || 0 })}
                      >
                        Salvar
                      </button>
                    </div>
                    <p className="config-hint" style={{ marginTop: 8 }}>% do faturamento do mês reservado pra investir ou guardar de reserva.</p>
                  </div>
                  <div className="metas-card">
                    <h4>INSS sobre pró-labore</h4>
                    <div className="metas-input-row">
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        placeholder="Ex: 11 (%)"
                        value={pctInssInput}
                        onChange={(e) => setPctInssInput(e.target.value)}
                      />
                      <button
                        className="btn-primary"
                        style={{ marginLeft: 0 }}
                        onClick={() => salvarParametrosFinanceiros({ pctInss: parseFloat(pctInssInput) || 0 })}
                      >
                        Salvar
                      </button>
                    </div>
                    <p className="config-hint" style={{ marginTop: 8 }}>% do pró-labore pago de INSS. Ao confirmar o pró-labore do mês, uma despesa "INSS" é lançada junto.</p>
                  </div>
                </div>
                <p className="config-hint" style={{ marginTop: 24, fontWeight: 600, color: "var(--text)" }}>Pró-labore mensal</p>
                <div className="month-nav" style={{ margin: "12px 0" }}>
                  <button className="icon-btn" onClick={() => setMonthAnchor(addMonthsISO(monthAnchor, -1))}><ChevronLeft size={14} /></button>
                  <div className="month-nav-label">{mesLabel(monthAnchor)}</div>
                  <button className="icon-btn" onClick={() => setMonthAnchor(addMonthsISO(monthAnchor, 1))}><ChevronRight size={14} /></button>
                  <button className="btn-ghost kanban-today-btn" onClick={() => setMonthAnchor(mesRef(todayISO()))}>Mês atual</button>
                </div>
                <div className="metas-grid">
                  <div className="metas-card">
                    <h4>Pró-labore — {mesLabel(monthAnchor)}</h4>
                    <div className="metas-input-row">
                      <input
                        type="number"
                        min="0"
                        step="100"
                        placeholder="Ex: 3000"
                        value={proLaboreMesInput}
                        onChange={(e) => setProLaboreMesInput(e.target.value)}
                      />
                      <button
                        className="btn-primary"
                        style={{ marginLeft: 0 }}
                        onClick={() => confirmarProLaboreMes(monthAnchor, proLaboreMesInput)}
                      >
                        Confirmar
                      </button>
                    </div>
                    <p className="config-hint" style={{ marginTop: 8 }}>
                      Valor que você retira nesse mês. Ao confirmar, uma despesa "Pró-labore" é lançada automaticamente no Financeiro.
                    </p>
                  </div>
                  <div className="metas-card">
                    <h4>Fator R — {mesLabel(monthAnchor)}</h4>
                    <div className="metas-line">
                      <span>28% do faturado (notas emitidas) nesse mês</span>
                      <b>R$ {(financeStatsMes.faturado * 0.28).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b>
                    </div>
                    <p className="config-hint" style={{ marginTop: 8 }}>
                      Referência: nos CNAEs que emitem NF, o pró-labore precisa ser igual ou maior que 28% do faturamento pra manter a alíquota de imposto melhor. Não altera o valor do pró-labore acima — é só pra consulta (cálculo provisório, a contabilidade vai ajustar o método em breve).
                    </p>
                  </div>
                </div>
              </div>
            ) : configSecaoAtiva === "metas" ? (
              <div className="config-panel">
                <button className="config-back" onClick={() => setConfigSecaoAtiva(null)}><ChevronLeft size={14} /> Voltar</button>
                <h3 className="config-section-title">Metas</h3>
                <p className="config-hint">Defina as metas que aparecem no painel Metas e nos Relatórios.</p>
                <div className="month-nav" style={{ margin: "16px 0" }}>
                  <button className="icon-btn" onClick={() => setMonthAnchor(addMonthsISO(monthAnchor, -1))}><ChevronLeft size={14} /></button>
                  <div className="month-nav-label">{mesLabel(monthAnchor)}</div>
                  <button className="icon-btn" onClick={() => setMonthAnchor(addMonthsISO(monthAnchor, 1))}><ChevronRight size={14} /></button>
                  <button className="btn-ghost kanban-today-btn" onClick={() => setMonthAnchor(mesRef(todayISO()))}>Mês atual</button>
                </div>
                <div className="metas-grid">
                  <div className="metas-card">
                    <h4>Meta de faturamento — {mesLabel(monthAnchor)}</h4>
                    <div className="metas-input-row">
                      <input
                        type="number"
                        min="0"
                        step="100"
                        placeholder="Ex: 15000"
                        value={metaInputValue}
                        onChange={(e) => setMetaInputValue(e.target.value)}
                      />
                      <button className="btn-primary" style={{ marginLeft: 0 }} onClick={() => setMetaDoMes(monthAnchor, metaInputValue)}>Salvar</button>
                    </div>
                  </div>
                  <div className="metas-card">
                    <h4>Faturamento anual — {anoAtual}</h4>
                    <div className="metas-input-row">
                      <input
                        type="number"
                        min="0"
                        step="1000"
                        placeholder="Ex: 180000"
                        value={metaAnualInputValue}
                        onChange={(e) => setMetaAnualInputValue(e.target.value)}
                      />
                      <button className="btn-primary" style={{ marginLeft: 0 }} onClick={() => setMetaAnual(anoAtual, metaAnualInputValue)}>Salvar</button>
                    </div>
                  </div>
                  <div className="metas-card">
                    <h4>Novos clientes — {mesLabel(monthAnchor)}</h4>
                    <div className="metas-input-row">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        placeholder="Ex: 3"
                        value={metaClientesInputValue}
                        onChange={(e) => setMetaClientesInputValue(e.target.value)}
                      />
                      <button className="btn-primary" style={{ marginLeft: 0 }} onClick={() => setMetaClientesDoMes(monthAnchor, metaClientesInputValue)}>Salvar</button>
                    </div>
                  </div>
                </div>
              </div>
            ) : configSecaoAtiva === "tipos" ? (
              <div className="config-panel">
                <button className="config-back" onClick={() => setConfigSecaoAtiva(null)}><ChevronLeft size={14} /> Voltar</button>
                <h3 className="config-section-title">Tipos de produção</h3>
                <p className="config-hint">Esses tipos aparecem no cadastro de Demandas e nas receitas do Financeiro. Renomear atualiza automaticamente as demandas, propostas e transações que já usam esse tipo.</p>
                <div className="config-tipo-list">
                  {tiposProducao.map((t) => (
                    <div className="config-tipo-item" key={t}>
                      {tipoEditando === t ? (
                        <>
                          <input
                            value={tipoEditValue}
                            autoFocus
                            onChange={(e) => setTipoEditValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") { renomearTipoProducao(t, tipoEditValue); setTipoEditando(null); }
                              if (e.key === "Escape") setTipoEditando(null);
                            }}
                          />
                          <div className="config-tipo-actions">
                            <button className="icon-btn" onClick={() => { renomearTipoProducao(t, tipoEditValue); setTipoEditando(null); }}><CheckCircle size={13} /></button>
                            <button className="icon-btn" onClick={() => setTipoEditando(null)}><X size={13} /></button>
                          </div>
                        </>
                      ) : (
                        <>
                          <span>{t}</span>
                          <div className="config-tipo-actions">
                            <button className="icon-btn" onClick={() => { setTipoEditando(t); setTipoEditValue(t); }}><Pencil size={13} /></button>
                            <button className="icon-btn" onClick={() => removeTipoProducao(t)}><Trash2 size={13} /></button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                  {tiposProducao.length === 0 && <div className="empty">Nenhum tipo cadastrado ainda.</div>}
                </div>
                <div className="config-add-row">
                  <input
                    value={novoTipoInput}
                    onChange={(e) => setNovoTipoInput(e.target.value)}
                    placeholder="Novo tipo de produção…"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") { addTipoProducao(novoTipoInput); setNovoTipoInput(""); }
                    }}
                  />
                  <button
                    className="btn-primary"
                    style={{ marginLeft: 0 }}
                    onClick={() => { addTipoProducao(novoTipoInput); setNovoTipoInput(""); }}
                  >
                    <Plus size={15} /> Adicionar
                  </button>
                </div>
              </div>
            ) : configSecaoAtiva === "tiposReceita" ? (
              <div className="config-panel">
                <button className="config-back" onClick={() => setConfigSecaoAtiva(null)}><ChevronLeft size={14} /> Voltar</button>
                <h3 className="config-section-title">Tipos de receita</h3>
                <p className="config-hint">Classificam de onde vem cada receita (prestação de serviço, deslocamento, reembolso etc.), separado do tipo de produção. Usado como filtro nos Relatórios. Renomear atualiza as receitas que já usam esse tipo.</p>
                <div className="config-tipo-list">
                  {tiposReceita.map((t) => (
                    <div className="config-tipo-item" key={t}>
                      {tipoReceitaEditando === t ? (
                        <>
                          <input
                            value={tipoReceitaEditValue}
                            autoFocus
                            onChange={(e) => setTipoReceitaEditValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") { renomearTipoReceita(t, tipoReceitaEditValue); setTipoReceitaEditando(null); }
                              if (e.key === "Escape") setTipoReceitaEditando(null);
                            }}
                          />
                          <div className="config-tipo-actions">
                            <button className="icon-btn" onClick={() => { renomearTipoReceita(t, tipoReceitaEditValue); setTipoReceitaEditando(null); }}><CheckCircle size={13} /></button>
                            <button className="icon-btn" onClick={() => setTipoReceitaEditando(null)}><X size={13} /></button>
                          </div>
                        </>
                      ) : (
                        <>
                          <span>{t}</span>
                          <div className="config-tipo-actions">
                            <button className="icon-btn" onClick={() => { setTipoReceitaEditando(t); setTipoReceitaEditValue(t); }}><Pencil size={13} /></button>
                            <button className="icon-btn" onClick={() => removeTipoReceita(t)}><Trash2 size={13} /></button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                  {tiposReceita.length === 0 && <div className="empty">Nenhum tipo cadastrado ainda.</div>}
                </div>
                <div className="config-add-row">
                  <input
                    value={novoTipoReceitaInput}
                    onChange={(e) => setNovoTipoReceitaInput(e.target.value)}
                    placeholder="Novo tipo de receita…"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") { addTipoReceita(novoTipoReceitaInput); setNovoTipoReceitaInput(""); }
                    }}
                  />
                  <button
                    className="btn-primary"
                    style={{ marginLeft: 0 }}
                    onClick={() => { addTipoReceita(novoTipoReceitaInput); setNovoTipoReceitaInput(""); }}
                  >
                    <Plus size={15} /> Adicionar
                  </button>
                </div>
              </div>
            ) : configSecaoAtiva === "categoriasDespesa" ? (
              <div className="config-panel">
                <button className="config-back" onClick={() => setConfigSecaoAtiva(null)}><ChevronLeft size={14} /> Voltar</button>
                <h3 className="config-section-title">Categorias de despesa</h3>
                <p className="config-hint">Usadas no cadastro de despesas e no resumo por categoria — separadas das categorias de receita. Renomear atualiza as despesas que já usam essa categoria.</p>
                <div className="config-tipo-list">
                  {tags.map((tg) => (
                    <div className="config-tipo-item" key={tg.id}>
                      {categoriaDespesaEditando === tg.id ? (
                        <>
                          <input
                            type="color"
                            value={tg.cor}
                            onChange={(e) => renameTag(tg.id, categoriaDespesaEditValue, e.target.value)}
                            style={{ width: 30, height: 30, flexShrink: 0, padding: 0, border: "none", background: "none" }}
                          />
                          <input
                            value={categoriaDespesaEditValue}
                            autoFocus
                            onChange={(e) => setCategoriaDespesaEditValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") { renameTag(tg.id, categoriaDespesaEditValue); setCategoriaDespesaEditando(null); }
                              if (e.key === "Escape") setCategoriaDespesaEditando(null);
                            }}
                          />
                          <div className="config-tipo-actions">
                            <button className="icon-btn" onClick={() => { renameTag(tg.id, categoriaDespesaEditValue); setCategoriaDespesaEditando(null); }}><CheckCircle size={13} /></button>
                            <button className="icon-btn" onClick={() => setCategoriaDespesaEditando(null)}><X size={13} /></button>
                          </div>
                        </>
                      ) : (
                        <>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                            <span style={{ width: 10, height: 10, borderRadius: "50%", background: tg.cor, flexShrink: 0 }} />
                            {tg.nome}
                          </span>
                          <div className="config-tipo-actions">
                            <button className="icon-btn" onClick={() => { setCategoriaDespesaEditando(tg.id); setCategoriaDespesaEditValue(tg.nome); }}><Pencil size={13} /></button>
                            <button className="icon-btn" onClick={() => deleteTag(tg.id)}><Trash2 size={13} /></button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                  {tags.length === 0 && <div className="empty">Nenhuma categoria cadastrada ainda.</div>}
                </div>
                <div className="config-add-row">
                  <input
                    value={novaCategoriaDespesaInput}
                    onChange={(e) => setNovaCategoriaDespesaInput(e.target.value)}
                    placeholder="Nova categoria de despesa…"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") { createTag(novaCategoriaDespesaInput); setNovaCategoriaDespesaInput(""); }
                    }}
                  />
                  <button
                    className="btn-primary"
                    style={{ marginLeft: 0 }}
                    onClick={() => { createTag(novaCategoriaDespesaInput); setNovaCategoriaDespesaInput(""); }}
                  >
                    <Plus size={15} /> Adicionar
                  </button>
                </div>
              </div>
            ) : configSecaoAtiva === "categoriasEquip" ? (
              <div className="config-panel">
                <button className="config-back" onClick={() => setConfigSecaoAtiva(null)}><ChevronLeft size={14} /> Voltar</button>
                <h3 className="config-section-title">Categorias de equipamentos</h3>
                <p className="config-hint">Usadas no cadastro e no filtro da aba Equipamentos. Renomear atualiza os equipamentos já cadastrados nessa categoria.</p>
                <div className="config-tipo-list">
                  {categoriasEquipamento.map((c) => (
                    <div className="config-tipo-item" key={c}>
                      {categoriaEquipEditando === c ? (
                        <>
                          <input
                            value={categoriaEquipEditValue}
                            autoFocus
                            onChange={(e) => setCategoriaEquipEditValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") { renomearCategoriaEquipamento(c, categoriaEquipEditValue); setCategoriaEquipEditando(null); }
                              if (e.key === "Escape") setCategoriaEquipEditando(null);
                            }}
                          />
                          <div className="config-tipo-actions">
                            <button className="icon-btn" onClick={() => { renomearCategoriaEquipamento(c, categoriaEquipEditValue); setCategoriaEquipEditando(null); }}><CheckCircle size={13} /></button>
                            <button className="icon-btn" onClick={() => setCategoriaEquipEditando(null)}><X size={13} /></button>
                          </div>
                        </>
                      ) : (
                        <>
                          <span>{c}</span>
                          <div className="config-tipo-actions">
                            <button className="icon-btn" onClick={() => { setCategoriaEquipEditando(c); setCategoriaEquipEditValue(c); }}><Pencil size={13} /></button>
                            <button className="icon-btn" onClick={() => removeCategoriaEquipamento(c)}><Trash2 size={13} /></button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                  {categoriasEquipamento.length === 0 && <div className="empty">Nenhuma categoria cadastrada ainda.</div>}
                </div>
                <div className="config-add-row">
                  <input
                    value={novaCategoriaEquipInput}
                    onChange={(e) => setNovaCategoriaEquipInput(e.target.value)}
                    placeholder="Nova categoria de equipamento…"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") { addCategoriaEquipamento(novaCategoriaEquipInput); setNovaCategoriaEquipInput(""); }
                    }}
                  />
                  <button
                    className="btn-primary"
                    style={{ marginLeft: 0 }}
                    onClick={() => { addCategoriaEquipamento(novaCategoriaEquipInput); setNovaCategoriaEquipInput(""); }}
                  >
                    <Plus size={15} /> Adicionar
                  </button>
                </div>
              </div>
            ) : (
              <div className="config-panel">
                <button className="config-back" onClick={() => setConfigSecaoAtiva(null)}><ChevronLeft size={14} /> Voltar</button>
                <h3 className="config-section-title">Status de demandas</h3>
                <p className="config-hint">Usados no cadastro de Demandas. Renomear atualiza automaticamente as demandas que já usam esse status.</p>
                <div className="config-tipo-list">
                  {statusDemandas.map((s) => (
                    <div className="config-tipo-item" key={s.id}>
                      {statusDemandaEditando === s.id ? (
                        <>
                          <input
                            type="color"
                            value={s.cor}
                            onChange={(e) => renameStatusDemanda(s.id, statusDemandaEditValue, e.target.value)}
                            style={{ width: 30, height: 30, flexShrink: 0, padding: 0, border: "none", background: "none" }}
                          />
                          <input
                            value={statusDemandaEditValue}
                            autoFocus
                            onChange={(e) => setStatusDemandaEditValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") { renameStatusDemanda(s.id, statusDemandaEditValue); setStatusDemandaEditando(null); }
                              if (e.key === "Escape") setStatusDemandaEditando(null);
                            }}
                          />
                          <div className="config-tipo-actions">
                            <button className="icon-btn" onClick={() => { renameStatusDemanda(s.id, statusDemandaEditValue); setStatusDemandaEditando(null); }}><CheckCircle size={13} /></button>
                            <button className="icon-btn" onClick={() => setStatusDemandaEditando(null)}><X size={13} /></button>
                          </div>
                        </>
                      ) : (
                        <>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                            <span style={{ width: 10, height: 10, borderRadius: "50%", background: s.cor, flexShrink: 0 }} />
                            {s.nome}
                          </span>
                          <div className="config-tipo-actions">
                            <button className="icon-btn" onClick={() => { setStatusDemandaEditando(s.id); setStatusDemandaEditValue(s.nome); }}><Pencil size={13} /></button>
                            <button className="icon-btn" onClick={() => deleteStatusDemanda(s.id)}><Trash2 size={13} /></button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                  {statusDemandas.length === 0 && <div className="empty">Nenhum status cadastrado ainda.</div>}
                </div>
                <div className="config-add-row">
                  <input
                    value={novoStatusDemandaInput}
                    onChange={(e) => setNovoStatusDemandaInput(e.target.value)}
                    placeholder="Novo status de demanda…"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") { createStatusDemanda(novoStatusDemandaInput); setNovoStatusDemandaInput(""); }
                    }}
                  />
                  <button
                    className="btn-primary"
                    style={{ marginLeft: 0 }}
                    onClick={() => { createStatusDemanda(novoStatusDemandaInput); setNovoStatusDemandaInput(""); }}
                  >
                    <Plus size={15} /> Adicionar
                  </button>
                </div>
              </div>
            )
          ) : tab === "processos" ? (
            <>
              <div className="toolbar">
                {processosCategorias.map((cat) => (
                  <span
                    key={cat}
                    className={"tag-pill tag-pill-btn" + (processoFiltroCategoria === cat ? " selected" : "")}
                    style={{ "--tag-color": "#4FA8A0" }}
                  >
                    <span onClick={() => setProcessoFiltroCategoria(processoFiltroCategoria === cat ? "" : cat)} style={{ cursor: "pointer" }}>
                      {cat}
                    </span>
                    <X
                      size={11}
                      style={{ marginLeft: 6, cursor: "pointer", verticalAlign: "-1px" }}
                      onClick={() => removeProcessoCategoria(cat)}
                    />
                  </span>
                ))}
                <input
                  value={novaCategoriaProcessoInput}
                  onChange={(e) => setNovaCategoriaProcessoInput(e.target.value)}
                  placeholder="+ nova categoria"
                  style={{ maxWidth: 160 }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { addProcessoCategoria(novaCategoriaProcessoInput); setNovaCategoriaProcessoInput(""); }
                  }}
                />
                <button
                  className="btn-ghost"
                  onClick={() => { addProcessoCategoria(novaCategoriaProcessoInput); setNovaCategoriaProcessoInput(""); }}
                >
                  <Plus size={14} />
                </button>
                <button
                  className="btn-primary"
                  onClick={() =>
                    setProcessoForm({
                      id: "pr_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
                      categoria: processoFiltroCategoria || processosCategorias[0] || "",
                      titulo: "",
                      conteudoTexto: "",
                      arquivoPath: "",
                      arquivoNome: "",
                      observacoes: "",
                    })
                  }
                >
                  <Plus size={15} /> Novo documento
                </button>
              </div>

              {(() => {
                const filtrados = processoFiltroCategoria
                  ? processosDocumentos.filter((d) => d.categoria === processoFiltroCategoria)
                  : processosDocumentos;
                if (filtrados.length === 0) {
                  return <div className="empty">Nenhum documento cadastrado ainda.</div>;
                }
                return (
                  <div className="processos-grid">
                    {filtrados.map((doc) => (
                      <div className="processo-card" key={doc.id}>
                        <div className="processo-card-head">
                          {doc.categoria && (
                            <span className="tag-pill">
                              <span className="tag-dot" style={{ background: "var(--teal)" }} />
                              {doc.categoria}
                            </span>
                          )}
                          <div className="processo-card-actions">
                            <button className="icon-btn" title="Editar" onClick={() => setProcessoForm(doc)}>
                              <Pencil size={13} />
                            </button>
                            <button
                              className="icon-btn"
                              title="Excluir"
                              onClick={() => setConfirmDelete({ type: "processo", id: doc.id, label: doc.titulo, doc })}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                        <h4 className="processo-card-title">{doc.titulo || "(sem título)"}</h4>
                        {doc.conteudoTexto && (
                          <>
                            <p className="processo-card-text">{doc.conteudoTexto}</p>
                            <div className="processo-card-buttons">
                              <button className="btn-ghost" onClick={() => copiarTextoProcesso(doc)}>
                                <Copy size={13} style={{ verticalAlign: "-2px", marginRight: 4 }} />Copiar
                              </button>
                              <button className="btn-ghost" onClick={() => baixarTextoProcesso(doc)}>
                                <Download size={13} style={{ verticalAlign: "-2px", marginRight: 4 }} />Baixar .txt
                              </button>
                            </div>
                          </>
                        )}
                        {doc.arquivoPath && (
                          <>
                            {isImagemArquivo(doc.arquivoNome) && <ProcessoImagePreview doc={doc} cache={processoPreviewUrls} />}
                            <div className="processo-card-buttons">
                              <span className="mono" style={{ fontSize: 11 }}>{doc.arquivoNome}</span>
                              <button className="btn-ghost" onClick={() => baixarArquivoProcesso(doc)}>
                                <Download size={13} style={{ verticalAlign: "-2px", marginRight: 4 }} />Baixar
                              </button>
                            </div>
                          </>
                        )}
                        {doc.observacoes && <p className="processo-card-obs">{doc.observacoes}</p>}
                      </div>
                    ))}
                  </div>
                );
              })()}
            </>
          ) : tab === "propostas" ? (
            <iframe title="Gerador de Proposta" srcDoc={PROPOSTA_HTML} />
          ) : tab === "contratos" ? (
            <iframe title="Gerador de Contrato" srcDoc={CONTRATO_HTML} />
          ) : (
            <iframe title="Calculadora de Orçamento" srcDoc={CALCULADORA_HTML} />
          )}
        </div>
        </div>
      </div>

      {toast && (
        <div className="toast">
          <CheckCircle size={15} />
          <span>{toast}</span>
        </div>
      )}

      {demandForm && (
        <div className="overlay" onClick={() => setDemandForm(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>
              {demands.some((d) => d.id === demandForm.id) ? "Editar demanda" : "Nova demanda"}
              <X size={18} style={{ cursor: "pointer" }} onClick={() => setDemandForm(null)} />
            </h3>
            <div className="field">
              <label>Projeto</label>
              <input value={demandForm.projeto} onChange={(e) => setDemandForm({ ...demandForm, projeto: e.target.value })} placeholder="Nome do projeto" />
            </div>
            <div className="field">
              <label>Vídeos deste projeto (opcional — para quando são vários vídeos em 1 demanda só)</label>
              {(demandForm.itens || []).map((v, idx) => (
                <div key={v.id} className="video-item-row">
                  <input
                    value={v.nome}
                    placeholder={"Vídeo " + (idx + 1)}
                    onChange={(e) => {
                      const itens = demandForm.itens.map((it, i) => (i === idx ? { ...it, nome: e.target.value } : it));
                      setDemandForm({ ...demandForm, itens });
                    }}
                  />
                  <input
                    type="date"
                    value={v.dataEntrega || ""}
                    title="Data de entrega"
                    onChange={(e) => {
                      const itens = demandForm.itens.map((it, i) => (i === idx ? { ...it, dataEntrega: e.target.value } : it));
                      setDemandForm({ ...demandForm, itens });
                    }}
                  />
                  <select
                    value={v.status}
                    onChange={(e) => {
                      const novoValor = e.target.value;
                      const itens = demandForm.itens.map((it, i) => (i === idx ? { ...it, status: novoValor, dataConclusao: novoValor === "Finalizada" ? it.dataConclusao || todayISO() : "" } : it));
                      const enviaAprovacao = novoValor === "Aguardando aprovação" || novoValor === "Finalizada";
                      const todasFinalizadas = itens.length > 0 && itens.every((it) => it.status === "Finalizada");
                      setDemandForm({
                        ...demandForm,
                        itens,
                        status: todasFinalizadas ? "Finalizada" : demandForm.status,
                        dataAprovacao: todasFinalizadas ? demandForm.dataAprovacao || todayISO() : demandForm.dataAprovacao,
                        dataEnvioAprovacao: enviaAprovacao ? demandForm.dataEnvioAprovacao || todayISO() : demandForm.dataEnvioAprovacao,
                      });
                    }}
                  >
                    {statusDemandas.map((s) => <option key={s.id} value={s.nome}>{s.nome}</option>)}
                  </select>
                  <button
                    className="icon-btn"
                    onClick={() => setDemandForm({ ...demandForm, itens: demandForm.itens.filter((_, i) => i !== idx) })}
                  >
                    <X size={13} />
                  </button>
                </div>
              ))}
              <button
                className="btn-ghost"
                style={{ width: "100%", marginTop: 4 }}
                onClick={() => setDemandForm({ ...demandForm, itens: [...(demandForm.itens || []), { ...emptyVideoItem(), status: statusDemandas[0]?.nome || "" }] })}
              >
                <Plus size={13} style={{ verticalAlign: "-2px", marginRight: 4 }} />Adicionar vídeo
              </button>
            </div>
            <div className="grid2">
              <div className="field">
                <label>Cliente</label>
                <select value={demandForm.clienteId} onChange={(e) => setDemandForm({ ...demandForm, clienteId: e.target.value })}>
                  <option value="">Selecionar…</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Tipo</label>
                <select
                  value={demandForm.tipo}
                  onChange={(e) => setDemandForm({ ...demandForm, tipo: e.target.value })}
                  style={{ borderLeft: "3px solid " + corDoStatusComMapa(coresStatus, "tipo", demandForm.tipo) }}
                >
                  {tiposProducao.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div className="field">
              <label>Status</label>
              <select
                value={demandForm.status}
                onChange={(e) => {
                  const novoValor = e.target.value;
                  const enviaAprovacao = novoValor === "Aguardando aprovação" || novoValor === "Finalizada";
                  setDemandForm({
                    ...demandForm,
                    status: novoValor,
                    dataAprovacao: novoValor === "Finalizada" ? demandForm.dataAprovacao || todayISO() : demandForm.dataAprovacao,
                    dataEnvioAprovacao: enviaAprovacao ? demandForm.dataEnvioAprovacao || todayISO() : demandForm.dataEnvioAprovacao,
                  });
                }}
                style={{ borderLeft: "3px solid " + corStatusDemanda(demandForm.status) }}
              >
                {statusDemandas.map((s) => <option key={s.id} value={s.nome}>{s.nome}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Editor</label>
              <input value={demandForm.editor} onChange={(e) => setDemandForm({ ...demandForm, editor: e.target.value })} placeholder="Ex: Vítor, Henrique…" />
            </div>
            {equipeMembros.some((m) => m.papel === "editor") && (
              <div className="field">
                <label>Liberar no painel da equipe para</label>
                <select
                  value={demandForm.editorMembroId || ""}
                  onChange={(e) => {
                    const novo = equipeMembros.find((m) => m.id === e.target.value);
                    const anterior = equipeMembros.find((m) => m.id === demandForm.editorMembroId);
                    const textoLivre = demandForm.editor && demandForm.editor !== anterior?.nome;
                    setDemandForm({ ...demandForm, editorMembroId: e.target.value, editor: textoLivre ? demandForm.editor : novo?.nome || "" });
                  }}
                >
                  <option value="">Nenhum editor</option>
                  {equipeMembros.filter((m) => m.papel === "editor").map((m) => (
                    <option key={m.id} value={m.id}>{m.nome}{m.ativo ? "" : " (desativado)"}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="grid2">
              <div className="field">
                <label>Data de entrega</label>
                <input type="date" value={demandForm.dataEntrega} onChange={(e) => setDemandForm({ ...demandForm, dataEntrega: e.target.value })} />
              </div>
              <div className="field">
                <label>Enviado p/ aprovação em</label>
                <input type="date" value={demandForm.dataEnvioAprovacao} onChange={(e) => setDemandForm({ ...demandForm, dataEnvioAprovacao: e.target.value })} />
              </div>
            </div>
            <div className="field">
              <label>Data de aprovação do cliente</label>
              <input type="date" value={demandForm.dataAprovacao} onChange={(e) => setDemandForm({ ...demandForm, dataAprovacao: e.target.value })} />
              <div className="lock-note">
                <Archive size={12} />
                {demandForm.dataAprovacao
                  ? `Arquivo liberado para exclusão em ${RETENCAO_DIAS} dias após esta data.`
                  : "Sem esta data, o sistema nunca libera o arquivo para exclusão."}
              </div>
            </div>
            <div className="field">
              <label>Link</label>
              <input value={demandForm.link} onChange={(e) => setDemandForm({ ...demandForm, link: e.target.value })} placeholder="https://…" />
            </div>
            <div className="field">
              <label>Observações</label>
              <textarea value={demandForm.observacoes} onChange={(e) => setDemandForm({ ...demandForm, observacoes: e.target.value })} />
            </div>
            <div className="modal-actions">
              <button className="btn-ghost" onClick={() => setDemandForm(null)}>Cancelar</button>
              <button className="btn-primary" style={{ marginLeft: 0 }} onClick={() => saveDemand(demandForm)}>Salvar</button>
            </div>
          </div>
        </div>
      )}

      {clientViewInfo && (
        <div className="overlay" onClick={() => setClientViewInfo(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>
              {clientViewInfo.nome || "(sem nome)"}
              <button className="icon-btn" onClick={() => setClientViewInfo(null)}><X size={15} /></button>
            </h3>
            <CamposCliente cliente={clientViewInfo} />
            {clientArquivos.length > 0 && (
              <div className="field">
                <label>Arquivos anexados</label>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {clientArquivos.map((a) => (
                    <div key={a.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                      <span>{a.tipo === "contrato" ? "📄" : "📎"} {a.nome}</span>
                      <span style={{ display: "flex", gap: 4 }}>
                        <button className="icon-btn" title="Baixar" onClick={() => baixarArquivoCliente(a)}><Download size={15} /></button>
                        <button className="icon-btn" title="Remover" onClick={() => removerArquivoCliente(a)}><Trash2 size={15} /></button>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <MateriaisCliente
              clienteId={clientViewInfo.id}
              materiais={materiais}
              erroCarga={colabErro}
              onSalvar={gravarColab(api.salvarMaterial)}
              onExcluir={gravarColab(api.excluirMaterial)}
            />
            <div className="field">
              <label>Cronograma mensal</label>
              <button className="btn-ghost" style={{ width: "100%" }} onClick={() => setCronogramaAberto({ clienteId: clientViewInfo.id })}>
                <Calendar size={13} style={{ verticalAlign: "-2px", marginRight: 4 }} />Postagens, gravações e reuniões ({agendaCliente.filter((i) => i.clienteId === clientViewInfo.id).length})
              </button>
            </div>
            <div className="field">
              <label>Notas de reunião</label>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {notasReuniao.filter((nt) => nt.clienteId === clientViewInfo.id).map((nt) => (
                  <div
                    key={nt.id}
                    style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, cursor: "pointer" }}
                    onClick={() => setNotaReuniaoForm(nt)}
                  >
                    <span><NotebookText size={13} style={{ verticalAlign: "-2px", marginRight: 4 }} />{nt.titulo || "Sem título"}{nt.autorNome ? <span style={{ fontSize: 12, color: "var(--text-dim)" }}> · {nt.autorNome}</span> : null}</span>
                    <span style={{ fontSize: 12, color: "var(--text-dim)", flexShrink: 0 }}>{fmtDate(nt.data)}</span>
                  </div>
                ))}
                {notasReuniao.filter((nt) => nt.clienteId === clientViewInfo.id).length === 0 && (
                  <span style={{ fontSize: 12.5, color: "var(--text-dim)" }}>Nenhuma nota registrada ainda.</span>
                )}
              </div>
              <button
                className="btn-ghost"
                style={{ width: "100%", marginTop: 8 }}
                onClick={() => setNotaReuniaoForm(emptyNotaReuniao(clientViewInfo.id))}
              >
                <Plus size={13} style={{ verticalAlign: "-2px", marginRight: 4 }} />Nova nota de reunião
              </button>
            </div>
            <div className="modal-actions">
              <button className="btn-ghost" onClick={() => setClientViewInfo(null)}>Fechar</button>
              {clientViewInfo.driveLink && (
                <a className="btn-primary" style={{ marginLeft: 0 }} href={clientViewInfo.driveLink} target="_blank" rel="noreferrer">
                  <ExternalLink size={15} /> Abrir Drive do cliente
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {cronogramaAberto && (
        <Janela
          titulo={cronogramaAberto.clienteId ? "Cronograma · " + clientName(cronogramaAberto.clienteId) : "Cronograma dos clientes"}
          larga
          onFechar={() => setCronogramaAberto(null)}
        >
          <Calendario
            itens={agendaCliente}
            clientes={cronogramaAberto.clienteId ? clients.filter((c) => c.id === cronogramaAberto.clienteId) : clientesAtivos}
            clienteId={cronogramaAberto.clienteId || undefined}
            podeEditar
            onSalvar={gravarColab(api.salvarAgenda)}
            onExcluir={gravarColab(api.excluirAgenda)}
          />
        </Janela>
      )}

      {clientForm && (
        <div className="overlay" onClick={() => setClientForm(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>
              {clients.some((c) => c.id === clientForm.id) ? "Editar cliente" : "Novo cliente"}
              <X size={18} style={{ cursor: "pointer" }} onClick={() => setClientForm(null)} />
            </h3>
            <div className="field">
              <label>Nome / Empresa</label>
              <input value={clientForm.nome} onChange={(e) => setClientForm({ ...clientForm, nome: e.target.value })} />
            </div>
            <div className="field">
              <label>Tipo</label>
              <select value={clientForm.tipo} onChange={(e) => setClientForm({ ...clientForm, tipo: e.target.value })}>
                <option>Recorrente</option>
                <option>Pontual</option>
              </select>
            </div>
            <div className="field">
              <label>Pessoa de contato</label>
              <input value={clientForm.contatoNome} onChange={(e) => setClientForm({ ...clientForm, contatoNome: e.target.value })} />
            </div>
            <div className="grid2">
              <div className="field">
                <label>E-mail</label>
                <input value={clientForm.email} onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })} />
              </div>
              <div className="field">
                <label>Telefone</label>
                <input value={clientForm.telefone} onChange={(e) => setClientForm({ ...clientForm, telefone: e.target.value })} />
              </div>
            </div>
            <div className="field">
              <label>Outros contatos (opcional — quando há mais de um responsável)</label>
              {(clientForm.contatos || []).map((c, idx) => (
                <div key={idx} className="video-item-row">
                  <input
                    placeholder="Nome"
                    value={c.nome}
                    onChange={(e) => {
                      const contatos = clientForm.contatos.map((x, i) => (i === idx ? { ...x, nome: e.target.value } : x));
                      setClientForm({ ...clientForm, contatos });
                    }}
                  />
                  <input
                    placeholder="Telefone"
                    value={c.telefone}
                    onChange={(e) => {
                      const contatos = clientForm.contatos.map((x, i) => (i === idx ? { ...x, telefone: e.target.value } : x));
                      setClientForm({ ...clientForm, contatos });
                    }}
                  />
                  <button className="icon-btn" onClick={() => setClientForm({ ...clientForm, contatos: clientForm.contatos.filter((_, i) => i !== idx) })}><X size={13} /></button>
                </div>
              ))}
              <button
                className="btn-ghost"
                style={{ width: "100%", marginTop: 4 }}
                onClick={() => setClientForm({ ...clientForm, contatos: [...(clientForm.contatos || []), { nome: "", telefone: "" }] })}
              >
                <Plus size={13} style={{ verticalAlign: "-2px", marginRight: 4 }} />Adicionar contato
              </button>
            </div>
            <div className="field">
              <label>Link do Google Drive (arquivos do cliente)</label>
              <input value={clientForm.driveLink} onChange={(e) => setClientForm({ ...clientForm, driveLink: e.target.value })} placeholder="https://drive.google.com/…" />
            </div>
            <div className="field">
              <label>Imagem de capa (usada na visualização em grade)</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleCapaClienteUpload(e.target.files?.[0] || null)}
              />
              {capaUploading && <div className="lock-note" style={{ marginTop: 8 }}>Enviando imagem…</div>}
              {clientForm.capaUrl && !capaUploading && (
                <div className="capa-preview" style={{ backgroundImage: `url(${clientForm.capaUrl})` }} />
              )}
            </div>
            <details className="lock-note" style={{ margin: "12px 0" }}>
              <summary style={{ cursor: "pointer", color: "var(--text-dim)", fontSize: 12.5 }}>Dados de empresa (opcional, usado nas propostas)</summary>
              <div style={{ marginTop: 10 }}>
                <div className="field">
                  <label>Razão social</label>
                  <input value={clientForm.razaoSocial} onChange={(e) => setClientForm({ ...clientForm, razaoSocial: e.target.value })} />
                </div>
                <div className="grid2">
                  <div className="field">
                    <label>CNPJ</label>
                    <input value={clientForm.cnpj} onChange={(e) => setClientForm({ ...clientForm, cnpj: e.target.value })} />
                  </div>
                  <div className="field">
                    <label>CEP</label>
                    <input value={clientForm.cep} onChange={(e) => setClientForm({ ...clientForm, cep: e.target.value })} />
                  </div>
                </div>
                <div className="field">
                  <label>Endereço</label>
                  <input value={clientForm.endereco} onChange={(e) => setClientForm({ ...clientForm, endereco: e.target.value })} />
                </div>
                <div className="grid2">
                  <div className="field">
                    <label>Bairro</label>
                    <input value={clientForm.bairro} onChange={(e) => setClientForm({ ...clientForm, bairro: e.target.value })} />
                  </div>
                  <div className="field">
                    <label>Município / UF</label>
                    <input value={clientForm.municipio} onChange={(e) => setClientForm({ ...clientForm, municipio: e.target.value })} placeholder="Cidade, UF" />
                  </div>
                </div>
              </div>
            </details>
            <div className="field">
              <label>Observações</label>
              <textarea value={clientForm.observacoes} onChange={(e) => setClientForm({ ...clientForm, observacoes: e.target.value })} />
            </div>
            <div className="modal-actions">
              <button className="btn-ghost" onClick={() => setClientForm(null)}>Cancelar</button>
              <button className="btn-primary" style={{ marginLeft: 0 }} onClick={() => saveClient(clientForm)}>Salvar</button>
            </div>
          </div>
        </div>
      )}

      {transacaoForm && (
        <div className="overlay" onClick={() => setTransacaoForm(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>
              {transacoes.some((t) => t.id === transacaoForm.id) ? "Editar transação" : "Nova " + transacaoForm.tipo.toLowerCase()}
              <X size={18} style={{ cursor: "pointer" }} onClick={() => { setTransacaoForm(null); setParcelasInput(1); setRepeticaoFreq("mensal"); }} />
            </h3>
            {(() => {
              const tipoSelect = (
                <div className="field">
                  <label>Tipo</label>
                  <select
                    value={transacaoForm.tipo}
                    onChange={(e) => {
                      const tipo = e.target.value;
                      setTransacaoForm({
                        ...transacaoForm,
                        tipo,
                        categoria: tipo === "Receita" ? "" : (tags[0]?.nome || ""),
                        tipoReceita: tipo === "Receita" ? (transacaoForm.tipoReceita || tiposReceita[0] || "") : transacaoForm.tipoReceita,
                      });
                    }}
                  >
                    <option>Receita</option>
                    <option>Despesa</option>
                  </select>
                </div>
              );
              return transacaoForm.tipo === "Despesa" ? (
                <div className="grid2">
                  {tipoSelect}
                  <div className="field">
                    <label>Categoria</label>
                    <select value={transacaoForm.categoria} onChange={(e) => setTransacaoForm({ ...transacaoForm, categoria: e.target.value })}>
                      {tags.map((tg) => <option key={tg.nome} value={tg.nome}>{tg.nome}</option>)}
                    </select>
                  </div>
                </div>
              ) : (
                tipoSelect
              );
            })()}
            {transacaoForm.tipo === "Receita" && (
              <div className="field">
                <label>Tipo de receita</label>
                <select value={transacaoForm.tipoReceita} onChange={(e) => setTransacaoForm({ ...transacaoForm, tipoReceita: e.target.value })}>
                  {tiposReceita.map((tr) => (
                    <option key={tr} value={tr}>{tr}</option>
                  ))}
                </select>
              </div>
            )}
            {transacaoForm.tipo === "Receita" && transacaoForm.tipoReceita !== TIPO_RECEITA_RETIRADA_RESERVA && (
              <div className="field">
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={!!transacaoForm.notaEmitida}
                    onChange={(e) =>
                      setTransacaoForm({
                        ...transacaoForm,
                        notaEmitida: e.target.checked,
                        dataNotaEmitida: e.target.checked ? transacaoForm.dataNotaEmitida || todayISO() : "",
                      })
                    }
                  />
                  Nota emitida
                </label>
                {transacaoForm.notaEmitida && (
                  <>
                    <label>Nota emitida em</label>
                    <input type="date" value={transacaoForm.dataNotaEmitida} onChange={(e) => setTransacaoForm({ ...transacaoForm, dataNotaEmitida: e.target.value })} />
                    {transacaoForm.dataNotaEmitida && (
                      <div className="lock-note">
                        <Archive size={12} />
                        Entra no faturamento de {mesLabel(mesRef(transacaoForm.dataNotaEmitida))}; o imposto vence em {fmtDate(vencimentoTributosDoMes(mesRef(transacaoForm.dataNotaEmitida)))}.
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
            <div className="field">
              <label>Descrição</label>
              <input value={transacaoForm.descricao} onChange={(e) => setTransacaoForm({ ...transacaoForm, descricao: e.target.value })} placeholder="Ex: Produção Coprel Julho" />
            </div>
            <div className="grid2">
              <div className="field">
                <label>Valor (R$){transacaoForm.parcelaGrupoId ? "" : parcelasInput > 1 ? " — " + FREQUENCIA_LABEL[transacaoForm.tipo === "Despesa" ? repeticaoFreq : "mensal"] : ""}</label>
                <input type="number" min="0" step="0.01" value={transacaoForm.valor} onChange={(e) => setTransacaoForm({ ...transacaoForm, valor: e.target.value })} />
              </div>
              <div className="field">
                <label>Vencimento{parcelasInput > 1 ? " (1ª parcela)" : ""}</label>
                <input type="date" value={transacaoForm.data} onChange={(e) => setTransacaoForm({ ...transacaoForm, data: e.target.value })} />
              </div>
            </div>
            {transacaoForm.tipo === "Despesa" && (
              <div className="field">
                <label>Natureza</label>
                <select value={transacaoForm.natureza || "Variável"} onChange={(e) => setTransacaoForm({ ...transacaoForm, natureza: e.target.value })}>
                  {NATUREZA_DESPESA.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            )}
            {!transacoes.some((t) => t.id === transacaoForm.id) && !transacaoForm.parcelaGrupoId && transacaoForm.tipo === "Despesa" && (
              <div className="field">
                <label>Repetição (opcional)</label>
                <div className="grid2">
                  <select value={repeticaoFreq} onChange={(e) => setRepeticaoFreq(e.target.value)}>
                    <option value="mensal">Mensalmente</option>
                    <option value="semanal">Semanalmente</option>
                    <option value="semestral">Semestralmente</option>
                    <option value="anual">Anualmente</option>
                  </select>
                  <input
                    type="number"
                    min="1"
                    max="48"
                    placeholder="Quantidade de repetições"
                    value={parcelasInput}
                    onChange={(e) => setParcelasInput(Math.max(1, parseInt(e.target.value) || 1))}
                  />
                </div>
                {parcelasInput > 1 && (
                  <div className="lock-note">
                    <Archive size={12} />
                    Serão criadas {parcelasInput} transações ({FREQUENCIA_LABEL[repeticaoFreq]}) de R$ {(parseFloat(transacaoForm.valor) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} cada (total R$ {((parseFloat(transacaoForm.valor) || 0) * parcelasInput).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}), a partir do vencimento acima.
                  </div>
                )}
              </div>
            )}
            {!transacoes.some((t) => t.id === transacaoForm.id) && !transacaoForm.parcelaGrupoId && transacaoForm.tipo === "Receita" && (
              <div className="field">
                <label>Parcelar em quantas vezes? (opcional — para compras parceladas)</label>
                <input
                  type="number"
                  min="1"
                  max="48"
                  value={parcelasInput}
                  onChange={(e) => setParcelasInput(Math.max(1, parseInt(e.target.value) || 1))}
                />
                {parcelasInput > 1 && (
                  <div className="lock-note">
                    <Archive size={12} />
                    Serão criadas {parcelasInput} transações mensais de R$ {(parseFloat(transacaoForm.valor) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} cada (total R$ {((parseFloat(transacaoForm.valor) || 0) * parcelasInput).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}), a partir do vencimento acima.
                  </div>
                )}
              </div>
            )}
            <div className="grid2">
              <div className="field">
                <label>Status</label>
                <select value={transacaoForm.statusPagamento} onChange={(e) => setTransacaoForm({ ...transacaoForm, statusPagamento: e.target.value })}>
                  {STATUS_PAGAMENTO.map((s) => (
                    <option key={s} value={s}>{s === "Pago" && transacaoForm.tipo === "Receita" ? "Recebido" : s}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Cliente (opcional)</label>
                <select value={transacaoForm.clienteId} onChange={(e) => setTransacaoForm({ ...transacaoForm, clienteId: e.target.value })}>
                  <option value="">Selecionar…</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="field">
              <label>Demanda vinculada (opcional)</label>
              <select value={transacaoForm.demandaId} onChange={(e) => setTransacaoForm({ ...transacaoForm, demandaId: e.target.value })}>
                <option value="">Nenhuma</option>
                {demands.map((d) => (
                  <option key={d.id} value={d.id}>{d.projeto}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Observações</label>
              <textarea value={transacaoForm.observacoes} onChange={(e) => setTransacaoForm({ ...transacaoForm, observacoes: e.target.value })} />
            </div>
            <div className="modal-actions">
              <button className="btn-ghost" onClick={() => { setTransacaoForm(null); setParcelasInput(1); setRepeticaoFreq("mensal"); }}>Cancelar</button>
              <button
                className="btn-primary"
                style={{ marginLeft: 0 }}
                onClick={() => saveTransacao({ ...transacaoForm, valor: transacaoForm.valor || "0" }, parcelasInput, transacaoForm.tipo === "Despesa" ? repeticaoFreq : "mensal")}
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {equipamentoForm && (
        <div className="overlay" onClick={() => setEquipamentoForm(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>
              {equipamentos.some((e) => e.id === equipamentoForm.id) ? "Editar equipamento" : "Novo equipamento"}
              <button className="icon-btn" onClick={() => setEquipamentoForm(null)}><X size={15} /></button>
            </h3>
            <div className="field">
              <label>Nome do equipamento</label>
              <input
                type="text"
                placeholder="Ex: Câmera Sony A7III"
                value={equipamentoForm.nome}
                onChange={(e) => setEquipamentoForm({ ...equipamentoForm, nome: e.target.value })}
              />
            </div>
            <div className="grid2">
              <div className="field">
                <label>Categoria</label>
                <select value={equipamentoForm.categoria} onChange={(e) => setEquipamentoForm({ ...equipamentoForm, categoria: e.target.value })}>
                  {categoriasEquipamento.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Status</label>
                <select value={equipamentoForm.status} onChange={(e) => setEquipamentoForm({ ...equipamentoForm, status: e.target.value })}>
                  {STATUS_EQUIP.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="grid2">
              <div className="field">
                <label>Responsável / com quem está</label>
                <input type="text" placeholder="Ex: Vítor" value={equipamentoForm.responsavel} onChange={(e) => setEquipamentoForm({ ...equipamentoForm, responsavel: e.target.value })} />
              </div>
              <div className="field">
                <label>Local (quando disponível)</label>
                <input type="text" placeholder="Ex: Armário 2, prateleira B" value={equipamentoForm.local} onChange={(e) => setEquipamentoForm({ ...equipamentoForm, local: e.target.value })} />
              </div>
            </div>
            <div className="grid2">
              <div className="field">
                <label>Número de série</label>
                <input type="text" value={equipamentoForm.numeroSerie} onChange={(e) => setEquipamentoForm({ ...equipamentoForm, numeroSerie: e.target.value })} />
              </div>
              <div className="field">
                <label>Quantidade</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={equipamentoForm.quantidade}
                  onChange={(e) => setEquipamentoForm({ ...equipamentoForm, quantidade: Math.max(1, parseInt(e.target.value) || 1) })}
                />
              </div>
            </div>
            <div className="grid2">
              <div className="field">
                <label>Valor de compra (R$) — por unidade</label>
                <input type="number" step="0.01" value={equipamentoForm.valorCompra} onChange={(e) => setEquipamentoForm({ ...equipamentoForm, valorCompra: e.target.value })} />
              </div>
              <div className="field">
                <label>Data de compra</label>
                <input type="date" value={equipamentoForm.dataCompra} onChange={(e) => setEquipamentoForm({ ...equipamentoForm, dataCompra: e.target.value })} />
              </div>
            </div>
            <div className="field">
              <label>Observações</label>
              <textarea value={equipamentoForm.observacoes} onChange={(e) => setEquipamentoForm({ ...equipamentoForm, observacoes: e.target.value })} />
            </div>
            <div className="modal-actions">
              <button className="btn-ghost" onClick={() => setEquipamentoForm(null)}>Cancelar</button>
              <button className="btn-primary" style={{ marginLeft: 0 }} onClick={() => saveEquipamento(equipamentoForm)}>Salvar</button>
            </div>
          </div>
        </div>
      )}

      {processoForm && (
        <div className="overlay" onClick={() => { setProcessoForm(null); setProcessoNovoArquivo(null); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>
              {processosDocumentos.some((d) => d.id === processoForm.id) ? "Editar documento" : "Novo documento"}
              <button className="icon-btn" onClick={() => { setProcessoForm(null); setProcessoNovoArquivo(null); }}><X size={15} /></button>
            </h3>
            <div className="field">
              <label>Título</label>
              <input
                type="text"
                placeholder="Ex: Mensagem de boas-vindas"
                value={processoForm.titulo}
                onChange={(e) => setProcessoForm({ ...processoForm, titulo: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Categoria</label>
              <select value={processoForm.categoria} onChange={(e) => setProcessoForm({ ...processoForm, categoria: e.target.value })}>
                <option value="">Sem categoria</option>
                {processosCategorias.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Conteúdo em texto (opcional — para mensagens e termos)</label>
              <textarea
                rows={5}
                placeholder="Ex: Olá! Segue nossa proposta..."
                value={processoForm.conteudoTexto}
                onChange={(e) => setProcessoForm({ ...processoForm, conteudoTexto: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Arquivo (opcional — imagem, PDF, etc.)</label>
              {processoForm.arquivoNome && !processoNovoArquivo && (
                <div className="lock-note" style={{ marginBottom: 8 }}>
                  <FileText size={12} />
                  Arquivo atual: {processoForm.arquivoNome}
                </div>
              )}
              <input
                type="file"
                ref={processoFileInputRef}
                onChange={(e) => setProcessoNovoArquivo(e.target.files?.[0] || null)}
              />
            </div>
            <div className="field">
              <label>Observações</label>
              <textarea value={processoForm.observacoes} onChange={(e) => setProcessoForm({ ...processoForm, observacoes: e.target.value })} />
            </div>
            <div className="modal-actions">
              <button className="btn-ghost" onClick={() => { setProcessoForm(null); setProcessoNovoArquivo(null); }}>Cancelar</button>
              <button className="btn-primary" style={{ marginLeft: 0 }} onClick={() => saveProcessoDocumento(processoForm, processoNovoArquivo)}>Salvar</button>
            </div>
          </div>
        </div>
      )}

      {retiradaReservaForm && (
        <div className="overlay" onClick={() => setRetiradaReservaForm(null)}>
          <div className="modal" style={{ width: 380 }} onClick={(e) => e.stopPropagation()}>
            <h3>Retirar da poupança</h3>
            <p style={{ fontSize: 13.5, color: "var(--text-dim)", marginTop: -4 }}>
              Reserva disponível: R$ {reservaAcumulada.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <div className="field">
              <label>Valor (R$)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                autoFocus
                value={retiradaReservaForm.valor}
                onChange={(e) => setRetiradaReservaForm({ ...retiradaReservaForm, valor: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Data</label>
              <input
                type="date"
                value={retiradaReservaForm.data}
                onChange={(e) => setRetiradaReservaForm({ ...retiradaReservaForm, data: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Descrição (opcional)</label>
              <input
                value={retiradaReservaForm.descricao}
                onChange={(e) => setRetiradaReservaForm({ ...retiradaReservaForm, descricao: e.target.value })}
                placeholder="Ex: Retirada pra equipamento novo"
              />
            </div>
            <div className="modal-actions">
              <button className="btn-ghost" onClick={() => setRetiradaReservaForm(null)}>Cancelar</button>
              <button className="btn-primary" style={{ marginLeft: 0 }} onClick={retirarDaReserva}>Retirar</button>
            </div>
          </div>
        </div>
      )}

      {notaReuniaoForm && (
        <div className="overlay" onClick={() => setNotaReuniaoForm(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>
              {notasReuniao.some((n2) => n2.id === notaReuniaoForm.id) ? "Editar nota" : "Nova nota de reunião"}
              <X size={18} style={{ cursor: "pointer" }} onClick={() => setNotaReuniaoForm(null)} />
            </h3>
            <div className="field">
              <label>Cliente</label>
              <select
                value={notaReuniaoForm.clienteId}
                onChange={(e) => setNotaReuniaoForm({ ...notaReuniaoForm, clienteId: e.target.value })}
              >
                <option value="">Sem cliente vinculado</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            {!notaReuniaoForm.clienteId && (
              <div className="field">
                <label>Nome do cliente (não cadastrado)</label>
                <input
                  value={notaReuniaoForm.clienteNomeLivre}
                  onChange={(e) => setNotaReuniaoForm({ ...notaReuniaoForm, clienteNomeLivre: e.target.value })}
                  placeholder="Ex: Contato via indicação, ainda sem cadastro"
                />
              </div>
            )}
            <div className="grid2">
              <div className="field">
                <label>Título</label>
                <input
                  value={notaReuniaoForm.titulo}
                  onChange={(e) => setNotaReuniaoForm({ ...notaReuniaoForm, titulo: e.target.value })}
                  placeholder="Ex: Reunião de brief"
                />
              </div>
              <div className="field">
                <label>Data</label>
                <input type="date" value={notaReuniaoForm.data} onChange={(e) => setNotaReuniaoForm({ ...notaReuniaoForm, data: e.target.value })} />
              </div>
            </div>
            <div className="field">
              <label>Anotações / combinados</label>
              <textarea
                rows={8}
                value={notaReuniaoForm.conteudo}
                onChange={(e) => setNotaReuniaoForm({ ...notaReuniaoForm, conteudo: e.target.value })}
                placeholder="O que foi combinado, referências enviadas, preferências do cliente…"
              />
            </div>
            <div className="modal-actions">
              <button className="btn-ghost" onClick={() => setNotaReuniaoForm(null)}>Cancelar</button>
              <button className="btn-primary" style={{ marginLeft: 0 }} onClick={() => saveNotaReuniao(notaReuniaoForm)}>Salvar</button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="overlay" onClick={() => setConfirmDelete(null)}>
          <div className="modal" style={{ width: 380 }} onClick={(e) => e.stopPropagation()}>
            <h3>Excluir registro <AlertTriangle size={18} color="var(--red)" /></h3>
            <p style={{ fontSize: 13.5, color: "var(--text-dim)" }}>
              Tem certeza que quer excluir "{confirmDelete.label || "sem nome"}"? Essa ação não pode ser desfeita.
            </p>
            <div className="modal-actions">
              <button className="btn-ghost" onClick={() => setConfirmDelete(null)}>Cancelar</button>
              {confirmDelete.type === "transacao" && confirmDelete.parcelaGrupoId && (
                <button
                  className="btn-danger"
                  onClick={() => removeTransacao(confirmDelete.id, true)}
                >
                  Excluir todas as parcelas
                </button>
              )}
              <button
                className="btn-danger"
                onClick={() => {
                  if (confirmDelete.type === "demand") removeDemand(confirmDelete.id);
                  else if (confirmDelete.type === "transacao") removeTransacao(confirmDelete.id, false);
                  else if (confirmDelete.type === "equipamento") removeEquipamento(confirmDelete.id);
                  else if (confirmDelete.type === "processo") removeProcessoDocumento(confirmDelete.doc);
                  else if (confirmDelete.type === "proposta") removeProposal(confirmDelete.id);
                  else if (confirmDelete.type === "notaReuniao") removeNotaReuniao(confirmDelete.id);
                  else removeClient(confirmDelete.id);
                }}
              >
                {confirmDelete.type === "transacao" && confirmDelete.parcelaGrupoId ? "Excluir só esta" : "Excluir"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

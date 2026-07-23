import React, { useState, useEffect, useMemo, useRef } from "react";
import { Film, Users, Plus, Pencil, Trash2, X, AlertTriangle, Clock, CheckCircle2, PauseCircle, ExternalLink, Archive, FileText, Calculator, CheckCircle, DollarSign, Settings, LayoutGrid, ChevronLeft, ChevronRight, GripVertical, Target, Search, Bell, CreditCard, TrendingUp, Wallet, Eye, EyeOff, Camera, Image as ImageIcon, Home, Wrench, Package, LogOut, Download, Copy, Calendar } from "lucide-react";
import { PROPOSTA_HTML, CALCULADORA_HTML } from "./embeddedTools.js";
import { supabase } from "./lib/supabaseClient.js";
import * as api from "./lib/api.js";
import * as googleCal from "./lib/googleCalendar.js";

let xlsxModulePromise = null;
function loadXLSX() {
  if (!xlsxModulePromise) xlsxModulePromise = import("xlsx");
  return xlsxModulePromise;
}

const STATUS_PRODUCAO = ["Não iniciada", "Em andamento", "Finalizada", "StandBy"];
const STATUS_APROVACAO = ["Não enviado", "Aguardando", "Aprovado", "Alteração solicitada"];
const DEFAULT_TIPOS = ["Produção Comercial", "Institucional", "Podcast", "Motion", "Outro"];
const DEFAULT_PROCESSOS_CATEGORIAS = ["Mensagens padrão", "Dados de pagamento", "Termos de uso de imagem", "Captação", "Edição", "Treinamentos"];
const PROCESSO_ARQUIVO_MAX_BYTES = 25 * 1024 * 1024;

const TAB_LABELS = {
  inicio: "Início",
  clientes: "Clientes",
  "propostas-lista": "Propostas",
  demandas: "Demandas",
  kanban: "Kanban semanal",
  financeiro: "Financeiro",
  metas: "Metas",
  equipamentos: "Equipamentos",
  processos: "Processos internos",
  calculadora: "Calculadora",
  propostas: "Gerador de Propostas",
  config: "Configurações",
};
const RETENCAO_DIAS = 30;

const CATEGORIAS_RECEITA = ["Produção", "Consultoria", "Outro"];
const CATEGORIAS_DESPESA = ["Freelancer", "Equipamento", "Software", "Escritório", "Transporte", "Imposto", "Outro"];
const STATUS_PAGAMENTO = ["Pendente", "Pago"];
const NATUREZA_DESPESA = ["Variável", "Fixa"];
const TAG_COLORS = ["#D9A441", "#4FA8A0", "#E2574C", "#9B87C4", "#6FBF73", "#5B9BD9", "#E07BB5", "#B0B4BB"];

const emptyTag = (nome, cor) => ({
  id: "tg_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
  nome: nome.trim(),
  cor,
});

const CATEGORIAS_EQUIP = ["Câmeras", "Lentes", "Áudio", "Iluminação", "Drones", "Acessórios", "Informática", "Outro"];
const STATUS_EQUIP = ["Disponível", "Em uso", "Em manutenção", "Emprestado", "Danificado"];

const emptyEquipamento = () => ({
  id: "eq_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
  nome: "",
  categoria: CATEGORIAS_EQUIP[0],
  status: "Disponível",
  numeroSerie: "",
  responsavel: "",
  local: "",
  valorCompra: "",
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

function parseEquipamentosSheet(rowsBrutas) {
  const rows = corrigirCabecalhoDeslocado(rowsBrutas);
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
    const categoria = CATEGORIAS_EQUIP.includes(campos.categoria) ? campos.categoria : CATEGORIAS_EQUIP[0];
    const status = STATUS_EQUIP.includes(campos.status) ? campos.status : "Disponível";
    const valor = parseValorCell(campos.valorCompra);
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
    ["Nome", "Categoria", "Status", "Nº de Série", "Responsável", "Local", "Valor de Compra", "Data de Compra", "Observações"],
    ["Ex: Câmera Sony A7III", "Câmeras", "Disponível", "SN123456", "Vítor", "Armário 2, prateleira B", "12500.00", "2024-03-15", ""],
  ]);
  XLSX.utils.book_append_sheet(wb, ws, "Equipamentos");
  XLSX.writeFile(wb, "modelo-equipamentos.xlsx");
}

const emptyTransacao = (tipo = "Receita") => ({
  id: "t_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
  tipo,
  descricao: "",
  categoria: tipo === "Receita" ? CATEGORIAS_RECEITA[0] : CATEGORIAS_DESPESA[0],
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
  tags: [],
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
  statusProducao: STATUS_PRODUCAO[0],
  statusAprovacao: STATUS_APROVACAO[0],
  dataEntrega: "",
  dataEnvioAprovacao: "",
  dataAprovacao: "",
  link: "",
  observacoes: "",
  itens: [],
});

const emptyVideoItem = () => ({ id: "v_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6), nome: "", statusEnvio: "Não enviado", statusAprovacao: "Aguardando" });
const VIDEO_STATUS_ENVIO = ["Não enviado", "Enviado"];
const VIDEO_STATUS_APROVACAO = ["Aguardando", "Aprovado", "Alteração solicitada"];

const emptyClient = () => ({
  id: "c_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
  nome: "",
  tipo: "Recorrente",
  contatoNome: "",
  email: "",
  telefone: "",
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
});

function fmtDate(iso) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function getUrgencia(d) {
  if (d.statusProducao === "Finalizada") return { label: "Concluído", tone: "done" };
  if (d.statusProducao === "StandBy") return { label: "StandBy", tone: "standby" };
  if (d.statusAprovacao === "Aguardando") return { label: "Aguardando cliente", tone: "wait" };
  if (!d.dataEntrega) return { label: "Sem prazo", tone: "neutral" };
  const today = new Date(todayISO() + "T00:00:00");
  const entrega = new Date(d.dataEntrega + "T00:00:00");
  const diff = Math.round((entrega - today) / 86400000);
  if (diff < 0) return { label: "Atrasado", tone: "late" };
  if (diff <= 3) return { label: "Urgente", tone: "urgent" };
  return { label: "No prazo", tone: "ok" };
}

function getRetencao(d) {
  if (!d.dataAprovacao) return { label: "Aguardando aprovação", ready: false };
  const dt = new Date(d.dataAprovacao + "T00:00:00");
  dt.setDate(dt.getDate() + RETENCAO_DIAS);
  const today = new Date(todayISO() + "T00:00:00");
  const ready = dt <= today;
  return { label: fmtDate(dt.toISOString().slice(0, 10)), ready };
}

const TONE_CLASS = {
  late: "badge-late",
  wait: "badge-wait",
  urgent: "badge-urgent",
  ok: "badge-ok",
  done: "badge-done",
  standby: "badge-standby",
  neutral: "badge-neutral",
};

function videoProgress(d) {
  const itens = d.itens || [];
  if (itens.length === 0) return null;
  const done = itens.filter((v) => v.statusAprovacao === "Aprovado").length;
  return { done, total: itens.length };
}

const FOLLOWUP_DIAS = 7;

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

function TagPicker({ allTags, selectedIds, onToggle, onCreate, onClose }) {
  const [search, setSearch] = useState("");
  const [pickingColor, setPickingColor] = useState(false);

  const matches = allTags.filter((tg) => tg.nome.toLowerCase().includes(search.trim().toLowerCase()));
  const exact = allTags.some((tg) => tg.nome.toLowerCase() === search.trim().toLowerCase());

  return (
    <div className="tag-picker" onClick={(e) => e.stopPropagation()}>
      <input
        className="tag-picker-search"
        autoFocus
        value={search}
        onChange={(e) => { setSearch(e.target.value); setPickingColor(false); }}
        placeholder="Buscar ou criar tag…"
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose();
        }}
      />
      <div className="tag-picker-list">
        {matches.map((tg) => (
          <button
            key={tg.id}
            className={"tag-pill tag-pill-btn" + (selectedIds.includes(tg.id) ? " selected" : "")}
            style={{ "--tag-color": tg.cor }}
            onClick={() => onToggle(tg.id)}
          >
            <span className="tag-dot" style={{ background: tg.cor }} />
            {tg.nome}
            {selectedIds.includes(tg.id) && <CheckCircle2 size={11} />}
          </button>
        ))}
        {matches.length === 0 && !search && <div className="tag-picker-empty">Nenhuma tag ainda. Crie a primeira abaixo.</div>}
      </div>
      {search.trim() && !exact && (
        pickingColor ? (
          <div className="tag-color-row">
            {TAG_COLORS.map((c) => (
              <button
                key={c}
                className="tag-color-swatch"
                style={{ background: c }}
                onClick={() => { const tg = onCreate(search, c); if (tg) onToggle(tg.id); setSearch(""); setPickingColor(false); }}
              />
            ))}
          </div>
        ) : (
          <button className="tag-picker-create" onClick={() => setPickingColor(true)}>
            <Plus size={12} /> Criar tag "{search.trim()}"
          </button>
        )
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
  const height = 280;
  const padding = { top: 16, right: 16, bottom: 30, left: 54 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;
  const n = Math.max(data.length, 1);
  const groupW = chartW / n;
  const barW = Math.min(26, groupW * 0.26);

  const allVals = data.flatMap((d) => [d.totalReceita, d.totalDespesas, d.meta || 0, d.margem]);
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

  const margemPts = data.map((d, i) => [padding.left + groupW * i + groupW / 2, scaleY(d.margem)]);
  const margemPath = margemPts.map((p, i) => (i === 0 ? "M" : "L") + p[0] + "," + p[1]).join(" ");

  const temMeta = data.some((d) => d.meta > 0);
  const metaPts = data.map((d, i) => [padding.left + groupW * i + groupW / 2, scaleY(d.meta || 0)]);
  const metaPath = metaPts.map((p, i) => (i === 0 ? "M" : "L") + p[0] + "," + p[1]).join(" ");

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
        return (
          <g key={d.mes}>
            <rect
              x={cx - barW - 2}
              y={Math.min(scaleY(d.totalReceita), zeroY)}
              width={barW}
              height={Math.abs(zeroY - scaleY(d.totalReceita))}
              className="chart-bar-receita"
              rx="2"
            >
              <title>{"Receita " + mesLabel(d.mes) + ": R$ " + d.totalReceita.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</title>
            </rect>
            <rect
              x={cx + 2}
              y={Math.min(scaleY(d.totalDespesas), zeroY)}
              width={barW}
              height={Math.abs(zeroY - scaleY(d.totalDespesas))}
              className="chart-bar-despesa"
              rx="2"
            >
              <title>{"Despesas " + mesLabel(d.mes) + ": R$ " + d.totalDespesas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</title>
            </rect>
            <text x={cx} y={height - padding.bottom + 18} textAnchor="middle" className="chart-axis-label">{mesLabel(d.mes)}</text>
          </g>
        );
      })}

      {temMeta && <path d={metaPath} className="chart-line-meta" fill="none" />}
      <path d={margemPath} className="chart-line-margem" fill="none" />
      {margemPts.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r="3" className="chart-dot-margem">
          <title>{"Margem " + mesLabel(data[i].mes) + ": R$ " + data[i].margem.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</title>
        </circle>
      ))}
    </svg>
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

export default function App() {
  const [tab, setTab] = useState("inicio");
  const [loading, setLoading] = useState(true);
  const [demands, setDemands] = useState([]);
  const [clients, setClients] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [transacoes, setTransacoes] = useState([]);
  const [tiposProducao, setTiposProducao] = useState(DEFAULT_TIPOS);
  const [kanbanTasks, setKanbanTasks] = useState([]);
  const [demandForm, setDemandForm] = useState(null);
  const [clientForm, setClientForm] = useState(null);
  const [transacaoForm, setTransacaoForm] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [filterCliente, setFilterCliente] = useState("");
  const [clientView, setClientView] = useState("lista");
  const [expandedDemands, setExpandedDemands] = useState(() => new Set());
  const [financeFilter, setFinanceFilter] = useState("todos");
  const [financeClienteFilter, setFinanceClienteFilter] = useState("");
  const [monthAnchor, setMonthAnchor] = useState(mesRef(todayISO()));
  const [parcelasInput, setParcelasInput] = useState(1);
  const [metas, setMetas] = useState({});
  const [metasAnuais, setMetasAnuais] = useState({});
  const [metasClientesNovos, setMetasClientesNovos] = useState({});
  const [tags, setTags] = useState([]);
  const [tagPopoverFor, setTagPopoverFor] = useState(null);
  const [tagFilterIds, setTagFilterIds] = useState([]);
  const [tagSearch, setTagSearch] = useState("");
  const [categoriaSearch, setCategoriaSearch] = useState("");
  const [metaInputValue, setMetaInputValue] = useState("");
  const [metaAnualInputValue, setMetaAnualInputValue] = useState("");
  const [metaClientesInputValue, setMetaClientesInputValue] = useState("");

  useEffect(() => {
    setMetaInputValue(metas[monthAnchor] ? String(metas[monthAnchor]) : "");
    setMetaClientesInputValue(metasClientesNovos[monthAnchor] ? String(metasClientesNovos[monthAnchor]) : "");
  }, [monthAnchor, metas, metasClientesNovos]);

  useEffect(() => {
    const ano = monthAnchor.slice(0, 4);
    setMetaAnualInputValue(metasAnuais[ano] ? String(metasAnuais[ano]) : "");
  }, [monthAnchor, metasAnuais]);
  const [novoTipoInput, setNovoTipoInput] = useState("");
  const [hideValues, setHideValues] = useState(false);
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
  const [googleToken, setGoogleToken] = useState(null);
  const [googleCalendarId, setGoogleCalendarId] = useState("");
  const [googleConectando, setGoogleConectando] = useState(false);
  const [googleErro, setGoogleErro] = useState("");
  const [googleEventosHoje, setGoogleEventosHoje] = useState([]);
  const [googleEventosHojeCarregando, setGoogleEventosHojeCarregando] = useState(false);

  const [search, setSearch] = useState("");
  const [toast, setToast] = useState(null);
  const clientsRef = useRef(clients);
  const demandsRef = useRef(demands);
  const proposalsRef = useRef(proposals);
  const transacoesRef = useRef(transacoes);
  clientsRef.current = clients;
  demandsRef.current = demands;
  proposalsRef.current = proposals;
  transacoesRef.current = transacoes;

  useEffect(() => {
    (async () => {
      const load = (label, fn, setter, fallback) =>
        fn().then(setter, (e) => {
          console.error("Falha ao carregar " + label, e);
          setter(fallback);
        });
      await Promise.all([
        load("demandas", api.listDemandas, setDemands, []),
        load("clientes", api.listClientes, setClients, []),
        load("propostas", api.listPropostas, setProposals, []),
        load("transações", api.listTransacoes, setTransacoes, []),
        load("tipos de produção", () => api.seedTiposProducaoSeVazio(DEFAULT_TIPOS), setTiposProducao, DEFAULT_TIPOS),
        load("tarefas do kanban", api.listKanbanTasks, setKanbanTasks, []),
        load("metas", api.listMetasMensais, setMetas, {}),
        load("metas anuais", api.listMetasAnuais, setMetasAnuais, {}),
        load("meta de clientes", api.listMetasClientesMensais, setMetasClientesNovos, {}),
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
    function onMessage(ev) {
      if (!ev.data || ev.data.type !== "fuzz:proposta-concluida") return;
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
        };
        clientId = novo.id;
        clientList = [novo, ...currentClients];
      }
      persistClients(clientList);

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
      persistProposals([novaProposta, ...proposalsRef.current]);

      setToast(
        (match ? "Cliente atualizado" : "Cliente criado") +
          ": " + nomeCliente + " · proposta nº " + p.numero + " adicionada em Propostas."
      );
      setTimeout(() => setToast(null), 6000);
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
    const novaDemanda = {
      ...emptyDemand(),
      projeto: prop.titulo,
      clienteId: prop.clienteId,
      tipo: prop.tipo,
      observacoes: "Gerada a partir da Proposta nº " + prop.numero + (prop.valorTotal ? " — valor: R$ " + prop.valorTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : ""),
    };
    persistDemands([novaDemanda, ...demandsRef.current]);
    persistProposals(proposalsRef.current.map((p) => (p.id === prop.id ? { ...p, status: "Confirmada" } : p)));

    if (prop.valorTotal) {
      const novaReceita = {
        ...emptyTransacao("Receita"),
        descricao: prop.titulo,
        valor: String(prop.valorTotal),
        data: todayISO(),
        demandaId: novaDemanda.id,
        clienteId: prop.clienteId,
        observacoes: "Gerada automaticamente a partir da Proposta nº " + prop.numero,
      };
      persistTransacoes([novaReceita, ...transacoesRef.current]);
    }

    setToast("Proposta confirmada: demanda \"" + prop.titulo + "\" criada em Demandas" + (prop.valorTotal ? " e receita lançada em Financeiro." : "."));
    setTimeout(() => setToast(null), 6000);
  }

  function recusarProposta(prop) {
    persistProposals(proposalsRef.current.map((p) => (p.id === prop.id ? { ...p, status: "Recusada" } : p)));
  }

  async function persistTransacoes(list) {
    const prev = transacoesRef.current;
    setTransacoes(list);
    try {
      await api.syncTransacoes(prev, list);
    } catch (e) {
      console.error("Falha ao salvar transações", e);
    }
  }

  function addMonthsToDate(iso, n) {
    const d = new Date(iso + "T00:00:00");
    d.setMonth(d.getMonth() + n);
    return d.toISOString().slice(0, 10);
  }

  function saveTransacao(t, parcelas) {
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
          data: addMonthsToDate(t.data, i),
          parcelaGrupoId: grupoId,
          parcelaAtual: i + 1,
          parcelaTotal: parcelas,
        });
      }
      persistTransacoes([...novas, ...transacoes]);
    } else {
      const list = exists ? transacoes.map((x) => (x.id === t.id ? t : x)) : [t, ...transacoes];
      persistTransacoes(list);
    }
    setTransacaoForm(null);
    setParcelasInput(1);
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
    persistTransacoes(transacoes.map((t) => (t.tags && t.tags.includes(id) ? { ...t, tags: t.tags.filter((tid) => tid !== id) } : t)));
  }

  function toggleTagOnTransacao(transacaoId, tagId) {
    persistTransacoes(
      transacoes.map((t) => {
        if (t.id !== transacaoId) return t;
        const atual = t.tags || [];
        const tem = atual.includes(tagId);
        return { ...t, tags: tem ? atual.filter((id) => id !== tagId) : [...atual, tagId] };
      })
    );
  }

  function toggleTagFilter(tagId) {
    setTagFilterIds((prev) => (prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]));
  }

  useEffect(() => {
    if (!tagPopoverFor) return;
    function onDocClick() {
      setTagPopoverFor(null);
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [tagPopoverFor]);

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
    const list = demandsRef.current.map((d) =>
      d.id === demandId ? { ...d, itens: (d.itens || []).map((it) => (it.id === itemId ? { ...it, [field]: value } : it)) } : d
    );
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

  function saveDemand(d) {
    const exists = demands.some((x) => x.id === d.id);
    const list = exists ? demands.map((x) => (x.id === d.id ? d : x)) : [d, ...demands];
    persistDemands(list);
    setDemandForm(null);
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
        const { novos, ignoradas } = parseEquipamentosSheet(rows);
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
      const token = await googleCal.requestGoogleToken(clientId);
      setGoogleToken(token);
      setGoogleCalendarId("primary");
    } catch (e) {
      console.error("Falha ao conectar Google Agenda", e);
      setGoogleErro(e.message || "Falha ao conectar com o Google Agenda.");
    } finally {
      setGoogleConectando(false);
    }
  }

  function reconectarGoogleAgenda() {
    setGoogleToken(null);
    conectarGoogleAgenda();
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
      .catch((e) => console.error("Falha ao carregar compromissos de hoje", e))
      .finally(() => { if (ativo) setGoogleEventosHojeCarregando(false); });
    return () => { ativo = false; };
  }, [googleToken, googleCalendarId]);

  const clientName = (id) => clients.find((c) => c.id === id)?.nome || "—";

  const filteredDemands = useMemo(() => {
    return demands.filter((d) => {
      if (filterCliente && d.clienteId !== filterCliente) return false;
      if (search && !d.projeto.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [demands, filterCliente, search]);

  const stats = useMemo(() => {
    const atrasado = demands.filter((d) => getUrgencia(d).tone === "late").length;
    const aguardando = demands.filter((d) => getUrgencia(d).tone === "wait").length;
    const prontoExcluir = demands.filter((d) => getRetencao(d).ready).length;
    return { total: demands.length, atrasado, aguardando, prontoExcluir };
  }, [demands]);

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
    const demandasAtrasadas = demands.filter((d) => getUrgencia(d).tone === "late");
    if (demandasAtrasadas.length > 0) {
      list.push({
        id: "demandas-atrasadas",
        tone: "late",
        text: demandasAtrasadas.length === 1 ? "1 demanda está atrasada." : demandasAtrasadas.length + " demandas estão atrasadas.",
        goto: "demandas",
        label: "Ver demandas",
      });
    }
    const demandasHoje = demands.filter((d) => d.dataEntrega === todayISO() && d.statusProducao !== "Finalizada");
    if (demandasHoje.length > 0) {
      list.push({
        id: "demandas-hoje",
        tone: "urgent",
        text: demandasHoje.length === 1 ? "1 demanda tem entrega hoje." : demandasHoje.length + " demandas têm entrega hoje.",
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
    const contasAtrasadas = transacoes.filter((t) => getStatusPagamentoEfetivo(t) === "Atrasado");
    if (contasAtrasadas.length > 0) {
      list.push({
        id: "contas-atrasadas",
        tone: "late",
        text: contasAtrasadas.length === 1 ? "1 conta está atrasada." : contasAtrasadas.length + " contas estão atrasadas.",
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
    const margem = totalReceita - totalDespesas;
    const margemPct = totalReceita > 0 ? (margem / totalReceita) * 100 : 0;
    return { mes, totalReceita, recebido, aReceber: totalReceita - recebido, totalDespesas, despesasFixas, despesasVariaveis, margem, margemPct };
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

  const ultimosMeses = useMemo(() => {
    const meses = [];
    for (let i = 5; i >= 0; i--) meses.push(addMonthsISO(monthAnchor, -i));
    return meses.map((m) => ({ ...computeMonthStats(transacoes, m), meta: metas[m] || 0 }));
  }, [transacoes, monthAnchor, metas]);

  const anoAtual = monthAnchor.slice(0, 4);
  const faturamentoAnual = useMemo(() => {
    const num = (v) => parseFloat(v) || 0;
    return transacoes
      .filter((t) => t.tipo === "Receita" && t.data && t.data.slice(0, 4) === anoAtual)
      .reduce((s, t) => s + num(t.valor), 0);
  }, [transacoes, anoAtual]);

  const novosClientesMes = useMemo(
    () => clients.filter((c) => mesRef(c.criadoEm) === monthAnchor).length,
    [clients, monthAnchor]
  );

  const resumoPorCategoria = useMemo(() => {
    const num = (v) => parseFloat(v) || 0;
    const doMes = transacoes.filter((t) => t.tipo === "Despesa" && mesRef(t.data) === monthAnchor);
    const porTag = {};
    let semTag = 0;
    doMes.forEach((t) => {
      if (!t.tags || t.tags.length === 0) {
        semTag += num(t.valor);
        return;
      }
      t.tags.forEach((tagId) => {
        porTag[tagId] = (porTag[tagId] || 0) + num(t.valor);
      });
    });
    const linhas = Object.entries(porTag)
      .map(([tagId, total]) => {
        const tg = tags.find((x) => x.id === tagId);
        return tg ? { id: tagId, nome: tg.nome, cor: tg.cor, total } : null;
      })
      .filter(Boolean);
    if (semTag > 0) linhas.push({ id: "sem-tag", nome: "Sem tag", cor: "#6b7078", total: semTag });
    linhas.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
    return linhas;
  }, [transacoes, tags, monthAnchor]);

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
    const entregas = demands.filter((d) => d.dataEntrega === hoje);
    const pagamentos = transacoes.filter((t) => t.data === hoje);
    const kanbanHoje = kanbanTasks.filter((k) => k.data === hoje && !k.concluida);
    return { entregas, pagamentos, kanbanHoje };
  }, [demands, transacoes, kanbanTasks]);

  const filteredTransacoes = useMemo(() => {
    let list = transacoes.filter((t) => mesRef(t.data) === monthAnchor || (!t.data && financeFilter === "todos"));
    if (financeFilter === "receitas") list = list.filter((t) => t.tipo === "Receita");
    else if (financeFilter === "despesas") list = list.filter((t) => t.tipo === "Despesa");
    else if (financeFilter === "atrasadas") list = list.filter((t) => getStatusPagamentoEfetivo(t) === "Atrasado");
    if (tagFilterIds.length > 0) list = list.filter((t) => (t.tags || []).some((id) => tagFilterIds.includes(id)));
    if (financeClienteFilter) list = list.filter((t) => t.clienteId === financeClienteFilter);
    return list;
  }, [transacoes, financeFilter, monthAnchor, tagFilterIds, financeClienteFilter]);

  return (
    <div className="app">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
        .app {
          --bg: #14161a;
          --surface: #1d2025;
          --surface-alt: #262a31;
          --border: #333840;
          --text: #edeceb;
          --text-dim: #9aa0a8;
          --amber: #d9a441;
          --amber-dark: #241c0c;
          --teal: #4fa8a0;
          --teal-dark: #0e2422;
          --red: #e2574c;
          --red-dark: #2a1210;
          --violet: #9b87c4;
          --violet-dark: #1e1a2c;
          --green: #6fbf73;
          --green-dark: #10240f;
          --brand: #ff5449;
          --brand-2: #e2392e;
          --brand-dark: #341210;
          --brand-glow: rgba(255, 84, 73, 0.35);
          font-family: 'Inter', sans-serif;
          background:
            radial-gradient(ellipse 900px 560px at 8% -8%, rgba(255, 84, 73, 0.30), transparent 60%),
            radial-gradient(ellipse 800px 640px at 108% 12%, rgba(217, 164, 65, 0.16), transparent 55%),
            radial-gradient(ellipse 900px 700px at 60% 118%, rgba(79, 168, 160, 0.14), transparent 60%),
            linear-gradient(160deg, #1a0e0c 0%, #191214 22%, #15171f 46%, #14161a 100%);
          color: var(--text);
          border-radius: 20px;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.08);
          min-height: 600px;
          position: relative;
          box-shadow: 0 30px 80px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.04);
        }
        .app * { box-sizing: border-box; }
        .shell { position: relative; z-index: 1; display: flex; min-height: 600px; }
        .right-col { flex: 1; min-width: 0; display: flex; flex-direction: column; }
        .brand-block { padding: 22px 18px 18px 18px; border-bottom: 1px solid rgba(255,255,255,0.07); margin-bottom: 10px; }
        .brand-logo { font-family: 'Bebas Neue', sans-serif; font-size: 22px; line-height: 1.05; letter-spacing: 1.5px; color: var(--text); }
        .brand-logo span { display: block; background: linear-gradient(120deg, var(--brand), #ffb199); -webkit-background-clip: text; background-clip: text; color: transparent; }
        .topbar {
          display: flex; align-items: flex-start; justify-content: space-between;
          padding: 22px 28px 14px 28px;
        }
        .topbar-icons { display: flex; align-items: center; gap: 10px; margin-top: 2px; }
        .icon-circle {
          width: 36px; height: 36px; border-radius: 50%; background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.09); color: var(--text-dim); display: flex; align-items: center;
          justify-content: center; cursor: pointer; position: relative; transition: background 0.15s, color 0.15s;
        }
        .icon-circle:hover { background: rgba(255,255,255,0.1); color: var(--text); }
        .icon-circle.active { background: var(--brand); color: #fff; border-color: transparent; }
        .topbar-search-wrap { position: relative; }
        .topbar-search-pop {
          position: absolute; top: calc(100% + 8px); right: 0; width: 300px; z-index: 60;
          background: rgba(29, 32, 37, 0.96); backdrop-filter: blur(16px); border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px; padding: 10px; box-shadow: 0 20px 50px rgba(0,0,0,0.5);
        }
        .topbar-search-pop input {
          width: 100%; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: var(--text);
          padding: 9px 11px; border-radius: 8px; font-size: 13px;
        }
        .topbar-search-results { margin-top: 8px; max-height: 280px; overflow-y: auto; display: flex; flex-direction: column; gap: 2px; }
        .topbar-search-empty { color: var(--text-dim); font-size: 12px; padding: 8px 4px; }
        .topbar-search-result {
          display: flex; align-items: center; gap: 8px; background: none; border: none; text-align: left;
          padding: 8px 8px; border-radius: 7px; cursor: pointer; width: 100%;
        }
        .topbar-search-result:hover { background: rgba(255,255,255,0.06); }
        .tsr-type { font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.4px; color: var(--brand); font-weight: 700; flex-shrink: 0; width: 58px; }
        .tsr-label { flex: 1; font-size: 12.5px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .tsr-sub { font-size: 11px; color: var(--text-dim); flex-shrink: 0; }
        .icon-badge {
          position: absolute; top: -3px; right: -3px; background: var(--red); color: #fff; font-size: 9.5px;
          font-weight: 700; min-width: 15px; height: 15px; border-radius: 8px; display: flex; align-items: center;
          justify-content: center; padding: 0 3px; border: 2px solid var(--bg);
        }
        .avatar-circle {
          width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(135deg, var(--brand), var(--brand-2));
          color: #fff; font-family: 'Bebas Neue', sans-serif; font-size: 15px; display: flex; align-items: center;
          justify-content: center; box-shadow: 0 4px 14px var(--brand-glow);
        }
        .slate {
          background: rgba(255, 255, 255, 0.025);
          border-bottom: 1px solid rgba(255,255,255,0.06);
          padding: 4px 28px 0 28px;
          position: relative;
        }
        .slate-stripe {
          height: 3px;
          background: linear-gradient(90deg, var(--brand), #ffb199 35%, transparent 75%);
          margin: 16px 0 0 0;
          opacity: 0.7;
        }
        .slate-title {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 34px;
          letter-spacing: 1.5px;
          line-height: 1;
          margin: 0;
        }
        .slate-sub {
          color: var(--text-dim);
          font-size: 13px;
          margin: 6px 0 18px 0;
          font-family: 'JetBrains Mono', monospace;
        }
        .stats-row { display: flex; gap: 10px; padding: 16px 28px; flex-wrap: wrap; }
        .finance-cards { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 16px; }
        .finance-cards .stat { flex: 1; min-width: 140px; }
        .finance-status-btn { border: none; cursor: pointer; font-family: inherit; }

        .tag-pill {
          display: inline-flex; align-items: center; gap: 5px; padding: 3px 9px 3px 7px; border-radius: 20px;
          font-size: 11px; font-weight: 600; background: color-mix(in srgb, var(--tag-color) 18%, transparent);
          color: var(--tag-color); border: 1px solid color-mix(in srgb, var(--tag-color) 45%, transparent);
          white-space: nowrap;
        }
        .tag-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
        .tag-pill-btn { cursor: pointer; font-family: inherit; margin: 0 5px 5px 0; }
        .tag-pill-btn.selected { background: var(--tag-color); color: #14161a; }
        .tag-cell { position: relative; display: flex; flex-wrap: wrap; gap: 4px; }
        .tag-cell-btn { background: none; border: none; padding: 0; cursor: pointer; display: flex; flex-wrap: wrap; gap: 4px; align-items: center; min-height: 22px; }
        .tag-cell-empty { color: var(--text-dim); font-size: 11.5px; border: 1px dashed var(--border); padding: 3px 8px; border-radius: 20px; }
        .tag-cell-empty:hover { border-color: var(--amber); color: var(--amber); }

        .tag-picker {
          position: absolute; z-index: 60; top: calc(100% + 4px); left: 0; width: 240px;
          background: var(--surface); border: 1px solid var(--border); border-radius: 8px;
          padding: 10px; box-shadow: 0 8px 24px rgba(0,0,0,0.4);
        }
        .tag-picker-search {
          width: 100%; background: var(--surface-alt); border: 1px solid var(--border); color: var(--text);
          padding: 7px 9px; border-radius: 6px; font-size: 12.5px; margin-bottom: 8px;
        }
        .tag-picker-list { display: flex; flex-wrap: wrap; gap: 0; max-height: 140px; overflow-y: auto; }
        .tag-picker-empty { color: var(--text-dim); font-size: 11.5px; padding: 4px 0; }
        .tag-picker-create {
          width: 100%; background: none; border: 1px dashed var(--border); color: var(--text-dim);
          padding: 7px; border-radius: 6px; font-size: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 5px;
        }
        .tag-picker-create:hover { border-color: var(--amber); color: var(--amber); }
        .tag-color-row { display: flex; gap: 6px; flex-wrap: wrap; padding-top: 4px; }
        .tag-color-swatch { width: 22px; height: 22px; border-radius: 50%; border: 2px solid transparent; cursor: pointer; }
        .tag-color-swatch:hover { border-color: var(--text); transform: scale(1.1); }

        .tag-filter-row { display: flex; align-items: center; flex-wrap: wrap; gap: 0; margin-bottom: 12px; }
        .tag-filter-label { font-size: 11.5px; color: var(--text-dim); margin-right: 8px; }
        .tag-filter-clear { background: none; border: 1px solid var(--border); color: var(--text-dim); border-radius: 20px; padding: 3px 10px; font-size: 11px; cursor: pointer; margin-bottom: 5px; }
        .tag-filter-clear:hover { border-color: var(--red); color: var(--red); }

        .finance-top-grid { display: flex; gap: 14px; align-items: stretch; margin-bottom: 16px; }
        .finance-top-grid .finance-cards { flex: 1; margin-bottom: 0; }
        .finance-gauge-card {
          background: rgba(255,255,255,0.035); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px;
          padding: 10px 20px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; backdrop-filter: blur(8px);
        }
        .categoria-panel { background: rgba(255,255,255,0.035); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 18px; margin-bottom: 16px; max-width: 420px; backdrop-filter: blur(8px); }
        .categoria-panel-head { font-size: 12px; text-transform: uppercase; letter-spacing: 0.4px; color: var(--text-dim); font-family: 'JetBrains Mono', monospace; margin-bottom: 10px; }
        .categoria-search-row input { width: 100%; margin-bottom: 8px; }
        .categoria-list { display: flex; flex-direction: column; max-height: 280px; overflow-y: auto; }
        .categoria-row { display: flex; align-items: center; gap: 10px; padding: 9px 2px; border-bottom: 1px solid var(--border); }
        .categoria-row:last-child { border-bottom: none; }
        .categoria-swatch { width: 20px; height: 20px; border-radius: 6px; flex-shrink: 0; }
        .categoria-nome { flex: 1; font-size: 13px; font-weight: 600; }
        .categoria-total { font-family: 'JetBrains Mono', monospace; font-size: 13px; color: var(--text); }

        .kanban-header { display: flex; align-items: center; gap: 8px; margin-bottom: 16px; }
        .kanban-range { font-family: 'JetBrains Mono', monospace; font-size: 13px; color: var(--text); min-width: 130px; text-align: center; }
        .kanban-today-btn { margin-left: 8px; padding: 6px 12px; font-size: 12px; }
        .month-nav { display: flex; align-items: center; gap: 8px; margin-bottom: 16px; }
        .month-nav-label { font-family: 'JetBrains Mono', monospace; font-size: 13px; color: var(--text); min-width: 60px; text-align: center; text-transform: capitalize; }

        .finance-chart-svg { width: 100%; height: auto; overflow: visible; }
        .chart-gridline { stroke: var(--border); stroke-width: 1; }
        .chart-zeroline { stroke: var(--text-dim); stroke-width: 1; }
        .chart-axis-label { fill: var(--text-dim); font-size: 10px; font-family: 'JetBrains Mono', monospace; }
        .chart-bar-receita { fill: var(--teal); opacity: 0.85; }
        .chart-bar-despesa { fill: var(--red); opacity: 0.75; }
        .chart-line-margem { stroke: var(--amber); stroke-width: 2.2; }
        .chart-dot-margem { fill: var(--amber); }
        .chart-line-meta { stroke: var(--violet); stroke-width: 1.6; stroke-dasharray: 5 4; }
        .chart-legend { display: flex; gap: 18px; flex-wrap: wrap; margin-top: 10px; font-size: 11.5px; color: var(--text-dim); }
        .chart-legend-item { display: flex; align-items: center; gap: 6px; }
        .chart-legend-swatch { width: 11px; height: 11px; border-radius: 3px; display: inline-block; }

        .metas-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; align-items: start; }
        .metas-card { background: rgba(255,255,255,0.035); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 20px; backdrop-filter: blur(8px); }
        .metas-card h4 { font-family: 'Bebas Neue', sans-serif; font-size: 18px; letter-spacing: 0.4px; margin: 0 0 12px 0; }
        .metas-input-row { display: flex; gap: 8px; margin-bottom: 16px; }
        .metas-input-row input { flex: 1; }
        .progress-bar-track { width: 100%; height: 12px; background: var(--surface); border-radius: 6px; overflow: hidden; border: 1px solid var(--border); }
        .progress-bar-fill { height: 100%; background: var(--teal); transition: width 0.4s ease; }
        .progress-bar-fill.over { background: var(--amber); }
        .metas-pct { font-family: 'JetBrains Mono', monospace; font-size: 26px; font-weight: 600; margin: 4px 0; }
        .metas-line { display: flex; justify-content: space-between; font-size: 12.5px; color: var(--text-dim); padding: 6px 0; border-bottom: 1px solid var(--border); }
        .metas-line:last-child { border-bottom: none; }
        .gauge-wrap { display: flex; flex-direction: column; align-items: center; gap: 6px; }
        .gauge-track { stroke: var(--surface); }
        .gauge-fill { stroke: var(--teal); transition: stroke-dashoffset 0.5s ease; }
        .gauge-fill.over { stroke: var(--amber); }
        .gauge-pct { fill: var(--text); font-size: 22px; font-weight: 700; font-family: 'JetBrains Mono', monospace; }
        .gauge-sublabel { fill: var(--text-dim); font-size: 9px; }
        .gauge-label { font-size: 11.5px; color: var(--text-dim); text-align: center; }
        .metas-line b { color: var(--text); font-family: 'JetBrains Mono', monospace; font-weight: 600; }
        .kanban-board { display: grid; grid-template-columns: repeat(7, minmax(190px, 1fr)); gap: 10px; overflow-x: auto; }
        .kanban-col { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; min-height: 220px; display: flex; flex-direction: column; transition: background 0.15s, border-color 0.15s; }
        .kanban-col.today { border-color: var(--brand); }
        .kanban-col.drag-over { background: var(--brand-dark); }
        .kanban-col-header { padding: 10px 10px 8px 10px; border-bottom: 1px solid var(--border); }
        .kanban-col-day { display: block; font-size: 11px; text-transform: uppercase; letter-spacing: 0.4px; color: var(--text-dim); }
        .kanban-col.today .kanban-col-day { color: var(--brand); }
        .kanban-col-date { font-family: 'JetBrains Mono', monospace; font-size: 12.5px; color: var(--text); }
        .kanban-col-body { padding: 8px; display: flex; flex-direction: column; gap: 6px; flex: 1; }
        .kanban-card { display: flex; align-items: flex-start; gap: 7px; background: var(--surface); border: 1px solid var(--border); border-radius: 6px; padding: 9px 9px; cursor: pointer; }
        .kanban-card:hover { border-color: var(--amber); }
        .kanban-card:active { cursor: grabbing; }
        .kanban-card.done { opacity: 0.55; }
        .kanban-card.done .kanban-card-title { text-decoration: line-through; }
        .kanban-card-grip { color: var(--text-dim); flex-shrink: 0; margin-top: 2px; cursor: grab; }
        .kanban-card input[type="checkbox"] { flex-shrink: 0; width: 14px; height: 14px; margin-top: 1.5px; }
        .kanban-card-title { flex: 1; font-size: 13px; line-height: 1.4; word-break: normal; overflow-wrap: break-word; hyphens: none; display: flex; align-items: flex-start; gap: 5px; }
        .kanban-card-note-icon { color: var(--amber); flex-shrink: 0; margin-top: 3px; }
        .kanban-card-del { background: none; border: none; color: var(--text-dim); cursor: pointer; flex-shrink: 0; display: flex; opacity: 0; transition: opacity 0.15s; margin-top: 1px; }
        .kanban-card:hover .kanban-card-del { opacity: 1; }
        .kanban-card-del:hover { color: var(--red); }
        .kanban-add-btn { background: none; border: 1px dashed var(--border); color: var(--text-dim); border-radius: 6px; padding: 7px 8px; font-size: 12px; cursor: pointer; display: flex; align-items: center; gap: 4px; justify-content: center; }
        .kanban-add-btn:hover { border-color: var(--amber); color: var(--amber); }
        .kanban-add-form input { width: 100%; background: var(--surface); border: 1px solid var(--amber); color: var(--text); padding: 7px 8px; border-radius: 6px; font-size: 12.5px; }
        .kanban-notas-textarea { width: 100%; min-height: 140px; background: var(--surface-alt); border: 1px solid var(--border); color: var(--text); padding: 10px; border-radius: 6px; font-size: 13px; font-family: inherit; resize: vertical; line-height: 1.5; }
        .kanban-copy-btn { margin-top: 8px; width: 100%; font-size: 12.5px; padding: 8px; }

        .config-panel { max-width: 480px; }
        .config-section-title { font-family: 'Bebas Neue', sans-serif; font-size: 20px; letter-spacing: 0.5px; margin: 0 0 4px 0; }
        .config-hint { font-size: 12.5px; color: var(--text-dim); margin: 0 0 16px 0; }
        .config-tipo-list { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
        .config-tipo-item { display: flex; align-items: center; justify-content: space-between; background: var(--surface-alt); border: 1px solid var(--border); border-radius: 6px; padding: 8px 10px; font-size: 13px; }
        .config-add-row { display: flex; gap: 8px; }
        .config-add-row input { flex: 1; }


        .news-panel { padding: 4px 28px 14px 28px; }
        .news-panel-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
        .news-panel-title { font-size: 11px; text-transform: uppercase; letter-spacing: 0.4px; color: var(--text-dim); font-family: 'JetBrains Mono', monospace; }
        .news-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 7px; }
        .news-list li { border-bottom: 1px solid var(--border); padding-bottom: 7px; }
        .news-list li:last-child { border-bottom: none; padding-bottom: 0; }
        .news-list a { color: var(--text); text-decoration: none; font-size: 13px; line-height: 1.4; }
        .news-list a:hover { color: var(--amber); }
        .news-empty { color: var(--text-dim); font-size: 12.5px; padding: 10px 0; }
        .news-retry { background: none; border: 1px solid var(--border); color: var(--text-dim); padding: 3px 9px; border-radius: 5px; font-size: 11.5px; cursor: pointer; margin-left: 6px; }
        .news-retry:hover { border-color: var(--amber); color: var(--amber); }
        .carousel { padding: 4px 0 6px 0; }
        .carousel-viewport { overflow: hidden; touch-action: pan-y; cursor: grab; }
        .carousel-viewport:active { cursor: grabbing; }
        .carousel-track { display: flex; transition: transform 0.4s cubic-bezier(0.22, 1, 0.36, 1); user-select: none; }
        .carousel-track.dragging { transition: none; }
        .carousel-slide { flex: 0 0 100%; min-width: 0; }
        .carousel-dots { display: flex; justify-content: center; gap: 7px; padding: 2px 0 4px 0; }
        .carousel-dot { width: 7px; height: 7px; border-radius: 50%; border: none; background: var(--border); cursor: pointer; padding: 0; transition: background 0.2s, transform 0.2s; }
        .carousel-dot:hover { background: var(--text-dim); }
        .carousel-dot.active { background: var(--brand); transform: scale(1.3); }
        .followup-banner {
          margin: 4px 28px 0 28px; background: var(--red-dark); border: 1px solid var(--red); color: #ffb4ac;
          padding: 10px 14px; border-radius: 8px; display: flex; align-items: center; gap: 10px; font-size: 12.5px;
        }
        .followup-banner + .followup-banner { margin-top: 8px; }
        .followup-banner svg { flex-shrink: 0; }
        .followup-link { margin-left: auto; background: none; border: 1px solid var(--red); color: #ffb4ac; padding: 4px 10px; border-radius: 6px; font-size: 11.5px; cursor: pointer; white-space: nowrap; }
        .followup-link:hover { background: var(--red); color: #2a0a07; }
        .followup-banner.tone-wait { background: var(--amber-dark); border-color: var(--amber); color: var(--amber); }
        .followup-banner.tone-wait .followup-link { border-color: var(--amber); color: var(--amber); }
        .followup-banner.tone-wait .followup-link:hover { background: var(--amber); color: #1a1305; }
        .followup-banner.tone-urgent { background: #3a2408; border-color: #ffb257; color: #ffb257; }
        .followup-banner.tone-urgent .followup-link { border-color: #ffb257; color: #ffb257; }
        .followup-banner.tone-urgent .followup-link:hover { background: #ffb257; color: #2a1608; }
        .slate-current { color: var(--brand); font-weight: 600; text-transform: none; }
        .stat {
          background: rgba(255,255,255,0.035);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 14px;
          padding: 14px 18px;
          min-width: 130px;
          backdrop-filter: blur(6px);
        }
        .stat .n { font-family: 'JetBrains Mono', monospace; font-size: 22px; font-weight: 600; }
        .stat .l { font-size: 11px; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px; }
        .stat-icon-sq {
          width: 34px; height: 34px; border-radius: 10px; display: flex; align-items: center; justify-content: center;
          margin-bottom: 10px;
        }
        .stat-icon-sq.teal { background: rgba(79,168,160,0.18); color: var(--teal); }
        .stat-icon-sq.amber { background: rgba(217,164,65,0.18); color: var(--amber); }
        .stat-icon-sq.red { background: rgba(226,87,76,0.18); color: var(--red); }
        .stat-icon-sq.brand { background: rgba(255,84,73,0.18); color: var(--brand); }

        .home-grid { display: grid; grid-template-columns: 1.5fr 1fr; gap: 20px; align-items: start; }
        .home-greeting { font-family: 'Bebas Neue', sans-serif; font-size: 30px; letter-spacing: 0.5px; margin: 0 0 2px 0; }
        .home-date { color: var(--text-dim); font-size: 13px; text-transform: capitalize; margin: 0 0 18px 0; }
        .home-quick-stats { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 16px; }
        .home-quick-stats .stat { flex: 1; min-width: 130px; }
        .home-quick-actions { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 4px; }
        .home-quick-actions .btn-ghost { display: flex; align-items: center; gap: 5px; margin-left: 0; }
        .home-card {
          background: rgba(255,255,255,0.035); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px;
          padding: 16px 18px; margin-bottom: 16px; backdrop-filter: blur(8px);
        }
        .home-card h4 {
          display: flex; align-items: center; gap: 7px; font-family: 'Bebas Neue', sans-serif; font-size: 16px;
          letter-spacing: 0.4px; margin: 0 0 10px 0; color: var(--text-dim);
        }
        .home-card-empty { color: var(--text-dim); font-size: 12.5px; padding: 4px 0; }
        .home-row { display: flex; align-items: center; gap: 9px; padding: 8px 4px; border-top: 1px solid var(--border); cursor: pointer; }
        .home-row:first-of-type { border-top: none; }
        .home-row:hover { background: rgba(255,255,255,0.04); border-radius: 6px; }
        .home-row-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; background: var(--text-dim); }
        .home-row-dot.tone-late { background: var(--red); }
        .home-row-dot.tone-urgent { background: #ffb257; }
        .home-row-dot.tone-wait { background: var(--amber); }
        .home-row-dot.tone-ok { background: var(--teal); }
        .home-row-dot.tone-done { background: var(--green); }
        .home-row-dot.tone-standby { background: var(--violet); }
        .home-row-title { flex: 1; font-size: 13px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .home-row-sub { font-size: 11.5px; color: var(--text-dim); flex-shrink: 0; }
        .home-row-kanban { cursor: default; }
        .home-row-kanban input[type="checkbox"] { width: 15px; height: 15px; flex-shrink: 0; cursor: pointer; }
        .home-row-kanban .home-row-title { cursor: pointer; }
        .stat.warn .n { color: var(--red); }
        .stat.wait .n { color: var(--amber); }
        .stat.ready .n { color: var(--teal); }
        .body { display: flex; }
        .rail {
          width: 220px;
          border-right: 1px solid rgba(255,255,255,0.07);
          background: rgba(255, 255, 255, 0.015);
          padding: 0 12px 16px 12px;
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
        }
        .rail-btn {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 12px; border-radius: 10px; cursor: pointer;
          font-size: 13px; color: var(--text-dim); margin-bottom: 3px;
          border: 1px solid transparent; background: none;
          width: 100%; text-align: left; white-space: nowrap;
          transition: background 0.15s, color 0.15s;
        }
        .rail-btn svg { flex-shrink: 0; }
        .rail-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .rail-btn:hover { background: rgba(255,255,255,0.06); color: var(--text); }
        .rail-btn.active { background: linear-gradient(135deg, var(--brand), var(--brand-2)); color: #fff; border-color: transparent; box-shadow: 0 6px 18px var(--brand-glow); }
        .rail-btn.disabled { opacity: 0.4; cursor: default; }
        .rail-btn.disabled:hover { background: none; color: var(--text-dim); }
        .rail-tag { font-size: 9.5px; background: var(--border); padding: 1px 6px; border-radius: 4px; margin-left: auto; flex-shrink: 0; }
        .rail-tag-alert { background: var(--red); color: #2a0a07; font-weight: 700; }
        .rail-divider { height: 1px; background: rgba(255,255,255,0.07); margin: 10px 6px; }
        .toast {
          position: absolute; top: 14px; right: 20px; z-index: 40;
          background: var(--teal-dark); border: 1px solid var(--teal); color: var(--teal);
          padding: 10px 14px; border-radius: 8px; font-size: 12.5px; display: flex; gap: 8px; align-items: center; max-width: 380px;
        }
        .tool-frame-wrap { flex: 1; padding: 0; }
        .tool-frame-wrap iframe { width: 100%; height: 78vh; min-height: 640px; border: none; display: block; background: #0A0B0D; }
        .main { flex: 1; padding: 20px 28px; min-width: 0; }
        .toolbar { display: flex; gap: 10px; margin-bottom: 16px; align-items: center; flex-wrap: wrap; }
        .view-toggle { display: flex; border: 1px solid var(--border); border-radius: 6px; overflow: hidden; }
        .view-toggle-btn { background: var(--surface-alt); border: none; color: var(--text-dim); width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; cursor: pointer; }
        .view-toggle-btn + .view-toggle-btn { border-left: 1px solid var(--border); }
        .view-toggle-btn.active { background: linear-gradient(135deg, var(--brand), var(--brand-2)); color: #fff; }
        .view-toggle-btn.active .view-icon-list span, .view-toggle-btn.active .view-icon-grid span { background: #fff; }
        .view-icon-list { display: flex; flex-direction: column; gap: 3px; width: 15px; }
        .view-icon-list span { height: 2px; background: var(--text-dim); border-radius: 1px; }
        .view-icon-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2px; width: 14px; height: 14px; }
        .view-icon-grid span { background: var(--text-dim); border-radius: 1px; }
        .client-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 14px; }
        .client-card { aspect-ratio: 1 / 1; border-radius: 16px; overflow: hidden; border: 1px solid rgba(255,255,255,0.08); cursor: pointer; display: flex; flex-direction: column; background: rgba(255,255,255,0.03); transition: border-color 0.15s, transform 0.15s, box-shadow 0.15s; }
        .client-card:hover { border-color: var(--brand); transform: translateY(-2px); box-shadow: 0 10px 24px rgba(0,0,0,0.35); }
        .client-card-cover { flex: 1; background: var(--surface); background-size: cover; background-position: center; display: flex; align-items: center; justify-content: center; color: var(--text-dim); }
        .client-card-footer { padding: 8px 10px; display: flex; align-items: center; gap: 7px; font-size: 12.5px; font-weight: 600; border-top: 1px solid var(--border); background: var(--surface-alt); }
        .client-card-footer span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .capa-preview { margin-top: 8px; width: 100%; aspect-ratio: 3 / 1; border-radius: 6px; background-size: cover; background-position: center; border: 1px solid var(--border); }
        .toolbar input, .toolbar select {
          background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); color: var(--text);
          padding: 9px 12px; border-radius: 10px; font-size: 13px; font-family: inherit;
        }
        .btn-primary {
          background: linear-gradient(135deg, var(--brand), var(--brand-2)); color: #fff; border: none; font-weight: 600;
          padding: 9px 16px; border-radius: 10px; font-size: 13px; cursor: pointer;
          display: flex; align-items: center; gap: 6px; margin-left: auto;
          box-shadow: 0 6px 16px var(--brand-glow);
          transition: filter 0.15s, transform 0.15s;
        }
        .btn-primary:hover { filter: brightness(1.1); transform: translateY(-1px); }
        table { width: 100%; border-collapse: collapse; font-size: 13px; }
        th { text-align: left; color: var(--text-dim); font-weight: 500; font-size: 11px; text-transform: uppercase; letter-spacing: 0.4px; padding: 8px 10px; border-bottom: 1px solid var(--border); }
        td { padding: 10px; border-bottom: 1px solid var(--border); vertical-align: middle; }
        tr:hover td { background: var(--surface-alt); }
        .proj { font-weight: 600; }
        .mono { font-family: 'JetBrains Mono', monospace; font-size: 12px; color: var(--text-dim); }
        .badge { padding: 3px 9px; border-radius: 4px; font-size: 11px; font-weight: 600; display: inline-block; white-space: nowrap; }
        .badge-late { background: var(--red-dark); color: #ff9d95; }
        .badge-wait { background: var(--amber-dark); color: var(--amber); }
        .badge-urgent { background: #3a2408; color: #ffb257; }
        .badge-ok { background: var(--teal-dark); color: var(--teal); }
        .badge-done { background: var(--green-dark); color: var(--green); }
        .badge-standby { background: var(--violet-dark); color: var(--violet); }
        .badge-neutral { background: var(--surface-alt); color: var(--text-dim); }
        .badge-ready { background: var(--teal-dark); color: var(--teal); }
        .badge-locked { background: var(--surface-alt); color: var(--text-dim); }
        .row-actions { display: flex; gap: 6px; }
        .icon-btn { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.09); color: var(--text-dim); width: 28px; height: 28px; border-radius: 9px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: background 0.15s, color 0.15s, border-color 0.15s; }
        .icon-btn:hover { color: var(--text); border-color: var(--brand); background: rgba(155,107,242,0.12); }
        .expand-btn { background: none; border: none; color: var(--text-dim); cursor: pointer; font-size: 13px; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; }
        .expand-btn:hover { color: var(--brand); }
        .video-subrow td { background: var(--surface-alt); padding: 10px 10px 10px 46px; border-bottom: 1px solid var(--border); }
        .video-sublist { display: flex; flex-direction: column; gap: 6px; }
        .video-subrow-item { display: flex; align-items: center; gap: 10px; }
        .video-subrow-name { flex: 1; font-size: 12.5px; color: var(--text); }
        .video-subrow-item select { background: var(--surface); border: 1px solid var(--border); color: var(--text); padding: 5px 8px; border-radius: 5px; font-size: 12px; width: 170px; }
        .empty { text-align: center; padding: 50px 0; color: var(--text-dim); }
        .overlay { position: fixed; inset: 0; background: rgba(10,8,16,0.65); backdrop-filter: blur(3px); display: flex; align-items: center; justify-content: center; z-index: 50; padding: 20px; }
        .modal { background: rgba(29, 32, 37, 0.92); backdrop-filter: blur(16px); border: 1px solid rgba(255,255,255,0.1); border-radius: 18px; width: 480px; max-width: 100%; max-height: 90vh; overflow-y: auto; padding: 24px; box-shadow: 0 30px 70px rgba(0,0,0,0.5); }
        .modal h3 { font-family: 'Bebas Neue', sans-serif; font-size: 22px; letter-spacing: 1px; margin: 0 0 16px 0; display: flex; justify-content: space-between; align-items: center; }
        .field { margin-bottom: 12px; }
        .field label { display: block; font-size: 11.5px; color: var(--text-dim); margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.4px; }
        .field input, .field select, .field textarea {
          width: 100%; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); color: var(--text);
          padding: 9px 12px; border-radius: 10px; font-size: 13.5px; font-family: inherit;
          transition: border-color 0.15s;
        }
        .field input:focus, .field select:focus, .field textarea:focus { outline: none; border-color: var(--brand); }
        .field textarea { resize: vertical; min-height: 60px; }
        .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 18px; }
        .btn-ghost { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); color: var(--text); padding: 9px 16px; border-radius: 10px; font-size: 13px; cursor: pointer; transition: background 0.15s, border-color 0.15s; }
        .btn-despesa, .btn-receita {
          border: none; font-weight: 600; padding: 9px 16px; border-radius: 10px; font-size: 13px; cursor: pointer;
          display: flex; align-items: center; gap: 6px; transition: filter 0.15s, transform 0.15s;
        }
        .btn-despesa:hover, .btn-receita:hover { filter: brightness(1.1); transform: translateY(-1px); }
        .btn-despesa { background: var(--red); color: #2a0a07; }
        .btn-receita { background: var(--green); color: #0d2a0f; }
        .btn-ghost:hover { background: rgba(255,255,255,0.07); border-color: rgba(255,255,255,0.18); }
        .btn-danger { background: var(--red); color: #2a0a07; border: none; padding: 9px 16px; border-radius: 10px; font-size: 13px; font-weight: 600; cursor: pointer; }
        .lock-note { font-size: 11.5px; color: var(--text-dim); margin-top: 4px; display: flex; gap: 5px; align-items: center; }
        .video-item-row { display: flex; gap: 6px; align-items: center; margin-bottom: 6px; }
        .video-item-row input[type="text"], .video-item-row input:not([type]) { flex: 1.2; min-width: 0; }
        .video-item-row select { flex: 1; min-width: 0; font-size: 12px; padding: 6px 6px; }
        .video-item-row input[type="checkbox"] { width: 16px; height: 16px; flex-shrink: 0; }
        .processos-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 14px; }
        .processo-card { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 14px; display: flex; flex-direction: column; gap: 8px; }
        .processo-card-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; }
        .processo-card-actions { display: flex; gap: 4px; flex-shrink: 0; }
        .processo-card-title { margin: 0; font-size: 14px; font-weight: 600; }
        .processo-card-text { margin: 0; font-size: 12.5px; color: var(--text-dim); white-space: pre-wrap; max-height: 90px; overflow-y: auto; line-height: 1.5; }
        .processo-card-buttons { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
        .processo-card-obs { margin: 0; font-size: 11.5px; color: var(--text-dim); font-style: italic; }
        .processo-img-preview { width: 100%; max-height: 160px; object-fit: contain; border-radius: 8px; background: rgba(255,255,255,0.03); }
        .processo-img-loading { font-size: 11.5px; color: var(--text-dim); padding: 20px 0; text-align: center; }
        .agenda-modo-toggle { display: flex; gap: 4px; margin-left: 10px; }
        .agenda-modo-toggle .btn-ghost { padding: 7px 12px; font-size: 12.5px; }
        .btn-ghost.active { background: var(--brand); border-color: transparent; color: #fff; }
        .agenda-month-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; }
        .agenda-month-weekday { text-align: center; font-size: 11px; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.4px; padding-bottom: 4px; }
        .agenda-month-day { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 6px; min-height: 84px; cursor: pointer; display: flex; flex-direction: column; gap: 3px; transition: border-color 0.15s; }
        .agenda-month-day:hover { border-color: var(--brand); }
        .agenda-month-day.outside { opacity: 0.4; }
        .agenda-month-day.today .agenda-month-day-num { color: var(--brand); font-weight: 700; }
        .agenda-month-day-num { font-size: 12px; color: var(--text-dim); }
        .agenda-month-event-chip { font-size: 11px; background: rgba(255,255,255,0.06); border-radius: 4px; padding: 2px 5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .agenda-month-event-chip:hover { background: var(--brand); color: #fff; }
        .agenda-month-more { font-size: 10.5px; color: var(--text-dim); padding-left: 5px; }
      `}</style>



      <div className="shell">
        <div className="rail">
          <div className="brand-block">
            <div className="brand-logo"><span>FUZZ</span>MÍDIA</div>
          </div>
          <button className={"rail-btn " + (tab === "inicio" ? "active" : "")} onClick={() => setTab("inicio")}>
            <Home size={16} /> <span className="rail-label">Início</span>
          </button>
          <button className={"rail-btn " + (tab === "clientes" ? "active" : "")} onClick={() => setTab("clientes")}>
            <Users size={16} /> <span className="rail-label">Clientes</span>
          </button>
          <button className={"rail-btn " + (tab === "propostas-lista" ? "active" : "")} onClick={() => setTab("propostas-lista")}>
            <FileText size={16} /> <span className="rail-label">Propostas</span>
            {followUps.length > 0 && <span className="rail-tag rail-tag-alert">{followUps.length}</span>}
          </button>
          <button className={"rail-btn " + (tab === "demandas" ? "active" : "")} onClick={() => setTab("demandas")}>
            <Film size={16} /> <span className="rail-label">Demandas</span>
          </button>
          <button className={"rail-btn " + (tab === "kanban" ? "active" : "")} onClick={() => setTab("kanban")}>
            <LayoutGrid size={16} /> <span className="rail-label">Kanban semanal</span>
          </button>
          <button className={"rail-btn " + (tab === "agenda" ? "active" : "")} onClick={() => setTab("agenda")}>
            <Calendar size={16} /> <span className="rail-label">Agenda</span>
          </button>
          <button className={"rail-btn " + (tab === "financeiro" ? "active" : "")} onClick={() => setTab("financeiro")}>
            <DollarSign size={16} /> <span className="rail-label">Financeiro</span>
            {financeStats.atrasadas > 0 && <span className="rail-tag rail-tag-alert">{financeStats.atrasadas}</span>}
          </button>
          <button className={"rail-btn " + (tab === "metas" ? "active" : "")} onClick={() => setTab("metas")}>
            <Target size={16} /> <span className="rail-label">Metas</span>
          </button>
          <button className="rail-btn disabled" disabled>
            <span className="rail-label">Entregáveis</span> <span className="rail-tag">em breve</span>
          </button>
          <div className="rail-divider" />
          <button className={"rail-btn " + (tab === "processos" ? "active" : "")} onClick={() => setTab("processos")}>
            <Wrench size={16} /> <span className="rail-label">Processos internos</span>
          </button>
          <button className={"rail-btn " + (tab === "calculadora" ? "active" : "")} onClick={() => setTab("calculadora")}>
            <Calculator size={16} /> <span className="rail-label">Calculadora</span>
          </button>
          <button className={"rail-btn " + (tab === "propostas" ? "active" : "")} onClick={() => setTab("propostas")}>
            <FileText size={16} /> <span className="rail-label">Gerador de Propostas</span>
          </button>
          <button className={"rail-btn " + (tab === "equipamentos" ? "active" : "")} onClick={() => setTab("equipamentos")}>
            <Camera size={16} /> <span className="rail-label">Equipamentos</span>
          </button>
          <div className="rail-divider" />
          <button className={"rail-btn " + (tab === "config" ? "active" : "")} onClick={() => setTab("config")}>
            <Settings size={16} /> <span className="rail-label">Configurações</span>
          </button>
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
            {notifications.map((n) => (
              <div key={n.id} className={"followup-banner tone-" + n.tone}>
                <AlertTriangle size={15} />
                <span>{n.text}</span>
                <button className="followup-link" onClick={() => setTab(n.goto)}>{n.label}</button>
              </div>
            ))}

            <StatsCarousel
              panels={[
                {
                  key: "producao",
                  label: "Resultados de produção",
                  content: (
                    <div className="stats-row">
                      <div className="stat"><div className="n">{stats.total}</div><div className="l">demandas</div></div>
                      <div className="stat warn"><div className="n">{stats.atrasado}</div><div className="l">atrasadas</div></div>
                      <div className="stat wait"><div className="n">{stats.aguardando}</div><div className="l">aguard. cliente</div></div>
                      <div className="stat ready"><div className="n">{stats.prontoExcluir}</div><div className="l">liberadas p/ excluir</div></div>
                    </div>
                  ),
                },
                {
                  key: "propostas",
                  label: "Resultados de propostas",
                  content: (
                    <div className="stats-row">
                      <div className="stat"><div className="n">{proposalStats.total}</div><div className="l">propostas geradas</div></div>
                      <div className="stat wait"><div className="n">{proposalStats.pendentes}</div><div className="l">pendentes</div></div>
                      <div className="stat ready"><div className="n">{proposalStats.confirmadas}</div><div className="l">confirmadas</div></div>
                      <div className="stat warn"><div className="n">{followUps.length}</div><div className="l">precisam follow up</div></div>
                    </div>
                  ),
                },
                {
                  key: "financeiro",
                  label: "Resultados financeiros",
                  content: (
                    <div className="stats-row">
                      <div className="stat ready"><div className="n">{hideValues ? "R$ ••••" : "R$ " + financeStatsMes.recebido.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}</div><div className="l">recebido no mês</div></div>
                      <div className="stat wait"><div className="n">{hideValues ? "R$ ••••" : "R$ " + financeStatsMes.aReceber.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}</div><div className="l">a receber no mês</div></div>
                      <div className="stat warn"><div className="n">{hideValues ? "R$ ••••" : "R$ " + financeStatsMes.totalDespesas.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}</div><div className="l">despesas no mês</div></div>
                      <div className="stat"><div className="n">{hideValues ? "R$ ••••" : "R$ " + financeStatsMes.margem.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}</div><div className="l">saldo no mês</div></div>
                    </div>
                  ),
                },
              ]}
            />

            <div className="slate-stripe" />
          </div>

          <div className={"main" + (tab === "propostas" || tab === "calculadora" ? " tool-frame-wrap" : "")}>
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
                  </div>
                </div>
                <div className="home-right">
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
                          <span className="home-row-sub">{clientName(d.clienteId)}</span>
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
                </div>
              </div>
            </>
          ) : tab === "demandas" ? (
            <>
              <div className="toolbar">
                <input placeholder="Buscar projeto…" value={search} onChange={(e) => setSearch(e.target.value)} />
                <select value={filterCliente} onChange={(e) => setFilterCliente(e.target.value)}>
                  <option value="">Todos os clientes</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
                <button className="btn-primary" onClick={() => setDemandForm(emptyDemand())}>
                  <Plus size={15} /> Nova demanda
                </button>
              </div>

              {filteredDemands.length === 0 ? (
                <div className="empty">Nenhuma demanda cadastrada ainda. Crie a primeira.</div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: 30 }}></th>
                      <th>Projeto</th>
                      <th>Cliente</th>
                      <th>Produção</th>
                      <th>Aprovação</th>
                      <th>Urgência</th>
                      <th>Entrega</th>
                      <th>Retenção</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDemands.map((d) => {
                      const urg = getUrgencia(d);
                      const ret = getRetencao(d);
                      const prog = videoProgress(d);
                      const expanded = expandedDemands.has(d.id);
                      return (
                        <React.Fragment key={d.id}>
                          <tr>
                            <td>
                              {prog && (
                                <button className="expand-btn" onClick={() => toggleExpandDemand(d.id)} title="Ver vídeos">
                                  {expanded ? "▾" : "▸"}
                                </button>
                              )}
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
                            <td>{d.statusProducao}</td>
                            <td>{d.statusAprovacao}</td>
                            <td><span className={"badge " + TONE_CLASS[urg.tone]}>{urg.label}</span></td>
                            <td className="mono">{fmtDate(d.dataEntrega)}</td>
                            <td>
                              <span className={"badge " + (ret.ready ? "badge-ready" : "badge-locked")}>
                                {ret.ready ? "Liberado" : ret.label === "Aguardando aprovação" ? "Bloqueado" : ret.label}
                              </span>
                            </td>
                            <td>
                              <div className="row-actions">
                                <button className="icon-btn" onClick={() => setDemandForm(d)}><Pencil size={13} /></button>
                                <button className="icon-btn" onClick={() => setConfirmDelete({ type: "demand", id: d.id, label: d.projeto })}><Trash2 size={13} /></button>
                              </div>
                            </td>
                          </tr>
                          {expanded && prog && (
                            <tr className="video-subrow">
                              <td colSpan={9}>
                                <div className="video-sublist">
                                  {d.itens.map((v, idx) => (
                                    <div key={v.id} className="video-subrow-item">
                                      <span className="video-subrow-name">{v.nome || "Vídeo " + (idx + 1)}</span>
                                      <select
                                        value={v.statusEnvio}
                                        onChange={(e) => updateVideoField(d.id, v.id, "statusEnvio", e.target.value)}
                                      >
                                        {VIDEO_STATUS_ENVIO.map((s) => <option key={s} value={s}>{s}</option>)}
                                      </select>
                                      <select
                                        value={v.statusAprovacao}
                                        onChange={(e) => updateVideoField(d.id, v.id, "statusAprovacao", e.target.value)}
                                      >
                                        {VIDEO_STATUS_APROVACAO.map((s) => <option key={s} value={s}>{s}</option>)}
                                      </select>
                                    </div>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </>
          ) : tab === "clientes" ? (
            <>
              <div className="toolbar">
                <div className="view-toggle">
                  <button className={"view-toggle-btn" + (clientView === "lista" ? " active" : "")} onClick={() => setClientView("lista")} title="Visualização em lista">
                    <span className="view-icon-list"><span /><span /><span /></span>
                  </button>
                  <button className={"view-toggle-btn" + (clientView === "grade" ? " active" : "")} onClick={() => setClientView("grade")} title="Visualização em grade">
                    <span className="view-icon-grid"><span /><span /><span /><span /></span>
                  </button>
                </div>
                <button className="btn-primary" onClick={() => setClientForm(emptyClient())}>
                  <Plus size={15} /> Novo cliente
                </button>
              </div>
              {clients.length === 0 ? (
                <div className="empty">Nenhum cliente cadastrado ainda. Crie o primeiro.</div>
              ) : clientView === "grade" ? (
                <div className="client-grid">
                  {clients.map((c) => (
                    <div className="client-card" key={c.id} onClick={() => setClientForm(c)}>
                      <div
                        className="client-card-cover"
                        style={c.capaUrl ? { backgroundImage: `url(${c.capaUrl})` } : {}}
                      >
                        {!c.capaUrl && <FileText size={22} />}
                      </div>
                      <div className="client-card-footer">
                        <FileText size={13} />
                        <span>{c.nome || "(sem nome)"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>Tipo</th>
                      <th>Contato</th>
                      <th>Demandas</th>
                      <th>Drive</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {clients.map((c) => (
                      <tr key={c.id}>
                        <td className="proj">{c.nome || "(sem nome)"}</td>
                        <td>{c.tipo}</td>
                        <td className="mono">{c.email || c.telefone || "—"}</td>
                        <td>{demands.filter((d) => d.clienteId === c.id).length}</td>
                        <td>
                          {c.driveLink ? (
                            <a className="icon-btn" href={c.driveLink} target="_blank" rel="noreferrer" title="Abrir Drive do cliente">
                              <ExternalLink size={13} />
                            </a>
                          ) : (
                            <span className="mono" style={{ fontSize: 11 }}>—</span>
                          )}
                        </td>
                        <td>
                          <div className="row-actions">
                            <button className="icon-btn" onClick={() => setClientForm(c)}><Pencil size={13} /></button>
                            <button className="icon-btn" onClick={() => setConfirmDelete({ type: "client", id: c.id, label: c.nome })}><Trash2 size={13} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          ) : tab === "propostas-lista" ? (
            <>
              {proposals.length === 0 ? (
                <div className="empty">Nenhuma proposta enviada do Gerador ainda. Ao clicar em "Salvar cliente e proposta no Painel" lá dentro, ela aparece aqui.</div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Cliente</th>
                      <th>Tipo</th>
                      <th>Data de geração</th>
                      <th>Valor</th>
                      <th>Status</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {proposals.map((p) => {
                      const alerta = precisaFollowUp(p);
                      return (
                        <tr key={p.id}>
                          <td className="proj">{p.clienteNome}</td>
                          <td>{p.tipo}</td>
                          <td className="mono">{fmtDate(p.dataGeracao)}{alerta && <span className="badge badge-late" style={{ marginLeft: 8 }}>follow up</span>}</td>
                          <td className="mono">R$ {Number(p.valorTotal || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                          <td>
                            <span className={"badge " + (p.status === "Confirmada" ? "badge-done" : p.status === "Recusada" ? "badge-neutral" : "badge-wait")}>
                              {p.status}
                            </span>
                          </td>
                          <td>
                            {p.status === "Pendente" ? (
                              <div className="row-actions">
                                <button className="icon-btn" title="Confirmar proposta" onClick={() => confirmarProposta(p)}><CheckCircle2 size={13} /></button>
                                <button className="icon-btn" title="Recusar proposta" onClick={() => recusarProposta(p)}><X size={13} /></button>
                              </div>
                            ) : (
                              <span className="mono" style={{ fontSize: 11 }}>—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </>
          ) : tab === "financeiro" ? (
            <>
              <div className="month-nav">
                <button className="icon-btn" onClick={() => setMonthAnchor(addMonthsISO(monthAnchor, -1))}><ChevronLeft size={14} /></button>
                <div className="month-nav-label">{mesLabel(monthAnchor)}</div>
                <button className="icon-btn" onClick={() => setMonthAnchor(addMonthsISO(monthAnchor, 1))}><ChevronRight size={14} /></button>
                <button className="btn-ghost kanban-today-btn" onClick={() => setMonthAnchor(mesRef(todayISO()))}>Mês atual</button>
              </div>
              <div className="finance-top-grid">
                <div className="finance-cards">
                  <div className="stat ready">
                    <div className="stat-icon-sq teal"><Wallet size={16} /></div>
                    <div className="n">R$ {financeStatsMes.recebido.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div><div className="l">recebido no mês</div>
                  </div>
                  <div className="stat wait">
                    <div className="stat-icon-sq amber"><Clock size={16} /></div>
                    <div className="n">R$ {financeStatsMes.aReceber.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div><div className="l">a receber no mês</div>
                  </div>
                  <div className="stat warn">
                    <div className="stat-icon-sq red"><CreditCard size={16} /></div>
                    <div className="n">R$ {financeStatsMes.totalDespesas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div><div className="l">despesas do mês</div>
                  </div>
                  <div className="stat">
                    <div className="stat-icon-sq brand"><TrendingUp size={16} /></div>
                    <div className="n">R$ {financeStatsMes.margem.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div><div className="l">margem do mês</div>
                  </div>
                </div>
                {(parseFloat(metas[monthAnchor]) || 0) > 0 && (
                  <div className="finance-gauge-card">
                    <GoalGauge
                      pct={(financeStatsMes.totalReceita / (parseFloat(metas[monthAnchor]) || 1)) * 100}
                      size={104}
                      label={"Meta de " + mesLabel(monthAnchor)}
                    />
                  </div>
                )}
              </div>
              <div className="toolbar">
                <select value={financeFilter} onChange={(e) => setFinanceFilter(e.target.value)}>
                  <option value="todos">Todas as transações</option>
                  <option value="receitas">Só receitas</option>
                  <option value="despesas">Só despesas</option>
                  <option value="atrasadas">Só atrasadas</option>
                </select>
                <select value={financeClienteFilter} onChange={(e) => setFinanceClienteFilter(e.target.value)}>
                  <option value="">Todos os clientes</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
                <button className="btn-despesa" onClick={() => setTransacaoForm({ ...emptyTransacao("Despesa"), data: monthAnchor + "-05" })}>
                  <Plus size={14} />Nova despesa
                </button>
                <button className="btn-receita" onClick={() => setTransacaoForm({ ...emptyTransacao("Receita"), categoria: tiposProducao[0] || "", data: monthAnchor + "-05" })}>
                  <Plus size={15} /> Nova receita
                </button>
              </div>
              {tags.length > 0 && (
                <div className="tag-filter-row">
                  <span className="tag-filter-label">Filtrar por tag:</span>
                  {tags.map((tg) => (
                    <button
                      key={tg.id}
                      className={"tag-pill tag-pill-btn" + (tagFilterIds.includes(tg.id) ? " selected" : "")}
                      style={{ "--tag-color": tg.cor }}
                      onClick={() => toggleTagFilter(tg.id)}
                    >
                      <span className="tag-dot" style={{ background: tg.cor }} />
                      {tg.nome}
                    </button>
                  ))}
                  {tagFilterIds.length > 0 && (
                    <button className="tag-filter-clear" onClick={() => setTagFilterIds([])}>Limpar</button>
                  )}
                </div>
              )}

              {resumoPorCategoria.length > 0 && (
                <div className="categoria-panel">
                  <div className="categoria-panel-head">
                    <span>Resumo por categoria — {mesLabel(monthAnchor)}</span>
                  </div>
                  <div className="categoria-search-row">
                    <input
                      value={categoriaSearch}
                      onChange={(e) => setCategoriaSearch(e.target.value)}
                      placeholder="Filtrar tags…"
                    />
                  </div>
                  <div className="categoria-list">
                    {resumoPorCategoria
                      .filter((l) => l.nome.toLowerCase().includes(categoriaSearch.trim().toLowerCase()))
                      .map((l) => (
                        <div className="categoria-row" key={l.id}>
                          <span className="categoria-swatch" style={{ background: l.cor }} />
                          <span className="categoria-nome">{l.nome}</span>
                          <span className="categoria-total">R$ {l.total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {filteredTransacoes.length === 0 ? (
                <div className="empty">Nenhuma transação neste mês. Receitas de propostas confirmadas aparecem automaticamente.</div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Descrição</th>
                      <th>Tipo</th>
                      <th>Categoria</th>
                      <th>Natureza</th>
                      <th>Tags</th>
                      <th>Cliente / Demanda</th>
                      <th>Valor</th>
                      <th>Vencimento</th>
                      <th>Status</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransacoes.map((t) => {
                      const statusEfetivo = getStatusPagamentoEfetivo(t);
                      const demanda = demands.find((d) => d.id === t.demandaId);
                      const tTags = (t.tags || []).map((id) => tags.find((tg) => tg.id === id)).filter(Boolean);
                      return (
                        <tr key={t.id}>
                          <td className="proj">
                            {t.descricao || "(sem descrição)"}
                            {t.parcelaGrupoId && (
                              <span className="badge badge-neutral" style={{ marginLeft: 8, fontWeight: 500 }}>
                                {t.parcelaAtual}/{t.parcelaTotal}
                              </span>
                            )}
                          </td>
                          <td>
                            <span className={"badge " + (t.tipo === "Receita" ? "badge-ready" : "badge-late")}>{t.tipo}</span>
                          </td>
                          <td>{t.categoria}</td>
                          <td>{t.tipo === "Despesa" ? (t.natureza || "Variável") : "—"}</td>
                          <td className="tag-cell">
                            {t.tipo === "Despesa" ? (
                              <>
                                <button className="tag-cell-btn" onClick={(e) => { e.stopPropagation(); setTagPopoverFor(tagPopoverFor === t.id ? null : t.id); }}>
                                  {tTags.length === 0 ? (
                                    <span className="tag-cell-empty">+ tag</span>
                                  ) : (
                                    tTags.map((tg) => (
                                      <span key={tg.id} className="tag-pill" style={{ "--tag-color": tg.cor }}>
                                        <span className="tag-dot" style={{ background: tg.cor }} />
                                        {tg.nome}
                                      </span>
                                    ))
                                  )}
                                </button>
                                {tagPopoverFor === t.id && (
                                  <TagPicker
                                    allTags={tags}
                                    selectedIds={t.tags || []}
                                    onToggle={(tagId) => toggleTagOnTransacao(t.id, tagId)}
                                    onCreate={(nome, cor) => createTag(nome, cor)}
                                    onClose={() => setTagPopoverFor(null)}
                                  />
                                )}
                              </>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td>{clientName(t.clienteId)}{demanda ? " · " + demanda.projeto : ""}</td>
                          <td className="mono">R$ {(parseFloat(t.valor) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                          <td className="mono">{fmtDate(t.data)}</td>
                          <td>
                            <button
                              className={"badge finance-status-btn " + (statusEfetivo === "Pago" ? "badge-done" : statusEfetivo === "Atrasado" ? "badge-late" : "badge-wait")}
                              onClick={() => toggleStatusPagamento(t)}
                              title="Clique para alternar pago/pendente"
                            >
                              {statusEfetivo}
                            </button>
                          </td>
                          <td>
                            <div className="row-actions">
                              <button className="icon-btn" onClick={() => setTransacaoForm(t)}><Pencil size={13} /></button>
                              <button className="icon-btn" onClick={() => setConfirmDelete({ type: "transacao", id: t.id, label: t.descricao, parcelaGrupoId: t.parcelaGrupoId })}><Trash2 size={13} /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </>
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
                const faturado = financeStatsMes.totalReceita;
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
                        <div className="empty" style={{ padding: "20px 0" }}>Defina uma meta pra este mês pra acompanhar o progresso.</div>
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
                        <div className="empty" style={{ padding: "20px 0" }}>Defina uma meta anual pra acompanhar o faturamento de {anoAtual}.</div>
                      )}
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
                          Defina quantos clientes novos você quer conquistar este mês.
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
                <select value={equipFiltroCategoria} onChange={(e) => setEquipFiltroCategoria(e.target.value)}>
                  <option value="">Todas as categorias</option>
                  {CATEGORIAS_EQUIP.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <select value={equipFiltroStatus} onChange={(e) => setEquipFiltroStatus(e.target.value)}>
                  <option value="">Todos os status</option>
                  {STATUS_EQUIP.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
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
                <table>
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>Categoria</th>
                      <th>Status</th>
                      <th>Responsável / Local</th>
                      <th>Nº Série</th>
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
                        <td>
                          <div className="row-actions">
                            <button className="icon-btn" onClick={() => setEquipamentoForm(eq)}><Pencil size={13} /></button>
                            <button className="icon-btn" onClick={() => setConfirmDelete({ type: "equipamento", id: eq.id, label: eq.nome })}><Trash2 size={13} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
            <div className="config-panel">
              <h3 className="config-section-title">Tipos de produção</h3>
              <p className="config-hint">Esses tipos aparecem no cadastro de Demandas e nas receitas do Financeiro.</p>
              <div className="config-tipo-list">
                {tiposProducao.map((t) => (
                  <div className="config-tipo-item" key={t}>
                    <span>{t}</span>
                    <button className="icon-btn" onClick={() => removeTipoProducao(t)}><Trash2 size={13} /></button>
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
                  <select
                    value={v.statusEnvio}
                    onChange={(e) => {
                      const itens = demandForm.itens.map((it, i) => (i === idx ? { ...it, statusEnvio: e.target.value } : it));
                      setDemandForm({ ...demandForm, itens });
                    }}
                  >
                    {VIDEO_STATUS_ENVIO.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <select
                    value={v.statusAprovacao}
                    onChange={(e) => {
                      const itens = demandForm.itens.map((it, i) => (i === idx ? { ...it, statusAprovacao: e.target.value } : it));
                      setDemandForm({ ...demandForm, itens });
                    }}
                  >
                    {VIDEO_STATUS_APROVACAO.map((s) => <option key={s} value={s}>{s}</option>)}
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
                onClick={() => setDemandForm({ ...demandForm, itens: [...(demandForm.itens || []), emptyVideoItem()] })}
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
                <select value={demandForm.tipo} onChange={(e) => setDemandForm({ ...demandForm, tipo: e.target.value })}>
                  {tiposProducao.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div className="grid2">
              <div className="field">
                <label>Status produção</label>
                <select value={demandForm.statusProducao} onChange={(e) => setDemandForm({ ...demandForm, statusProducao: e.target.value })}>
                  {STATUS_PRODUCAO.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Status aprovação</label>
                <select value={demandForm.statusAprovacao} onChange={(e) => setDemandForm({ ...demandForm, statusAprovacao: e.target.value })}>
                  {STATUS_APROVACAO.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="field">
              <label>Editor</label>
              <input value={demandForm.editor} onChange={(e) => setDemandForm({ ...demandForm, editor: e.target.value })} placeholder="Ex: Vítor, Henrique…" />
            </div>
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
              <label>Link do Google Drive (arquivos do cliente)</label>
              <input value={clientForm.driveLink} onChange={(e) => setClientForm({ ...clientForm, driveLink: e.target.value })} placeholder="https://drive.google.com/…" />
            </div>
            <div className="field">
              <label>Imagem de capa (URL — usada na visualização em grade)</label>
              <input value={clientForm.capaUrl} onChange={(e) => setClientForm({ ...clientForm, capaUrl: e.target.value })} placeholder="https://…/logo-ou-foto.jpg" />
              {clientForm.capaUrl && (
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
              <X size={18} style={{ cursor: "pointer" }} onClick={() => { setTransacaoForm(null); setParcelasInput(1); }} />
            </h3>
            <div className="grid2">
              <div className="field">
                <label>Tipo</label>
                <select
                  value={transacaoForm.tipo}
                  onChange={(e) => {
                    const tipo = e.target.value;
                    setTransacaoForm({ ...transacaoForm, tipo, categoria: tipo === "Receita" ? (tiposProducao[0] || "") : CATEGORIAS_DESPESA[0] });
                  }}
                >
                  <option>Receita</option>
                  <option>Despesa</option>
                </select>
              </div>
              <div className="field">
                <label>{transacaoForm.tipo === "Receita" ? "Tipo de produção" : "Categoria"}</label>
                <select value={transacaoForm.categoria} onChange={(e) => setTransacaoForm({ ...transacaoForm, categoria: e.target.value })}>
                  {(transacaoForm.tipo === "Receita" ? tiposProducao : CATEGORIAS_DESPESA).map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="field">
              <label>Descrição</label>
              <input value={transacaoForm.descricao} onChange={(e) => setTransacaoForm({ ...transacaoForm, descricao: e.target.value })} placeholder="Ex: Produção Coprel Julho" />
            </div>
            <div className="grid2">
              <div className="field">
                <label>Valor (R$){transacaoForm.parcelaGrupoId ? "" : parcelasInput > 1 ? " — mensal" : ""}</label>
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
            {transacaoForm.tipo === "Despesa" && (
              <div className="field" style={{ position: "relative" }}>
                <label>Tags</label>
                <div className="tag-cell" style={{ minHeight: 34 }}>
                  <button type="button" className="tag-cell-btn" onClick={(e) => { e.stopPropagation(); setTagPopoverFor(tagPopoverFor === "form" ? null : "form"); }}>
                    {(transacaoForm.tags || []).length === 0 ? (
                      <span className="tag-cell-empty">+ adicionar tag</span>
                    ) : (
                      (transacaoForm.tags || []).map((id) => {
                        const tg = tags.find((x) => x.id === id);
                        if (!tg) return null;
                        return (
                          <span key={id} className="tag-pill" style={{ "--tag-color": tg.cor }}>
                            <span className="tag-dot" style={{ background: tg.cor }} />
                            {tg.nome}
                          </span>
                        );
                      })
                    )}
                  </button>
                  {tagPopoverFor === "form" && (
                    <TagPicker
                      allTags={tags}
                      selectedIds={transacaoForm.tags || []}
                      onToggle={(tagId) => {
                        const atual = transacaoForm.tags || [];
                        const novo = atual.includes(tagId) ? atual.filter((id) => id !== tagId) : [...atual, tagId];
                        setTransacaoForm({ ...transacaoForm, tags: novo });
                      }}
                      onCreate={(nome, cor) => createTag(nome, cor)}
                      onClose={() => setTagPopoverFor(null)}
                    />
                  )}
                </div>
              </div>
            )}
            {!transacoes.some((t) => t.id === transacaoForm.id) && !transacaoForm.parcelaGrupoId && (
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
                  {STATUS_PAGAMENTO.map((s) => <option key={s} value={s}>{s}</option>)}
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
              <button className="btn-ghost" onClick={() => { setTransacaoForm(null); setParcelasInput(1); }}>Cancelar</button>
              <button
                className="btn-primary"
                style={{ marginLeft: 0 }}
                onClick={() => saveTransacao({ ...transacaoForm, valor: transacaoForm.valor || "0" }, parcelasInput)}
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
                  {CATEGORIAS_EQUIP.map((c) => <option key={c} value={c}>{c}</option>)}
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
                <label>Valor de compra (R$)</label>
                <input type="number" step="0.01" value={equipamentoForm.valorCompra} onChange={(e) => setEquipamentoForm({ ...equipamentoForm, valorCompra: e.target.value })} />
              </div>
            </div>
            <div className="field">
              <label>Data de compra</label>
              <input type="date" value={equipamentoForm.dataCompra} onChange={(e) => setEquipamentoForm({ ...equipamentoForm, dataCompra: e.target.value })} />
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

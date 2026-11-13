// Cálculos do painel financeiro (aba Financeiro). Funções puras, sem React.
// Regra única: "do mês" = tudo que VENCE no mês (data do lançamento).

const num = (v) => parseFloat(v) || 0;
const mesDe = (iso) => (iso ? iso.slice(0, 7) : "");
const round2 = (v) => Math.round(v * 100) / 100;

export const CATEGORIA_SEM = "Sem categoria";
export const META_MESES_FOLEGO = 6;

function ultimoDiaDoMes(mes) {
  const [y, m] = mes.split("-").map(Number);
  const d = new Date(y, m, 0).getDate();
  return mes + "-" + String(d).padStart(2, "0");
}

function proximoMes(mes) {
  const [y, m] = mes.split("-").map(Number);
  const d = new Date(y, m, 1);
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
}

function diasEntre(deISO, ateISO) {
  const a = new Date(deISO + "T00:00:00");
  const b = new Date(ateISO + "T00:00:00");
  return Math.round((b - a) / 86400000);
}

function somaDias(iso, n) {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + n);
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

// Pró-labore: o lançamento automático (id prolabore_AAAA-MM) ou qualquer despesa cuja
// categoria seja de pró-labore (o nome da categoria pode ter sido renomeado).
export function ehProLabore(t) {
  if (t.tipo !== "Despesa") return false;
  if ((t.id || "").startsWith("prolabore_")) return true;
  return /labore/i.test(t.categoria || "");
}

// Base do INSS de um mês: soma de TODOS os pró-labores que vencem no mês (fixos ou variáveis).
export function proLaboreTotalDoMes(list, mes) {
  return list.filter((t) => ehProLabore(t) && mesDe(t.data) === mes).reduce((s, t) => s + num(t.valor), 0);
}

// Retorna tudo que a tela Financeiro mostra para o mês selecionado.
//  transacoes     lista completa
//  mes            "AAAA-MM"
//  hoje           "AAAA-MM-DD"
//  caixaHoje      saldo acumulado (já calculado pelo app)
//  faturadoNotas  soma das notas emitidas no mês
//  mediaDespesas6m, pctImposto, pctInss, pctReserva  parâmetros
//  reservaDoMes   quanto foi destinado à reserva no mês (pago)
//  tipoRetiradaReserva  tipo de receita que não conta como faturamento
export function calcularPainelFinanceiro({
  transacoes,
  mes,
  hoje,
  caixaHoje,
  faturadoNotas,
  mediaDespesas6m,
  pctImposto,
  pctInss,
  pctReserva,
  reservaDoMes,
}) {
  const fimMes = ultimoDiaDoMes(mes);
  const doMes = transacoes.filter((t) => mesDe(t.data) === mes);
  const receitas = doMes.filter((t) => t.tipo === "Receita");
  const despesas = doMes.filter((t) => t.tipo === "Despesa");

  const totalReceitas = receitas.reduce((s, t) => s + num(t.valor), 0);
  const recebido = receitas.filter((t) => t.statusPagamento === "Pago").reduce((s, t) => s + num(t.valor), 0);
  const aReceber = totalReceitas - recebido;
  const totalDespesas = despesas.reduce((s, t) => s + num(t.valor), 0);
  const pago = despesas.filter((t) => t.statusPagamento === "Pago").reduce((s, t) => s + num(t.valor), 0);
  const aPagar = totalDespesas - pago;
  const resultadoMes = totalReceitas - totalDespesas;

  // ----- Agenda: pendentes até o fim do mês (atrasadas deste mês entram; vencidas de meses anteriores não) -----
  const pendentes = transacoes
    // Vencidos de meses anteriores não entram na conta (só o que ainda vai ser pago/recebido).
    .filter((t) => t.statusPagamento !== "Pago" && t.data && t.data <= fimMes && !(mesDe(t.data) < mes && t.data < hoje))
    .map((t) => ({ t, sinal: t.tipo === "Receita" ? 1 : -1, valor: num(t.valor), data: t.data, atrasado: t.data < hoje }))
    .sort((a, b) => {
      if (a.data !== b.data) return a.data < b.data ? -1 : 1;
      if (a.sinal !== b.sinal) return b.sinal - a.sinal; // receitas antes das despesas no mesmo dia
      return a.valor - b.valor;
    });
  let saldo = caixaHoje;
  const agenda = pendentes.map((p) => {
    saldo = round2(saldo + p.sinal * p.valor);
    return { ...p, saldoApos: saldo };
  });
  const saldoPrevisto = agenda.length ? agenda[agenda.length - 1].saldoApos : caixaHoje;
  const anterioresAbertos = agenda.filter((a) => mesDe(a.data) < mes);
  const anterioresLiquido = anterioresAbertos.reduce((s, a) => s + a.sinal * a.valor, 0);

  // ----- Alerta de dependência / caixa negativo -----
  function primeiroNegativo(linhas) {
    let acc = caixaHoje;
    for (const l of linhas) {
      acc = round2(acc + l.sinal * l.valor);
      if (acc < 0) return l;
    }
    return null;
  }
  let dependencia = null;
  const negativoComTudo = primeiroNegativo(agenda);
  if (negativoComTudo) {
    dependencia = { tipo: "negativo", data: negativoComTudo.data, causa: negativoComTudo.t.descricao || "" };
  } else {
    const receitasAgenda = agenda.filter((a) => a.sinal > 0);
    if (receitasAgenda.length) {
      const maior = receitasAgenda.reduce((m, a) => (a.valor > m.valor ? a : m), receitasAgenda[0]);
      const semMaior = agenda.filter((a) => a !== maior);
      const neg = primeiroNegativo(semMaior);
      if (neg) {
        dependencia = {
          tipo: "depende",
          cliente: maior.t.clienteId || "",
          descricao: maior.t.descricao || "",
          transacaoId: maior.t.id,
          valor: maior.valor,
          dataReceita: maior.data,
          dataNegativo: neg.data,
          causa: neg.t.descricao || "",
        };
      }
    }
  }

  // ----- Alertas -----
  const alertas = [];
  agenda.filter((a) => a.sinal > 0 && a.atrasado).forEach((a) => {
    alertas.push({ id: "rec-atr-" + a.t.id, nivel: "urgente", acao: "cobrar", transacaoId: a.t.id, titulo: (a.t.descricao || "Receita") + " atrasado", dias: diasEntre(a.data, hoje), valor: a.valor, clienteId: a.t.clienteId });
  });
  agenda.filter((a) => a.sinal < 0 && a.atrasado).forEach((a) => {
    alertas.push({ id: "desp-atr-" + a.t.id, nivel: "urgente", acao: "pagar", transacaoId: a.t.id, titulo: (a.t.descricao || "Despesa") + " atrasada", dias: diasEntre(a.data, hoje), valor: a.valor });
  });
  const limite7 = somaDias(hoje, 7);
  agenda
    .filter((a) => a.sinal > 0 && !a.atrasado && a.data <= limite7 && !a.t.notaEmitida && a.t.tipoReceita !== "Retirada de Reserva")
    .forEach((a) => {
      alertas.push({ id: "sem-nf-" + a.t.id, nivel: "pendencia", acao: "emitir-nota", transacaoId: a.t.id, titulo: (a.t.descricao || "Receita") + " sem NF", data: a.data, valor: a.valor, clienteId: a.t.clienteId });
    });
  const semCategoria = despesas.filter((t) => !t.categoria);
  if (semCategoria.length) {
    alertas.push({
      id: "sem-categoria",
      nivel: "pendencia",
      acao: "categorizar",
      titulo: semCategoria.length + (semCategoria.length === 1 ? " despesa sem categoria" : " despesas sem categoria"),
      nomes: semCategoria.map((t) => t.descricao || "(sem descrição)"),
      valor: semCategoria.reduce((s, t) => s + num(t.valor), 0),
      transacaoId: semCategoria[0].id,
    });
  }
  const sugestaoReserva = round2((faturadoNotas * (num(pctReserva))) / 100);
  if (reservaDoMes <= 0 && sugestaoReserva > 0) {
    alertas.push({ id: "reserva", nivel: "sugestao", acao: "guardar", titulo: "Nenhum valor guardado na reserva este mês", valor: sugestaoReserva, pct: num(pctReserva) });
  }

  // ----- Fôlego -----
  const media = num(mediaDespesas6m);
  const folego = {
    caixa: caixaHoje,
    media,
    meses: media > 0 ? Math.round((caixaHoje / media) * 10) / 10 : null,
    meta: media * META_MESES_FOLEGO,
    pct: media > 0 ? Math.max(0, Math.min(100, (caixaHoje / (media * META_MESES_FOLEGO)) * 100)) : 0,
  };

  // ----- Categorias -----
  const porCategoria = {};
  despesas.forEach((t) => {
    const k = t.categoria || CATEGORIA_SEM;
    porCategoria[k] = (porCategoria[k] || 0) + num(t.valor);
  });
  const categorias = Object.entries(porCategoria)
    .map(([nome, total]) => ({ nome, total, pct: totalDespesas > 0 ? (total / totalDespesas) * 100 : 0 }))
    .sort((a, b) => {
      if (a.nome === CATEGORIA_SEM) return 1;
      if (b.nome === CATEGORIA_SEM) return -1;
      return b.total - a.total;
    });

  // ----- Provisão para o mês seguinte -----
  const proxMes = proximoMes(mes);
  const simples = round2((faturadoNotas * num(pctImposto)) / 100);
  const proLaboreTotal = proLaboreTotalDoMes(transacoes, mes);
  const inss = round2((proLaboreTotal * num(pctInss)) / 100);
  const fatorRMinimo = round2(faturadoNotas * 0.28);
  const provisao = {
    mesSeguinte: proxMes,
    vencimento: proxMes + "-20",
    faturadoNotas,
    pctImposto: num(pctImposto),
    simples,
    pctInss: num(pctInss),
    proLaboreTotal,
    inss,
    total: round2(simples + inss),
    fatorRMinimo,
    fatorROk: proLaboreTotal >= fatorRMinimo,
    fatorRFalta: Math.max(0, round2(fatorRMinimo - proLaboreTotal)),
  };

  return {
    mes,
    fimMes,
    caixaHoje,
    totalReceitas,
    recebido,
    aReceber,
    pctRecebido: totalReceitas > 0 ? Math.round((recebido / totalReceitas) * 100) : 0,
    totalDespesas,
    pago,
    aPagar,
    pctPago: totalDespesas > 0 ? Math.round((pago / totalDespesas) * 100) : 0,
    resultadoMes,
    saldoPrevisto,
    anterioresAbertos: anterioresAbertos.length,
    anterioresLiquido,
    agenda,
    dependencia,
    alertas,
    folego,
    categorias,
    provisao,
    receitas,
    despesas,
  };
}

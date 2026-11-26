// Regras de status e prazo dos trabalhos, usadas pelo painel do dono e pela tela da equipe.

function hojeLocalISO() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

// Status que vale pra um vídeo: é o do próprio vídeo. Só a demanda Finalizada ou em
// Standby vale pra todos os vídeos que ainda não foram finalizados. A aprovação é
// sempre por vídeo, então o status "Aguardando aprovação" da demanda não é repassado.
export function statusEfetivoDoItem(d, statusItem) {
  if (statusItem === "Finalizada" || d.status === "Finalizada") return "Finalizada";
  if (d.status === "Standby") return "Standby";
  return statusItem || "Não iniciada";
}

// Unidades de trabalho de uma demanda: cada vídeo (ou a própria demanda, se não tiver vídeos).
// Todos os números do painel são contados por unidade, então mudam a cada vídeo concluído.
export function unidadesDoTrabalho(d) {
  const itens = d.itens || [];
  if (itens.length === 0) {
    return [{
      status: d.status || "Não iniciada",
      prazo: d.dataEntrega || "",
      conclusao: d.status === "Finalizada" ? d.dataAprovacao || "" : "",
    }];
  }
  return itens.map((it) => {
    const status = statusEfetivoDoItem(d, it.status);
    return {
      status,
      prazo: it.dataEntrega || d.dataEntrega || "",
      conclusao: status === "Finalizada"
        ? it.dataConclusao || (d.status === "Finalizada" ? d.dataAprovacao : "") || it.dataEntrega || d.dataEntrega || ""
        : "",
    };
  });
}

export const STATUS_AGUARDANDO = "Aguardando aprovação";
export const STATUS_APROVADO = "Aprovado";
export const STATUS_ALTERACAO = "Alteração solicitada";

export function urgenciaDaUnidade(u) {
  if (u.status === "Finalizada") return { label: "Concluído", tone: "done" };
  if (u.status === "Standby") return { label: "StandBy", tone: "standby" };
  if (u.status === "Aguardando aprovação") return { label: "Aguardando cliente", tone: "wait" };
  // Aprovado não atrasa mais, mas a demanda continua aberta até o dono finalizar.
  if (u.status === STATUS_APROVADO) return { label: "Aprovado", tone: "approved" };
  if (!u.prazo) return { label: "Sem prazo", tone: "neutral" };
  const today = new Date(hojeLocalISO() + "T00:00:00");
  const entrega = new Date(u.prazo + "T00:00:00");
  const diff = Math.round((entrega - today) / 86400000);
  if (diff < 0) return { label: "Atrasado", tone: "late" };
  if (diff <= 3) return { label: "Urgente", tone: "urgent" };
  return { label: "No prazo", tone: "ok" };
}

const SEVERIDADE_URGENCIA = { late: 4, urgent: 3, ok: 2, neutral: 1 };

export function getUrgencia(d) {
  const urgencias = unidadesDoTrabalho(d).map(urgenciaDaUnidade);
  const ativas = urgencias.filter((u) => SEVERIDADE_URGENCIA[u.tone]);
  if (ativas.length > 0) return ativas.reduce((a, b) => (SEVERIDADE_URGENCIA[b.tone] > SEVERIDADE_URGENCIA[a.tone] ? b : a));
  const espera = urgencias.find((u) => u.tone === "wait");
  if (espera) return espera;
  const parada = urgencias.find((u) => u.tone === "standby");
  if (parada) return parada;
  const aprovada = urgencias.find((u) => u.tone === "approved");
  if (aprovada) return aprovada;
  return { label: "Concluído", tone: "done" };
}

export const TONE_CLASS = {
  late: "badge-late",
  wait: "badge-wait",
  urgent: "badge-urgent",
  ok: "badge-ok",
  done: "badge-done",
  approved: "badge-done",
  standby: "badge-standby",
  neutral: "badge-neutral",
};

export function videoProgress(d) {
  const itens = d.itens || [];
  if (itens.length === 0) return null;
  const done = itens.filter((v) => v.status === "Finalizada").length;
  return { done, total: itens.length };
}

export function ehNaoIniciado(st) {
  return !st || st === "Não iniciada" || st === "Não iniciado";
}

// Números de produção do topo do painel, contados por vídeo.
export function statsDeProducao(demandas) {
  let emAndamento = 0;
  let atrasado = 0;
  let aguardando = 0;
  demandas.forEach((d) => {
    unidadesDoTrabalho(d).forEach((u) => {
      if (u.status === "Finalizada" || u.status === "Standby" || u.status === STATUS_APROVADO) return;
      if (u.status === "Aguardando aprovação") { aguardando++; return; }
      if (urgenciaDaUnidade(u).tone === "late") atrasado++;
      if (u.status === "Em andamento" || (ehNaoIniciado(u.status) && d.status === "Em andamento")) emAndamento++;
    });
  });
  return { emAndamento, atrasado, aguardando };
}

// Vídeos (ou demandas sem vídeos) que estão num dos status pedidos, pelo status que
// aparece na lista. Demandas finalizadas ou em standby ficam de fora.
export function videosComStatus(demandas, statusAceitos) {
  const lista = [];
  demandas.forEach((d) => {
    if (d.status === "Finalizada" || d.status === "Standby") return;
    const itens = d.itens || [];
    if (itens.length === 0) {
      if (statusAceitos.includes(d.status)) {
        lista.push({ demanda: d, itemId: "", nome: d.projeto, status: d.status, prazo: d.dataEntrega || "", link: d.link || "", retorno: d.retorno || "", retornoPor: d.retornoPor || "" });
      }
      return;
    }
    itens.forEach((it, i) => {
      if (statusAceitos.includes(it.status)) {
        lista.push({ demanda: d, itemId: it.id, nome: it.nome || "Vídeo " + (i + 1), status: it.status, prazo: it.dataEntrega || d.dataEntrega || "", link: it.link || d.link || "", retorno: it.retorno || "", retornoPor: it.retornoPor || "" });
      }
    });
  });
  return lista;
}

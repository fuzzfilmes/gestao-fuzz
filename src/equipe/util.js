// Utilidades compartilhadas entre o painel do dono e a tela da equipe.

export const TIPOS_AGENDA = {
  postagem: { nome: "Postagem", cor: "#e8536f", descricao: "Legenda e observações" },
  gravacao: { nome: "Gravação", cor: "#d9a441", descricao: "Local, horário e o que gravar" },
  reuniao: { nome: "Reunião", cor: "#7aa7f0", descricao: "Pauta e participantes" },
};

export function nomeStatusAgenda(tipo, status) {
  if (status === "agendado") return "Agendado";
  if (status === "concluido") return tipo === "postagem" ? "Publicado" : "Concluído";
  return "Planejado";
}

export const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

export function isoDe(d) {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}
export const hojeISO = () => isoDe(new Date());
export function somaDiasISO(iso, n) {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + n);
  return isoDe(d);
}
export function dataCurta(iso) {
  if (!iso) return "sem prazo";
  const [, m, d] = iso.split("-");
  return d + "/" + m;
}

// Só abre endereços web: qualquer outro esquema (javascript:, data: etc.) é ignorado.
export function linkSeguro(texto) {
  const bruto = (texto || "").trim();
  if (!bruto) return "";
  try {
    const url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(bruto) ? bruto : "https://" + bruto);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : "";
  } catch {
    return "";
  }
}

export function linkZap(telefone) {
  const digitos = (telefone || "").replace(/\D/g, "");
  if (!digitos) return "";
  return "https://wa.me/" + (digitos.length <= 11 ? "55" + digitos : digitos);
}

// Avisos da tela inicial: o que não foi concluído nos últimos 7 dias, hoje e nos próximos 7.
export function avisosDoCronograma(itens, hoje = hojeISO()) {
  const de = somaDiasISO(hoje, -7);
  const ate = somaDiasISO(hoje, 7);
  const ordenados = [...itens].sort((a, b) => (a.data + (a.hora || "")).localeCompare(b.data + (b.hora || "")));
  return {
    pendentes: ordenados.filter((i) => i.status !== "concluido" && i.data < hoje && i.data >= de),
    hoje: ordenados.filter((i) => i.data === hoje && i.status !== "concluido"),
    proximos: ordenados.filter((i) => i.data > hoje && i.data <= ate && i.status !== "concluido"),
  };
}

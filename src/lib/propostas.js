// Regras das propostas: parcelas e o que a aprovação gerou.

export const FORMAS_PAGAMENTO = ["Pix", "Boleto", "Transferência", "Cartão de crédito", "Cartão de débito", "Dinheiro", "A combinar"];

const centavos = (v) => Math.round((parseFloat(v) || 0) * 100);

// Divide um valor em n partes iguais; o centavo que sobra vai pra última.
export function dividirValor(total, n) {
  const t = centavos(total);
  const base = Math.floor(t / n);
  return Array.from({ length: n }, (_, i) => ((i === n - 1 ? t - base * (n - 1) : base) / 100).toFixed(2));
}

// Ao mudar uma parcela, o que falta é redividido entre as seguintes.
export function ajustarParcelas(parcelas, indice, valor, total) {
  const novas = parcelas.map((p, i) => (i === indice ? valor : p));
  const depois = novas.length - indice - 1;
  if (depois > 0) {
    const usado = novas.slice(0, indice + 1).reduce((s, v) => s + centavos(v), 0);
    const resto = Math.max(0, centavos(total) - usado);
    dividirValor(resto / 100, depois).forEach((v, i) => { novas[indice + 1 + i] = v; });
  }
  return novas;
}

export function diferencaParcelas(parcelas, total) {
  return (parcelas.reduce((s, v) => s + centavos(v), 0) - centavos(total)) / 100;
}

const escapar = (t) => String(t).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Demanda e receitas que vieram de uma proposta. As aprovadas antes de existir a
// ligação no banco são reconhecidas pelo texto automático das observações.
export function vinculosDaProposta(prop, demandas, transacoes) {
  const numero = String(prop.numero || "");
  const textoDemanda = numero ? new RegExp("^Gerada a partir da Proposta nº " + escapar(numero) + "( —|$)") : null;
  const textoReceita = "Gerada automaticamente a partir da Proposta nº " + numero;
  return {
    demandas: demandas.filter(
      (d) => (prop.demandaId && d.id === prop.demandaId) || (!!textoDemanda && d.clienteId === prop.clienteId && textoDemanda.test(d.observacoes || ""))
    ),
    receitas: transacoes.filter(
      (t) =>
        t.tipo === "Receita" &&
        (t.propostaId === prop.id || (!t.propostaId && !!numero && t.clienteId === prop.clienteId && t.observacoes === textoReceita))
    ),
  };
}

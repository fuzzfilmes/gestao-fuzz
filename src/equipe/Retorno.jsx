import React from "react";

// O que a social media respondeu sobre o vídeo, mostrado nos dois painéis.
export default function Retorno({ status, retorno, retornoPor, retornoEm }) {
  if (!retornoEm) return null;
  const quando = new Date(retornoEm).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  let titulo = "";
  let cor = "var(--text-dim)";
  if (status === "Aprovado") { titulo = "Aprovado por " + retornoPor; cor = "#5ccba8"; }
  else if (status === "Alteração solicitada") { titulo = "Alteração pedida por " + retornoPor; cor = "#ff8a80"; }
  else if (status === "Aguardando aprovação" && retorno) titulo = "Último retorno de " + retornoPor;
  else return null;
  return (
    <div style={{ flexBasis: "100%", fontSize: 12, lineHeight: 1.45, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
      <b style={{ color: cor }}>{titulo}</b> <span style={{ color: "var(--text-dim)" }}>· {quando}</span>
      {retorno ? <div>{retorno}</div> : null}
    </div>
  );
}

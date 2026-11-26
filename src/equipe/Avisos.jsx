import React from "react";
import { CSS_EQUIPE } from "./estilo.js";
import { TIPOS_AGENDA, avisosDoCronograma, dataCurta } from "./util.js";

// Lista da tela inicial com o que vem do cronograma.
export default function AvisosCronograma({ itens, clientes, onAbrir }) {
  const { pendentes, hoje, proximos } = avisosDoCronograma(itens);
  const nomeCliente = (id) => clientes.find((c) => c.id === id)?.nome || "";
  const grupos = [
    { titulo: "Hoje", classe: "hoje", lista: hoje },
    { titulo: "Próximos 7 dias", classe: "", lista: proximos },
    { titulo: "Passou da data sem concluir", classe: "atraso", lista: pendentes },
  ].filter((g) => g.lista.length > 0);

  return (
    <div className="tm">
      <style>{CSS_EQUIPE}</style>
      {grupos.length === 0 && <div className="tm-vazio">Nada no cronograma para hoje nem para os próximos 7 dias.</div>}
      {grupos.map((g) => (
        <div key={g.titulo}>
          <div className={"tm-grupo " + g.classe}>{g.titulo}</div>
          {g.lista.map((i) => (
            <button key={i.id} className="tm-linha" onClick={() => onAbrir(i)}>
              <i className="tm-ponto" style={{ background: TIPOS_AGENDA[i.tipo]?.cor }} />
              <span className="tm-linha-corpo">
                {i.titulo}
                <span className="tm-linha-sub">{[TIPOS_AGENDA[i.tipo]?.nome, nomeCliente(i.clienteId)].filter(Boolean).join(" · ")}</span>
              </span>
              <span className="tm-linha-data">{[g.classe === "hoje" ? "" : dataCurta(i.data), i.hora].filter(Boolean).join(" ")}</span>
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

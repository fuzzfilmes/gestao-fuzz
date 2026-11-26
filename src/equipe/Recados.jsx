import React, { useState } from "react";
import { Send } from "lucide-react";
import { CSS_EQUIPE } from "./estilo.js";

function quando(iso) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export const recadosNaoLidos = (lista) => lista.filter((r) => !r.enviadoPorMim && !r.lido);

export function Recado({ r, onLido, onExcluir }) {
  const novo = !r.enviadoPorMim && !r.lido;
  return (
    <div className={"tm-recado" + (novo ? " novo" : "")}>
      <div className="tm-recado-topo">
        <span>{r.enviadoPorMim ? "Você → " + r.paraNome : r.deNome + (r.paraNome === "Todos" ? " → Todos" : "")}{r.clienteNome ? " · " + r.clienteNome : ""}</span>
        <span>{quando(r.criadoEm)}</span>
      </div>
      <p className="tm-texto">{r.texto}</p>
      {(novo || onExcluir) && (
        <div className="tm-acoes">
          {onExcluir && <button className="tm-btn perigo" onClick={() => onExcluir(r.id)}>Excluir</button>}
          {novo && <button className="tm-btn" onClick={() => onLido(r.id)}>Marcar como lido</button>}
        </div>
      )}
    </div>
  );
}

// Mural de recados: escrever e ler.
//  pessoas  [{id, nome}] que podem receber (o "Todos" é adicionado aqui)
export default function Recados({ recados, pessoas, clientes, onEnviar, onLido, onExcluir }) {
  const [destino, setDestino] = useState("");
  const [clienteId, setClienteId] = useState("");
  const [texto, setTexto] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const destinoSel = destino || pessoas[0]?.id || "";

  async function protegido(acao) {
    setErro("");
    try {
      await acao();
      return true;
    } catch (e) {
      console.error("Falha nos recados", e);
      setErro(e?.message || "Não consegui concluir.");
      return false;
    }
  }

  async function enviar(e) {
    e.preventDefault();
    if (!texto.trim() || !destinoSel) return;
    setEnviando(true);
    if (await protegido(() => onEnviar({ destino: destinoSel, clienteId, texto: texto.trim() }))) setTexto("");
    setEnviando(false);
  }

  return (
    <div className="tm">
      <style>{CSS_EQUIPE}</style>
      {pessoas.length === 0 ? (
        <div className="tm-vazio">Cadastre alguém em Configurações → Equipe e acessos para enviar recados.</div>
      ) : (
        <form onSubmit={enviar} style={{ marginBottom: 14 }}>
          <div className="tm-duas">
            <label className="tm-campo"><span>Para</span>
              <select value={destinoSel} onChange={(e) => setDestino(e.target.value)}>
                {pessoas.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
                <option value="todos">Todos</option>
              </select>
            </label>
            <label className="tm-campo"><span>Cliente (opcional)</span>
              <select value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
                <option value="">Nenhum</option>
                {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </label>
          </div>
          <label className="tm-campo"><span>Recado</span><textarea value={texto} maxLength={4000} onChange={(e) => setTexto(e.target.value)} /></label>
          <div className="tm-acoes">
            <button type="submit" className="tm-btn forte" disabled={enviando || !texto.trim()}><Send size={13} /> Enviar</button>
          </div>
        </form>
      )}
      {erro && <p className="tm-erro">{erro}</p>}
      {recados.length === 0 && <div className="tm-vazio">Nenhum recado ainda.</div>}
      {recados.map((r) => (
        <Recado key={r.id} r={r} onLido={(id) => protegido(() => onLido(id))} onExcluir={onExcluir ? (id) => protegido(() => onExcluir(id)) : undefined} />
      ))}
    </div>
  );
}

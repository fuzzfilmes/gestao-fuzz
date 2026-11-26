import React, { useState } from "react";
import { Calendar as IconeCalendario, ExternalLink, Lock, NotebookText, Plus, X } from "lucide-react";
import Calendario from "./Calendario.jsx";
import Janela from "./Janela.jsx";
import { CamposCliente } from "./Clientes.jsx";
import { dataCurta, hojeISO, linkSeguro } from "./util.js";

// Ficha do cliente na visão da equipe: a mesma do dono, com o que não foi liberado
// bloqueado. Contratos, propostas, arquivos e valores nem chegam até aqui.
export default function FichaClienteEquipe({ cliente: c, agenda, ehSocial, acoes, onFechar }) {
  const [nota, setNota] = useState(null);
  const [cronograma, setCronograma] = useState(false);
  const drive = linkSeguro(c.driveLink);

  return (
    <div className="overlay" onClick={onFechar}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>
          {c.nome || "(sem nome)"}
          <button className="icon-btn" onClick={onFechar}><X size={15} /></button>
        </h3>
        <CamposCliente cliente={c} />

        <div className="field" style={{ opacity: 0.45 }} title="Não liberado para o seu acesso">
          <label>Arquivos anexados</label>
          <span style={{ fontSize: 12.5 }}><Lock size={11} /> Não liberado para o seu acesso</span>
        </div>

        <div className="field">
          <label>Materiais de apoio</label>
          {c.materiais.length === 0 && <span style={{ fontSize: 12.5, color: "var(--text-dim)" }}>Nenhum material ainda.</span>}
          {c.materiais.map((m) => {
            const link = linkSeguro(m.link);
            return (
              <div key={m.id} style={{ padding: "6px 0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                  <b style={{ fontSize: 13.5, overflowWrap: "anywhere" }}>{m.titulo}</b>
                  {link && <a className="icon-btn" href={link} target="_blank" rel="noopener noreferrer" title="Abrir"><ExternalLink size={13} /></a>}
                </div>
                {m.texto && <div style={{ fontSize: 13, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{m.texto}</div>}
              </div>
            );
          })}
        </div>

        <div className="field">
          <label>Cronograma mensal</label>
          <button className="btn-ghost" style={{ width: "100%" }} onClick={() => setCronograma(true)}>
            <IconeCalendario size={13} style={{ verticalAlign: "-2px", marginRight: 4 }} />Postagens, gravações e reuniões ({agenda.length})
          </button>
        </div>

        <div className="field">
          <label>Notas de reunião</label>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {c.notas.map((n) => (
              <div key={n.id} style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, cursor: "pointer" }} onClick={() => setNota({ ...n, clienteId: c.id })}>
                <span><NotebookText size={13} style={{ verticalAlign: "-2px", marginRight: 4 }} />{n.titulo || "Sem título"}{n.autorNome ? <span style={{ fontSize: 12, color: "var(--text-dim)" }}> · {n.autorNome}</span> : null}</span>
                <span style={{ fontSize: 12, color: "var(--text-dim)", flexShrink: 0 }}>{dataCurta(n.data)}</span>
              </div>
            ))}
            {c.notas.length === 0 && <span style={{ fontSize: 12.5, color: "var(--text-dim)" }}>Nenhuma nota registrada ainda.</span>}
          </div>
          <button
            className="btn-ghost"
            style={{ width: "100%", marginTop: 8 }}
            disabled={!ehSocial}
            title={ehSocial ? "" : "Não liberado para o seu acesso"}
            onClick={() => setNota({ id: "", clienteId: c.id, titulo: "", data: hojeISO(), conteudo: "", minha: true })}
          >
            <Plus size={13} style={{ verticalAlign: "-2px", marginRight: 4 }} />Nova nota de reunião
          </button>
        </div>

        <div className="modal-actions">
          <button className="btn-ghost" onClick={onFechar}>Fechar</button>
          {drive && (
            <a className="btn-primary" style={{ marginLeft: 0 }} href={drive} target="_blank" rel="noopener noreferrer">
              <ExternalLink size={15} /> Abrir Drive do cliente
            </a>
          )}
        </div>

        {cronograma && (
          <Janela titulo={"Cronograma · " + c.nome} larga onFechar={() => setCronograma(false)}>
            <Calendario itens={agenda} clientes={[c]} clienteId={c.id} podeEditar={ehSocial} onSalvar={acoes.salvarAgenda} onExcluir={acoes.excluirAgenda} />
          </Janela>
        )}
        {nota && <NotaReuniao nota={nota} podeEditar={ehSocial && nota.minha} acoes={acoes} onFechar={() => setNota(null)} />}
      </div>
    </div>
  );
}

function NotaReuniao({ nota, podeEditar, acoes, onFechar }) {
  const [f, setF] = useState(nota);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [confirma, setConfirma] = useState(false);

  async function executar(acao) {
    setErro("");
    setSalvando(true);
    try {
      await acao();
      onFechar();
    } catch (e) {
      console.error("Falha na nota de reunião", e);
      setErro(e?.message || "Não consegui salvar.");
      setSalvando(false);
    }
  }

  if (!podeEditar) {
    return (
      <Janela titulo={f.titulo || "Nota de reunião"} onFechar={onFechar}>
        <p className="tm-linha-sub" style={{ marginBottom: 10 }}>{dataCurta(f.data)} · {f.autorNome || "Fuzz"}</p>
        <p className="tm-texto">{f.conteudo}</p>
      </Janela>
    );
  }
  return (
    <Janela titulo={nota.id ? "Editar nota" : "Nova nota de reunião"} onFechar={onFechar}>
      <form onSubmit={(e) => { e.preventDefault(); executar(() => acoes.salvarNota(f)); }}>
        <div className="tm-duas">
          <label className="tm-campo"><span>Título</span><input value={f.titulo} onChange={(e) => setF({ ...f, titulo: e.target.value })} required autoFocus /></label>
          <label className="tm-campo"><span>Data</span><input type="date" value={f.data} onChange={(e) => setF({ ...f, data: e.target.value })} required /></label>
        </div>
        <label className="tm-campo"><span>Anotações</span><textarea style={{ minHeight: 180 }} value={f.conteudo} onChange={(e) => setF({ ...f, conteudo: e.target.value })} /></label>
        {erro && <p className="tm-erro">{erro}</p>}
        <div className="tm-acoes">
          {nota.id && (
            <button type="button" className="tm-btn perigo" disabled={salvando} onClick={() => (confirma ? executar(() => acoes.excluirNota(nota.id)) : setConfirma(true))}>
              {confirma ? "Confirmar exclusão" : "Excluir"}
            </button>
          )}
          <button type="submit" className="tm-btn forte" disabled={salvando}>{salvando ? "Salvando…" : "Salvar"}</button>
        </div>
      </form>
    </Janela>
  );
}

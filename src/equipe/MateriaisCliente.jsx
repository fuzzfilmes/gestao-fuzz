import React, { useState } from "react";
import { ExternalLink, Pencil, Plus } from "lucide-react";
import Janela from "./Janela.jsx";
import { linkSeguro } from "./util.js";

// Materiais de apoio, no cadastro do cliente (visão do dono).
export default function MateriaisCliente({ clienteId, materiais, erroCarga, onSalvar, onExcluir }) {
  const [form, setForm] = useState(null);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [confirma, setConfirma] = useState(false);
  const lista = materiais.filter((m) => m.clienteId === clienteId);

  const abrir = (m) => { setErro(""); setConfirma(false); setSalvando(false); setForm(m); };

  async function executar(acao) {
    setErro("");
    setSalvando(true);
    try {
      await acao();
      setForm(null);
    } catch (e) {
      console.error("Falha no material de apoio", e);
      setErro(e?.message || "Não consegui salvar.");
      setSalvando(false);
    }
  }

  return (
    <div className="field">
      <label>Materiais de apoio (visíveis para a equipe)</label>
      {erroCarga ? (
        <span style={{ fontSize: 12.5, color: "var(--amber)" }}>Rode a migração 025 no Supabase para usar os materiais.</span>
      ) : (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {lista.map((m) => (
              <div key={m.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <span style={{ overflowWrap: "anywhere" }}>{m.titulo}</span>
                <span style={{ display: "flex", gap: 4 }}>
                  {linkSeguro(m.link) && <a className="icon-btn" href={linkSeguro(m.link)} target="_blank" rel="noopener noreferrer" title="Abrir"><ExternalLink size={13} /></a>}
                  <button className="icon-btn" title="Editar" onClick={() => abrir(m)}><Pencil size={13} /></button>
                </span>
              </div>
            ))}
            {lista.length === 0 && <span style={{ fontSize: 12.5, color: "var(--text-dim)" }}>Nenhum material ainda.</span>}
          </div>
          <button className="btn-ghost" style={{ width: "100%", marginTop: 8 }} onClick={() => abrir({ id: "", clienteId, titulo: "", link: "", texto: "" })}>
            <Plus size={13} style={{ verticalAlign: "-2px", marginRight: 4 }} />Novo material
          </button>
        </>
      )}
      {form && (
        <Janela titulo={form.id ? "Editar material" : "Novo material de apoio"} onFechar={() => setForm(null)}>
          <form onSubmit={(e) => { e.preventDefault(); executar(() => onSalvar(form)); }}>
            <label className="tm-campo"><span>Título</span><input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} placeholder="Ex: Identidade visual, Tom de voz, Hashtags" required autoFocus /></label>
            <label className="tm-campo"><span>Link (opcional)</span><input value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} placeholder="https://…" /></label>
            <label className="tm-campo"><span>Orientações (opcional)</span><textarea style={{ minHeight: 140 }} value={form.texto} onChange={(e) => setForm({ ...form, texto: e.target.value })} /></label>
            <p className="tm-linha-sub">A equipe com acesso a este cliente vê este conteúdo. Não coloque senhas nem valores.</p>
            {erro && <p className="tm-erro">{erro}</p>}
            <div className="tm-acoes">
              {form.id && (
                <button type="button" className="tm-btn perigo" disabled={salvando} onClick={() => (confirma ? executar(() => onExcluir(form.id)) : setConfirma(true))}>
                  {confirma ? "Confirmar exclusão" : "Excluir"}
                </button>
              )}
              <button type="submit" className="tm-btn forte" disabled={salvando}>Salvar</button>
            </div>
          </form>
        </Janela>
      )}
    </div>
  );
}

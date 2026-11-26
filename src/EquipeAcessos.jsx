import React, { useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, Trash2 } from "lucide-react";
import PainelEquipe from "./PainelEquipe.jsx";
import * as api from "./lib/api.js";

const PAPEIS = {
  editor: { nome: "Editor", resumo: "Vê as demandas atribuídas e os clientes delas" },
  social: { nome: "Social media", resumo: "Vê os clientes liberados, monta o cronograma e cria notas" },
};

function SeletorClientes({ clientes, selecionados, onChange }) {
  const ordenados = [...clientes].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  if (ordenados.length === 0) return <p className="config-hint">Nenhum cliente cadastrado.</p>;
  return (
    <div className="equipe-clientes">
      {ordenados.map((c) => (
        <label key={c.id}>
          <input
            type="checkbox"
            checked={selecionados.includes(c.id)}
            onChange={(e) => onChange(e.target.checked ? [...selecionados, c.id] : selecionados.filter((x) => x !== c.id))}
          />
          <span>{c.nome}</span>
        </label>
      ))}
    </div>
  );
}

// Mostra a tela da equipe com os dados reais, só na tela do dono: não cria acesso nem grava nada.
// Usa os mesmos campos que a função painel_equipe() do banco entrega.
function PreviaEquipe({ clientes, demandas, membros, status, materiais, notas, agenda }) {
  const [papel, setPapel] = useState("social");
  const [clientesIds, setClientesIds] = useState([]);
  const [editor, setEditor] = useState("");
  const [aberta, setAberta] = useState(false);

  const opcoesEditor = [
    ...membros.filter((m) => m.papel === "editor").map((m) => ({ valor: "m:" + m.id, nome: m.nome + " (demandas atribuídas)" })),
    ...[...new Set(demandas.map((d) => (d.editor || "").trim()).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, "pt-BR"))
      .map((nome) => ({ valor: "t:" + nome, nome: 'Campo "Editor" = ' + nome })),
  ];
  const editorSel = editor || opcoesEditor[0]?.valor || "";

  const visiveis = demandas.filter((d) => {
    if (papel === "social") return clientesIds.includes(d.clienteId);
    if (editorSel.startsWith("m:")) return d.editorMembroId === editorSel.slice(2);
    return !!editorSel && (d.editor || "").trim() === editorSel.slice(2);
  });

  // Social vê os clientes marcados; editor, os clientes das demandas dele.
  const idsClientes = papel === "social" ? clientesIds : [...new Set(visiveis.map((d) => d.clienteId))];

  const dados = {
    membro: { nome: "Pré-visualização", papel, ativo: true },
    clientes: clientes
      .filter((c) => idsClientes.includes(c.id))
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
      .map((c) => ({
        ...c,
        contatos: c.contatos || [],
        materiais: materiais.filter((m) => m.clienteId === c.id),
        notas: notas.filter((n) => n.clienteId === c.id).map((n) => ({ ...n, minha: false })),
      })),
    agenda: agenda.filter((i) => idsClientes.includes(i.clienteId)),
    recados: [],
    pessoas: [{ id: "dono", nome: "Fuzz" }],
    status: status.map((s) => ({ nome: s.nome, cor: s.cor })),
    trabalhos: visiveis.map((d) => ({
      id: d.id,
      clienteId: d.clienteId,
      projeto: d.projeto,
      clienteNome: clientes.find((c) => c.id === d.clienteId)?.nome || "",
      tipo: d.tipo,
      editor: d.editor,
      status: d.status,
      dataEntrega: d.dataEntrega,
      dataEnvioAprovacao: d.dataEnvioAprovacao,
      dataAprovacao: d.dataAprovacao,
      link: d.link,
      observacoes: papel === "editor" ? d.observacoes : "",
      itens: d.itens || [],
    })),
  };

  return (
    <div className="equipe-card">
      <b>Ver como a equipe vê</b>
      <div className="equipe-sub">Usa as suas demandas reais, só para conferência. Não precisa de cadastro nem de email.</div>
      <div className="field">
        <label>Papel</label>
        <select value={papel} onChange={(e) => setPapel(e.target.value)}>
          <option value="social">Social media</option>
          <option value="editor">Editor</option>
        </select>
      </div>
      {papel === "social" ? (
        <div className="field">
          <label>Clientes liberados</label>
          <SeletorClientes clientes={clientes} selecionados={clientesIds} onChange={setClientesIds} />
        </div>
      ) : (
        <div className="field">
          <label>Demandas de qual editor</label>
          {opcoesEditor.length === 0 ? (
            <p className="config-hint">Nenhuma demanda tem o campo "Editor" preenchido.</p>
          ) : (
            <select value={editorSel} onChange={(e) => setEditor(e.target.value)}>
              {opcoesEditor.map((o) => <option key={o.valor} value={o.valor}>{o.nome}</option>)}
            </select>
          )}
        </div>
      )}
      <button type="button" className="btn-primary" style={{ marginLeft: 0 }} onClick={() => setAberta(true)}>
        Abrir prévia ({visiveis.length} {visiveis.length === 1 ? "demanda" : "demandas"})
      </button>
      {aberta &&
        createPortal(
          <div className="eq-previa" style={{ position: "fixed", inset: 0, zIndex: 1000, overflowY: "auto", background: "#0A0B0D", padding: "16px", display: "flex", justifyContent: "center", alignItems: "flex-start" }}>
            <style>{".eq-previa > div.app { width: 100%; max-width: 1400px; height: max-content; }"}</style>
            <PainelEquipe dados={dados} onAtualizar={async () => {}} onFecharPrevia={() => setAberta(false)} />
          </div>,
          document.body
        )}
    </div>
  );
}

function mensagemConvite(m, codigo) {
  return [
    "Oi, " + m.nome.split(" ")[0] + "! Seu acesso ao painel da Fuzz:",
    window.location.origin,
    "1. Clique em \"Primeiro acesso\"",
    "2. Email: " + m.email,
    "3. Código: " + codigo,
    "4. Crie a sua senha",
    "O código vale por 7 dias e funciona uma única vez.",
  ].join("\n");
}

// Situação do login de cada pessoa e o botão de gerar o código.
function PrimeiroAcesso({ membro: m, onRecarregar }) {
  const [codigo, setCodigo] = useState("");
  const [erro, setErro] = useState("");
  const [gerando, setGerando] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  const [copiado, setCopiado] = useState(false);

  if (m.acessoCriadoEm === undefined) {
    return <p className="config-hint" style={{ color: "var(--amber)", margin: "10px 0 0" }}>Rode a migração 026 no Supabase para gerar o código de primeiro acesso.</p>;
  }
  const criado = !!m.acessoCriadoEm;
  const pendente = !criado && m.conviteExpira && new Date(m.conviteExpira) > new Date();
  const dataBR = (iso) => new Date(iso).toLocaleDateString("pt-BR");

  async function gerar() {
    setErro("");
    setGerando(true);
    try {
      setCodigo(await api.gerarCodigoAcesso(m.id, criado));
      setCopiado(false);
      setConfirmar(false);
      await onRecarregar();
    } catch (e) {
      console.error("Falha ao gerar código de acesso", e);
      setErro(e?.message || "Não consegui gerar o código.");
    } finally {
      setGerando(false);
    }
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(mensagemConvite(m, codigo));
      setCopiado(true);
    } catch {
      setErro("Não consegui copiar. Selecione o texto e copie manualmente.");
    }
  }

  return (
    <div className="equipe-acesso">
      <div className="equipe-sub">
        {criado
          ? "Senha criada em " + dataBR(m.acessoCriadoEm) + "."
          : pendente
          ? "Aguardando o primeiro acesso (código válido até " + dataBR(m.conviteExpira) + ")."
          : "Ainda sem senha criada."}
      </div>
      {confirmar ? (
        <div className="equipe-confirma">
          <span>A senha atual deixa de funcionar e a pessoa cria outra com o novo código. Continuar?</span>
          <button className="btn-ghost" disabled={gerando} onClick={gerar}>Sim, redefinir</button>
          <button className="btn-ghost" onClick={() => setConfirmar(false)}>Cancelar</button>
        </div>
      ) : (
        <button className="btn-ghost" disabled={gerando || !m.ativo} onClick={() => (criado ? setConfirmar(true) : gerar())}>
          {criado ? "Redefinir senha" : pendente || codigo ? "Gerar novo código" : "Gerar código de primeiro acesso"}
        </button>
      )}
      {codigo && !criado && (
        <div className="equipe-passos" style={{ marginTop: 10, marginBottom: 0 }}>
          <b>Envie para a pessoa (o código só aparece agora):</b>
          <pre className="equipe-convite">{mensagemConvite(m, codigo)}</pre>
          <button className="btn-ghost" onClick={copiar}>{copiado ? "Copiado ✓" : "Copiar mensagem"}</button>
        </div>
      )}
      {erro && <p className="config-hint" style={{ color: "var(--red)", margin: "8px 0 0" }}>{erro}</p>}
    </div>
  );
}

const formVazio = { nome: "", email: "", papel: "editor", clientesIds: [] };

export default function EquipeAcessos({ membros, clientes, demandas, status, materiais, notas, agenda, erroCarga, onRecarregar, onExcluido, onVoltar }) {
  const [form, setForm] = useState(formVazio);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [aExcluir, setAExcluir] = useState(null);

  async function executar(acao) {
    setErro("");
    setSalvando(true);
    try {
      await acao();
      await onRecarregar();
      return true;
    } catch (e) {
      console.error("Falha ao salvar acesso da equipe", e);
      setErro(
        e?.code === "23505"
          ? "Já existe um acesso com esse email."
          : e?.code === "42501"
          ? "Não é possível cadastrar o seu próprio email."
          : "Não consegui salvar. " + (e?.message || "")
      );
      return false;
    } finally {
      setSalvando(false);
    }
  }

  async function adicionar(e) {
    e.preventDefault();
    if (!form.nome.trim() || !form.email.trim()) return;
    if (await executar(() => api.criarEquipeMembro(form))) setForm(formVazio);
  }

  return (
    <div className="config-panel">
      <button className="config-back" onClick={onVoltar}><ChevronLeft size={14} /> Voltar</button>
      <h3 className="config-section-title">Equipe e acessos</h3>
      <p className="config-hint">
        Cada pessoa entra com o próprio login e vê uma tela separada, só com as demandas e os clientes liberados (contatos, Drive, dados cadastrais, materiais, cronograma e notas de reunião). Ninguém da equipe acessa financeiro, propostas, contratos ou arquivos anexados.
      </p>

      <PreviaEquipe clientes={clientes} demandas={demandas} membros={membros} status={status} materiais={materiais} notas={notas} agenda={agenda} />

      {erroCarga ? (
        <p className="config-hint" style={{ color: "var(--amber)" }}>
          Não consegui carregar a equipe ({erroCarga}). Se for a primeira vez, rode a migração 025 no Supabase e recarregue a página.
        </p>
      ) : (
        <>
          <div className="equipe-passos">
            <b>Para liberar alguém:</b>
            <ol>
              <li>Cadastre a pessoa abaixo (nome, email e papel).</li>
              <li>Clique em <i>Gerar código de primeiro acesso</i> e envie a mensagem para ela.</li>
              <li>Ela abre o painel, clica em <i>Primeiro acesso</i> e cria a própria senha.</li>
            </ol>
          </div>

          {membros.map((m) => {
            const atribuidas = demandas.filter((d) =>
              m.papel === "editor" ? d.editorMembroId === m.id : m.clientesIds.includes(d.clienteId)
            ).length;
            return (
              <div className={"equipe-card" + (m.ativo ? "" : " off")} key={m.id}>
                <div className="equipe-card-head">
                  <div>
                    <b>{m.nome}</b> <span className="badge badge-neutral">{PAPEIS[m.papel].nome}</span>
                    {!m.ativo && <span className="badge badge-wait" style={{ marginLeft: 6 }}>Desativado</span>}
                    <div className="equipe-email">{m.email} · {atribuidas} {atribuidas === 1 ? "demanda visível" : "demandas visíveis"}</div>
                  </div>
                  <div className="equipe-acoes">
                    <button className="btn-ghost" disabled={salvando} onClick={() => executar(() => api.atualizarEquipeMembro(m.id, { ativo: !m.ativo }))}>
                      {m.ativo ? "Desativar" : "Reativar"}
                    </button>
                    <button className="icon-btn" title="Excluir acesso" onClick={() => setAExcluir(m.id)}><Trash2 size={13} /></button>
                  </div>
                </div>
                {aExcluir === m.id && (
                  <div className="equipe-confirma">
                    <span>Excluir este acesso? O login criado pelo primeiro acesso é apagado, junto com as atribuições e os recados dessa pessoa. Para só bloquear a entrada, use "Desativar".</span>
                    <button
                      className="btn-ghost"
                      disabled={salvando}
                      onClick={async () => { if (await executar(() => api.excluirEquipeMembro(m.id))) { onExcluido(m.id); setAExcluir(null); } }}
                    >
                      Excluir
                    </button>
                    <button className="btn-ghost" onClick={() => setAExcluir(null)}>Cancelar</button>
                  </div>
                )}
                <PrimeiroAcesso membro={m} onRecarregar={onRecarregar} />
                {m.papel === "social" ? (
                  <>
                    <div className="equipe-sub">Clientes liberados</div>
                    <SeletorClientes
                      clientes={clientes}
                      selecionados={m.clientesIds}
                      onChange={(ids) => executar(() => api.atualizarEquipeMembro(m.id, { clientesIds: ids }))}
                    />
                  </>
                ) : (
                  <div className="equipe-sub">Para liberar uma demanda, abra a demanda e escolha a pessoa em "Liberar no painel da equipe para".</div>
                )}
              </div>
            );
          })}

          <form className="equipe-card" onSubmit={adicionar}>
            <b>Novo acesso</b>
            <div className="grid2" style={{ marginTop: 10 }}>
              <div className="field">
                <label>Nome</label>
                <input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required />
              </div>
              <div className="field">
                <label>Email de login</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              </div>
            </div>
            <div className="field">
              <label>Papel</label>
              <select value={form.papel} onChange={(e) => setForm({ ...form, papel: e.target.value })}>
                {Object.entries(PAPEIS).map(([k, p]) => <option key={k} value={k}>{p.nome} — {p.resumo}</option>)}
              </select>
            </div>
            {form.papel === "social" && (
              <div className="field">
                <label>Clientes liberados</label>
                <SeletorClientes clientes={clientes} selecionados={form.clientesIds} onChange={(ids) => setForm({ ...form, clientesIds: ids })} />
              </div>
            )}
            <button type="submit" className="btn-primary" style={{ marginLeft: 0 }} disabled={salvando}>Cadastrar acesso</button>
          </form>

          {erro && <p className="config-hint" style={{ color: "var(--red)" }}>{erro}</p>}
        </>
      )}
    </div>
  );
}

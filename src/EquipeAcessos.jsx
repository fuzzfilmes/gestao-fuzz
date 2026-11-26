import React, { useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, Eye, Plus, Trash2, X } from "lucide-react";
import PainelEquipe from "./PainelEquipe.jsx";
import * as api from "./lib/api.js";

// Configurações → Equipe e acessos: um card por pessoa e uma janela pra configurar cada uma.

const PAPEIS = {
  editor: { nome: "Editor", resumo: "Vê as demandas que você atribuir e os clientes delas" },
  social: { nome: "Social media", resumo: "Vê os clientes liberados, monta o cronograma e aprova vídeos" },
};

function Marcadores({ opcoes, selecionados, onChange, vazio }) {
  if (opcoes.length === 0) return <p className="config-hint">{vazio}</p>;
  return (
    <div className="equipe-clientes">
      {opcoes.map((o) => (
        <label key={o.id}>
          <input
            type="checkbox"
            checked={selecionados.includes(o.id)}
            onChange={(e) => onChange(e.target.checked ? [...selecionados, o.id] : selecionados.filter((x) => x !== o.id))}
          />
          <span>{o.nome}{o.detalhe ? <small> · {o.detalhe}</small> : null}</span>
        </label>
      ))}
    </div>
  );
}

// Função da pessoa e o que ela enxerga: clientes (social media) ou demandas (editor).
function FuncaoEAcessos({ valor, onChange, membroId, clientes, demandas, membros }) {
  const opcoesClientes = [...clientes].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")).map((c) => ({ id: c.id, nome: c.nome }));
  const opcoesDemandas = demandas
    .filter((d) => d.status !== "Finalizada" || valor.demandasIds.includes(d.id))
    .map((d) => {
      const outro = d.editorMembroId && d.editorMembroId !== membroId ? membros.find((m) => m.id === d.editorMembroId)?.nome : "";
      return {
        id: d.id,
        nome: d.projeto || "(sem nome)",
        detalhe: [clientes.find((c) => c.id === d.clienteId)?.nome, outro ? "hoje com " + outro : ""].filter(Boolean).join(" · "),
      };
    })
    .sort((a, b) => a.detalhe.localeCompare(b.detalhe, "pt-BR") || a.nome.localeCompare(b.nome, "pt-BR"));

  return (
    <>
      <div className="field">
        <label>Função</label>
        <div className="equipe-funcoes">
          {Object.entries(PAPEIS).map(([id, p]) => (
            <button type="button" key={id} className={valor.papel === id ? "on" : ""} aria-pressed={valor.papel === id} onClick={() => onChange({ ...valor, papel: id })}>
              <b>{p.nome}</b>
              <span>{p.resumo}</span>
            </button>
          ))}
        </div>
      </div>
      {valor.papel === "social" ? (
        <div className="field">
          <label>Clientes liberados · {valor.clientesIds.length}</label>
          <Marcadores opcoes={opcoesClientes} selecionados={valor.clientesIds} onChange={(ids) => onChange({ ...valor, clientesIds: ids })} vazio="Nenhum cliente cadastrado." />
        </div>
      ) : (
        <div className="field">
          <label>Demandas atribuídas · {valor.demandasIds.length}</label>
          <Marcadores opcoes={opcoesDemandas} selecionados={valor.demandasIds} onChange={(ids) => onChange({ ...valor, demandasIds: ids })} vazio="Nenhuma demanda em aberto." />
        </div>
      )}
    </>
  );
}

function mensagemDeErro(e) {
  if (e?.code === "23505") return "Já existe um acesso com esse email.";
  if (e?.code === "42501") return "Não é possível cadastrar o seu próprio email.";
  return "Não consegui salvar. " + (e?.message || "");
}

function situacao(m) {
  if (!m.ativo) return { texto: "Desativado", tom: "off" };
  if (m.acessoCriadoEm) return { texto: "Acesso criado", tom: "ok" };
  if (m.conviteExpira && new Date(m.conviteExpira) > new Date()) return { texto: "Aguardando 1º acesso", tom: "wait" };
  return { texto: "Sem senha ainda", tom: "wait" };
}

function Moldura({ titulo, onFechar, children }) {
  return (
    <div className="overlay" onClick={onFechar}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>
          {titulo}
          <button className="icon-btn" onClick={onFechar}><X size={15} /></button>
        </h3>
        {children}
      </div>
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

// Dados que essa pessoa veria, montados na tela do dono (os mesmos campos que painel_equipe() entrega).
// Nada é gravado.
function dadosDaPrevia(m, { clientes, demandas, status, materiais, notas, agenda }) {
  const visiveis = demandas.filter((d) => (m.papel === "social" ? m.clientesIds.includes(d.clienteId) : d.editorMembroId === m.id));
  const idsClientes = m.papel === "social" ? m.clientesIds : [...new Set(visiveis.map((d) => d.clienteId))];
  return {
    membro: { nome: m.nome, papel: m.papel, ativo: true },
    clientes: clientes
      .filter((c) => idsClientes.includes(c.id))
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
      .map((c) => ({
        ...c,
        contatos: c.contatos || [],
        materiais: materiais.filter((x) => x.clienteId === c.id),
        notas: notas.filter((n) => n.clienteId === c.id).map((n) => ({ ...n, minha: false })),
      })),
    agenda: agenda.filter((i) => idsClientes.includes(i.clienteId)),
    recados: [],
    pessoas: [{ id: "dono", nome: "Fuzz" }],
    status: status.map((x) => ({ nome: x.nome, cor: x.cor })),
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
      retorno: d.retorno,
      retornoPor: d.retornoPor,
      retornoEm: d.retornoEm,
      observacoes: m.papel === "editor" ? d.observacoes : "",
      itens: d.itens || [],
    })),
  };
}

function NovoMembro({ dados, onCriar, onFechar }) {
  const [f, setF] = useState({ nome: "", email: "", papel: "social", clientesIds: [], demandasIds: [] });
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function criar(e) {
    e.preventDefault();
    setErro("");
    setSalvando(true);
    try {
      await onCriar(f);
    } catch (err) {
      console.error("Falha ao criar acesso", err);
      setErro(mensagemDeErro(err));
      setSalvando(false);
    }
  }

  return (
    <Moldura titulo="Novo membro" onFechar={onFechar}>
      <form onSubmit={criar}>
        <div className="grid2">
          <div className="field"><label>Nome</label><input value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} required autoFocus /></div>
          <div className="field"><label>Email de login</label><input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} required /></div>
        </div>
        <FuncaoEAcessos valor={f} onChange={setF} membroId="" {...dados} />
        {erro && <p className="config-hint" style={{ color: "var(--red)" }}>{erro}</p>}
        <div className="modal-actions">
          <button type="button" className="btn-ghost" onClick={onFechar}>Cancelar</button>
          <button type="submit" className="btn-primary" style={{ marginLeft: 0 }} disabled={salvando}>{salvando ? "Criando…" : "Criar e continuar"}</button>
        </div>
      </form>
    </Moldura>
  );
}

const mesmaLista = (a, b) => a.length === b.length && [...a].sort().join() === [...b].sort().join();

function ConfigurarMembro({ membro: m, dados, onSalvar, onAlternarAtivo, onExcluir, onRecarregar, onVerPrevia, onFechar }) {
  const atual = {
    nome: m.nome,
    papel: m.papel,
    clientesIds: m.clientesIds,
    demandasIds: dados.demandas.filter((d) => d.editorMembroId === m.id).map((d) => d.id),
  };
  const [f, setF] = useState(atual);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);
  const [confirmaExcluir, setConfirmaExcluir] = useState(false);
  // Só conta a lista da função escolhida: a outra não é gravada.
  const mudou =
    f.nome !== atual.nome ||
    f.papel !== atual.papel ||
    (f.papel === "social" ? !mesmaLista(f.clientesIds, atual.clientesIds) : !mesmaLista(f.demandasIds, atual.demandasIds));

  async function executar(acao) {
    setErro("");
    setSalvando(true);
    try {
      await acao();
      return true;
    } catch (e) {
      console.error("Falha ao salvar acesso da equipe", e);
      setErro(mensagemDeErro(e));
      return false;
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Moldura titulo={m.nome} onFechar={onFechar}>
      <p className="config-hint" style={{ marginTop: -6 }}>{m.email} · {situacao(m).texto}</p>
      <div className="field"><label>Nome</label><input value={f.nome} onChange={(e) => { setSalvo(false); setF({ ...f, nome: e.target.value }); }} /></div>
      <FuncaoEAcessos valor={f} onChange={(v) => { setSalvo(false); setF(v); }} membroId={m.id} {...dados} />
      <button
        className="btn-primary"
        style={{ marginLeft: 0, width: "100%" }}
        disabled={!mudou || salvando || !f.nome.trim()}
        onClick={async () => { if (await executar(() => onSalvar(m, f))) setSalvo(true); }}
      >
        {salvando ? "Salvando…" : salvo && !mudou ? "Salvo ✓" : "Salvar alterações"}
      </button>

      <div className="field" style={{ marginTop: 16 }}>
        <label>Acesso ao painel</label>
        <PrimeiroAcesso membro={m} onRecarregar={onRecarregar} />
      </div>

      {erro && <p className="config-hint" style={{ color: "var(--red)" }}>{erro}</p>}
      <div className="equipe-rodape">
        <button className="btn-ghost" onClick={() => onVerPrevia(m)} disabled={mudou} title={mudou ? "Salve antes de conferir" : ""}><Eye size={13} /> Ver como essa pessoa vê</button>
        <button className="btn-ghost" disabled={salvando} onClick={() => executar(() => onAlternarAtivo(m))}>{m.ativo ? "Desativar" : "Reativar"}</button>
        <button className="btn-ghost" onClick={() => setConfirmaExcluir(true)}><Trash2 size={13} /> Excluir</button>
      </div>
      {confirmaExcluir && (
        <div className="equipe-confirma">
          <span>Excluir este acesso? O login criado pelo primeiro acesso é apagado, junto com as atribuições e os recados dessa pessoa. Para só bloquear a entrada, use "Desativar".</span>
          <button className="btn-ghost" disabled={salvando} onClick={() => executar(() => onExcluir(m))}>Sim, excluir</button>
          <button className="btn-ghost" onClick={() => setConfirmaExcluir(false)}>Cancelar</button>
        </div>
      )}
    </Moldura>
  );
}

export default function EquipeAcessos({ membros, clientes, demandas, status, materiais, notas, agenda, erroCarga, onRecarregar, onAtribuir, onExcluido, onVoltar }) {
  const [aberto, setAberto] = useState(""); // "" | "novo" | id do membro
  const [previa, setPrevia] = useState(null);
  const dados = { clientes, demandas, membros };
  const membro = membros.find((m) => m.id === aberto);

  async function criar(f) {
    await api.criarEquipeMembro(f);
    const novo = (await api.listEquipeMembros()).find((m) => m.email === f.email.trim().toLowerCase());
    if (novo && f.papel === "editor" && f.demandasIds.length) await onAtribuir(novo.id, novo.nome, f.demandasIds);
    await onRecarregar();
    setAberto(novo?.id || "");
  }

  async function salvar(m, f) {
    await api.atualizarEquipeMembro(m.id, { nome: f.nome, papel: f.papel, clientesIds: f.papel === "social" ? f.clientesIds : [] });
    await onAtribuir(m.id, f.nome.trim(), f.papel === "editor" ? f.demandasIds : []);
    await onRecarregar();
  }

  async function alternarAtivo(m) {
    await api.atualizarEquipeMembro(m.id, { ativo: !m.ativo });
    await onRecarregar();
  }

  async function excluir(m) {
    await api.excluirEquipeMembro(m.id);
    onExcluido(m.id);
    setAberto("");
    await onRecarregar();
  }

  return (
    <div className="config-panel equipe-painel">
      <button className="config-back" onClick={onVoltar}><ChevronLeft size={14} /> Voltar</button>
      <h3 className="config-section-title">Equipe e acessos</h3>
      <p className="config-hint">Clique em uma pessoa para definir a função, o que ela vê e o acesso. Ninguém da equipe vê financeiro, propostas ou contratos.</p>

      {erroCarga ? (
        <p className="config-hint" style={{ color: "var(--amber)" }}>Não consegui carregar a equipe ({erroCarga}). Confira a internet e recarregue a página.</p>
      ) : (
        <div className="equipe-grade">
          {membros.map((m) => {
            const st = situacao(m);
            const n = m.papel === "social" ? m.clientesIds.length : demandas.filter((d) => d.editorMembroId === m.id).length;
            const unidade = m.papel === "social" ? (n === 1 ? "cliente" : "clientes") : n === 1 ? "demanda" : "demandas";
            return (
              <button key={m.id} className={"equipe-membro" + (m.ativo ? "" : " off")} onClick={() => setAberto(m.id)}>
                <span className="equipe-avatar">{(m.nome.trim()[0] || "?").toUpperCase()}</span>
                <b>{m.nome}</b>
                <span className="badge badge-neutral">{PAPEIS[m.papel].nome}</span>
                <span className="equipe-resumo">{n} {unidade}</span>
                <span className={"equipe-situacao " + st.tom}><i />{st.texto}</span>
              </button>
            );
          })}
          <button className="equipe-membro novo" onClick={() => setAberto("novo")}>
            <span className="equipe-avatar"><Plus size={20} /></span>
            <b>Novo membro</b>
          </button>
        </div>
      )}

      {aberto === "novo" && <NovoMembro dados={dados} onCriar={criar} onFechar={() => setAberto("")} />}
      {membro && (
        <ConfigurarMembro
          key={membro.id}
          membro={membro}
          dados={dados}
          onSalvar={salvar}
          onAlternarAtivo={alternarAtivo}
          onExcluir={excluir}
          onRecarregar={onRecarregar}
          onVerPrevia={(m) => setPrevia(dadosDaPrevia(m, { clientes, demandas, status, materiais, notas, agenda }))}
          onFechar={() => setAberto("")}
        />
      )}
      {previa &&
        createPortal(
          <div className="eq-previa" style={{ position: "fixed", inset: 0, zIndex: 1000, overflowY: "auto", background: "#0A0B0D", padding: "16px", display: "flex", justifyContent: "center", alignItems: "flex-start" }}>
            <style>{".eq-previa > div.app { width: 100%; max-width: 1400px; height: max-content; }"}</style>
            <PainelEquipe dados={previa} onAtualizar={async () => {}} onFecharPrevia={() => setPrevia(null)} />
          </div>,
          document.body
        )}
    </div>
  );
}

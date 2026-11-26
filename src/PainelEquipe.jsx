import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Calendar, Check, CheckCircle2, ChevronLeft, ChevronRight, DollarSign, ExternalLink, Eye, Film, GripVertical, LayoutGrid, Lock, LogOut, MessageCircle, NotebookText, Pencil, Plus, RefreshCw, Search, StickyNote, Trash2, X } from "lucide-react";
import { supabase } from "./lib/supabaseClient.js";
import * as api from "./lib/api.js";
import { unidadesDoTrabalho, getUrgencia, videoProgress, statsDeProducao, videosComStatus, TONE_CLASS, STATUS_AGUARDANDO, STATUS_ALTERACAO } from "./lib/trabalhos.js";
import Retorno from "./equipe/Retorno.jsx";
import { APP_CSS } from "./appStyle.js";
import { CSS_EQUIPE } from "./equipe/estilo.js";
import { MENU } from "./equipe/menu.js";
import Calendario from "./equipe/Calendario.jsx";
import AvisosCronograma from "./equipe/Avisos.jsx";
import Recados, { Recado, recadosNaoLidos } from "./equipe/Recados.jsx";
import Janela from "./equipe/Janela.jsx";
import { AlternarVisao, ListaClientes } from "./equipe/Clientes.jsx";
import FichaClienteEquipe from "./equipe/ClienteEquipe.jsx";
import { dataCurta, hojeISO, linkSeguro } from "./equipe/util.js";
import fuzzLogo from "./assets/fuzz-logo.png";

// Tela de quem é da equipe: o mesmo layout do painel do dono, com o que não foi
// liberado visível e bloqueado. Os dados chegam prontos e já filtrados pela função
// painel_equipe() do banco, e tudo que a equipe grava passa pelas funções equipe_*,
// que conferem a permissão. O bloqueio dos botões aqui é só visual.

const BLOQUEADO = "Não liberado para o seu acesso";
const PAPEL_NOME = { editor: "Editor", social: "Social media" };

// Na pré-visualização do dono nada é gravado.
function recusarNaPrevia() {
  return Promise.reject(new Error("Na pré-visualização nada é salvo."));
}

const dataCompleta = (iso) => (iso ? iso.split("-").reverse().join("/") : "—");

function CartaoBloqueado({ icone: Icone, titulo }) {
  return (
    <div className="home-card eq-bloqueado" title={BLOQUEADO}>
      <h4><Icone size={14} /> {titulo}</h4>
      <div className="home-card-empty"><Lock size={11} /> {BLOQUEADO}</div>
    </div>
  );
}

export default function PainelEquipe({ dados, onAtualizar, onFecharPrevia }) {
  const { membro, status, trabalhos, clientes = [], agenda = [], recados = [], pessoas = [] } = dados;
  const ehSocial = membro.papel === "social";
  const [aba, setAba] = useState("inicio");
  const [menuRecolhido, setMenuRecolhido] = useState(false);
  const [visaoClientes, setVisaoClientes] = useState("grade");
  const [clienteAberto, setClienteAberto] = useState("");
  const [demandaAberta, setDemandaAberta] = useState("");
  const [atualizando, setAtualizando] = useState(false);
  const [focoDemandas, setFocoDemandas] = useState([]); // demandas que devem abrir já expandidas
  const [resposta, setResposta] = useState(null); // { alvo, decisao }

  // Mantém tudo em dia sem a pessoa precisar recarregar.
  useEffect(() => {
    if (onFecharPrevia) return undefined;
    const timer = setInterval(onAtualizar, 60000);
    window.addEventListener("focus", onAtualizar);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", onAtualizar);
    };
  }, [onAtualizar, onFecharPrevia]);

  async function atualizar() {
    setAtualizando(true);
    await onAtualizar();
    setAtualizando(false);
  }

  const gravar = (fn) =>
    onFecharPrevia
      ? recusarNaPrevia
      : async (arg) => {
          await fn(arg);
          await onAtualizar();
        };
  const acoes = {
    salvarAgenda: gravar(api.equipeSalvarAgenda),
    excluirAgenda: gravar(api.equipeExcluirAgenda),
    salvarNota: gravar(api.equipeSalvarNota),
    excluirNota: gravar(api.equipeExcluirNota),
    enviarRecado: gravar(api.equipeEnviarRecado),
    marcarLido: gravar(api.marcarRecadoLido),
    responderVideo: gravar(api.equipeResponderVideo),
  };

  // O que pede ação de quem está logado: a social aprova; quem edita faz as alterações.
  const paraAprovar = useMemo(() => videosComStatus(trabalhos, [STATUS_AGUARDANDO]), [trabalhos]);
  const emAlteracao = useMemo(() => videosComStatus(trabalhos, [STATUS_ALTERACAO]), [trabalhos]);
  const pendentes = ehSocial ? paraAprovar : emAlteracao;
  const textoPendentes =
    pendentes.length === 1
      ? ehSocial ? "1 vídeo aguardando a sua aprovação." : "1 vídeo com alteração solicitada."
      : pendentes.length + (ehSocial ? " vídeos aguardando a sua aprovação." : " vídeos com alteração solicitada.");

  function irParaVideos(lista) {
    setFocoDemandas([...new Set(lista.map((v) => v.demanda.id))]);
    setAba("demandas");
  }

  const naoLidos = recadosNaoLidos(recados);
  const stats = useMemo(() => statsDeProducao(trabalhos), [trabalhos]);
  const cliente = clientes.find((c) => c.id === clienteAberto);
  const demanda = trabalhos.find((d) => d.id === demandaAberta);
  const corStatus = (nome) => status.find((s) => s.nome === nome)?.cor || "#8a8f98";
  const entregasHoje = trabalhos.filter((d) => unidadesDoTrabalho(d).some((u) => u.prazo === hojeISO() && u.status !== "Finalizada"));
  const liberado = (item) => membro.ativo && item.equipe?.includes(membro.papel);

  const marcarLido = (id) => acoes.marcarLido(id).catch((e) => window.alert(e.message));

  return (
    <div className="app">
      <style>{APP_CSS + CSS_EQUIPE + CSS}</style>
      <div className="shell">
        <div className={"rail" + (menuRecolhido ? " collapsed" : "")}>
          <div className="brand-block">
            <img src={fuzzLogo} alt="fuzz" className="brand-logo-img" />
          </div>
          <button className="rail-collapse-btn" onClick={() => setMenuRecolhido(!menuRecolhido)} title={menuRecolhido ? "Expandir menu" : "Recolher menu"}>
            {menuRecolhido ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
          {MENU.map((item) => {
            if (item.divisor) return <div className="rail-divider" key={item.divisor} />;
            const ok = liberado(item);
            return (
              <button
                key={item.id}
                className={"rail-btn" + (ok ? (aba === item.id ? " active" : "") : " disabled")}
                disabled={!ok}
                title={ok ? item.nome : item.nome + " — " + BLOQUEADO}
                onClick={() => setAba(item.id)}
              >
                <item.Icone size={16} /> <span className="rail-label">{item.nome}</span>
                {!ok && <Lock size={11} className="eq-cadeado" />}
                {ok && item.id === "recados" && naoLidos.length > 0 && <span className="rail-tag rail-tag-alert">{naoLidos.length}</span>}
                {ok && item.id === "demandas" && pendentes.length > 0 && <span className="rail-tag rail-tag-alert">{pendentes.length}</span>}
              </button>
            );
          })}
        </div>

        <div className="right-col">
          <div className="topbar">
            <div>
              <p className="slate-title">Painel de Gestão</p>
              <p className="eq-quem">{membro.nome} · {PAPEL_NOME[membro.papel]}</p>
            </div>
            <div className="topbar-icons">
              <button className="icon-circle" disabled title={"Mostrar valores — " + BLOQUEADO}><Eye size={16} /></button>
              {onFecharPrevia ? (
                <button className="btn-ghost" onClick={onFecharPrevia}><X size={14} /> Fechar prévia</button>
              ) : (
                <>
                  <button className="icon-circle" title="Atualizar" onClick={atualizar} disabled={atualizando}><RefreshCw size={16} /></button>
                  <button className="icon-circle" title="Sair" onClick={() => supabase.auth.signOut()}><LogOut size={16} /></button>
                </>
              )}
              <button className="icon-circle" disabled title={"Buscar — " + BLOQUEADO}><Search size={16} /></button>
            </div>
          </div>

          <div className="slate">
            {membro.ativo && (pendentes.length > 0 || (naoLidos.length > 0 && aba !== "recados")) && (
              <div className="notifications-row">
                {pendentes.length > 0 && (
                  <div className="followup-banner tone-urgent">
                    <AlertTriangle size={13} />
                    <span>{textoPendentes}</span>
                    <button className="followup-link" onClick={() => irParaVideos(pendentes)}>Ver vídeos</button>
                  </div>
                )}
                {naoLidos.length > 0 && aba !== "recados" && (
                  <div className="followup-banner tone-wait">
                    <AlertTriangle size={13} />
                    <span>{naoLidos.length === 1 ? "Você tem 1 recado novo." : "Você tem " + naoLidos.length + " recados novos."}</span>
                    <button className="followup-link" onClick={() => setAba("recados")}>Ver recados</button>
                  </div>
                )}
              </div>
            )}
            <div className="stats-row">
              <div className="stat"><div className="n">{stats.emAndamento}</div><div className="l">em andamento</div></div>
              <div className="stat warn"><div className="n">{stats.atrasado}</div><div className="l">atrasadas</div></div>
              <div className="stat wait"><div className="n">{stats.aguardando}</div><div className="l">aguard. cliente</div></div>
            </div>
            <div className="slate-stripe" />
          </div>

          <div className="main">
            {!membro.ativo ? (
              <div className="empty">Seu acesso está desativado. Fale com a Fuzz para reativar.</div>
            ) : aba === "inicio" ? (
              <div className="home-grid">
                <div className="home-left">
                  <h2 className="home-greeting">Bom trabalho, {membro.nome.split(" ")[0]}</h2>
                  <p className="home-date">{new Date(hojeISO() + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}</p>
                  <div className="home-quick-stats">
                    <div className="stat warn"><div className="n">{stats.atrasado}</div><div className="l">demandas atrasadas</div></div>
                    <div className="stat wait"><div className="n">{stats.aguardando}</div><div className="l">aguardando cliente</div></div>
                    <div className="stat ready"><div className="n">{naoLidos.length}</div><div className="l">recados novos</div></div>
                  </div>
                  <div className="home-quick-actions">
                    {["Nova demanda", "Novo cliente", "Nova despesa", "Nota de reunião"].map((nome) => (
                      <button key={nome} className="btn-ghost" disabled title={nome === "Nota de reunião" && ehSocial ? "Abra o cliente para criar a nota" : BLOQUEADO}><Plus size={14} />{nome}</button>
                    ))}
                  </div>
                </div>
                <div className="home-right">
                  <div className="home-card">
                    <h4><CheckCircle2 size={14} /> {ehSocial ? "Vídeos para aprovar" : "Alterações para fazer"}{pendentes.length > 0 ? " · " + pendentes.length : ""}</h4>
                    {pendentes.length === 0 && <div className="home-card-empty">{ehSocial ? "Nenhum vídeo aguardando aprovação." : "Nenhuma alteração solicitada."}</div>}
                    {pendentes.map((v) => (
                      <div key={v.demanda.id + v.itemId} className="home-row" onClick={() => irParaVideos([v])}>
                        <span className="home-row-dot tone-urgent" />
                        <span className="home-row-title">{v.nome}</span>
                        <span className="home-row-sub">{[v.demanda.clienteNome, v.itemId ? v.demanda.projeto : ""].filter(Boolean).join(" · ")}</span>
                      </div>
                    ))}
                    {ehSocial && emAlteracao.length > 0 && (
                      <button className="btn-ghost" style={{ width: "100%", marginTop: 8 }} onClick={() => irParaVideos(emAlteracao)}>
                        {emAlteracao.length} em alteração
                      </button>
                    )}
                  </div>
                  <div className="home-card">
                    <h4><Calendar size={14} /> Cronograma dos clientes</h4>
                    <AvisosCronograma itens={agenda} clientes={clientes} onAbrir={() => setAba("cronograma")} />
                    <button className="btn-ghost" style={{ width: "100%", marginTop: 8 }} onClick={() => setAba("cronograma")}>Abrir cronograma</button>
                  </div>
                  <div className="home-card">
                    <h4><MessageCircle size={14} /> Recados{naoLidos.length > 0 ? " · " + naoLidos.length + (naoLidos.length === 1 ? " novo" : " novos") : ""}</h4>
                    <div className="tm">
                      {naoLidos.slice(0, 3).map((r) => <Recado key={r.id} r={r} onLido={marcarLido} />)}
                      {naoLidos.length === 0 && <div className="home-card-empty">Nenhum recado novo.</div>}
                    </div>
                    <button className="btn-ghost" style={{ width: "100%", marginTop: 8 }} onClick={() => setAba("recados")}>Escrever / ver todos</button>
                  </div>
                  <div className="home-card">
                    <h4><Film size={14} /> Entregas de hoje</h4>
                    {entregasHoje.length === 0 ? (
                      <div className="home-card-empty">Nenhuma entrega marcada para hoje.</div>
                    ) : (
                      entregasHoje.map((d) => (
                        <div key={d.id} className="home-row" onClick={() => setDemandaAberta(d.id)}>
                          <span className={"home-row-dot tone-" + getUrgencia(d).tone} />
                          <span className="home-row-title">{d.projeto}</span>
                          <span className="home-row-sub">{d.clienteNome}</span>
                        </div>
                      ))
                    )}
                  </div>
                  <CartaoBloqueado icone={Calendar} titulo="Compromissos de hoje" />
                  <CartaoBloqueado icone={DollarSign} titulo="Pagamentos de hoje" />
                  <CartaoBloqueado icone={LayoutGrid} titulo="Kanban de hoje" />
                  <CartaoBloqueado icone={StickyNote} titulo="Nota rápida" />
                </div>
              </div>
            ) : aba === "clientes" ? (
              <>
                <div className="toolbar">
                  <AlternarVisao visao={visaoClientes} onMudar={setVisaoClientes} />
                  <button className="btn-primary" disabled title={BLOQUEADO}><Plus size={15} /> Novo cliente</button>
                </div>
                {clientes.length === 0 ? (
                  <div className="empty">Nenhum cliente foi liberado para você ainda.</div>
                ) : (
                  <ListaClientes
                    clientes={clientes}
                    visao={visaoClientes}
                    totalDemandas={(id) => trabalhos.filter((d) => d.clienteId === id).length}
                    onAbrir={(c) => setClienteAberto(c.id)}
                    acoesDaLinha={() => (
                      <div className="row-actions">
                        <button className="icon-btn" disabled title={BLOQUEADO}><Pencil size={13} /></button>
                        <button className="icon-btn" disabled title={BLOQUEADO}><Trash2 size={13} /></button>
                      </div>
                    )}
                  />
                )}
              </>
            ) : aba === "demandas" ? (
              <Demandas
                trabalhos={trabalhos}
                corStatus={corStatus}
                onAbrir={setDemandaAberta}
                foco={focoDemandas}
                ehSocial={ehSocial}
                onResponder={(alvo, decisao) => setResposta({ alvo, decisao })}
              />
            ) : aba === "cronograma" ? (
              <Calendario itens={agenda} clientes={clientes} podeEditar={ehSocial} onSalvar={acoes.salvarAgenda} onExcluir={acoes.excluirAgenda} />
            ) : aba === "recados" ? (
              <div style={{ maxWidth: 720 }}>
                <Recados recados={recados} pessoas={pessoas} clientes={clientes} onEnviar={acoes.enviarRecado} onLido={acoes.marcarLido} />
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {cliente && (
        <FichaClienteEquipe
          cliente={cliente}
          agenda={agenda.filter((i) => i.clienteId === cliente.id)}
          ehSocial={ehSocial}
          acoes={acoes}
          onFechar={() => setClienteAberto("")}
        />
      )}

      {demanda && <DetalheDemanda d={demanda} corStatus={corStatus} onFechar={() => setDemandaAberta("")} />}

      {resposta && <ResponderVideo {...resposta} onEnviar={acoes.responderVideo} onFechar={() => setResposta(null)} />}
    </div>
  );
}

function SeloStatus({ nome, cor }) {
  return <span className="demand-status-select eq-selo" style={{ borderLeft: "3px solid " + cor }}>{nome || "Sem status"}</span>;
}

// Mesma tabela do painel do dono, sem edição.
function Demandas({ trabalhos, corStatus, onAbrir, foco, ehSocial, onResponder }) {
  const [busca, setBusca] = useState("");
  const [mostrarFinalizadas, setMostrarFinalizadas] = useState(false);
  const [mostrarVideos, setMostrarVideos] = useState(false);
  const [expandidas, setExpandidas] = useState(() => new Set(foco));
  useEffect(() => {
    if (foco.length) setExpandidas((atual) => new Set([...atual, ...foco]));
  }, [foco]);
  const lista = trabalhos.filter(
    (d) =>
      (mostrarFinalizadas || getUrgencia(d).tone !== "done") &&
      (d.projeto + " " + d.clienteNome).toLowerCase().includes(busca.trim().toLowerCase())
  );
  const alternar = (id) => {
    const novo = new Set(expandidas);
    if (!novo.delete(id)) novo.add(id);
    setExpandidas(novo);
  };

  return (
    <>
      <div className="toolbar">
        <input placeholder="Buscar projeto…" value={busca} onChange={(e) => setBusca(e.target.value)} />
        <button className="btn-primary" disabled title={BLOQUEADO}><Plus size={15} /> Nova demanda</button>
      </div>
      <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "var(--text-dim)", margin: "-6px 0 6px" }}>
        <input type="checkbox" checked={mostrarFinalizadas} onChange={(e) => setMostrarFinalizadas(e.target.checked)} />
        Mostrar demandas finalizadas
      </label>
      <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "var(--text-dim)", margin: "0 0 12px" }}>
        <input type="checkbox" checked={mostrarVideos} onChange={(e) => setMostrarVideos(e.target.checked)} />
        Mostrar vídeos finalizados
      </label>
      {lista.length === 0 ? (
        <div className="empty">{trabalhos.length === 0 ? "Nenhuma demanda foi liberada para você ainda." : "Nenhuma demanda para mostrar."}</div>
      ) : (
        <div className="table-scroll"><table>
          <thead>
            <tr>
              <th style={{ width: 22 }}></th>
              <th style={{ width: 30 }}></th>
              <th>Projeto</th>
              <th>Cliente</th>
              <th>Status</th>
              <th>Urgência</th>
              <th>Entrega</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {lista.map((d) => {
              const urg = getUrgencia(d);
              const prog = videoProgress(d);
              const aberta = expandidas.has(d.id);
              const link = linkSeguro(d.link);
              // Demanda sem lista de vídeos que espera resposta também abre, com uma linha própria.
              const semVideos = !prog && videosComStatus([d], [STATUS_AGUARDANDO, STATUS_ALTERACAO]).length > 0;
              const podeAbrir = !!prog || semVideos || !!d.retornoEm;
              const linhas = prog
                ? d.itens.map((v, i) => ({ id: v.id, itemId: v.id, nome: v.nome || "Vídeo " + (i + 1), status: v.status, prazo: v.dataEntrega || d.dataEntrega, link: v.link, retorno: v.retorno, retornoPor: v.retornoPor, retornoEm: v.retornoEm }))
                : [{ id: d.id, itemId: "", nome: d.projeto, status: d.status, prazo: d.dataEntrega, link: "", retorno: d.retorno, retornoPor: d.retornoPor, retornoEm: d.retornoEm }];
              return (
                <React.Fragment key={d.id}>
                  <tr className={podeAbrir ? "clickable-row" : ""} onClick={() => podeAbrir && alternar(d.id)}>
                    <td><span className="demand-drag-handle disabled" title={BLOQUEADO}><GripVertical size={14} /></span></td>
                    <td>{podeAbrir && <span className="expand-btn" title="Ver vídeos">{aberta ? "▾" : "▸"}</span>}</td>
                    <td className="proj">
                      {d.projeto || "(sem nome)"}
                      {prog && <span className="badge badge-neutral" style={{ marginLeft: 8, fontWeight: 500 }}>{prog.done}/{prog.total} vídeos</span>}
                    </td>
                    <td>{d.clienteNome || "—"}</td>
                    <td><SeloStatus nome={d.status} cor={corStatus(d.status)} /></td>
                    <td><span className={"badge " + TONE_CLASS[urg.tone]}>{urg.label}</span></td>
                    <td className="mono">{dataCompleta(d.dataEntrega)}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="row-actions">
                        {link && <a className="icon-btn" href={link} target="_blank" rel="noopener noreferrer" title="Abrir link"><ExternalLink size={13} /></a>}
                        <button className="icon-btn" title="Ver detalhes" onClick={() => onAbrir(d.id)}><Eye size={13} /></button>
                        <button className="icon-btn" disabled title={"Excluir — " + BLOQUEADO}><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                  {aberta && podeAbrir && (
                    <tr className="video-subrow">
                      <td colSpan={8}>
                        <div className="video-sublist">
                          {linhas.map((v) => {
                            if (prog && v.status === "Finalizada" && !mostrarVideos) return null;
                            const linkVideo = linkSeguro(v.link);
                            const respondivel =
                              ehSocial && d.status !== "Finalizada" && d.status !== "Standby" && (v.status === STATUS_AGUARDANDO || v.status === STATUS_ALTERACAO);
                            const alvo = { demandaId: d.id, itemId: v.itemId, nome: v.nome };
                            return (
                              <div key={v.id} className="video-subrow-item" style={{ background: `color-mix(in srgb, ${corStatus(v.status)} 14%, transparent)` }}>
                                <span className="demand-drag-handle disabled" title={BLOQUEADO}><GripVertical size={14} /></span>
                                <span className="video-subrow-name">{v.nome}</span>
                                {linkVideo && (
                                  <a className="btn-ghost eq-acao" href={linkVideo} target="_blank" rel="noopener noreferrer"><ExternalLink size={12} /> Abrir vídeo</a>
                                )}
                                <span className="mono">{v.prazo ? dataCurta(v.prazo) : "sem prazo"}</span>
                                <SeloStatus nome={v.status} cor={corStatus(v.status)} />
                                {respondivel && (
                                  <span className="eq-respostas">
                                    <button className="btn-ghost eq-acao ok" onClick={() => onResponder(alvo, "aprovar")}><Check size={12} /> Aprovar</button>
                                    <button className="btn-ghost eq-acao ajuste" onClick={() => onResponder(alvo, "alterar")}><Pencil size={12} /> Pedir alteração</button>
                                  </span>
                                )}
                                <Retorno status={v.status} retorno={v.retorno} retornoPor={v.retornoPor} retornoEm={v.retornoEm} />
                              </div>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table></div>
      )}
    </>
  );
}

function DetalheDemanda({ d, corStatus, onFechar }) {
  const link = linkSeguro(d.link);
  const linhas = [
    ["Cliente", d.clienteNome],
    ["Tipo de produção", d.tipo],
    ["Editor", d.editor],
    ["Data de entrega", dataCompleta(d.dataEntrega)],
    ["Enviado p/ aprovação em", dataCompleta(d.dataEnvioAprovacao)],
    ["Data de aprovação do cliente", dataCompleta(d.dataAprovacao)],
    ["Observações", d.observacoes],
  ].filter(([, v]) => v && v !== "—");
  return (
    <Janela titulo={d.projeto || "Demanda"} onFechar={onFechar}>
      <p style={{ marginBottom: 12 }}><span className="tm-ponto" style={{ background: corStatus(d.status), marginRight: 6 }} />{d.status}</p>
      {linhas.map(([rotulo, valor]) => (
        <div className="tm-campo" key={rotulo}><span>{rotulo}</span><p className="tm-texto">{valor}</p></div>
      ))}
      {(d.itens || []).length > 0 && (
        <div className="tm-campo">
          <span>Vídeos</span>
          {d.itens.map((v, i) => (
            <p className="tm-texto" key={v.id}>{v.nome || "Vídeo " + (i + 1)} — {v.status}</p>
          ))}
        </div>
      )}
      {link && <div className="tm-acoes"><a className="tm-btn forte" href={link} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} /> Abrir link</a></div>}
    </Janela>
  );
}

function ResponderVideo({ alvo, decisao, onEnviar, onFechar }) {
  const [comentario, setComentario] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const aprovar = decisao === "aprovar";

  async function enviar(e) {
    e.preventDefault();
    if (!aprovar && !comentario.trim()) return;
    setErro("");
    setEnviando(true);
    try {
      await onEnviar({ demandaId: alvo.demandaId, itemId: alvo.itemId, decisao, comentario: comentario.trim() });
      onFechar();
    } catch (err) {
      console.error("Falha ao responder o vídeo", err);
      setErro(err?.message || "Não consegui enviar.");
      setEnviando(false);
    }
  }

  return (
    <Janela titulo={(aprovar ? "Aprovar: " : "Pedir alteração: ") + alvo.nome} onFechar={onFechar}>
      <form onSubmit={enviar}>
        <label className="tm-campo">
          <span>{aprovar ? "Comentário (opcional)" : "O que precisa mudar"}</span>
          <textarea style={{ minHeight: 120 }} value={comentario} maxLength={2000} onChange={(e) => setComentario(e.target.value)} autoFocus required={!aprovar} />
        </label>
        <p className="tm-linha-sub">A Fuzz e quem edita recebem um aviso.</p>
        {erro && <p className="tm-erro">{erro}</p>}
        <div className="tm-acoes">
          <button type="button" className="tm-btn" onClick={onFechar}>Cancelar</button>
          <button type="submit" className="tm-btn forte" disabled={enviando || (!aprovar && !comentario.trim())}>
            {enviando ? "Enviando…" : aprovar ? "Confirmar aprovação" : "Enviar pedido"}
          </button>
        </div>
      </form>
    </Janela>
  );
}

const CSS = `
  .app .video-subrow-item .eq-acao { padding: 5px 10px; font-size: 12px; display: inline-flex; align-items: center; gap: 5px; text-decoration: none; }
  .app .eq-respostas { display: inline-flex; gap: 6px; flex-wrap: wrap; }
  .app .video-subrow-item .eq-acao.ok { border-color: #2f7a63; color: #7fdcbe; }
  .app .video-subrow-item .eq-acao.ajuste { border-color: #8a4046; color: #ff9c93; }
  .app .eq-cadeado { margin-left: auto; opacity: 0.8; }
  .app .rail.collapsed .eq-cadeado { position: absolute; right: 3px; bottom: 3px; width: 9px; height: 9px; }
  .app button:disabled { cursor: default; }
  .app .btn-primary:disabled, .app .btn-ghost:disabled, .app .icon-btn:disabled, .app .icon-circle:disabled { opacity: 0.38; box-shadow: none; transform: none; filter: grayscale(1); }
  .app .eq-quem { margin: 2px 0 0; font-size: 12.5px; color: var(--text-dim); }
  .app .eq-bloqueado { opacity: 0.45; }
  .app .eq-selo { display: inline-block; white-space: nowrap; }
`;

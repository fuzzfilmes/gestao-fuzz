import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Calendar, ChevronLeft, ChevronRight, DollarSign, ExternalLink, Eye, Film, GripVertical, LayoutGrid, Lock, LogOut, MessageCircle, NotebookText, Pencil, Plus, RefreshCw, Search, StickyNote, Trash2, X } from "lucide-react";
import { supabase } from "./lib/supabaseClient.js";
import * as api from "./lib/api.js";
import { unidadesDoTrabalho, getUrgencia, videoProgress, statsDeProducao, TONE_CLASS } from "./lib/trabalhos.js";
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
  };

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
            {naoLidos.length > 0 && aba !== "recados" && (
              <div className="notifications-row">
                <div className="followup-banner tone-wait">
                  <AlertTriangle size={13} />
                  <span>{naoLidos.length === 1 ? "Você tem 1 recado novo." : "Você tem " + naoLidos.length + " recados novos."}</span>
                  <button className="followup-link" onClick={() => setAba("recados")}>Ver recados</button>
                </div>
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
              <Demandas trabalhos={trabalhos} corStatus={corStatus} onAbrir={setDemandaAberta} />
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
    </div>
  );
}

function SeloStatus({ nome, cor }) {
  return <span className="demand-status-select eq-selo" style={{ borderLeft: "3px solid " + cor }}>{nome || "Sem status"}</span>;
}

// Mesma tabela do painel do dono, sem edição.
function Demandas({ trabalhos, corStatus, onAbrir }) {
  const [busca, setBusca] = useState("");
  const [mostrarFinalizadas, setMostrarFinalizadas] = useState(false);
  const [mostrarVideos, setMostrarVideos] = useState(false);
  const [expandidas, setExpandidas] = useState(() => new Set());
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
              return (
                <React.Fragment key={d.id}>
                  <tr className={prog ? "clickable-row" : ""} onClick={() => prog && alternar(d.id)}>
                    <td><span className="demand-drag-handle disabled" title={BLOQUEADO}><GripVertical size={14} /></span></td>
                    <td>{prog && <span className="expand-btn" title="Ver vídeos">{aberta ? "▾" : "▸"}</span>}</td>
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
                  {aberta && prog && (
                    <tr className="video-subrow">
                      <td colSpan={8}>
                        <div className="video-sublist">
                          {d.itens.map((v, idx) => {
                            if (v.status === "Finalizada" && !mostrarVideos) return null;
                            const unidade = unidadesDoTrabalho(d)[idx];
                            return (
                              <div key={v.id} className="video-subrow-item">
                                <span className="demand-drag-handle disabled" title={BLOQUEADO}><GripVertical size={14} /></span>
                                <span className="video-subrow-name">{v.nome || "Vídeo " + (idx + 1)}</span>
                                <span className="mono">{unidade.prazo ? dataCurta(unidade.prazo) : "sem prazo"}</span>
                                <SeloStatus nome={unidade.status} cor={corStatus(unidade.status)} />
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
            <p className="tm-texto" key={v.id}>{v.nome || "Vídeo " + (i + 1)} — {unidadesDoTrabalho(d)[i].status}</p>
          ))}
        </div>
      )}
      {link && <div className="tm-acoes"><a className="tm-btn forte" href={link} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} /> Abrir link</a></div>}
    </Janela>
  );
}

const CSS = `
  .app .eq-cadeado { margin-left: auto; opacity: 0.8; }
  .app .rail.collapsed .eq-cadeado { position: absolute; right: 3px; bottom: 3px; width: 9px; height: 9px; }
  .app button:disabled { cursor: default; }
  .app .btn-primary:disabled, .app .btn-ghost:disabled, .app .icon-btn:disabled, .app .icon-circle:disabled { opacity: 0.38; box-shadow: none; transform: none; filter: grayscale(1); }
  .app .eq-quem { margin: 2px 0 0; font-size: 12.5px; color: var(--text-dim); }
  .app .eq-bloqueado { opacity: 0.45; }
  .app .eq-selo { display: inline-block; white-space: nowrap; }
`;

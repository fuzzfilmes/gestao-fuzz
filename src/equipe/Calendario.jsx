import React, { useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ExternalLink, Plus } from "lucide-react";
import Janela from "./Janela.jsx";
import { CSS_EQUIPE } from "./estilo.js";
import { TIPOS_AGENDA, MESES, nomeStatusAgenda, isoDe, hojeISO, dataCurta, linkSeguro } from "./util.js";

const SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const POR_DIA = 3; // quantos itens aparecem dentro do dia antes do "+ mais"

const novoItem = (clienteId, data) => ({ id: "", clienteId, tipo: "postagem", titulo: "", data, hora: "", rede: "", descricao: "", link: "", status: "planejado" });

// Cronograma mensal de postagens, gravações e reuniões.
//  itens       lista de itens do cronograma
//  clientes    [{id, nome}] disponíveis
//  clienteId   quando informado, mostra só esse cliente
//  podeEditar  libera criar, alterar e excluir
export default function Calendario({ itens, clientes: listaClientes, clienteId, podeEditar, onSalvar, onExcluir }) {
  const clientes = [...listaClientes].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  const [mes, setMes] = useState(hojeISO().slice(0, 7));
  const [ocultos, setOcultos] = useState([]);
  const [filtroCliente, setFiltroCliente] = useState("");
  const [aberto, setAberto] = useState(null);
  const [diaAberto, setDiaAberto] = useState("");
  const grade = useRef(null);

  const hoje = hojeISO();
  const [ano, m] = mes.split("-").map(Number);
  const nomeCliente = (id) => clientes.find((c) => c.id === id)?.nome || "";
  const clienteAtivo = clienteId || filtroCliente;

  const visiveis = itens
    .filter((i) => (!clienteAtivo || i.clienteId === clienteAtivo) && !ocultos.includes(i.tipo))
    .sort((a, b) => (a.data + (a.hora || "")).localeCompare(b.data + (b.hora || "")));
  const porDia = {};
  visiveis.forEach((i) => (porDia[i.data] = porDia[i.data] || []).push(i));

  // Semanas completas, começando no domingo.
  const inicio = new Date(ano, m - 1, 1 - new Date(ano, m - 1, 1).getDay());
  const totalCelulas = Math.ceil((new Date(ano, m - 1, 1).getDay() + new Date(ano, m, 0).getDate()) / 7) * 7;
  const dias = Array.from({ length: totalCelulas }, (_, i) => isoDe(new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + i)));

  const mudarMes = (n) => setMes(isoDe(new Date(ano, m - 1 + n, 1)).slice(0, 7));
  const dataPadrao = hoje.startsWith(mes) ? hoje : mes + "-01";
  const podeCriar = podeEditar && clientes.length > 0;
  const criar = (data) => { setDiaAberto(""); setAberto(novoItem(clienteId || filtroCliente || (clientes.length === 1 ? clientes[0].id : ""), data)); };
  const abrirItem = (i) => { setDiaAberto(""); setAberto(i); };
  // Em tela estreita os dias ficam pequenos: o toque abre a lista do dia.
  const compacto = () => (grade.current?.clientWidth || 0) < 620;
  function clicarDia(d) {
    if (compacto()) {
      if (porDia[d] || podeCriar) setDiaAberto(d);
    } else if (podeCriar) criar(d);
    else if (porDia[d]) setDiaAberto(d);
  }

  const rotulo = (i) => [i.hora, i.titulo, !clienteAtivo ? nomeCliente(i.clienteId) : ""].filter(Boolean).join(" · ");

  return (
    <div className="tm tm-cal">
      <style>{CSS_EQUIPE}</style>
      <div className="tm-cal-topo">
        <div className="tm-cal-mes">
          <button className="tm-btn" onClick={() => mudarMes(-1)} aria-label="Mês anterior"><ChevronLeft size={14} /></button>
          <h3>{MESES[m - 1]} {ano}</h3>
          <button className="tm-btn" onClick={() => mudarMes(1)} aria-label="Próximo mês"><ChevronRight size={14} /></button>
          {!hoje.startsWith(mes) && <button className="tm-btn" onClick={() => setMes(hoje.slice(0, 7))}>Mês atual</button>}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {!clienteId && clientes.length > 1 && (
            <div className="tm-campo" style={{ marginBottom: 0 }}>
              <select value={filtroCliente} onChange={(e) => setFiltroCliente(e.target.value)} aria-label="Filtrar por cliente">
                <option value="">Todos os clientes</option>
                {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
          )}
          {podeCriar && (
            <button className="tm-btn forte" onClick={() => criar(dataPadrao)}><Plus size={14} /> Adicionar</button>
          )}
        </div>
      </div>

      <div className="tm-legenda">
        {Object.entries(TIPOS_AGENDA).map(([k, t]) => (
          <button key={k} className={ocultos.includes(k) ? "off" : ""} onClick={() => setOcultos(ocultos.includes(k) ? ocultos.filter((x) => x !== k) : [...ocultos, k])}>
            <i className="tm-ponto" style={{ background: t.cor }} />{t.nome}
          </button>
        ))}
      </div>
      <p className="tm-dica">{podeCriar ? "Clique em um dia para adicionar. Clique em um item para abrir." : "Clique em um item para ver os detalhes."}</p>

      <div className="tm-grade" ref={grade}>
        {SEMANA.map((s) => <div className="tm-sem" key={s}>{s}</div>)}
        {dias.map((d) => {
          const doDia = porDia[d] || [];
          return (
            <div
              key={d}
              className={"tm-dia" + (d.startsWith(mes) ? "" : " fora") + (d === hoje ? " hoje" : "") + (podeCriar || doDia.length ? " clicavel" : "")}
              onClick={() => clicarDia(d)}
              role="button"
              tabIndex={0}
              aria-label={"Dia " + dataCurta(d) + (doDia.length ? ", " + doDia.length + " itens" : "")}
              onKeyDown={(e) => { if (e.key === "Enter" && e.target === e.currentTarget) clicarDia(d); }}
            >
              <span className="tm-dia-num">{Number(d.slice(8))}</span>
              {doDia.slice(0, POR_DIA).map((i) => (
                <button
                  key={i.id}
                  className={"tm-evento" + (i.status === "concluido" ? " feito" : "")}
                  style={{ "--cor": TIPOS_AGENDA[i.tipo]?.cor }}
                  title={TIPOS_AGENDA[i.tipo]?.nome + " · " + nomeCliente(i.clienteId) + " · " + i.titulo}
                  onClick={(e) => { e.stopPropagation(); if (compacto()) setDiaAberto(d); else abrirItem(i); }}
                >
                  {rotulo(i)}
                </button>
              ))}
              {doDia.length > POR_DIA && (
                <button className="tm-mais" onClick={(e) => { e.stopPropagation(); setDiaAberto(d); }}>+{doDia.length - POR_DIA}</button>
              )}
            </div>
          );
        })}
      </div>

      {diaAberto && (
        <Janela titulo={Number(diaAberto.slice(8)) + " de " + MESES[Number(diaAberto.slice(5, 7)) - 1]} onFechar={() => setDiaAberto("")}>
          {!porDia[diaAberto] && <div className="tm-vazio">Nada neste dia.</div>}
          {(porDia[diaAberto] || []).map((i) => (
            <button key={i.id} className="tm-linha" onClick={() => abrirItem(i)}>
              <i className="tm-ponto" style={{ background: TIPOS_AGENDA[i.tipo]?.cor }} />
              <span className="tm-linha-corpo">
                {i.titulo}
                <span className="tm-linha-sub">{[TIPOS_AGENDA[i.tipo]?.nome, i.hora, nomeCliente(i.clienteId), nomeStatusAgenda(i.tipo, i.status)].filter(Boolean).join(" · ")}</span>
              </span>
            </button>
          ))}
          {podeCriar && (
            <div className="tm-acoes">
              <button className="tm-btn forte" onClick={() => criar(diaAberto)}><Plus size={14} /> Adicionar neste dia</button>
            </div>
          )}
        </Janela>
      )}

      {aberto && (
        <ItemCronograma
          item={aberto}
          clientes={clientes}
          clienteFixo={!!clienteId}
          nomeCliente={nomeCliente}
          podeEditar={podeEditar}
          onSalvar={onSalvar}
          onExcluir={onExcluir}
          onFechar={() => setAberto(null)}
        />
      )}
    </div>
  );
}

function ItemCronograma({ item, clientes, clienteFixo, nomeCliente, podeEditar, onSalvar, onExcluir, onFechar }) {
  const [f, setF] = useState(item);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [confirmaExcluir, setConfirmaExcluir] = useState(false);
  const tipo = TIPOS_AGENDA[f.tipo] || TIPOS_AGENDA.postagem;
  const link = linkSeguro(f.link);
  const mudar = (campo) => (e) => setF({ ...f, [campo]: e.target.value });

  async function executar(acao) {
    setErro("");
    setSalvando(true);
    try {
      await acao();
      onFechar();
    } catch (e) {
      console.error("Falha no cronograma", e);
      setErro(e?.message || "Não consegui salvar.");
      setSalvando(false);
    }
  }

  if (!podeEditar) {
    return (
      <Janela titulo={f.titulo || tipo.nome} onFechar={onFechar}>
        <p className="tm-linha-sub" style={{ marginBottom: 10 }}>
          {[tipo.nome, dataCurta(f.data), f.hora, nomeCliente(f.clienteId), f.rede, nomeStatusAgenda(f.tipo, f.status)].filter(Boolean).join(" · ")}
        </p>
        {f.descricao ? <p className="tm-texto">{f.descricao}</p> : <p className="tm-vazio">Sem detalhes.</p>}
        {link && <div className="tm-acoes"><a className="tm-btn" href={link} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} /> Abrir link</a></div>}
      </Janela>
    );
  }

  return (
    <Janela titulo={item.id ? "Editar item" : "Novo item no cronograma"} onFechar={onFechar}>
      <form onSubmit={(e) => { e.preventDefault(); executar(() => onSalvar(f)); }}>
        <div className="tm-tipos" role="radiogroup" aria-label="O que é">
          {Object.entries(TIPOS_AGENDA).map(([k, t]) => (
            <button type="button" key={k} role="radio" aria-checked={f.tipo === k} className={f.tipo === k ? "on" : ""} style={{ "--cor": t.cor }} onClick={() => setF({ ...f, tipo: k })}>
              <i className="tm-ponto" style={{ background: t.cor }} />{t.nome}
            </button>
          ))}
        </div>
        <label className="tm-campo"><span>Situação</span>
          <select value={f.status} onChange={mudar("status")}>
            {["planejado", "agendado", "concluido"].map((s) => <option key={s} value={s}>{nomeStatusAgenda(f.tipo, s)}</option>)}
          </select>
        </label>
        {!clienteFixo && (
          <label className="tm-campo"><span>Cliente</span>
            <select value={f.clienteId} onChange={mudar("clienteId")} required>
              <option value="" disabled>Selecione o cliente…</option>
              {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </label>
        )}
        <label className="tm-campo"><span>Título</span><input value={f.titulo} onChange={mudar("titulo")} required autoFocus /></label>
        <div className="tm-duas">
          <label className="tm-campo"><span>Data</span><input type="date" value={f.data} onChange={mudar("data")} required /></label>
          <label className="tm-campo"><span>Hora (opcional)</span><input type="time" value={f.hora} onChange={mudar("hora")} /></label>
        </div>
        {f.tipo === "postagem" && (
          <label className="tm-campo"><span>Rede / formato</span><input value={f.rede} onChange={mudar("rede")} placeholder="Ex: Instagram Reels, Stories, LinkedIn" /></label>
        )}
        <label className="tm-campo"><span>{tipo.descricao}</span><textarea value={f.descricao} onChange={mudar("descricao")} /></label>
        <label className="tm-campo"><span>Link (opcional)</span><input value={f.link} onChange={mudar("link")} placeholder="https://…" /></label>
        {item.autorNome && <p className="tm-linha-sub">Criado por {item.autorNome}</p>}
        {erro && <p className="tm-erro">{erro}</p>}
        <div className="tm-acoes">
          {item.id && (
            <button type="button" className="tm-btn perigo" disabled={salvando} onClick={() => (confirmaExcluir ? executar(() => onExcluir(item.id)) : setConfirmaExcluir(true))}>
              {confirmaExcluir ? "Confirmar exclusão" : "Excluir"}
            </button>
          )}
          {link && <a className="tm-btn" href={link} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} /> Abrir link</a>}
          <button type="submit" className="tm-btn forte" disabled={salvando}>{salvando ? "Salvando…" : "Salvar"}</button>
        </div>
      </form>
    </Janela>
  );
}

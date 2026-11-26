import React, { useState } from "react";
import { X } from "lucide-react";
import { FORMAS_PAGAMENTO, dividirValor, ajustarParcelas, diferencaParcelas, vinculosDaProposta } from "./lib/propostas.js";

const brl = (v) => "R$ " + (parseFloat(v) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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

const linhaCheck = { display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13.5, textTransform: "none", letterSpacing: 0, color: "var(--text)", margin: "0 0 8px", cursor: "pointer" };

export function AprovarProposta({ proposta, demandas, transacoes, comPagamento, onConfirmar, onFechar }) {
  const vinc = vinculosDaProposta(proposta, demandas, transacoes);
  const total = Number(proposta.valorTotal) || 0;
  const [criarDemanda, setCriarDemanda] = useState(vinc.demandas.length === 0);
  const [lancar, setLancar] = useState(total > 0 && vinc.receitas.length === 0);
  const [forma, setForma] = useState("Pix");
  const [parcelado, setParcelado] = useState(false);
  const [parcelas, setParcelas] = useState(() => dividirValor(total, 2));
  const lista = parcelado ? parcelas : [total.toFixed(2)];
  const diferenca = diferencaParcelas(lista, total);
  const invalido = lancar && (Math.abs(diferenca) >= 0.01 || lista.some((v) => !(parseFloat(v) > 0)));

  const mudarQuantidade = (n) => setParcelas(dividirValor(total, Math.max(2, Math.min(24, n || 2))));

  return (
    <Moldura titulo="Aprovar proposta" onFechar={onFechar}>
      <p style={{ marginTop: 0 }}>
        <b>{proposta.clienteNome}</b> · nº {proposta.numero || "—"}<br />
        {proposta.titulo} · {brl(total)}
      </p>

      {vinc.demandas.length > 0 && <p className="config-hint">Já existe uma demanda desta proposta: "{vinc.demandas[0].projeto}".</p>}
      <label style={linhaCheck}>
        <input type="checkbox" style={{ width: "auto" }} checked={criarDemanda} onChange={(e) => setCriarDemanda(e.target.checked)} />
        Criar a demanda em Demandas
      </label>

      {vinc.receitas.length > 0 && <p className="config-hint">Esta proposta já tem {vinc.receitas.length} {vinc.receitas.length === 1 ? "receita lançada" : "receitas lançadas"}. Marque abaixo só se quiser lançar de novo.</p>}
      {total > 0 && (
        <label style={linhaCheck}>
          <input type="checkbox" style={{ width: "auto" }} checked={lancar} onChange={(e) => setLancar(e.target.checked)} />
          Lançar a receita no Financeiro, aguardando data
        </label>
      )}

      {lancar && (
        <>
          <div className="grid2">
            {comPagamento && (
              <div className="field">
                <label>Forma de pagamento</label>
                <select value={forma} onChange={(e) => setForma(e.target.value)}>
                  {FORMAS_PAGAMENTO.map((f) => <option key={f}>{f}</option>)}
                </select>
              </div>
            )}
            <div className="field">
              <label>Condição</label>
              <select value={parcelado ? "parcelado" : "avista"} onChange={(e) => setParcelado(e.target.value === "parcelado")}>
                <option value="avista">À vista</option>
                <option value="parcelado">Parcelado / com entrada</option>
              </select>
            </div>
          </div>
          {parcelado && (
            <>
              <div className="field">
                <label>Quantidade de parcelas (a entrada conta como a 1ª)</label>
                <input type="number" min="2" max="24" value={parcelas.length} onChange={(e) => mudarQuantidade(parseInt(e.target.value, 10))} />
              </div>
              {parcelas.map((v, i) => (
                <div className="field" key={i}>
                  <label>Parcela {i + 1}/{parcelas.length} (R$)</label>
                  <input type="number" step="0.01" min="0" value={v} onChange={(e) => setParcelas(ajustarParcelas(parcelas, i, e.target.value, total))} />
                </div>
              ))}
              <p className="config-hint">Ao mudar uma parcela, o restante é redividido entre as seguintes.</p>
              {Math.abs(diferenca) >= 0.01 && (
                <p className="config-hint" style={{ color: "var(--red)" }}>
                  A soma das parcelas está {brl(Math.abs(diferenca))} {diferenca > 0 ? "acima" : "abaixo"} do valor da proposta.
                </p>
              )}
            </>
          )}
          <p className="config-hint">As receitas ficam em "Aguardando data de pagamento" no Financeiro até você informar o vencimento.</p>
        </>
      )}

      <div className="modal-actions">
        <button className="btn-ghost" onClick={onFechar}>Cancelar</button>
        <button
          className="btn-primary"
          style={{ marginLeft: 0 }}
          disabled={invalido}
          onClick={() => onConfirmar({ criarDemanda, receitas: lancar ? lista : [], forma })}
        >
          Aprovar
        </button>
      </div>
    </Moldura>
  );
}

// Recusa de uma proposta que já estava aprovada: o dono escolhe o que apagar.
export function RecusarProposta({ proposta, demandas, transacoes, onConfirmar, onFechar }) {
  const vinc = vinculosDaProposta(proposta, demandas, transacoes);
  const [apagar, setApagar] = useState(() => new Set());
  const alternar = (id) => {
    const novo = new Set(apagar);
    if (!novo.delete(id)) novo.add(id);
    setApagar(novo);
  };
  const nada = vinc.demandas.length === 0 && vinc.receitas.length === 0;

  return (
    <Moldura titulo="Recusar proposta aprovada" onFechar={onFechar}>
      <p style={{ marginTop: 0 }}><b>{proposta.clienteNome}</b> · nº {proposta.numero || "—"} · {brl(proposta.valorTotal)}</p>
      {nada ? (
        <p className="config-hint">Não encontrei demanda nem receita geradas por esta proposta. Só o status vai mudar.</p>
      ) : (
        <p className="config-hint">A aprovação gerou os itens abaixo. <b>Marque o que deve ser apagado.</b> O que ficar desmarcado continua como está.</p>
      )}
      {vinc.demandas.map((d) => (
        <label key={d.id} style={linhaCheck}>
          <input type="checkbox" style={{ width: "auto" }} checked={apagar.has(d.id)} onChange={() => alternar(d.id)} />
          <span>Apagar a demanda "{d.projeto}" <span style={{ color: "var(--text-dim)" }}>· {d.status}{(d.itens || []).length ? " · " + d.itens.length + " vídeos" : ""}</span></span>
        </label>
      ))}
      {vinc.receitas.map((t) => {
        const recebida = t.statusPagamento === "Pago";
        return (
          <label key={t.id} style={{ ...linhaCheck, cursor: recebida ? "default" : "pointer", opacity: recebida ? 0.6 : 1 }}>
            <input type="checkbox" style={{ width: "auto" }} disabled={recebida} checked={apagar.has(t.id)} onChange={() => alternar(t.id)} />
            <span>
              {recebida ? "Receita já recebida (não é apagada)" : "Apagar a receita"} {brl(t.valor)}
              {t.parcelaGrupoId ? " · " + t.parcelaAtual + "/" + t.parcelaTotal : ""}
              <span style={{ color: "var(--text-dim)" }}> · {t.data ? "vence " + t.data.split("-").reverse().join("/") : "sem data"}{t.notaEmitida ? " · nota emitida" : ""}</span>
            </span>
          </label>
        );
      })}
      <div className="modal-actions">
        <button className="btn-ghost" onClick={onFechar}>Cancelar</button>
        <button
          className="btn-primary"
          style={{ marginLeft: 0 }}
          onClick={() => onConfirmar({
            demandas: vinc.demandas.filter((d) => apagar.has(d.id)).map((d) => d.id),
            receitas: vinc.receitas.filter((t) => apagar.has(t.id) && t.statusPagamento !== "Pago").map((t) => t.id),
          })}
        >
          Recusar{apagar.size > 0 ? " e apagar " + apagar.size : ""}
        </button>
      </div>
    </Moldura>
  );
}

// Só para propostas salvas antes de o painel guardar o texto completo.
export function EditarProposta({ proposta, clientes, tipos, onSalvar, onFechar }) {
  const [f, setF] = useState({ ...proposta, valorTotal: String(proposta.valorTotal ?? "") });
  const mudar = (campo) => (e) => setF({ ...f, [campo]: e.target.value });
  const opcoesTipo = tipos.includes(f.tipo) || !f.tipo ? tipos : [f.tipo, ...tipos];

  return (
    <Moldura titulo="Editar proposta" onFechar={onFechar}>
      <p className="config-hint">Esta proposta foi salva antes de o painel guardar o texto completo, então só os dados da lista podem ser alterados.</p>
      <div className="grid2">
        <div className="field"><label>Número</label><input value={f.numero || ""} onChange={mudar("numero")} /></div>
        <div className="field"><label>Data de geração</label><input type="date" value={f.dataGeracao || ""} onChange={mudar("dataGeracao")} /></div>
      </div>
      <div className="field"><label>Título</label><input value={f.titulo || ""} onChange={mudar("titulo")} /></div>
      <div className="field">
        <label>Cliente</label>
        <select
          value={f.clienteId || ""}
          onChange={(e) => setF({ ...f, clienteId: e.target.value, clienteNome: clientes.find((c) => c.id === e.target.value)?.nome || f.clienteNome })}
        >
          {!clientes.some((c) => c.id === f.clienteId) && <option value={f.clienteId || ""}>{f.clienteNome || "—"}</option>}
          {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
      </div>
      <div className="grid2">
        <div className="field">
          <label>Tipo</label>
          <select value={f.tipo || ""} onChange={mudar("tipo")}>
            {opcoesTipo.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="field"><label>Valor (R$)</label><input type="number" step="0.01" min="0" value={f.valorTotal} onChange={mudar("valorTotal")} /></div>
      </div>
      {proposta.status === "Confirmada" && <p className="config-hint">As receitas e a demanda já criadas não mudam sozinhas. Ajuste-as no Financeiro e em Demandas, se precisar.</p>}
      <div className="modal-actions">
        <button className="btn-ghost" onClick={onFechar}>Cancelar</button>
        <button className="btn-primary" style={{ marginLeft: 0 }} onClick={() => onSalvar({ ...f, valorTotal: parseFloat(f.valorTotal) || 0 })}>Salvar</button>
      </div>
    </Moldura>
  );
}

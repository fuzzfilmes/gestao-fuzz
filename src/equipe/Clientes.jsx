// Lista de clientes e ficha cadastral, usadas pelo painel do dono e pelo da equipe,
// pra a tela do cliente ser a mesma nos dois.
import React from "react";
import { ExternalLink, FileText, MessageCircle } from "lucide-react";
import { linkSeguro, linkZap } from "./util.js";

export function AlternarVisao({ visao, onMudar }) {
  return (
    <div className="view-toggle">
      <button className={"view-toggle-btn" + (visao === "lista" ? " active" : "")} onClick={() => onMudar("lista")} title="Visualização em lista">
        <span className="view-icon-list"><span /><span /><span /></span>
      </button>
      <button className={"view-toggle-btn" + (visao === "grade" ? " active" : "")} onClick={() => onMudar("grade")} title="Visualização em grade">
        <span className="view-icon-grid"><span /><span /><span /><span /></span>
      </button>
    </div>
  );
}

export function ListaClientes({ clientes, visao, totalDemandas, onAbrir, acoesDaLinha }) {
  if (visao === "grade") {
    return (
      <div className="client-grid">
        {clientes.map((c) => (
          <div className="client-card" key={c.id} onClick={() => onAbrir(c)}>
            <div className="client-card-cover" style={c.capaUrl ? { backgroundImage: `url(${c.capaUrl})` } : {}}>
              {!c.capaUrl && <FileText size={22} />}
            </div>
            <div className="client-card-footer">
              <FileText size={13} />
              <span>{c.nome || "(sem nome)"}{c.rascunho ? " (rascunho)" : ""}</span>
            </div>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="table-scroll"><table>
      <thead>
        <tr>
          <th>Nome</th>
          <th>Tipo</th>
          <th>Contato</th>
          <th>Demandas</th>
          <th>Drive</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {clientes.map((c) => (
          <tr key={c.id} className="clickable-row" onClick={() => onAbrir(c)}>
            <td className="proj">{c.nome || "(sem nome)"}{c.rascunho ? " (rascunho)" : ""}</td>
            <td>{c.tipo}</td>
            <td className="mono">{c.email || c.telefone || "—"}</td>
            <td>{totalDemandas(c.id)}</td>
            <td onClick={(e) => e.stopPropagation()}>
              {linkSeguro(c.driveLink) ? (
                <a className="icon-btn" href={linkSeguro(c.driveLink)} target="_blank" rel="noopener noreferrer" title="Abrir Drive do cliente">
                  <ExternalLink size={13} />
                </a>
              ) : (
                <span className="mono" style={{ fontSize: 11 }}>—</span>
              )}
            </td>
            <td onClick={(e) => e.stopPropagation()}>{acoesDaLinha(c)}</td>
          </tr>
        ))}
      </tbody>
    </table></div>
  );
}

export function CamposCliente({ cliente: c }) {
  const contatos = [{ nome: c.contatoNome, telefone: c.telefone }, ...(c.contatos || [])].filter((x) => x.nome || x.telefone);
  const endereco = [c.endereco, c.bairro, [c.municipio, c.estado].filter(Boolean).join("/"), c.cep].filter(Boolean).join(", ");
  return (
    <>
      <div className="field"><label>Tipo</label><div>{c.tipo || "—"}</div></div>
      {c.razaoSocial && <div className="field"><label>Razão social</label><div>{c.razaoSocial}</div></div>}
      {c.cnpj && <div className="field"><label>CNPJ</label><div>{c.cnpj}</div></div>}
      {contatos.length > 0 && (
        <div className="field">
          <label>Contatos</label>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {contatos.map((x, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <span>{x.nome || "—"}</span>
                {x.telefone && linkZap(x.telefone) && (
                  <a className="btn-ghost" style={{ padding: "4px 10px", fontSize: 12 }} href={linkZap(x.telefone)} target="_blank" rel="noopener noreferrer">
                    <MessageCircle size={13} style={{ verticalAlign: "-2px", marginRight: 4 }} />{x.telefone}
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      {c.email && <div className="field"><label>E-mail</label><div>{c.email}</div></div>}
      {(c.endereco || c.bairro || c.municipio) && <div className="field"><label>Endereço</label><div>{endereco}</div></div>}
      {c.observacoes && <div className="field"><label>Observações</label><div style={{ whiteSpace: "pre-wrap" }}>{c.observacoes}</div></div>}
    </>
  );
}

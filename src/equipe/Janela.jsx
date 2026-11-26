import React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { CSS_EQUIPE } from "./estilo.js";

// Janela sobre a tela, usada pelos dois painéis.
export default function Janela({ titulo, larga, onFechar, children }) {
  return createPortal(
    <div className="tm tm-fundo" onClick={(e) => { e.stopPropagation(); onFechar(); }}>
      <style>{CSS_EQUIPE}</style>
      <div className={"tm-janela" + (larga ? " larga" : "")} onClick={(e) => e.stopPropagation()}>
        <div className="tm-janela-topo">
          <h3>{titulo}</h3>
          <button className="tm-btn" onClick={onFechar} aria-label="Fechar"><X size={15} /></button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
}

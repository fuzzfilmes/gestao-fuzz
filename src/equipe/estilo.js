// Estilo dos blocos compartilhados (cronograma, recados, avisos). Prefixo "tm-".
export const CSS_EQUIPE = `
  .tm { --tm-bg: #1d2025; --tm-line: #333840; --tm-text: #edeceb; --tm-dim: #9aa0a8; color: var(--tm-text); font-family: 'Inter', sans-serif; text-align: left; }
  .tm * { box-sizing: border-box; }
  .tm button, .tm select, .tm input, .tm textarea { font-family: inherit; }
  .tm-btn { min-height: 34px; padding: 0 12px; border-radius: 9px; background: transparent; border: 1px solid var(--tm-line); color: var(--tm-text); font-size: 12.5px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 6px; text-decoration: none; }
  .tm-btn:hover { background: rgba(255,255,255,0.06); }
  .tm-btn.forte { background: #ff5449; border-color: #ff5449; color: #fff; }
  .tm-btn.perigo { color: #ff8a80; border-color: #6b2f33; }
  .tm-btn:disabled { opacity: 0.55; cursor: default; }
  .tm-campo { display: flex; flex-direction: column; gap: 4px; margin-bottom: 10px; min-width: 0; }
  .tm .tm-campo > span { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--tm-dim); }
  .tm .tm-campo input, .tm .tm-campo select, .tm .tm-campo textarea { width: 100%; margin: 0; background: #14161a; border: 1px solid var(--tm-line); color: var(--tm-text); border-radius: 8px; padding: 8px 10px; font-size: 13.5px; }
  .tm .tm-campo textarea { min-height: 84px; resize: vertical; }
  .tm-duas { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .tm-erro { color: #ff8a80; font-size: 12.5px; margin: 0 0 10px; }
  .tm-vazio { color: var(--tm-dim); font-size: 13px; padding: 8px 0; }

  .tm-cal { container-type: inline-size; }
  .tm-cal-topo { display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 10px; }
  .tm-cal-mes { display: flex; align-items: center; gap: 8px; }
  .tm .tm-cal-mes h3 { font-family: 'Bebas Neue', sans-serif; font-weight: 400; font-size: 24px; letter-spacing: 0.5px; margin: 0; min-width: 170px; text-align: center; }
  .tm-legenda { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 10px; }
  .tm-legenda button { display: inline-flex; align-items: center; gap: 6px; background: transparent; border: 1px solid var(--tm-line); color: var(--tm-text); border-radius: 999px; padding: 4px 11px; font-size: 12px; cursor: pointer; }
  .tm-legenda button.off { opacity: 0.4; }
  .tm-ponto { width: 9px; height: 9px; border-radius: 50%; display: inline-block; flex-shrink: 0; }
  .tm .tm-dica { font-size: 12px; color: var(--tm-dim); margin: 0 0 8px; }
  .tm-grade { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); border-top: 1px solid var(--tm-line); border-left: 1px solid var(--tm-line); }
  .tm-sem { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--tm-dim); text-align: center; padding: 6px 0; border-right: 1px solid var(--tm-line); border-bottom: 1px solid var(--tm-line); }
  .tm-dia { min-height: 112px; padding: 5px; border-right: 1px solid var(--tm-line); border-bottom: 1px solid var(--tm-line); display: flex; flex-direction: column; gap: 3px; min-width: 0; }
  .tm-dia.clicavel { cursor: pointer; }
  .tm-dia.clicavel:hover { background: rgba(255,255,255,0.045); }
  .tm-dia:focus-visible { outline: 2px solid #7aa7f0; outline-offset: -2px; }
  .tm-dia.fora { opacity: 0.38; }
  .tm-dia-num { font-family: 'JetBrains Mono', monospace; font-size: 12px; color: var(--tm-dim); align-self: flex-start; padding: 0 6px; border-radius: 999px; }
  .tm-dia.hoje .tm-dia-num { color: #fff; background: #ff5449; }
  .tm .tm-evento { width: 100%; flex-shrink: 0; text-align: left; border: none; border-left: 3px solid var(--cor); border-radius: 5px; background: color-mix(in srgb, var(--cor) 22%, transparent); color: var(--tm-text); font-size: 11.5px; line-height: 1.3; padding: 3px 5px; cursor: pointer; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow-wrap: anywhere; }
  .tm .tm-evento.feito { opacity: 0.5; text-decoration: line-through; }
  .tm .tm-mais { background: none; border: none; color: #7aa7f0; font-size: 11.5px; font-weight: 600; text-align: left; padding: 0 5px; cursor: pointer; }
  @container (max-width: 620px) {
    .tm .tm-cal-mes h3 { min-width: 0; font-size: 20px; }
    .tm-dia { min-height: 56px; padding: 3px; flex-direction: row; flex-wrap: wrap; align-content: flex-start; gap: 3px; }
    .tm-dia-num { width: 100%; padding: 0 3px; }
    .tm-dia.hoje .tm-dia-num { width: auto; margin-right: 60%; padding: 0 5px; }
    .tm .tm-evento { width: 8px; height: 8px; padding: 0; border: none; border-radius: 50%; background: var(--cor); font-size: 0; display: block; }
    .tm .tm-mais { font-size: 10px; padding: 0; line-height: 8px; }
  }
  .tm-tipos { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; margin-bottom: 12px; }
  .tm .tm-tipos button { display: inline-flex; align-items: center; justify-content: center; gap: 6px; min-height: 40px; border-radius: 10px; border: 1px solid var(--tm-line); background: transparent; color: var(--tm-text); font-size: 13px; font-weight: 600; cursor: pointer; }
  .tm .tm-tipos button.on { border-color: var(--cor); background: color-mix(in srgb, var(--cor) 22%, transparent); }

  .tm-linha { display: flex; align-items: flex-start; gap: 10px; width: 100%; text-align: left; background: none; border: none; border-top: 1px solid var(--tm-line); color: var(--tm-text); padding: 9px 2px; font-size: 13px; }
  button.tm-linha { cursor: pointer; }
  .tm-linha:first-child { border-top: none; }
  .tm-linha .tm-ponto { margin-top: 5px; }
  .tm-linha-corpo { flex: 1; min-width: 0; overflow-wrap: anywhere; }
  .tm-linha-sub { display: block; font-size: 12px; color: var(--tm-dim); margin-top: 1px; }
  .tm-linha-data { font-family: 'JetBrains Mono', monospace; font-size: 12px; color: var(--tm-dim); white-space: nowrap; }
  .tm .tm-grupo { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--tm-dim); margin: 10px 0 2px; font-weight: 600; }
  .tm .tm-grupo.atraso { color: #ff8a80; }
  .tm .tm-grupo.hoje { color: #5ccba8; }

  .tm-fundo { position: fixed; inset: 0; background: rgba(5,6,8,0.7); z-index: 1100; display: flex; align-items: center; justify-content: center; padding: 16px; }
  .tm-janela { background: var(--tm-bg); border: 1px solid var(--tm-line); border-radius: 16px; width: 480px; max-width: 100%; max-height: 90vh; overflow-y: auto; padding: 20px; }
  .tm-janela.larga { width: 1000px; }
  .tm .tm-janela-topo { display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-bottom: 14px; }
  .tm .tm-janela-topo h3 { margin: 0; font-family: 'Bebas Neue', sans-serif; font-weight: 400; font-size: 22px; letter-spacing: 0.5px; }
  .tm-acoes { display: flex; gap: 8px; justify-content: flex-end; flex-wrap: wrap; margin-top: 6px; }
  .tm-texto { white-space: pre-wrap; overflow-wrap: anywhere; font-size: 13.5px; line-height: 1.5; margin: 0; }

  .tm-recado { border: 1px solid var(--tm-line); border-radius: 12px; padding: 10px 12px; margin-bottom: 8px; }
  .tm-recado.novo { border-color: #d9a441; background: rgba(217,164,65,0.08); }
  .tm-recado-topo { display: flex; justify-content: space-between; gap: 8px; font-size: 12px; color: var(--tm-dim); margin-bottom: 4px; flex-wrap: wrap; }
  .tm-recado .tm-acoes { margin-top: 8px; }
  @media (max-width: 560px) { .tm-duas { grid-template-columns: 1fr; } }
`;

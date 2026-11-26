// Estilo do painel (classes ".app"), compartilhado com a tela da equipe.
export const APP_CSS = `
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
        .app {
          --bg: #14161a;
          --surface: #1d2025;
          --surface-alt: #262a31;
          --border: #333840;
          --text: #edeceb;
          --text-dim: #9aa0a8;
          --amber: #d9a441;
          --amber-dark: #241c0c;
          --teal: #4fa8a0;
          --teal-dark: #0e2422;
          --red: #e2574c;
          --red-dark: #2a1210;
          --violet: #9b87c4;
          --violet-dark: #1e1a2c;
          --green: #6fbf73;
          --green-dark: #10240f;
          --brand: #ff5449;
          --brand-2: #e2392e;
          --brand-dark: #341210;
          --brand-glow: rgba(255, 84, 73, 0.35);
          font-family: 'Inter', sans-serif;
          background:
            radial-gradient(ellipse 900px 560px at 8% -8%, rgba(255, 84, 73, 0.30), transparent 60%),
            radial-gradient(ellipse 800px 640px at 108% 12%, rgba(217, 164, 65, 0.16), transparent 55%),
            radial-gradient(ellipse 900px 700px at 60% 118%, rgba(79, 168, 160, 0.14), transparent 60%),
            linear-gradient(160deg, #1a0e0c 0%, #191214 22%, #15171f 46%, #14161a 100%);
          color: var(--text);
          border-radius: 20px;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.08);
          min-height: 600px;
          position: relative;
          box-shadow: 0 30px 80px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.04);
        }
        .app * { box-sizing: border-box; }
        .shell { position: relative; z-index: 1; display: flex; min-height: 600px; }
        .right-col { flex: 1; min-width: 0; display: flex; flex-direction: column; }
        .brand-block { padding: 22px 18px 18px 18px; border-bottom: 1px solid rgba(255,255,255,0.07); margin-bottom: 10px; }
        .brand-logo-img { height: 42px; width: auto; display: block; filter: brightness(0) invert(1); }
        .topbar {
          display: flex; align-items: flex-start; justify-content: space-between;
          padding: 22px 28px 14px 28px;
        }
        .topbar-icons { display: flex; align-items: center; gap: 10px; margin-top: 2px; }
        .icon-circle {
          width: 36px; height: 36px; border-radius: 50%; background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.09); color: var(--text-dim); display: flex; align-items: center;
          justify-content: center; cursor: pointer; position: relative; transition: background 0.15s, color 0.15s;
        }
        .icon-circle:hover { background: rgba(255,255,255,0.1); color: var(--text); }
        .icon-circle.active { background: var(--brand); color: #fff; border-color: transparent; }
        .topbar-search-wrap { position: relative; }
        .topbar-search-pop {
          position: absolute; top: calc(100% + 8px); right: 0; width: 300px; z-index: 60;
          background: rgba(29, 32, 37, 0.96); backdrop-filter: blur(16px); border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px; padding: 10px; box-shadow: 0 20px 50px rgba(0,0,0,0.5);
        }
        .topbar-search-pop input {
          width: 100%; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: var(--text);
          padding: 9px 11px; border-radius: 8px; font-size: 13px;
        }
        .topbar-search-results { margin-top: 8px; max-height: 280px; overflow-y: auto; display: flex; flex-direction: column; gap: 2px; }
        .topbar-search-empty { color: var(--text-dim); font-size: 12px; padding: 8px 4px; }
        .topbar-search-result {
          display: flex; align-items: center; gap: 8px; background: none; border: none; text-align: left;
          padding: 8px 8px; border-radius: 7px; cursor: pointer; width: 100%;
        }
        .topbar-search-result:hover { background: rgba(255,255,255,0.06); }
        .tsr-type { font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.4px; color: var(--brand); font-weight: 700; flex-shrink: 0; width: 58px; }
        .tsr-label { flex: 1; font-size: 12.5px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .tsr-sub { font-size: 11px; color: var(--text-dim); flex-shrink: 0; }
        .icon-badge {
          position: absolute; top: -3px; right: -3px; background: var(--red); color: #fff; font-size: 9.5px;
          font-weight: 700; min-width: 15px; height: 15px; border-radius: 8px; display: flex; align-items: center;
          justify-content: center; padding: 0 3px; border: 2px solid var(--bg);
        }
        .avatar-circle {
          width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(135deg, var(--brand), var(--brand-2));
          color: #fff; font-family: 'Bebas Neue', sans-serif; font-size: 15px; display: flex; align-items: center;
          justify-content: center; box-shadow: 0 4px 14px var(--brand-glow);
        }
        .slate {
          background: rgba(255, 255, 255, 0.025);
          border-bottom: 1px solid rgba(255,255,255,0.06);
          padding: 4px 28px 0 28px;
          position: relative;
        }
        .slate-stripe {
          height: 3px;
          background: linear-gradient(90deg, var(--brand), #ffb199 35%, transparent 75%);
          margin: 16px 0 0 0;
          opacity: 0.7;
        }
        .slate-title {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 34px;
          letter-spacing: 1.5px;
          line-height: 1;
          margin: 0;
        }
        .slate-sub {
          color: var(--text-dim);
          font-size: 13px;
          margin: 6px 0 18px 0;
          font-family: 'JetBrains Mono', monospace;
        }
        .stats-row { display: flex; gap: 10px; padding: 16px 28px; flex-wrap: wrap; }
        .finance-cards { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 16px; }
        .finance-cards .stat { flex: 1; min-width: 140px; }
        .finance-status-btn { border: none; cursor: pointer; font-family: inherit; }

        .tag-pill {
          display: inline-flex; align-items: center; gap: 5px; padding: 3px 9px 3px 7px; border-radius: 20px;
          font-size: 11px; font-weight: 600; background: color-mix(in srgb, var(--tag-color) 18%, transparent);
          color: var(--tag-color); border: 1px solid color-mix(in srgb, var(--tag-color) 45%, transparent);
          white-space: nowrap;
        }
        .tag-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
        .tag-pill-btn { cursor: pointer; font-family: inherit; margin: 0 5px 5px 0; }
        .tag-pill-btn.selected { background: var(--tag-color); color: #14161a; }
        .tag-cell { position: relative; display: flex; flex-wrap: wrap; gap: 4px; }
        .field .tag-cell { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 8px 10px; align-items: center; }
        .tag-cell-btn { background: none; border: none; padding: 0; cursor: pointer; display: flex; flex-wrap: wrap; gap: 4px; align-items: center; min-height: 22px; }
        .tag-cell-empty { color: var(--text-dim); font-size: 11.5px; border: 1px dashed var(--border); padding: 3px 8px; border-radius: 20px; }
        .tag-cell-empty:hover { border-color: var(--amber); color: var(--amber); }

        .filter-menu { position: relative; display: inline-block; }
        .filter-menu-btn {
          position: relative; display: flex; align-items: center; justify-content: center;
          width: 34px; height: 34px; background: var(--surface); border: 1px solid var(--border);
          color: var(--text-dim); border-radius: 8px; cursor: pointer;
        }
        .filter-menu-btn:hover { color: var(--text); border-color: var(--text-dim); }
        .filter-menu-btn.has-active { color: var(--amber); border-color: var(--amber); }
        .filter-menu-badge {
          position: absolute; top: -6px; right: -6px; min-width: 16px; height: 16px; padding: 0 3px;
          border-radius: 20px; background: var(--amber); color: #1a1305; font-size: 10px; font-weight: 700;
          display: flex; align-items: center; justify-content: center; line-height: 1;
        }
        .filter-menu-popover {
          position: absolute; z-index: 60; top: calc(100% + 6px); left: 0; width: 240px;
          background: var(--surface); border: 1px solid var(--border); border-radius: 10px;
          padding: 12px; box-shadow: 0 8px 24px rgba(0,0,0,0.4); display: flex; flex-direction: column; gap: 10px;
        }
        .filter-menu-popover.align-right { left: auto; right: 0; }
        .filter-menu-field { display: flex; flex-direction: column; gap: 4px; }
        .filter-menu-field label { font-size: 11px; color: var(--text-dim); }
        .filter-menu-field select, .filter-menu-field input { width: 100%; }
        .filter-menu-row { display: flex; gap: 8px; }
        .filter-menu-row .filter-menu-field { flex: 1; }
        .filter-menu-clear {
          background: none; border: 1px solid var(--border); color: var(--text-dim); border-radius: 6px;
          padding: 6px; font-size: 11.5px; cursor: pointer; margin-top: 2px;
        }
        .filter-menu-clear:hover { border-color: var(--red); color: var(--red); }

        .tag-picker {
          position: absolute; z-index: 60; top: calc(100% + 4px); left: 0; width: 240px;
          background: var(--surface); border: 1px solid var(--border); border-radius: 8px;
          padding: 10px; box-shadow: 0 8px 24px rgba(0,0,0,0.4);
        }
        .tag-picker-search {
          width: 100%; background: var(--surface-alt); border: 1px solid var(--border); color: var(--text);
          padding: 7px 9px; border-radius: 6px; font-size: 12.5px; margin-bottom: 8px;
        }
        .tag-picker-list { display: flex; flex-wrap: wrap; gap: 0; max-height: 140px; overflow-y: auto; }
        .tag-picker-empty { color: var(--text-dim); font-size: 11.5px; padding: 4px 0; }
        .tag-picker-create {
          width: 100%; background: none; border: 1px dashed var(--border); color: var(--text-dim);
          padding: 7px; border-radius: 6px; font-size: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 5px;
        }
        .tag-picker-create:hover { border-color: var(--amber); color: var(--amber); }
        .tag-color-row { display: flex; gap: 6px; flex-wrap: wrap; padding-top: 4px; }
        .tag-color-swatch { width: 22px; height: 22px; border-radius: 50%; border: 2px solid transparent; cursor: pointer; }
        .tag-color-swatch:hover { border-color: var(--text); transform: scale(1.1); }

        .tag-filter-row { display: flex; align-items: center; flex-wrap: wrap; gap: 0; margin-bottom: 12px; }
        .tag-filter-label { font-size: 11.5px; color: var(--text-dim); margin-right: 8px; }
        .tag-filter-clear { background: none; border: 1px solid var(--border); color: var(--text-dim); border-radius: 20px; padding: 3px 10px; font-size: 11px; cursor: pointer; margin-bottom: 5px; }
        .tag-filter-clear:hover { border-color: var(--red); color: var(--red); }

        .finance-top-grid { display: flex; gap: 14px; align-items: stretch; margin-bottom: 16px; }
        .finance-top-grid .finance-cards { flex: 1; margin-bottom: 0; }
        .finance-gauge-card {
          background: rgba(255,255,255,0.035); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px;
          padding: 10px 20px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; backdrop-filter: blur(8px);
        }
        .categoria-panel { background: rgba(255,255,255,0.035); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 18px; margin-bottom: 16px; max-width: 420px; backdrop-filter: blur(8px); }
        .categoria-panel-head { font-size: 12px; text-transform: uppercase; letter-spacing: 0.4px; color: var(--text-dim); font-family: 'JetBrains Mono', monospace; margin-bottom: 10px; }
        .categoria-search-row input { width: 100%; margin-bottom: 8px; }
        .categoria-list { display: flex; flex-direction: column; max-height: 280px; overflow-y: auto; }
        .categoria-row { display: flex; align-items: center; gap: 10px; padding: 9px 2px; border-bottom: 1px solid var(--border); }
        .categoria-row:last-child { border-bottom: none; }
        .categoria-swatch { width: 20px; height: 20px; border-radius: 6px; flex-shrink: 0; }
        .categoria-nome { flex: 1; font-size: 13px; font-weight: 600; }
        .categoria-total { font-family: 'JetBrains Mono', monospace; font-size: 13px; color: var(--text); }

        .kanban-header { display: flex; align-items: center; gap: 8px; margin-bottom: 16px; }
        .kanban-range { font-family: 'JetBrains Mono', monospace; font-size: 13px; color: var(--text); min-width: 130px; text-align: center; }
        .kanban-today-btn { margin-left: 8px; padding: 6px 12px; font-size: 12px; }
        .month-nav { display: flex; align-items: center; gap: 8px; margin-bottom: 16px; }
        .month-nav-label { font-family: 'JetBrains Mono', monospace; font-size: 13px; color: var(--text); min-width: 60px; text-align: center; text-transform: capitalize; }

        .finance-chart-svg { width: 100%; height: auto; overflow: visible; }
        .chart-gridline { stroke: var(--border); stroke-width: 1; }
        .chart-zeroline { stroke: var(--text-dim); stroke-width: 1; }
        .chart-axis-label { fill: var(--text-dim); font-size: 10.5px; font-family: 'JetBrains Mono', monospace; }
        .chart-bar-receita { fill: var(--teal); opacity: 0.9; }
        .chart-bar-despesa { fill: var(--red); opacity: 0.85; }
        .chart-bar-margem { fill: var(--amber); opacity: 0.9; }
        .chart-bar-margem.negativa { fill: var(--red); }
        .chart-tick-meta { stroke: var(--violet); stroke-width: 1.6; stroke-dasharray: 4 3; }
        .chart-legend { display: flex; gap: 18px; flex-wrap: wrap; margin-top: 10px; font-size: 11.5px; color: var(--text-dim); }
        .chart-legend-item { display: flex; align-items: center; gap: 6px; }
        .chart-legend-swatch { width: 11px; height: 11px; border-radius: 3px; display: inline-block; }

        .report-section { border: 1px solid var(--border); border-radius: 14px; margin-bottom: 14px; overflow: hidden; background: rgba(255,255,255,0.02); }
        .report-section-head { width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 12px; background: none; border: none; color: var(--text); padding: 16px 18px; cursor: pointer; text-align: left; }
        .report-section-head:hover { background: rgba(255,255,255,0.03); }
        .report-section-titles { display: flex; flex-direction: column; gap: 3px; }
        .report-section-title { font-family: 'Bebas Neue', sans-serif; font-size: 18px; letter-spacing: 0.4px; }
        .report-section-subtitle { font-size: 12px; color: var(--text-dim); }
        .report-section-chevron { flex-shrink: 0; transition: transform 0.15s ease; color: var(--text-dim); }
        .report-section-chevron.open { transform: rotate(90deg); }
        .report-section-body { padding: 4px 18px 20px; border-top: 1px solid var(--border); }
        .metas-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; align-items: start; }
        .metas-card { background: rgba(255,255,255,0.035); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 20px; backdrop-filter: blur(8px); }
        .metas-card h4 { font-family: 'Bebas Neue', sans-serif; font-size: 18px; letter-spacing: 0.4px; margin: 0 0 12px 0; }
        .metas-input-row { display: flex; gap: 8px; margin-bottom: 16px; }
        .metas-input-row input { flex: 1; }
        .progress-bar-track { width: 100%; height: 12px; background: var(--surface); border-radius: 6px; overflow: hidden; border: 1px solid var(--border); }
        .progress-bar-fill { height: 100%; background: var(--teal); transition: width 0.4s ease; }
        .progress-bar-fill.over { background: var(--amber); }
        .metas-pct { font-family: 'JetBrains Mono', monospace; font-size: 26px; font-weight: 600; margin: 4px 0; }
        .metas-line { display: flex; justify-content: space-between; font-size: 12.5px; color: var(--text-dim); padding: 6px 0; border-bottom: 1px solid var(--border); }
        .metas-line:last-child { border-bottom: none; }
        .gauge-wrap { display: flex; flex-direction: column; align-items: center; gap: 6px; }
        .gauge-track { stroke: var(--surface); }
        .gauge-fill { stroke: var(--teal); transition: stroke-dashoffset 0.5s ease; }
        .gauge-fill.over { stroke: var(--amber); }
        .gauge-pct { fill: var(--text); font-size: 22px; font-weight: 700; font-family: 'JetBrains Mono', monospace; }
        .gauge-sublabel { fill: var(--text-dim); font-size: 9px; }
        .gauge-label { font-size: 11.5px; color: var(--text-dim); text-align: center; }
        .metas-line b { color: var(--text); font-family: 'JetBrains Mono', monospace; font-weight: 600; }
        .kanban-inbox-bar {
          display: flex; align-items: center; gap: 12px; margin-bottom: 12px; padding: 10px 14px;
          background: rgba(217,164,65,0.06); border: 1px dashed var(--amber); border-radius: 12px;
          overflow-x: auto; transition: background 0.15s;
        }
        .kanban-inbox-bar.drag-over { background: var(--amber-dark); }
        .kanban-inbox-label { display: flex; align-items: center; gap: 6px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.4px; color: var(--amber); flex-shrink: 0; white-space: nowrap; }
        .kanban-inbox-chips { display: flex; align-items: center; gap: 8px; flex-wrap: nowrap; }
        .kanban-chip {
          display: flex; align-items: center; gap: 6px; background: var(--surface); border: 1px solid var(--border);
          border-radius: 20px; padding: 5px 10px; cursor: pointer; white-space: nowrap; flex-shrink: 0;
        }
        .kanban-chip:hover { border-color: var(--amber); }
        .kanban-chip.done { opacity: 0.5; text-decoration: line-through; }
        .kanban-chip-grip { color: var(--text-dim); cursor: grab; flex-shrink: 0; }
        .kanban-chip input[type="checkbox"] { flex-shrink: 0; }
        .kanban-chip-title { font-size: 12.5px; max-width: 220px; overflow: hidden; text-overflow: ellipsis; }
        .kanban-chip-del { background: none; border: none; color: var(--text-dim); cursor: pointer; flex-shrink: 0; display: flex; padding: 0; }
        .kanban-chip-del:hover { color: var(--red); }
        .kanban-chip-add {
          display: flex; align-items: center; gap: 4px; background: none; border: 1px dashed var(--border);
          border-radius: 20px; padding: 5px 10px; color: var(--text-dim); cursor: pointer; font-size: 12px; flex-shrink: 0;
        }
        .kanban-chip-add:hover { border-color: var(--amber); color: var(--amber); }
        .kanban-inbox-input {
          background: var(--surface); border: 1px solid var(--amber); border-radius: 20px; padding: 5px 12px;
          font-size: 12.5px; width: 180px; flex-shrink: 0;
        }
        .kanban-inbox-bar.pendencias { background: rgba(226,87,76,0.06); border-color: var(--red); }
        .kanban-inbox-bar.pendencias .kanban-inbox-label { color: var(--red); }
        .kanban-inbox-bar.pendencias .kanban-chip:hover { border-color: var(--red); }
        .kanban-chip-date { font-size: 11px; color: var(--text-dim); font-family: 'JetBrains Mono', monospace; flex-shrink: 0; }
        .kanban-board { display: grid; grid-template-columns: repeat(7, minmax(190px, 1fr)); gap: 10px; overflow-x: auto; }
        .kanban-col { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; min-height: 220px; display: flex; flex-direction: column; transition: background 0.15s, border-color 0.15s; }
        .kanban-col.today { border-color: var(--brand); }
        .kanban-col.drag-over { background: var(--brand-dark); }
        .kanban-col-header { padding: 10px 10px 8px 10px; border-bottom: 1px solid var(--border); }
        .kanban-col-day { display: block; font-size: 11px; text-transform: uppercase; letter-spacing: 0.4px; color: var(--text-dim); }
        .kanban-col.today .kanban-col-day { color: var(--brand); }
        .kanban-col-date { font-family: 'JetBrains Mono', monospace; font-size: 12.5px; color: var(--text); }
        .kanban-col-body { padding: 8px; display: flex; flex-direction: column; gap: 6px; flex: 1; }
        .kanban-card { display: flex; align-items: flex-start; gap: 7px; background: var(--surface); border: 1px solid var(--border); border-radius: 6px; padding: 9px 9px; cursor: pointer; }
        .kanban-card:hover { border-color: var(--amber); }
        .kanban-card:active { cursor: grabbing; }
        .kanban-card.done { opacity: 0.55; }
        .kanban-card.done .kanban-card-title { text-decoration: line-through; }
        .kanban-card-grip { color: var(--text-dim); flex-shrink: 0; margin-top: 2px; cursor: grab; }
        .kanban-card input[type="checkbox"] { flex-shrink: 0; width: 14px; height: 14px; margin-top: 1.5px; }
        .kanban-card-title { flex: 1; font-size: 13px; line-height: 1.4; word-break: normal; overflow-wrap: break-word; hyphens: none; display: flex; align-items: flex-start; gap: 5px; }
        .kanban-card-note-icon { color: var(--amber); flex-shrink: 0; margin-top: 3px; }
        .kanban-card-del { background: none; border: none; color: var(--text-dim); cursor: pointer; flex-shrink: 0; display: flex; opacity: 0; transition: opacity 0.15s; margin-top: 1px; }
        .kanban-card:hover .kanban-card-del { opacity: 1; }
        .kanban-card-del:hover { color: var(--red); }
        .kanban-add-btn { background: none; border: 1px dashed var(--border); color: var(--text-dim); border-radius: 6px; padding: 7px 8px; font-size: 12px; cursor: pointer; display: flex; align-items: center; gap: 4px; justify-content: center; }
        .kanban-add-btn:hover { border-color: var(--amber); color: var(--amber); }
        .kanban-add-form input { width: 100%; background: var(--surface); border: 1px solid var(--amber); color: var(--text); padding: 7px 8px; border-radius: 6px; font-size: 12.5px; }
        .kanban-notas-textarea { width: 100%; min-height: 140px; background: var(--surface-alt); border: 1px solid var(--border); color: var(--text); padding: 10px; border-radius: 6px; font-size: 13px; font-family: inherit; resize: vertical; line-height: 1.5; }
        .kanban-copy-btn { margin-top: 8px; width: 100%; font-size: 12.5px; padding: 8px; }

        .config-panel { max-width: 480px; }
        .config-section-title { font-family: 'Bebas Neue', sans-serif; font-size: 20px; letter-spacing: 0.5px; margin: 0 0 4px 0; }
        .finance-panel { margin-bottom: 28px; }
        .finance-panel-title { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
        .finance-panel-title-right { display: flex; align-items: center; gap: 12px; }
        .finance-panel-total { font-family: 'JetBrains Mono', monospace; font-size: 14px; color: var(--text-dim); font-weight: 500; }
        .finance-saldo-card {
          background: rgba(255,255,255,0.035); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px;
          padding: 16px 20px; margin-bottom: 16px; display: flex; align-items: center; justify-content: space-between;
          gap: 14px; flex-wrap: wrap; backdrop-filter: blur(8px);
        }
        .finance-saldo-label { font-size: 12px; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 3px; }
        .finance-saldo-valor { font-family: 'JetBrains Mono', monospace; font-size: 28px; font-weight: 700; color: var(--teal); }
        .finance-saldo-valor.negativo { color: var(--red); }

        /* ---- Aba Financeiro (redesign) ---- */
        .fz-fin { container-type: inline-size; --fz-in: #5ccba8; --fz-in-bg: #1d3a31; --fz-in-fg: #7fdcbe; --fz-out: #ff8a80; --fz-out-bg: #45252a; --fz-out-fg: #ff9c93; --fz-wait-bg: #3d3220; --fz-wait-fg: #f1c772; --fz-blue: #7aa7f0; --fz-line: rgba(255,255,255,0.07); display: flex; flex-direction: column; gap: 18px; }
        .fz-fin .num { font-family: 'JetBrains Mono', monospace; font-variant-numeric: tabular-nums; }
        .fz-fin .in { color: var(--fz-in); }
        .fz-fin .out { color: var(--fz-out); }
        .fz-fin .late { color: var(--fz-out); }
        .fz-fin .muted { color: var(--text-dim); }
        .fz-fin .r { text-align: right; }
        .fz-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
        .fz-eyebrow { font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-dim); margin-bottom: 6px; }
        .fz-title-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
        .fz-title { font-family: 'Bebas Neue', sans-serif; font-size: 38px; letter-spacing: 0.6px; font-weight: 400; margin: 0; line-height: 1; }
        .fz-head-actions { display: flex; align-items: center; gap: 10px; }
        .fz-btn { min-height: 44px; padding: 0 18px; border-radius: 10px; background: transparent; font-family: inherit; font-size: 14px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; transition: background 0.15s; }
        .fz-btn-in { border: 1.5px solid var(--fz-in); color: var(--fz-in); }
        .fz-btn-in:hover { background: rgba(92,203,168,0.12); }
        .fz-btn-out { border: 1.5px solid var(--fz-out); color: var(--fz-out); }
        .fz-btn-out:hover { background: rgba(255,138,128,0.12); }
        .fz-minus { font-size: 17px; line-height: 1; width: 15px; text-align: center; }
        .fz-card { background: rgba(255,255,255,0.035); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 22px; min-width: 0; }
        .fz-card-title { font-family: 'Bebas Neue', sans-serif; font-size: 20px; letter-spacing: 0.5px; margin: 0 0 14px 0; }
        .fz-card-title-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
        .fz-total { font-family: 'JetBrains Mono', monospace; font-size: 15px; font-weight: 600; font-variant-numeric: tabular-nums; }
        .fz-hero { display: grid; grid-template-columns: minmax(0,1fr) auto minmax(0,1fr) auto minmax(0,1fr) auto minmax(0,1.25fr); align-items: stretch; gap: 8px; }
        .fz-op { align-self: center; font-size: 20px; width: 14px; text-align: center; color: var(--text-dim); font-family: 'JetBrains Mono', monospace; }
        .fz-hero-card { display: flex; flex-direction: column; gap: 6px; padding: 18px; }
        .fz-hero-main { background: #1e2a27; border-color: #2f5a4c; }
        .fz-hero-main.neg { background: #2b1a1c; border-color: #6b2f33; }
        .fz-label { font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-dim); }
        .fz-label.in { color: var(--fz-in); }
        .fz-label.out { color: var(--fz-out); }
        .fz-big { font-family: 'JetBrains Mono', monospace; font-variant-numeric: tabular-nums; font-size: 22px; font-weight: 700; line-height: 1.15; white-space: nowrap; }
        .fz-big.neg { color: var(--fz-out); }
        .fz-hint { font-size: 12.5px; color: var(--text-dim); line-height: 1.4; }
        .fz-hint b { font-weight: 600; font-family: 'JetBrains Mono', monospace; }
        .fz-hint.warn { color: var(--fz-wait-fg); }
        .fz-bar { height: 6px; border-radius: 999px; background: rgba(255,255,255,0.08); overflow: hidden; }
        .fz-bar.big { height: 8px; margin: 10px 0 8px; }
        .fz-bar i { display: block; height: 100%; border-radius: 999px; background: var(--text-dim); }
        .fz-bar i.in { background: var(--fz-in); }
        .fz-bar i.out { background: var(--fz-out); }
        .fz-bar i.amber { background: var(--amber); }
        .fz-row-2 { display: grid; grid-template-columns: minmax(0,1.6fr) minmax(0,1fr); gap: 18px; align-items: stretch; }
        .fz-row-2.even { grid-template-columns: minmax(0,1fr) minmax(0,1fr); }
        .fz-col { display: flex; flex-direction: column; gap: 18px; min-width: 0; }
        .fz-col > .fz-card:last-child { flex: 1; }
        .fz-alert-box { background: #2b2519; border: 1px solid #4a3d22; color: #f3dda8; border-radius: 12px; padding: 12px 14px; font-size: 13.5px; line-height: 1.5; margin-bottom: 14px; }
        .fz-alert-box.red { background: #2b1a1c; border-color: #6b2f33; color: #ffc4be; }
        .fz-trow { display: grid; grid-template-columns: 54px 1fr 112px 124px; gap: 10px; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--fz-line); font-size: 13.5px; }
        .fz-trow .num { font-size: 13px; }
        .fz-thead { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-dim); padding-top: 0; }
        .fz-tfoot { font-weight: 700; border-bottom: none; border-top: 1px solid rgba(255,255,255,0.14); }
        .fz-trow-desc { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; min-width: 0; overflow-wrap: anywhere; }
        .fz-trow .bal { color: var(--text); }
        .fz-trow .bal.neg { color: var(--fz-out); }
        .fz-chip { border: none; font-family: inherit; font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 999px; cursor: pointer; white-space: nowrap; }
        .fz-chip.ok { background: var(--fz-in-bg); color: var(--fz-in-fg); }
        .fz-chip.wait { background: var(--fz-wait-bg); color: var(--fz-wait-fg); }
        .fz-chip.late { background: var(--fz-out-bg); color: var(--fz-out-fg); }
        .fz-chip-sm { font-size: 10.5px; padding: 2px 8px; cursor: default; }
        .fz-alerts { display: flex; flex-direction: column; }
        .fz-alert { display: flex; align-items: center; gap: 12px; padding: 11px 0; border-bottom: 1px solid var(--fz-line); }
        .fz-alert:last-child { border-bottom: none; padding-bottom: 0; }
        .fz-alert:first-child { padding-top: 0; }
        .fz-alert-body { flex: 1; min-width: 0; }
        .fz-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; background: var(--fz-out); }
        .fz-dot.pendencia { background: var(--amber); }
        .fz-dot.sugestao { background: var(--fz-blue); }
        .fz-alert-btn { background: transparent; border: 1px solid rgba(255,255,255,0.18); color: var(--text); border-radius: 8px; padding: 6px 12px; font-family: inherit; font-size: 12.5px; font-weight: 600; cursor: pointer; white-space: nowrap; }
        .fz-alert-btn:hover { background: rgba(255,255,255,0.07); }
        .fz-ttl { margin: 0; font-size: 14px; font-weight: 600; overflow-wrap: anywhere; }
        .fz-sub { margin: 2px 0 0; font-size: 12.5px; color: var(--text-dim); display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
        .fz-sem-cat { color: var(--fz-wait-fg); }
        .fz-ok-state { color: var(--fz-in); font-weight: 600; font-size: 14px; }
        .fz-folego-txt { margin: 0; font-size: 14px; }
        .fz-folego-txt b { font-family: 'JetBrains Mono', monospace; font-size: 17px; }
        .fz-list { display: flex; flex-direction: column; }
        .fz-lrow { position: relative; display: grid; grid-template-columns: 44px minmax(0,1fr) auto auto; gap: 12px; align-items: center; padding: 11px 0; border-bottom: 1px solid var(--fz-line); }
        .fz-lrow.is-dim .fz-ttl, .fz-lrow.is-dim .fz-lvalor, .fz-lrow.is-dim .fz-date b { opacity: 0.55; }
        .fz-date { display: flex; flex-direction: column; align-items: center; line-height: 1.05; }
        .fz-date b { font-family: 'JetBrains Mono', monospace; font-size: 18px; font-weight: 700; }
        .fz-date span { font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-dim); }
        .fz-date.late b { color: var(--fz-out); }
        .fz-lmain { min-width: 0; }
        .fz-parcela { margin-left: 8px; font-size: 12px; font-weight: 500; color: var(--text-dim); }
        .fz-lvalor { font-family: 'JetBrains Mono', monospace; font-variant-numeric: tabular-nums; font-size: 14px; font-weight: 600; text-align: right; white-space: nowrap; }
        .fz-lactions { position: absolute; right: 0; top: 50%; transform: translateY(-50%); display: flex; gap: 4px; padding: 4px; border-radius: 10px; background: #2a2c31; box-shadow: 0 2px 10px rgba(0,0,0,0.45); opacity: 0; pointer-events: none; transition: opacity 0.12s; }
        .fz-lrow:hover .fz-lactions, .fz-lrow:focus-within .fz-lactions { opacity: 1; pointer-events: auto; }
        .fz-lactions .icon-btn { width: 26px; height: 26px; }
        .fz-nf { border: none; font-family: inherit; font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 999px; cursor: pointer; }
        .fz-nf.ok { background: rgba(255,255,255,0.08); color: var(--text-dim); }
        .fz-nf.sem { background: var(--fz-wait-bg); color: var(--fz-wait-fg); }
        .fz-group-head { display: flex; align-items: center; justify-content: space-between; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-dim); margin: 14px 0 2px; }
        .fz-group-head:first-of-type { margin-top: 0; }
        .fz-link-btn { background: none; border: none; color: var(--fz-blue); font-family: inherit; font-size: 12px; font-weight: 600; cursor: pointer; text-transform: none; letter-spacing: 0; }
        .fz-cats { display: flex; flex-direction: column; gap: 14px; }
        .fz-cat-head { display: flex; justify-content: space-between; gap: 10px; margin-bottom: 6px; font-size: 13.5px; }
        .fz-cat-nome.sem { color: var(--fz-wait-fg); }
        .fz-cat-val { font-family: 'JetBrains Mono', monospace; font-size: 12.5px; color: var(--text-dim); font-variant-numeric: tabular-nums; white-space: nowrap; }
        .fz-prov { display: flex; flex-direction: column; }
        .fz-prov-line { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 11px 0; border-bottom: 1px solid var(--fz-line); }
        .fz-prov-line.total { border-bottom: none; padding-bottom: 14px; }
        .fz-prov-line b.num { font-size: 15px; font-weight: 700; }
        .fz-seal { border-radius: 10px; padding: 10px 12px; font-size: 13px; font-weight: 600; line-height: 1.4; }
        .fz-seal.ok { background: var(--fz-in-bg); color: var(--fz-in-fg); }
        .fz-seal.bad { background: var(--fz-out-bg); color: var(--fz-out-fg); }
        @media (hover: none) { .fz-lrow { grid-template-columns: 44px minmax(0,1fr) auto auto auto; } .fz-lactions { position: static; transform: none; background: none; box-shadow: none; padding: 0; opacity: 1; pointer-events: auto; } }
        @container (max-width: 860px) {
          .fz-hero { grid-template-columns: 1fr 1fr; }
          .fz-op { display: none; }
          .fz-row-2, .fz-row-2.even { grid-template-columns: 1fr; }
        }
        @container (max-width: 560px) {
          .fz-hero { grid-template-columns: 1fr; }
          .fz-title { font-size: 32px; }
          .fz-head-actions { width: 100%; }
          .fz-head-actions .fz-btn { flex: 1; justify-content: center; }
          .fz-trow { grid-template-columns: 48px 1fr 104px; }
          .fz-col-saldo { display: none; }
          .fz-lrow { grid-template-columns: 40px minmax(0,1fr) auto; }
          @media (hover: none) { .fz-lrow { grid-template-columns: 40px minmax(0,1fr) auto auto; } }
          .fz-lrow .fz-chip { display: none; }
        }
        .config-hint { font-size: 12.5px; color: var(--text-dim); margin: 0 0 16px 0; }
        .config-tipo-list { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
        .config-tipo-item { display: flex; align-items: center; justify-content: space-between; background: var(--surface-alt); border: 1px solid var(--border); border-radius: 6px; padding: 8px 10px; font-size: 13px; }
        .config-add-row { display: flex; gap: 8px; }
        .config-add-row input { flex: 1; }
        .equipe-passos { font-size: 13px; background: var(--surface-alt); border: 1px solid var(--border); border-radius: 10px; padding: 12px 14px; margin-bottom: 16px; line-height: 1.5; }
        .equipe-passos ol { margin: 6px 0 0; padding-left: 18px; }
        .equipe-convite { white-space: pre-wrap; overflow-wrap: anywhere; font-family: 'JetBrains Mono', monospace; font-size: 12px; margin: 8px 0 10px; user-select: all; }
        .equipe-card { display: block; border: 1px solid var(--border); border-radius: 12px; padding: 14px; margin-bottom: 12px; }
        .equipe-card.off { opacity: 0.65; }
        .equipe-card-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; flex-wrap: wrap; }
        .equipe-email { font-size: 12.5px; color: var(--text-dim); margin-top: 4px; }
        .equipe-acoes { display: flex; gap: 8px; align-items: center; }
        .equipe-confirma { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; font-size: 12.5px; color: var(--amber); margin-top: 10px; }
        .equipe-sub { font-size: 12.5px; color: var(--text-dim); margin: 10px 0 6px; }
        .equipe-clientes { display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 6px; max-height: 180px; overflow-y: auto; }
        .app .equipe-clientes label { display: flex; align-items: center; gap: 6px; font-size: 13px; text-transform: none; letter-spacing: 0; color: var(--text); margin: 0; cursor: pointer; }
        .app .equipe-clientes input { width: auto; margin: 0; padding: 0; flex-shrink: 0; }
        .config-tipo-item input { flex: 1; margin-right: 8px; }
        .config-tipo-actions { display: flex; gap: 4px; flex-shrink: 0; }
        .config-cards { display: flex; gap: 14px; flex-wrap: wrap; }
        .config-card {
          display: flex; flex-direction: column; align-items: flex-start; gap: 8px;
          width: 220px; padding: 20px; background: var(--surface); border: 1px solid var(--border);
          border-radius: 12px; cursor: pointer; text-align: left; color: var(--text);
          transition: border-color 0.15s, transform 0.15s;
        }
        .config-card:hover { border-color: var(--brand); transform: translateY(-2px); }
        .config-card-title { font-size: 14px; font-weight: 600; }
        .config-card-sub { font-size: 12px; color: var(--text-dim); }
        .config-back { background: none; border: none; color: var(--text-dim); font-size: 12.5px; display: flex; align-items: center; gap: 4px; cursor: pointer; padding: 0; margin-bottom: 14px; }
        .config-back:hover { color: var(--text); }
        .config-cores-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 6px; }
        .config-cor-item { display: flex; align-items: center; gap: 10px; font-size: 13px; }
        .config-cor-item input[type=color] { width: 34px; height: 28px; padding: 2px; border-radius: 6px; cursor: pointer; }


        .news-panel { padding: 4px 28px 14px 28px; }
        .news-panel-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
        .news-panel-title { font-size: 11px; text-transform: uppercase; letter-spacing: 0.4px; color: var(--text-dim); font-family: 'JetBrains Mono', monospace; }
        .news-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 7px; }
        .news-list li { border-bottom: 1px solid var(--border); padding-bottom: 7px; }
        .news-list li:last-child { border-bottom: none; padding-bottom: 0; }
        .news-list a { color: var(--text); text-decoration: none; font-size: 13px; line-height: 1.4; }
        .news-list a:hover { color: var(--amber); }
        .news-empty { color: var(--text-dim); font-size: 12.5px; padding: 10px 0; }
        .news-retry { background: none; border: 1px solid var(--border); color: var(--text-dim); padding: 3px 9px; border-radius: 5px; font-size: 11.5px; cursor: pointer; margin-left: 6px; }
        .news-retry:hover { border-color: var(--amber); color: var(--amber); }
        .carousel { padding: 4px 0 6px 0; }
        .carousel-viewport { overflow: hidden; touch-action: pan-y; cursor: grab; }
        .carousel-viewport:active { cursor: grabbing; }
        .carousel-track { display: flex; transition: transform 0.4s cubic-bezier(0.22, 1, 0.36, 1); user-select: none; }
        .carousel-track.dragging { transition: none; }
        .carousel-slide { flex: 0 0 100%; min-width: 0; }
        .carousel-dots { display: flex; justify-content: center; gap: 7px; padding: 2px 0 4px 0; }
        .carousel-dot { width: 7px; height: 7px; border-radius: 50%; border: none; background: var(--border); cursor: pointer; padding: 0; transition: background 0.2s, transform 0.2s; }
        .carousel-dot:hover { background: var(--text-dim); }
        .carousel-dot.active { background: var(--brand); transform: scale(1.3); }
        .notifications-row { display: flex; flex-wrap: wrap; gap: 8px; margin: 4px 28px 0 28px; }
        .followup-banner {
          background: var(--red-dark); border: 1px solid var(--red); color: #ffb4ac;
          padding: 7px 8px 7px 12px; border-radius: 8px; display: flex; align-items: center; gap: 8px; font-size: 12px;
          flex: 0 1 auto; max-width: 340px;
        }
        .followup-banner span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .followup-banner svg { flex-shrink: 0; }
        .followup-link { flex-shrink: 0; background: none; border: 1px solid var(--red); color: #ffb4ac; padding: 3px 8px; border-radius: 6px; font-size: 11px; cursor: pointer; white-space: nowrap; }
        .followup-link:hover { background: var(--red); color: #2a0a07; }
        .followup-dismiss { flex-shrink: 0; background: none; border: none; color: inherit; opacity: 0.6; padding: 2px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
        .followup-dismiss:hover { opacity: 1; }
        .followup-banner.tone-wait { background: var(--amber-dark); border-color: var(--amber); color: var(--amber); }
        .followup-banner.tone-wait .followup-link { border-color: var(--amber); color: var(--amber); }
        .followup-banner.tone-wait .followup-link:hover { background: var(--amber); color: #1a1305; }
        .followup-banner.tone-urgent { background: #3a2408; border-color: #ffb257; color: #ffb257; }
        .followup-banner.tone-urgent .followup-link { border-color: #ffb257; color: #ffb257; }
        .followup-banner.tone-urgent .followup-link:hover { background: #ffb257; color: #2a1608; }
        .slate-current { color: var(--brand); font-weight: 600; text-transform: none; }
        .stat {
          background: rgba(255,255,255,0.035);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 14px;
          padding: 14px 18px;
          min-width: 130px;
          backdrop-filter: blur(6px);
        }
        .stat .n { font-family: 'JetBrains Mono', monospace; font-size: 22px; font-weight: 600; }
        .stat .l { font-size: 11px; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px; }
        .stat-icon-sq {
          width: 34px; height: 34px; border-radius: 10px; display: flex; align-items: center; justify-content: center;
          margin-bottom: 10px;
        }
        .stat-icon-sq.teal { background: rgba(79,168,160,0.18); color: var(--teal); }
        .stat-icon-sq.amber { background: rgba(217,164,65,0.18); color: var(--amber); }
        .stat-icon-sq.red { background: rgba(226,87,76,0.18); color: var(--red); }
        .stat-icon-sq.brand { background: rgba(255,84,73,0.18); color: var(--brand); }

        .home-grid { display: grid; grid-template-columns: 1.5fr 1fr; gap: 20px; align-items: start; }
        .home-greeting { font-family: 'Bebas Neue', sans-serif; font-size: 30px; letter-spacing: 0.5px; margin: 0 0 2px 0; }
        .home-date { color: var(--text-dim); font-size: 13px; text-transform: capitalize; margin: 0 0 18px 0; }
        .home-quick-stats { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 16px; }
        .home-quick-stats .stat { flex: 1; min-width: 130px; }
        .home-quick-actions { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 4px; }
        .home-quick-actions .btn-ghost { display: flex; align-items: center; gap: 5px; margin-left: 0; }
        .home-card {
          background: rgba(255,255,255,0.035); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px;
          padding: 16px 18px; margin-bottom: 16px; backdrop-filter: blur(8px);
        }
        .home-card h4 {
          display: flex; align-items: center; gap: 7px; font-family: 'Bebas Neue', sans-serif; font-size: 16px;
          letter-spacing: 0.4px; margin: 0 0 10px 0; color: var(--text-dim);
        }
        .home-card-empty { color: var(--text-dim); font-size: 12.5px; padding: 4px 0; }
        .home-quicknote-row { display: flex; gap: 8px; margin-bottom: 6px; }
        .home-quicknote-row input { flex: 1; }
        .home-quicknote-row .icon-btn { flex-shrink: 0; }
        .home-quicknote-row .icon-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .home-row { display: flex; align-items: center; gap: 9px; padding: 8px 4px; border-top: 1px solid var(--border); cursor: pointer; }
        .home-row:first-of-type { border-top: none; }
        .home-row:hover { background: rgba(255,255,255,0.04); border-radius: 6px; }
        .home-row-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; background: var(--text-dim); }
        .home-row-dot.tone-late { background: var(--red); }
        .home-row-dot.tone-urgent { background: #ffb257; }
        .home-row-dot.tone-wait { background: var(--amber); }
        .home-row-dot.tone-ok { background: var(--teal); }
        .home-row-dot.tone-done { background: var(--green); }
        .home-row-dot.tone-standby { background: var(--violet); }
        .home-row-title { flex: 1; font-size: 13px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .home-row-sub { font-size: 11.5px; color: var(--text-dim); flex-shrink: 0; }
        .home-row-kanban { cursor: default; }
        .home-row-kanban input[type="checkbox"] { width: 15px; height: 15px; flex-shrink: 0; cursor: pointer; }
        .home-row-kanban .home-row-title { cursor: pointer; }
        .stat.warn .n { color: var(--red); }
        .stat.wait .n { color: var(--amber); }
        .stat.ready .n { color: var(--teal); }
        .body { display: flex; }
        .rail {
          width: 220px;
          border-right: 1px solid rgba(255,255,255,0.07);
          background: rgba(255, 255, 255, 0.015);
          padding: 0 12px 16px 12px;
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          max-height: 100vh;
          overflow-y: auto;
          scrollbar-width: none;
        }
        .rail::-webkit-scrollbar { display: none; }
        .right-col { scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.15) transparent; }
        .right-col::-webkit-scrollbar { width: 8px; }
        .right-col::-webkit-scrollbar-track { background: transparent; }
        .right-col::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 4px; }
        .rail-collapse-btn {
          display: flex; align-items: center; justify-content: center;
          width: 100%; padding: 6px 0; margin-bottom: 8px;
          background: none; border: 1px solid var(--border); border-radius: 8px;
          color: var(--text-dim); cursor: pointer; flex-shrink: 0;
          transition: background 0.15s, color 0.15s;
        }
        .rail-collapse-btn:hover { background: rgba(255,255,255,0.06); color: var(--text); }
        .rail.collapsed { width: 56px; padding: 0 6px 12px 6px; }
        .rail.collapsed .brand-block { padding: 16px 0 12px 0; display: flex; justify-content: center; }
        .rail.collapsed .brand-logo-img { height: 24px; }
        .rail.collapsed .rail-label { display: none; }
        .rail.collapsed .rail-btn { justify-content: center; padding: 10px 4px; gap: 0; position: relative; }
        .rail.collapsed .rail-tag { position: absolute; margin-left: 0; top: 4px; right: 4px; }
        .rail-btn {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 12px; border-radius: 10px; cursor: pointer;
          font-size: 13px; color: var(--text-dim); margin-bottom: 3px;
          border: 1px solid transparent; background: none;
          width: 100%; text-align: left; white-space: nowrap;
          transition: background 0.15s, color 0.15s;
        }
        .rail-btn svg { flex-shrink: 0; }
        .rail-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .rail-btn:hover { background: rgba(255,255,255,0.06); color: var(--text); }
        .rail-btn.active { background: linear-gradient(135deg, var(--brand), var(--brand-2)); color: #fff; border-color: transparent; box-shadow: 0 6px 18px var(--brand-glow); }
        .rail-btn.disabled { opacity: 0.4; cursor: default; }
        .rail-btn.disabled:hover { background: none; color: var(--text-dim); }
        .rail-tag { font-size: 9.5px; background: var(--border); padding: 1px 6px; border-radius: 4px; margin-left: auto; flex-shrink: 0; }
        .rail-tag-alert { background: var(--red); color: #2a0a07; font-weight: 700; }
        .rail-divider { height: 1px; background: rgba(255,255,255,0.07); margin: 10px 6px; }
        @media (max-width: 680px) {
          .rail { width: 56px; padding: 0 6px 12px 6px; }
          .brand-block { padding: 16px 0 12px 0; display: flex; justify-content: center; }
          .brand-logo-img { height: 24px; }
          .rail-label { display: none; }
          .rail-btn { justify-content: center; padding: 10px 4px; gap: 0; position: relative; }
          .rail-tag { position: absolute; margin-left: 0; top: 4px; right: 4px; }
          .slate { padding: 4px 14px 0 14px; }
          .notifications-row { margin: 4px 14px 0 14px; }
          .main { padding: 14px; }
          .stats-row { padding: 12px 14px; gap: 8px; }
          .finance-cards, .home-quick-stats { gap: 8px; }
          .stat, .finance-cards .stat, .home-quick-stats .stat { min-width: 0; flex: 1 1 30%; padding: 10px 12px; }
          .followup-banner { flex: 1 1 100%; max-width: none; min-width: 0; }
          .followup-banner span { min-width: 0; flex-shrink: 1; }
          .table-scroll { overflow-x: auto; }
          .home-grid { grid-template-columns: 1fr; }
          .finance-top-grid { flex-wrap: wrap; }
          .home-row-sub { max-width: 40%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
          #root { padding: 0; }
          .app { border-radius: 0; border: none; box-shadow: none; height: 100vh; min-height: 100vh; }
          .shell { height: 100%; min-height: 0; }
          .right-col { overflow-y: auto; min-height: 0; }
        }
        .toast {
          position: absolute; top: 14px; right: 20px; z-index: 40;
          background: var(--teal-dark); border: 1px solid var(--teal); color: var(--teal);
          padding: 10px 14px; border-radius: 8px; font-size: 12.5px; display: flex; gap: 8px; align-items: center; max-width: 380px;
        }
        .tool-frame-wrap { flex: 1; padding: 0; }
        .tool-frame-wrap iframe { width: 100%; height: 78vh; min-height: 640px; border: none; display: block; background: #0A0B0D; }
        .main { flex: 1; padding: 20px 28px; min-width: 0; }
        .toolbar { display: flex; gap: 10px; margin-bottom: 16px; align-items: center; flex-wrap: wrap; }
        .view-toggle { display: flex; border: 1px solid var(--border); border-radius: 6px; overflow: hidden; }
        .view-toggle-btn { background: var(--surface-alt); border: none; color: var(--text-dim); width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; cursor: pointer; }
        .view-toggle-btn + .view-toggle-btn { border-left: 1px solid var(--border); }
        .view-toggle-btn.active { background: linear-gradient(135deg, var(--brand), var(--brand-2)); color: #fff; }
        .view-toggle-btn.active .view-icon-list span, .view-toggle-btn.active .view-icon-grid span { background: #fff; }
        .view-icon-list { display: flex; flex-direction: column; gap: 3px; width: 15px; }
        .view-icon-list span { height: 2px; background: var(--text-dim); border-radius: 1px; }
        .view-icon-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2px; width: 14px; height: 14px; }
        .view-icon-grid span { background: var(--text-dim); border-radius: 1px; }
        .client-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 14px; }
        .client-card { aspect-ratio: 1 / 1; border-radius: 16px; overflow: hidden; border: 1px solid rgba(255,255,255,0.08); cursor: pointer; display: flex; flex-direction: column; background: rgba(255,255,255,0.03); transition: border-color 0.15s, transform 0.15s, box-shadow 0.15s; }
        .client-card:hover { border-color: var(--brand); transform: translateY(-2px); box-shadow: 0 10px 24px rgba(0,0,0,0.35); }
        .client-card-cover { flex: 1; background: var(--surface); background-size: cover; background-position: center; display: flex; align-items: center; justify-content: center; color: var(--text-dim); }
        .client-card-footer { padding: 8px 10px; display: flex; align-items: center; gap: 7px; font-size: 12.5px; font-weight: 600; border-top: 1px solid var(--border); background: var(--surface-alt); }
        .client-card-footer span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .capa-preview { margin-top: 8px; width: 100%; aspect-ratio: 3 / 1; border-radius: 6px; background-size: cover; background-position: center; border: 1px solid var(--border); }
        .toolbar input, .toolbar select {
          background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); color: var(--text);
          padding: 9px 12px; border-radius: 10px; font-size: 13px; font-family: inherit;
        }
        .btn-primary {
          background: linear-gradient(135deg, var(--brand), var(--brand-2)); color: #fff; border: none; font-weight: 600;
          padding: 9px 16px; border-radius: 10px; font-size: 13px; cursor: pointer;
          display: flex; align-items: center; gap: 6px; margin-left: auto;
          box-shadow: 0 6px 16px var(--brand-glow);
          transition: filter 0.15s, transform 0.15s;
        }
        .btn-primary:hover { filter: brightness(1.1); transform: translateY(-1px); }
        table { width: 100%; border-collapse: collapse; font-size: 13px; }
        th { text-align: left; color: var(--text-dim); font-weight: 500; font-size: 11px; text-transform: uppercase; letter-spacing: 0.4px; padding: 8px 10px; border-bottom: 1px solid var(--border); }
        .sortable-th { cursor: pointer; user-select: none; white-space: nowrap; }
        .sortable-th:hover { color: var(--text); }
        td { padding: 10px; border-bottom: 1px solid var(--border); vertical-align: middle; }
        tr:hover td { background: var(--surface-alt); }
        .proj { font-weight: 600; }
        .mono { font-family: 'JetBrains Mono', monospace; font-size: 12px; color: var(--text-dim); }
        .badge { padding: 3px 9px; border-radius: 4px; font-size: 11px; font-weight: 600; display: inline-block; white-space: nowrap; }
        .badge-late { background: var(--red-dark); color: #ff9d95; }
        .badge-wait { background: var(--amber-dark); color: var(--amber); }
        .badge-urgent { background: #3a2408; color: #ffb257; }
        .badge-ok { background: var(--teal-dark); color: var(--teal); }
        .badge-done { background: var(--green-dark); color: var(--green); }
        .badge-standby { background: var(--violet-dark); color: var(--violet); }
        .badge-neutral { background: var(--surface-alt); color: var(--text-dim); }
        .badge-ready { background: var(--teal-dark); color: var(--teal); }
        .badge-locked { background: var(--surface-alt); color: var(--text-dim); }
        .row-actions { display: flex; gap: 6px; }
        .icon-btn { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.09); color: var(--text-dim); width: 28px; height: 28px; border-radius: 9px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: background 0.15s, color 0.15s, border-color 0.15s; }
        .icon-btn:hover { color: var(--text); border-color: var(--brand); background: rgba(155,107,242,0.12); }
        .expand-btn { background: none; border: none; color: var(--text-dim); cursor: pointer; font-size: 13px; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; }
        .expand-btn:hover { color: var(--brand); }
        tr.clickable-row { cursor: pointer; }
        tr.clickable-row:hover td { background: var(--surface-alt); }
        .video-subrow td { background: var(--surface-alt); padding: 10px 10px 10px 46px; border-bottom: 1px solid var(--border); }
        .video-sublist { display: flex; flex-direction: column; gap: 6px; }
        .video-subrow-item { display: flex; align-items: center; gap: 10px; padding: 4px 6px; border-radius: 6px; }
        .video-subrow-name { flex: 1; font-size: 12.5px; color: var(--text); }
        .video-subrow-item select { background: var(--surface); border: 1px solid var(--border); color: var(--text); padding: 5px 8px; border-radius: 5px; font-size: 12px; width: 190px; }
        .video-subrow-item input[type="date"] { background: var(--surface); border: 1px solid var(--border); color: var(--text); padding: 5px 8px; border-radius: 5px; font-size: 12px; width: 140px; }
        .demand-status-select { background: var(--surface); border: 1px solid var(--border); color: var(--text); padding: 6px 10px; border-radius: 7px; font-size: 12.5px; font-family: inherit; }
        .demand-drag-handle { display: flex; align-items: center; justify-content: center; color: var(--text-dim); cursor: grab; }
        .demand-drag-handle:active { cursor: grabbing; }
        .demand-drag-handle:hover { color: var(--text); }
        .demand-drag-handle.disabled { color: var(--border); cursor: not-allowed; opacity: 0.5; }
        .demand-drag-handle.disabled:hover { color: var(--border); }
        .empty { text-align: center; padding: 50px 0; color: var(--text-dim); }
        .overlay { position: fixed; inset: 0; background: rgba(10,8,16,0.65); backdrop-filter: blur(3px); display: flex; align-items: center; justify-content: center; z-index: 50; padding: 20px; }
        .modal { background: rgba(29, 32, 37, 0.92); backdrop-filter: blur(16px); border: 1px solid rgba(255,255,255,0.1); border-radius: 18px; width: 480px; max-width: 100%; max-height: 90vh; overflow-y: auto; padding: 24px; box-shadow: 0 30px 70px rgba(0,0,0,0.5); }
        .modal h3 { font-family: 'Bebas Neue', sans-serif; font-size: 22px; letter-spacing: 1px; margin: 0 0 16px 0; display: flex; justify-content: space-between; align-items: center; }
        .field { margin-bottom: 12px; }
        .field label { display: block; font-size: 11.5px; color: var(--text-dim); margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.4px; }
        .field input, .field select, .field textarea {
          width: 100%; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); color: var(--text);
          padding: 9px 12px; border-radius: 10px; font-size: 13.5px; font-family: inherit;
          transition: border-color 0.15s;
        }
        .field input:focus, .field select:focus, .field textarea:focus { outline: none; border-color: var(--brand); }
        .field textarea { resize: vertical; min-height: 60px; }
        .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 18px; }
        .btn-ghost { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); color: var(--text); padding: 9px 16px; border-radius: 10px; font-size: 13px; cursor: pointer; transition: background 0.15s, border-color 0.15s; }
        .btn-despesa, .btn-receita {
          border: none; font-weight: 600; padding: 9px 16px; border-radius: 10px; font-size: 13px; cursor: pointer;
          display: flex; align-items: center; gap: 6px; transition: filter 0.15s, transform 0.15s;
        }
        .btn-despesa:hover, .btn-receita:hover { filter: brightness(1.1); transform: translateY(-1px); }
        .btn-despesa { background: var(--red); color: #2a0a07; }
        .btn-receita { background: var(--green); color: #0d2a0f; }
        .btn-ghost:hover { background: rgba(255,255,255,0.07); border-color: rgba(255,255,255,0.18); }
        .btn-danger { background: var(--red); color: #2a0a07; border: none; padding: 9px 16px; border-radius: 10px; font-size: 13px; font-weight: 600; cursor: pointer; }
        .lock-note { font-size: 11.5px; color: var(--text-dim); margin-top: 4px; display: flex; gap: 5px; align-items: center; }
        .video-item-row { display: flex; gap: 6px; align-items: center; margin-bottom: 6px; }
        .video-item-row input[type="text"], .video-item-row input:not([type]) { flex: 1.2; min-width: 0; }
        .video-item-row select { flex: 1; min-width: 0; font-size: 12px; padding: 6px 6px; }
        .video-item-row input[type="date"] { flex: 0.9; min-width: 0; font-size: 12px; padding: 6px 6px; }
        .video-item-row input[type="checkbox"] { width: 16px; height: 16px; flex-shrink: 0; }
        .processos-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 14px; }
        .processo-card { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 14px; display: flex; flex-direction: column; gap: 8px; }
        .processo-card-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; }
        .processo-card-actions { display: flex; gap: 4px; flex-shrink: 0; }
        .processo-card-title { margin: 0; font-size: 14px; font-weight: 600; }
        .processo-card-text { margin: 0; font-size: 12.5px; color: var(--text-dim); white-space: pre-wrap; max-height: 90px; overflow-y: auto; line-height: 1.5; }
        .processo-card-buttons { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
        .processo-card-obs { margin: 0; font-size: 11.5px; color: var(--text-dim); font-style: italic; }
        .processo-img-preview { width: 100%; max-height: 160px; object-fit: contain; border-radius: 8px; background: rgba(255,255,255,0.03); }
        .processo-img-loading { font-size: 11.5px; color: var(--text-dim); padding: 20px 0; text-align: center; }
        .agenda-modo-toggle { display: flex; gap: 4px; margin-left: 10px; }
        .agenda-modo-toggle .btn-ghost { padding: 7px 12px; font-size: 12.5px; }
        .btn-ghost.active { background: var(--brand); border-color: transparent; color: #fff; }
        .agenda-month-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; }
        .agenda-month-weekday { text-align: center; font-size: 11px; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.4px; padding-bottom: 4px; }
        .agenda-month-day { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 6px; min-height: 84px; cursor: pointer; display: flex; flex-direction: column; gap: 3px; transition: border-color 0.15s; }
        .agenda-month-day:hover { border-color: var(--brand); }
        .agenda-month-day.outside { opacity: 0.4; }
        .agenda-month-day.today .agenda-month-day-num { color: var(--brand); font-weight: 700; }
        .agenda-month-day-num { font-size: 12px; color: var(--text-dim); }
        .agenda-month-event-chip { font-size: 11px; background: rgba(255,255,255,0.06); border-radius: 4px; padding: 2px 5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .agenda-month-event-chip:hover { background: var(--brand); color: #fff; }
        .agenda-month-more { font-size: 10.5px; color: var(--text-dim); padding-left: 5px; }
      `;

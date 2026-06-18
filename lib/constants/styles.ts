export const GLOBAL_CSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { height: 100%; }
  ::-webkit-scrollbar { width: 4px; height: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }

  @keyframes fadeUp   { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
  @keyframes fadeIn   { from { opacity:0; } to { opacity:1; } }
  @keyframes slideUp  { from { opacity:0; transform:translateY(40px); } to { opacity:1; transform:translateY(0); } }
  @keyframes toastIn  { from { opacity:0; transform:translateX(60px) scale(.9); } to { opacity:1; transform:translateX(0) scale(1); } }

  .fade-up  { animation: fadeUp  .3s cubic-bezier(.22,.68,0,1.2) forwards; }
  .fade-in  { animation: fadeIn  .25s ease forwards; }

  .crm-input {
    display: block; width: 100%;
    background: var(--app-input) !important;
    color: var(--app-text) !important;
    border: 1.5px solid var(--app-border) !important;
    border-radius: 10px !important;
    padding: 11px 14px !important;
    font-size: 13px !important;
    font-weight: 600 !important;
    outline: none !important;
    font-family: inherit !important;
    transition: border-color .15s, box-shadow .15s !important;
  }
  .crm-input:focus {
    border-color: var(--app-primary) !important;
    box-shadow: 0 0 0 3px var(--app-primary-soft) !important;
  }
  select.crm-input option { background: var(--app-panel); color: var(--app-text); }

  .btn-primary {
    display: inline-flex; align-items: center; justify-content: center; gap: 6px;
    background: var(--app-primary);
    border: none; color: #fff; border-radius: 8px;
    padding: 9px 14px; min-height: 36px; font-weight: 700; cursor: pointer; font-size: 12px;
    transition: all .18s; box-shadow: 0 4px 12px rgba(115,103,240,.24);
    white-space: nowrap; font-family: inherit;
  }
  .btn-primary:hover:not(:disabled) { background: var(--app-primary-strong); box-shadow: 0 6px 18px rgba(115,103,240,.3); }
  .btn-primary:disabled { opacity: .45; cursor: not-allowed; }

  .btn-ghost {
    display: inline-flex; align-items: center; justify-content: center; gap: 6px;
    background: var(--app-panel-soft); border: 1.5px solid var(--app-border);
    color: var(--app-muted); border-radius: 8px;
    padding: 9px 14px; min-height: 36px; font-weight: 700; cursor: pointer; font-size: 12px;
    transition: all .15s; white-space: nowrap; font-family: inherit;
  }
  .btn-ghost:hover { border-color: rgba(115,103,240,.4); color: var(--app-primary); }

  .btn-icon {
    display: inline-flex; align-items: center; justify-content: center;
    border-radius: 7px; padding: 7px 10px; cursor: pointer; font-size: 12px;
    font-weight: 700; border: 1.5px solid transparent; transition: all .15s;
    font-family: inherit; white-space: nowrap;
  }

  .crm-table { width: 100%; border-collapse: collapse; min-width: 520px; }
  .crm-table th {
    padding: 11px 16px; text-align: left; font-size: 10.5px; font-weight: 800;
    color: var(--app-muted); letter-spacing: .6px; text-transform: uppercase;
    border-bottom: 1px solid var(--app-border); white-space: nowrap; background: var(--app-panel);
  }
  .crm-table td {
    padding: 12px 16px; font-size: 13px; border-bottom: 1px solid var(--app-border); vertical-align: middle;
  }
  .crm-table tr:last-child td { border-bottom: none; }
  .crm-table tbody tr { transition: background .12s; }
  .crm-table tbody tr:hover td { background: var(--app-primary-soft); }
  .table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; border-radius: 8px; border: 1px solid var(--app-border); background: var(--app-panel); }

  .stat-card {
    background: var(--app-panel); border: 1px solid var(--app-border);
    border-radius: 8px; padding: 18px;
    transition: all .2s; cursor: default;
  }
  .stat-card:hover { border-color: rgba(115,103,240,.35); box-shadow: 0 8px 24px var(--app-shadow); }

  .modal-backdrop {
    position: fixed; inset: 0; background: rgba(0,0,0,.75);
    z-index: 300; display: flex; align-items: flex-end; justify-content: center;
    animation: fadeIn .2s ease;
    padding: 0;
  }
  .modal-box {
    background: var(--app-panel); border: 1px solid var(--app-border);
    border-radius: 12px 12px 0 0;
    width: 100%; max-width: 620px; max-height: 92vh;
    overflow-y: auto; color: var(--app-text);
    padding: 28px 24px 32px;
    animation: slideUp .28s cubic-bezier(.22,.68,0,1.1);
    box-shadow: 0 -16px 60px rgba(0,0,0,.4);
  }
  .modal-drag { width: 44px; height: 4px; background: var(--app-border); border-radius: 2px; margin: 0 auto 22px; }
  .modal-title { font-size: 18px; font-weight: 900; margin-bottom: 20px; }

  .badge {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 3px 10px; border-radius: 20px;
    font-size: 11px; font-weight: 800; white-space: nowrap;
  }

  .nav-item {
    display: flex; align-items: center; gap: 10px;
    padding: 10px 12px; border-radius: 11px; margin-bottom: 2px;
    cursor: pointer; transition: all .15s; border: 1.5px solid transparent;
    font-size: 13px; font-weight: 500; color: var(--app-muted);
    white-space: nowrap; overflow: hidden;
  }
  .nav-item:hover { background: var(--app-primary-soft); color: var(--app-primary); }
  .nav-item.active {
    background: var(--app-primary-soft); color: var(--app-primary); font-weight: 700;
    border-color: var(--app-primary); box-shadow: none;
  }
  .nav-icon { font-size: 18px; flex-shrink: 0; }

  .bottom-nav {
    display: none; position: fixed; bottom: 0; left: 0; right: 0;
    background: var(--app-panel); border-top: 1px solid var(--app-border);
    z-index: 100; padding: 6px 8px 16px;
  }
  .bnav-grid { display: grid; grid-template-columns: repeat(6,1fr); gap: 2px; }
  .bnav-btn {
    display: flex; flex-direction: column; align-items: center; gap: 3px;
    padding: 7px 4px; border-radius: 12px; cursor: pointer;
    border: none; background: transparent; color: var(--app-muted);
    font-family: inherit; transition: all .15s;
  }
  .bnav-btn.active { color: var(--app-primary); background: var(--app-primary-soft); }
  .bnav-icon { font-size: 22px; line-height: 1; }
  .bnav-label { font-size: 9px; font-weight: 800; letter-spacing: .2px; }

  .form-label {
    display: block; font-size: 10.5px; font-weight: 800;
    color: var(--app-muted); letter-spacing: .6px; text-transform: uppercase; margin-bottom: 7px;
  }
  .form-group { margin-bottom: 14px; }

  .sidebar { display: flex; flex-direction: column; flex-shrink: 0; width: 240px; background: var(--app-panel); border-right: 1px solid var(--app-border); }

  @media (max-width: 768px) {
    .sidebar { display: none !important; }
    .bottom-nav { display: block !important; }
    .page-pad { padding: 16px 14px 100px !important; }
    .modal-backdrop { align-items: flex-end; }
    .modal-box { border-radius: 12px 12px 0 0; max-height: 88vh; }
    .hide-mobile { display: none !important; }
    .stat-row { grid-template-columns: 1fr 1fr !important; }
    .firm-grid { grid-template-columns: 1fr !important; }
    .branch-grid { grid-template-columns: 1fr !important; }
    .action-row { flex-direction: column; }
    .action-row .btn-primary { width: 100%; justify-content: center; }
  }
  @media (min-width: 769px) {
    .modal-backdrop { align-items: center; padding: 20px; }
    .modal-box { border-radius: 12px; max-height: 90vh; }
  }
`;

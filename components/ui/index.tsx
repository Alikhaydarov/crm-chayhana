export function Modal({ onClose, children, className = "" }: { onClose: () => void; children: React.ReactNode; className?: string }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className={`modal-box ${className}`} onClick={(e) => e.stopPropagation()}>
        <div className="modal-drag" />
        {children}
      </div>
    </div>
  );
}

export function PageWrap({
  title,
  sub,
  action,
  children,
}: {
  title?: React.ReactNode;
  sub?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="page-pad" style={{ padding: "28px 24px" }}>
      {(title || action) && (
        <div
          className="action-row"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: 12,
            marginBottom: 26,
          }}
        >
          <div className="page-heading">
            {title && (
              <h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: -0.4, margin: "0 0 4px" }}>
                {title}
              </h1>
            )}
            {sub && <div style={{ color: "var(--app-muted)", fontSize: 13 }}>{sub}</div>}
          </div>
          {action && <div className="page-action">{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

export function Toast({ msg, type }: { msg: string; type: "success" | "error" }) {
  return (
    <div
      className="app-toast"
      style={{
        position: "fixed",
        top: 20,
        right: 20,
        zIndex: 9999,
        padding: "13px 20px",
        borderRadius: 14,
        fontWeight: 800,
        fontSize: 13,
        boxShadow: "0 12px 32px rgba(0,0,0,.4)",
        animation: "toastIn .3s cubic-bezier(.22,.68,0,1.2)",
        display: "flex",
        alignItems: "center",
        gap: 8,
        maxWidth: 340,
        background: type === "success" ? "#3fb950" : "#f85149",
        color: "#fff",
      }}
    >
      {type === "success" ? "✅" : "❌"} {msg}
    </div>
  );
}

import { CircleCheck, CircleX } from "lucide-react";
import { useEffect } from "react";

export function Modal({ onClose, children, className = "" }: { onClose: () => void; children: React.ReactNode; className?: string }) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);
  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div className={`modal-box ${className}`} role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
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
      className={`app-toast ${type}`}
      role={type === "error" ? "alert" : "status"}
      aria-live={type === "error" ? "assertive" : "polite"}
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
        background: "var(--app-panel)",
        color: "var(--app-text)",
      }}
    >
      {type === "success" ? <CircleCheck size={18} /> : <CircleX size={18} />}<span>{msg}</span>
    </div>
  );
}

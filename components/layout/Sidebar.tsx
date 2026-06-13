"use client";
import { Boxes, ChevronLeft, ChevronRight, Languages, LogOut, Moon, Sun } from "lucide-react";
import type { UserInfo, TabId, ThemeMode, Lang } from "@/types";

type Tab = {
  id: TabId;
  icon: React.ElementType;
  label: string;
  badge?: number;
};

type Props = {
  user: UserInfo;
  tabs: Tab[];
  activeTab: TabId;
  collapsed: boolean;
  theme: ThemeMode;
  lang: Lang;
  onTabChange: (tab: TabId) => void;
  onToggleCollapse: () => void;
  onCollapse: () => void;
  onThemeToggle: () => void;
  onLangToggle: () => void;
  onLogout: () => void;
};

export function Sidebar({
  user, tabs, activeTab, collapsed, theme, lang,
  onTabChange, onToggleCollapse, onCollapse, onThemeToggle, onLangToggle, onLogout,
}: Props) {
  return (
    <aside className={`sidebar app-sidebar${collapsed ? " collapsed" : ""}`}>
      {/* Brand */}
      <div
        className="brand-row"
        style={{
          padding: "16px 14px",
          borderBottom: "1px solid var(--app-border)",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <button className="sidebar-toggle" onClick={onToggleCollapse}>
          <Boxes size={20} />
        </button>
        <div className="sidebar-brand-copy">
          <div style={{ fontWeight: 900, fontSize: 14, letterSpacing: -0.3 }}>CRM-JUTSU</div>
          <div style={{ fontSize: 10, color: "var(--app-muted)" }}>v3.0</div>
        </div>
        <button className="sidebar-collapse-action" onClick={onCollapse}>
          <ChevronLeft size={17} />
        </button>
      </div>

      {/* User card */}
      <div
        className="sidebar-card"
        style={{
          margin: "12px 10px",
          padding: "12px",
          background: "var(--app-panel-soft)",
          border: "1px solid var(--app-border)",
          borderRadius: 8,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div
          style={{
            width: 34, height: 34, borderRadius: 8,
            background: "var(--app-primary-soft)",
            color: "var(--app-primary)",
            display: "grid", placeItems: "center", fontWeight: 800,
          }}
        >
          {user.branchIcon}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {user.name}
          </div>
          <div style={{ fontSize: 11, color: "var(--app-muted)", marginTop: 2 }}>{user.branchName}</div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "6px 8px", overflowY: "auto" }}>
        {tabs.map((nav) => (
          <button
            key={nav.id}
            title={nav.label}
            className={`nav-item tab-item${activeTab === nav.id ? " active" : ""}`}
            onClick={() => onTabChange(nav.id)}
          >
            <span className="nav-icon">
              <nav.icon size={20} strokeWidth={1.8} />
            </span>
            <span className="sidebar-text" style={{ flex: 1 }}>{nav.label}</span>
            {(nav.badge || 0) > 0 && (
              <span
                style={{
                  background: activeTab === nav.id ? "#fff" : "var(--app-primary)",
                  color: activeTab === nav.id ? "var(--app-primary)" : "#fff",
                  borderRadius: 20, padding: "1px 7px", fontSize: 10, fontWeight: 900,
                }}
              >
                {nav.badge}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer" style={{ padding: "8px 8px 12px", borderTop: "1px solid var(--app-border)" }}>
        <button className="sidebar-footer-button" onClick={onThemeToggle}>
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          <span className="sidebar-text">{theme === "dark" ? "Kunduzgi" : "Tungi"} rejim</span>
        </button>
        <button className="sidebar-footer-button" onClick={onLangToggle}>
          <Languages size={18} />
          <span className="sidebar-text">{lang === "uz" ? "O'zbek" : "한국어"}</span>
        </button>
        <button className="sidebar-footer-button danger" onClick={onLogout}>
          <LogOut size={18} />
          <span className="sidebar-text">Chiqish</span>
        </button>
      </div>
    </aside>
  );
}

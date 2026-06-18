"use client";
import { useEffect, useRef, useState } from "react";
import { Boxes, Check, ChevronDown, ChevronLeft, Languages, LogOut, Moon, Sun } from "lucide-react";
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
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const closeMenu = (event: MouseEvent) => {
      if (!accountRef.current?.contains(event.target as Node)) setAccountOpen(false);
    };
    document.addEventListener("mousedown", closeMenu);
    return () => document.removeEventListener("mousedown", closeMenu);
  }, []);

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

      {/* Account dock */}
      <div className="sidebar-footer account-dock" ref={accountRef}>
        {accountOpen && !collapsed && (
          <div className="account-menu">
            <div className="account-menu-header">
              <span className="account-avatar">{user.branchIcon || user.name.charAt(0)}</span>
              <span><strong>{user.name}</strong><small>{user.branchName}</small></span>
            </div>
            <div className="account-menu-label">Til</div>
            <button className="account-menu-item" onClick={onLangToggle}>
              <Languages size={17} />
              <span>{lang === "uz" ? "O'zbekcha" : "한국어"}</span>
              <Check size={15} />
            </button>
            <div className="account-menu-separator" />
            <button className="account-menu-item danger" onClick={onLogout}>
              <LogOut size={17} />
              <span>Hisobdan chiqish</span>
            </button>
          </div>
        )}
        <div className="account-dock-row">
          <button
            className={`account-trigger${accountOpen ? " active" : ""}`}
            onClick={() => collapsed ? onToggleCollapse() : setAccountOpen(value => !value)}
            title={collapsed ? user.name : "Profil menyusi"}
          >
            <span className="account-avatar">{user.branchIcon || user.name.charAt(0)}</span>
            <span className="sidebar-text account-copy">
              <strong>{user.name}</strong>
              <small>{user.branchName}</small>
            </span>
            <ChevronDown className="sidebar-text account-chevron" size={16} />
          </button>
          <button className="theme-dock-button" onClick={onThemeToggle} title={theme === "dark" ? "Kunduzgi rejim" : "Tungi rejim"}>
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </div>
    </aside>
  );
}

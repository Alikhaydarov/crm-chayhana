"use client";
import { useEffect, useRef, useState } from "react";
import { Boxes, Check, ChevronDown, ChevronLeft, Languages, LogOut, Moon, Sun, X } from "lucide-react";
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
  mobileOpen?: boolean;
  theme: ThemeMode;
  lang: Lang;
  onTabChange: (tab: TabId) => void;
  onToggleCollapse: () => void;
  onCollapse: () => void;
  onMobileClose?: () => void;
  onThemeToggle: () => void;
  onLangToggle: () => void;
  onLogout: () => void;
};

export function Sidebar({
  user, tabs, activeTab, collapsed, mobileOpen, theme, lang,
  onTabChange, onToggleCollapse, onCollapse, onMobileClose, onThemeToggle, onLangToggle, onLogout,
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

  // Mobile drawer always shows the full (uncollapsed) layout, regardless of
  // the desktop collapse preference -- otherwise a "collapsed" desktop
  // setting would leak into the mobile drawer's className *and* behavior.
  const effectiveCollapsed = collapsed && !mobileOpen;
  const navGroups = [
    { label: lang === "uz" ? "Asosiy" : "기본", ids: ["dashboard", "warehouse", "transfers", "damages"] },
    { label: lang === "uz" ? "Savdo va nazorat" : "판매 및 관리", ids: ["orders", "products", "expiry", "suppliers", "history", "analysis"] },
    { label: lang === "uz" ? "Tizim" : "시스템", ids: ["settings"] },
  ].map((group) => ({ ...group, items: tabs.filter((tab) => group.ids.includes(tab.id)) })).filter((group) => group.items.length > 0);

  return (
    <aside className={`sidebar app-sidebar${effectiveCollapsed ? " collapsed" : ""}${mobileOpen ? " mobile-open" : ""}`}>
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
        <button type="button" className="sidebar-toggle" onClick={onToggleCollapse} aria-label="Yon panelni o'zgartirish">
          <Boxes size={20} />
        </button>
        <div className="sidebar-brand-copy">
          <div style={{ fontWeight: 900, fontSize: 14, letterSpacing: -0.3 }}>CRM-JUTSU</div>
          <div style={{ fontSize: 10, color: "var(--app-muted)" }}>v3.0</div>
        </div>
        <button type="button" className="sidebar-collapse-action" onClick={onCollapse} aria-label="Yon panelni yig'ish">
          <ChevronLeft size={17} />
        </button>
        <button type="button" className="sidebar-collapse-action mobile-drawer-close" onClick={onMobileClose} title="Yopish" aria-label="Menyuni yopish">
          <X size={17} />
        </button>
      </div>

      {/* Nav */}
      <nav aria-label="Asosiy navigatsiya" style={{ flex: 1, padding: "6px 8px", overflowY: "auto" }}>
        {navGroups.map((group) => <div className="sidebar-nav-group" key={group.label}>
          <div className="sidebar-nav-label sidebar-text">{group.label}</div>
          {group.items.map((nav) => (
            <button
              type="button"
              key={nav.id}
              title={nav.label}
              aria-current={activeTab === nav.id ? "page" : undefined}
              className={`nav-item tab-item${activeTab === nav.id ? " active" : ""}`}
              onClick={() => onTabChange(nav.id)}
            >
              <span className="nav-icon">
                <nav.icon size={19} strokeWidth={1.8} />
              </span>
              <span className="sidebar-text" style={{ flex: 1 }}>{nav.label}</span>
              {(nav.badge || 0) > 0 && <span className="sidebar-nav-badge">{nav.badge}</span>}
            </button>
          ))}
        </div>)}
      </nav>

      {/* Account dock */}
      <div className="sidebar-footer account-dock" ref={accountRef}>
        {accountOpen && !effectiveCollapsed && (
          <div className="account-menu">
            <div className="account-menu-header">
              <span className="account-avatar">{user.branchIcon || user.name.charAt(0)}</span>
              <span><strong>{user.name}</strong><small>{user.branchName}</small></span>
            </div>
            <div className="account-menu-label">Til</div>
            <button type="button" className="account-menu-item" onClick={onLangToggle}>
              <Languages size={17} />
              <span>{lang === "uz" ? "O'zbekcha" : "한국어"}</span>
              <Check size={15} />
            </button>
            <div className="account-menu-separator" />
            <button type="button" className="account-menu-item danger" onClick={onLogout}>
              <LogOut size={17} />
              <span>Hisobdan chiqish</span>
            </button>
          </div>
        )}
        <div className="account-dock-row">
          <button
            type="button"
            className={`account-trigger${accountOpen ? " active" : ""}`}
            onClick={() => effectiveCollapsed ? onToggleCollapse() : setAccountOpen(value => !value)}
            title={effectiveCollapsed ? user.name : "Profil menyusi"}
            aria-expanded={accountOpen}
          >
            <span className="account-avatar">{user.branchIcon || user.name.charAt(0)}</span>
            <span className="sidebar-text account-copy">
              <strong>{user.name}</strong>
              <small>{user.branchName}</small>
            </span>
            <ChevronDown className="sidebar-text account-chevron" size={16} />
          </button>
          <button type="button" className="theme-dock-button" onClick={onThemeToggle} title={theme === "dark" ? "Kunduzgi rejim" : "Tungi rejim"} aria-label={theme === "dark" ? "Kunduzgi rejimni yoqish" : "Tungi rejimni yoqish"}>
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </div>
    </aside>
  );
}

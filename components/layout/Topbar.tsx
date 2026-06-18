"use client";
import { useState } from "react";
import { Bell, ChevronLeft, ChevronRight, Languages, LogOut, Moon, Search, Sun } from "lucide-react";
import type { UserInfo, TabId, ThemeMode, Lang } from "@/types";

type Tab = {
  id: TabId;
  icon: React.ElementType;
  label: string;
  badge?: number;
};

type TopbarProps = {
  user: UserInfo;
  activeTab: TabId;
  tabs: Tab[];
  sidebarCollapsed: boolean;
  theme: ThemeMode;
  lang: Lang;
  onToggleSidebar: () => void;
  onThemeToggle: () => void;
  onLangToggle: () => void;
  onLogout: () => void;
  onSearch: () => void;
  alerts: string[];
};

export function Topbar({
  user, activeTab, tabs, sidebarCollapsed, theme, lang,
  onToggleSidebar, onThemeToggle, onLangToggle, onLogout, onSearch, alerts,
}: TopbarProps) {
  const currentTab = tabs.find((item) => item.id === activeTab);
  const [alertsOpen, setAlertsOpen] = useState(false);

  return (
    <header
      className="app-topbar mobile-topbar"
      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        <button className="topbar-control desktop-only" onClick={onToggleSidebar}>
          {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
        <div
          style={{
            width: 34, height: 34, borderRadius: 8,
            background: "var(--app-primary)", color: "#fff",
            display: "grid", placeItems: "center", fontWeight: 900, flexShrink: 0,
          }}
        >
          C
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {activeTab === "shop-sales" ? "Do'kon savdosi" : currentTab?.label}
          </div>
          <div style={{ fontSize: 11, color: "var(--app-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {user.name} · {user.branchName}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <button className="topbar-search" onClick={onSearch} title="Tezkor qidiruv">
          <Search size={17} />
          <span>Qidiruv</span>
          <kbd>Ctrl K</kbd>
        </button>
        <div className="alert-menu">
          <button className="topbar-control alert-control" title={`${alerts.length} ta ogohlantirish`} onClick={() => setAlertsOpen(value => !value)}>
            <Bell size={17} />
            {alerts.length > 0 && <span>{Math.min(alerts.length, 9)}</span>}
          </button>
          {alertsOpen && (
            <div className="alert-popover">
              <div className="alert-popover-title">E'tibor talab qiladi</div>
              {alerts.length
                ? alerts.map(alert => <div className="alert-row" key={alert}><Bell size={15} />{alert}</div>)
                : <div className="alert-row muted">Yangi ogohlantirish yo'q</div>}
            </div>
          )}
        </div>
        <button className="topbar-control" title={lang === "uz" ? "Koreys tili" : "O'zbek tili"} onClick={onLangToggle}>
          <Languages size={17} />
        </button>
        <button className="topbar-control" title={theme === "dark" ? "Kunduzgi rejim" : "Tungi rejim"} onClick={onThemeToggle}>
          {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
        </button>
        <button className="topbar-control danger-control" title="Chiqish" onClick={onLogout}><LogOut size={17} /></button>
      </div>
    </header>
  );
}

type BottomNavProps = {
  tabs: Tab[];
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
};

export function BottomNav({ tabs, activeTab, onTabChange }: BottomNavProps) {
  return (
    <nav className="bottom-nav">
      <div className="bnav-grid">
        {tabs.map((nav) => (
          <button
            key={nav.id}
            className={`bnav-btn${activeTab === nav.id ? " active" : ""}`}
            onClick={() => onTabChange(nav.id)}
          >
            <span className="bnav-icon" style={{ position: "relative" }}>
              <nav.icon size={21} strokeWidth={1.9} />
              {(nav.badge || 0) > 0 && (
                <span
                  style={{
                    position: "absolute", top: -4, right: -6,
                    background: "#f85149", color: "#fff",
                    borderRadius: 20, padding: "0 4px", fontSize: 8, fontWeight: 900, lineHeight: "14px",
                  }}
                >
                  {nav.badge}
                </span>
              )}
            </span>
            <span className="bnav-label">{nav.label.split(" ")[0]}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}

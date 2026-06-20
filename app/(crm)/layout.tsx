"use client";
import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { ArrowLeftRight, BarChart3, LayoutDashboard, Package, ShoppingCart, Store, Warehouse } from "lucide-react";
import { logoutApi, restoreSessionApi } from "@/lib/api";
import { I18N, BRANCH_NAMES } from "@/lib/constants";
import { GLOBAL_CSS } from "@/lib/constants/styles";
import { useAppData } from "@/hooks/useAppData";
import { AppContext } from "@/lib/AppContext";
import { canAccessTab } from "@/lib/permissions";
import { Toast } from "@/components/ui";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar, BottomNav } from "@/components/layout/Topbar";
import { CommandPalette } from "@/components/layout/CommandPalette";
import type { AdminNotification } from "@/components/layout/AdminNotifications";
import type { UserInfo, ThemeMode, Lang, TabId } from "@/types";

const TAB_ROUTES: Record<TabId, string> = {
  dashboard: "/dashboard",
  warehouse: "/warehouse",
  transfers: "/transfers",
  orders: "/orders",
  products: "/products",
  suppliers: "/suppliers",
  analysis: "/analysis",
};

const ROUTE_TABS: Record<string, TabId> = {
  "/dashboard": "dashboard",
  "/warehouse": "warehouse",
  "/transfers": "transfers",
  "/orders": "orders",
  "/products": "products",
  "/suppliers": "suppliers",
  "/analysis": "analysis",
  "/shop-sales": "analysis",
};

export default function CRMLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>("dark");
  const [lang, setLang] = useState<Lang>("uz");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [commandOpen, setCommandOpen] = useState(false);

  const t = I18N[lang];
  const activeTab: TabId = ROUTE_TABS[pathname] ?? "dashboard";
  const { transfers, fetchAll, showToast, toast, ...rest } = useAppData(user);
  const { products, stock, mainStock, shopStock, reports, companies, orders, companyPayments, shopSales, staff, accounts, branches } = rest as any;
  const currentBranch = user
    ? branches.find((branch: any) =>
        (user.branchId != null && String(branch.id) === String(user.branchId)) ||
        (user.branchSlug && branch.slug === user.branchSlug) ||
        (user.branchName && String(branch.name || "").trim().toLocaleLowerCase() === user.branchName.trim().toLocaleLowerCase())
      )
    : null;
  const currentBranchType = String(
    currentBranch?.branch_type ?? currentBranch?.branchType ?? currentBranch?.type ?? user?.branchType ?? ""
  ).toLocaleLowerCase();
  const isShopAdmin =
    user?.role === "shop" ||
    currentBranchType === "shop" ||
    /shop|dokon|do-kon|do'kon/i.test(`${user?.branchSlug || ""} ${user?.branchName || ""}`);
  const canUseTab = (tabId: TabId) => {
    if (isShopAdmin) return ["dashboard", "warehouse", "transfers", "analysis"].includes(tabId);
    return canAccessTab(user?.role as any, tabId);
  };

  useEffect(() => {
    let active = true;
    restoreSessionApi().then((result) => {
      if (!active) return;
      if (result.success) setUser((result as any).user);
      else router.replace("/");
    }).finally(() => { if (active) setSessionReady(true); });
    return () => { active = false; };
  }, [router]);

  useEffect(() => { const s = localStorage.getItem("crm-theme") as ThemeMode | null; if (s) setTheme(s); }, []);
  useEffect(() => { localStorage.setItem("crm-theme", theme); }, [theme]);
  useEffect(() => { const s = localStorage.getItem("crm-lang") as Lang | null; if (s === "uz" || s === "ko") setLang(s); }, []);
  useEffect(() => { localStorage.setItem("crm-lang", lang); }, [lang]);
  useEffect(() => { setSidebarCollapsed(localStorage.getItem("crm-sidebar") !== "open"); }, []);
  useEffect(() => { localStorage.setItem("crm-sidebar", sidebarCollapsed ? "collapsed" : "open"); }, [sidebarCollapsed]);
  useEffect(() => {
    const openCommand = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen(true);
      }
      if (event.key === "Escape") setCommandOpen(false);
    };
    window.addEventListener("keydown", openCommand);
    return () => window.removeEventListener("keydown", openCommand);
  }, []);

  useEffect(() => {
    if (!user) return;
    if (!canUseTab(activeTab)) router.replace("/dashboard");
  }, [activeTab, isShopAdmin, router, user]);

  const signOut = async () => { await logoutApi(); setUser(null); router.replace("/"); };
  const toggleTheme = () => setTheme((v) => (v === "dark" ? "light" : "dark"));
  const toggleLang = () => setLang((v) => (v === "uz" ? "ko" : "uz"));
  const handleTabChange = (tabId: TabId) => {
    if (!user || !canUseTab(tabId)) { router.push("/dashboard"); return; }
    router.push(TAB_ROUTES[tabId]);
  };
  const openBranchAnalysis = (branchSlug: string) => router.push(`/analysis?branch=${encodeURIComponent(branchSlug)}`);

  if (!sessionReady) return (
    <div className={`${theme} theme-shell`} style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "var(--app-bg)", color: "var(--app-text)" }}>
      <style>{GLOBAL_CSS}</style>{t.loading}
    </div>
  );
  if (!user || !canUseTab(activeTab)) return null;

  const pendingCount = transfers.filter((tr: any) => tr.status === "pending").length;
  const notifications: AdminNotification[] = user.role === "superadmin"
    ? [
        ...transfers.map((transfer: any) => ({
          id: `transfer-${transfer.id}-${transfer.status}`,
          type: "transfer" as const,
          title: transfer.status === "pending" ? "Yangi transfer so'rovi" : transfer.status === "approved" ? "Transfer tasdiqlandi" : "Transfer rad etildi",
          description: `${transfer.branchName || transfer.toBranchName || BRANCH_NAMES[transfer.toBranch] || transfer.toBranch} · ${transfer.items?.length || 0} ta mahsulot`,
          createdAt: transfer.updatedAt || transfer.createdAt,
          tab: "transfers" as const,
          level: transfer.status === "pending" ? "warning" as const : transfer.status === "approved" ? "success" as const : "danger" as const,
        })),
        ...products.filter((product: any) => (stock[product.id] || 0) <= product.minStock).map((product: any) => ({
          id: `stock-${product.id}-${stock[product.id] || 0}`,
          type: "stock" as const,
          title: "Skladda mahsulot kam qoldi",
          description: `${product.name}: ${stock[product.id] || 0} ${product.unit}`,
          createdAt: "",
          tab: "warehouse" as const,
          level: "danger" as const,
        })),
        ...orders.slice(0, 30).map((order: any) => ({
          id: `order-${order.id}-${order.paidAmount}`,
          type: "order" as const,
          title: order.totalPrice <= order.paidAmount ? "Order to'liq to'landi" : "Yangi order yoki qarz",
          description: `${order.companyName} · ${order.items?.length || 0} ta mahsulot`,
          createdAt: order.createdAt,
          tab: "orders" as const,
          level: order.totalPrice <= order.paidAmount ? "success" as const : "info" as const,
        })),
        ...companyPayments.slice(0, 30).map((payment: any) => ({
          id: `payment-${payment.id}`,
          type: "payment" as const,
          title: "Firma to'lovi qabul qilindi",
          description: `${payment.amount?.toLocaleString("uz-UZ") || 0} so'm · ${payment.note || "Izohsiz"}`,
          createdAt: payment.createdAt,
          tab: "suppliers" as const,
          level: "success" as const,
        })),
      ].sort((a, b) => (new Date(b.createdAt).getTime() || 0) - (new Date(a.createdAt).getTime() || 0)).slice(0, 80)
    : [];

  const TABS = [
    { id: "dashboard" as TabId, icon: LayoutDashboard, label: t.dashboard },
    { id: "warehouse" as TabId, icon: Warehouse, label: t.warehouse },
    { id: "transfers" as TabId, icon: ArrowLeftRight, label: t.transfers, badge: pendingCount },
    { id: "orders" as TabId, icon: ShoppingCart, label: t.orders },
    { id: "products" as TabId, icon: Package, label: t.products },
    { id: "suppliers" as TabId, icon: Store, label: t.suppliers },
    ...(isShopAdmin ? [{ id: "analysis" as TabId, icon: BarChart3, label: t.analysis }] : []),
  ].filter((tab) => canUseTab(tab.id));
  const commands = TABS.map(tab => ({
    ...tab,
    description: tab.id === "dashboard" ? "Asosiy ko'rsatkichlar va tezkor holat"
      : tab.id === "warehouse" ? "Mahsulot qoldiqlari va kam qolganlar"
      : tab.id === "transfers" ? "Sklad so'rovlari va tasdiqlash"
      : tab.id === "orders" ? "Yangi order va to'lov holati"
      : tab.id === "products" ? "Mahsulot va shtrix-kod bazasi"
      : tab.id === "suppliers" ? "Firmalar, qarz va to'lov tarixi"
      : "Excel savdo, foyda va statistika",
  }));

  return (
    <AppContext.Provider value={{ products, stock, mainStock, shopStock, transfers, reports, companies, orders, companyPayments, shopSales, staff, accounts, branches, fetchAll, showToast, t, lang, user, setTab: (tab: string) => handleTabChange(tab as TabId), openBranchAnalysis }}>
      <div className={`${theme} theme-shell`} style={{ display: "flex", height: "100vh", background: "var(--app-bg)", fontFamily: "var(--font-ui)", color: "var(--app-text)", overflow: "hidden" }}>
        <style>{GLOBAL_CSS}</style>
        {toast && <Toast msg={toast.msg} type={toast.type} />}
        <Sidebar user={user} tabs={TABS} activeTab={activeTab} collapsed={sidebarCollapsed} theme={theme} lang={lang} onTabChange={handleTabChange} onToggleCollapse={() => setSidebarCollapsed((v) => !v)} onCollapse={() => setSidebarCollapsed(true)} onThemeToggle={toggleTheme} onLangToggle={toggleLang} onLogout={signOut} />
        <main className="mobile-main" style={{ flex: 1, overflowY: "auto", minWidth: 0 }}>
          <Topbar user={user} activeTab={activeTab} tabs={TABS} sidebarCollapsed={sidebarCollapsed} theme={theme} lang={lang} onToggleSidebar={() => setSidebarCollapsed((v) => !v)} onThemeToggle={toggleTheme} onLangToggle={toggleLang} onLogout={signOut} onSearch={() => setCommandOpen(true)} notifications={notifications} onNavigate={handleTabChange} />
          {children}
        </main>
        <BottomNav tabs={TABS} activeTab={activeTab} onTabChange={handleTabChange} />
        <CommandPalette commands={commands} open={commandOpen} onClose={() => setCommandOpen(false)} onSelect={(tab) => { setCommandOpen(false); handleTabChange(tab); }} />
      </div>
    </AppContext.Provider>
  );
}

"use client";

import type { ComponentType } from "react";
import { AlertTriangle, ArrowRight, ArrowUpRight, Boxes, Building2, CircleDollarSign, Clock3, PackageSearch, ReceiptText, TrendingUp, Users } from "lucide-react";
import { PageWrap } from "@/components/ui";
import { BRANCH_NAMES, TRANSFER_STATUS_CONFIG } from "@/lib/constants";
import { fmtD, fmtM } from "@/lib/utils";
import type { Product, StockMap, TabId, UserInfo } from "@/types";
import type { Account, Branch, Order, ReportSummary } from "@/types/domain";

type Props = { reports: ReportSummary | null; user: UserInfo; setTab: (tab: TabId) => void; transfers: any[]; orders: Order[]; companies: any[]; accounts: Account[]; branches: Branch[]; products: Product[]; stock: StockMap; openBranchAnalysis: (branchSlug: string) => void; t: Record<string, string> };
type Metric = { label: string; value: string; detail: string; Icon: ComponentType<{ size?: number }>; tone: "green" | "blue" | "amber" | "red" };

function MetricCard({ metric }: { metric: Metric }) {
  return <section className="dashboard-metric"><div className={`dashboard-metric-icon tone-${metric.tone}`}><metric.Icon size={18} /></div><div className="dashboard-metric-copy"><span>{metric.label}</span><strong>{metric.value}</strong><small>{metric.detail}</small></div></section>;
}

export function DashboardTab({ reports, user, setTab, transfers, orders, accounts, branches, products, stock, openBranchAnalysis }: Props) {
  const isSuperAdmin = user.role === "superadmin";
  const currentBranch = branches.find((branch) => branch.slug === user.branchSlug);
  const isShop = user.role === "shop" || user.branchType === "shop" || currentBranch?.branch_type === "shop";
  const branchKey = user.branchSlug || user.role;
  const branchReport = reports?.branchStats?.find((report: any) => report.branch === branchKey);
  const visibleTransfers = isSuperAdmin ? transfers : transfers.filter((transfer: any) => transfer.toBranch === branchKey);
  const visibleOrders = isSuperAdmin ? orders : isShop ? [] : orders;
  const pendingTransfers = visibleTransfers.filter((transfer: any) => transfer.status === "pending");
  const totalDebt = visibleOrders.reduce((sum, order) => sum + Math.max(0, Number(order.totalPrice) - Number(order.paidAmount)), 0);
  const unpaidOrders = visibleOrders.filter((order) => Number(order.totalPrice) > Number(order.paidAmount));
  const lowStockProducts = products.filter((product) => Number(stock[product.id] || 0) <= Number(product.minStock || 0));
  const activeAccounts = accounts.filter((account) => account.active !== false);
  const today = new Date().toLocaleDateString("uz-UZ", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  const metrics: Metric[] = isSuperAdmin ? [
    { label: "Asosiy sklad", value: fmtM(Number(reports?.mainStockValue) || 0), detail: `${reports?.totalProducts || products.length} turdagi mahsulot`, Icon: CircleDollarSign, tone: "green" },
    { label: "Kutilayotgan transfer", value: String(pendingTransfers.length), detail: `${visibleTransfers.length} ta jami transfer`, Icon: Clock3, tone: pendingTransfers.length ? "amber" : "blue" },
    { label: "Firma qarzi", value: fmtM(totalDebt), detail: `${unpaidOrders.length} ta yopilmagan order`, Icon: ReceiptText, tone: totalDebt ? "red" : "green" },
    { label: "Faol foydalanuvchi", value: String(activeAccounts.length), detail: `${branches.filter((branch) => branch.is_active !== false).length} ta faol filial`, Icon: Users, tone: "blue" },
  ] : [
    { label: "Sklad qiymati", value: fmtM(Number(branchReport?.stockValue) || 0), detail: `${products.length} turdagi mahsulot`, Icon: CircleDollarSign, tone: "green" },
    { label: "Transferlar", value: String(visibleTransfers.length), detail: `${pendingTransfers.length} ta kutilmoqda`, Icon: TrendingUp, tone: "blue" },
    { label: "Kam qolgan", value: String(branchReport?.lowStockCount || lowStockProducts.length), detail: "Nazorat talab qilinadi", Icon: AlertTriangle, tone: (branchReport?.lowStockCount || lowStockProducts.length) ? "red" : "green" },
    isShop ? { label: "Tasdiqlangan", value: String(visibleTransfers.filter((transfer: any) => transfer.status === "approved" || transfer.status === "received").length), detail: "Qabul qilingan transfer", Icon: Boxes, tone: "green" } : { label: "Firma qarzi", value: fmtM(totalDebt), detail: `${unpaidOrders.length} ta order`, Icon: ReceiptText, tone: totalDebt ? "red" : "green" },
  ];

  const activeBranches = branches.filter((branch) => branch.is_active !== false);
  const attentionItems = [
    ...(pendingTransfers.length ? [{ label: "Tasdiq kutayotgan transferlar", value: `${pendingTransfers.length} ta`, tone: "amber", action: () => setTab("transfers") }] : []),
    ...(totalDebt > 0 ? [{ label: "Yopilmagan firma qarzi", value: fmtM(totalDebt), tone: "red", action: () => setTab("orders") }] : []),
    ...(lowStockProducts.length ? [{ label: "Asosiy skladda kam qolgan", value: `${lowStockProducts.length} ta`, tone: "red", action: () => setTab("warehouse") }] : []),
  ];

  return <PageWrap title="Boshqaruv paneli" sub={`${user.branchName} · ${today}`} action={isShop ? <button className="btn-primary" onClick={() => setTab("analysis")}><TrendingUp size={16} /> Savdo tahlili</button> : undefined}>
    <div className="dashboard-metrics">{metrics.map((metric) => <MetricCard key={metric.label} metric={metric} />)}</div>

    {isSuperAdmin && <section className="dashboard-section"><div className="dashboard-section-head"><div><h2><Building2 size={18} /> Filiallar</h2><p>Filiallar bo‘yicha sklad va foydalanuvchilar holati</p></div><span className="dashboard-count">{activeBranches.length} ta</span></div><div className="dashboard-branch-grid">
      {activeBranches.map((branch) => {
        const report = reports?.branchStats?.find((item: any) => item.branch === branch.slug);
        const branchAccounts = accounts.filter((account) => account.branchSlug === branch.slug);
        const lowCount = Number(report?.lowStockCount || 0);
        const clickable = branch.branch_type === "shop";
        return <button key={branch.id} type="button" className="dashboard-branch-card" onClick={() => clickable && openBranchAnalysis(branch.slug)} disabled={!clickable}><div className="dashboard-branch-top"><div className="dashboard-branch-mark">{branch.name.slice(0, 1).toUpperCase()}</div><div><strong>{branch.name}</strong><span>{branch.branch_type === "shop" ? "Do‘kon" : "Restoran"} · {branchAccounts.length} account</span></div>{clickable && <ArrowUpRight size={17} />}</div><div className="dashboard-branch-data"><div><span>Sklad qiymati</span><strong>{fmtM(Number(report?.stockValue) || 0)}</strong></div><div><span>Kam qolgan</span><strong className={lowCount ? "is-danger" : "is-success"}>{lowCount} ta</strong></div></div><div className="dashboard-branch-foot"><span><i className={branchAccounts.some((account) => account.active !== false) ? "online" : "offline"} />{branchAccounts.filter((account) => account.active !== false).length} faol</span><span>{branch.warehouse?.name || "Filial skladi"}</span></div></button>;
      })}
    </div></section>}

    <div className="dashboard-bottom-grid"><section className="dashboard-section dashboard-activity"><div className="dashboard-section-head"><div><h2><TrendingUp size={18} /> Oxirgi transferlar</h2><p>Eng so‘nggi sklad harakatlari</p></div><button className="dashboard-text-button" onClick={() => setTab("transfers")}>Barchasi <ArrowRight size={15} /></button></div><div className="dashboard-transfer-list">
      {visibleTransfers.slice(0, 6).map((transfer: any) => { const status = TRANSFER_STATUS_CONFIG[transfer.status as keyof typeof TRANSFER_STATUS_CONFIG]; return <button key={transfer.id} type="button" className="dashboard-transfer-row" onClick={() => setTab("transfers")}><div className="dashboard-transfer-icon"><Boxes size={17} /></div><div className="dashboard-transfer-main"><strong>{transfer.branchName || transfer.toBranchName || BRANCH_NAMES[transfer.toBranch] || transfer.toBranch}</strong><span>#{String(transfer.id).slice(-8)} · {fmtD(transfer.createdAt)}</span></div><div className="dashboard-transfer-value"><strong>{fmtM(Number(transfer.totalValue) || 0)}</strong><span style={{ color: status?.c }}>{status?.l || transfer.status}</span></div></button>; })}
      {!visibleTransfers.length && <div className="dashboard-empty"><PackageSearch size={24} /><strong>Transferlar yo‘q</strong><span>Yangi harakatlar shu yerda ko‘rinadi</span></div>}
    </div></section><aside className="dashboard-section dashboard-attention"><div className="dashboard-section-head"><div><h2><AlertTriangle size={18} /> E’tibor talab qiladi</h2><p>Tezkor nazorat ro‘yxati</p></div></div><div className="dashboard-attention-list">
      {attentionItems.map((item) => <button key={item.label} type="button" onClick={item.action}><i className={`tone-${item.tone}`} /><span>{item.label}</span><strong>{item.value}</strong><ArrowRight size={15} /></button>)}
      {!attentionItems.length && <div className="dashboard-all-good"><span>✓</span><strong>Hammasi joyida</strong><small>Hozircha muhim ogohlantirish yo‘q</small></div>}
    </div></aside></div>
  </PageWrap>;
}

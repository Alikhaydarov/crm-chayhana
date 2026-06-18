"use client";
import { TrendingUp } from "lucide-react";
import { PageWrap } from "@/components/ui";
import { BRANCH_ICONS, BRANCH_NAMES, TRANSFER_STATUS_CONFIG } from "@/lib/constants";
import { fmtM, fmtD } from "@/lib/utils";
import type { UserInfo, TabId } from "@/types";
import type { Order, Staff } from "@/lib/localStore";

type Props = {
  reports: any;
  user: UserInfo;
  setTab: (tab: TabId) => void;
  transfers: any[];
  orders: Order[];
  companies: any[];
  staff: Staff[];
  t: Record<string, string>;
};

const BRANCH_LIST = ["restaurant1", "restaurant2", "shop"] as const;

export function DashboardTab({ reports, user, setTab, transfers, orders, companies, staff, t }: Props) {
  if (!reports)
    return (
      <PageWrap>
        <div style={{ color: "var(--app-muted)", padding: 40, textAlign: "center" }}>{t.loading}</div>
      </PageWrap>
    );

  const isSA = user.role === "superadmin";
  const isShop = user.role === "shop";
  const branchReport = reports.branchStats?.find((b: any) => b.branch === user.role);
  const visibleTransfers = isSA
    ? transfers
    : transfers.filter((transfer: any) => transfer.toBranch === user.role);
  const visibleOrders = isSA ? orders : isShop ? [] : orders;
  const totalDebt = visibleOrders.reduce((s: number, o: Order) => s + (o.totalPrice - o.paidAmount), 0);
  const today = new Date().toLocaleDateString("uz-UZ", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  const stats = isSA
    ? [
        { l: "Sklad qiymati",   v: fmtM(reports.mainStockValue), c: "#3fb950", bg: "rgba(63,185,80,.08)",    i: "💰" },
        { l: "Mahsulot turlari",v: String(reports.totalProducts), c: "#7367f0", bg: "rgba(115,103,240,.08)", i: "📦" },
        { l: "Jami foydalanuvchilar", v: String(staff.filter(s => s.active).length), c: "#3b82f6", bg: "rgba(59,130,246,.08)", i: "👥" },
        { l: "Order qarzi",     v: fmtM(totalDebt), c: totalDebt > 0 ? "#f85149" : "#3fb950", bg: totalDebt > 0 ? "rgba(248,81,73,.08)" : "rgba(63,185,80,.08)", i: "🏢" },
      ]
    : [
        { l: "Skladim",       v: fmtM(branchReport?.stockValue || 0), c: "#3fb950", bg: "rgba(63,185,80,.08)", i: "💰" },
        { l: "So'rovlarim",   v: String(visibleTransfers.length), c: "#7367f0", bg: "rgba(115,103,240,.08)", i: "🔄" },
        { l: "Kutilayotgan",  v: String(visibleTransfers.filter((tr: any) => tr.status === "pending").length), c: "#f0a500", bg: "rgba(240,165,0,.08)", i: "⏳" },
        isShop
          ? { l: "Kam qolgan", v: String(branchReport?.lowStockCount || 0), c: "#f85149", bg: "rgba(248,81,73,.08)", i: "📦" }
          : { l: "Order qarzi", v: fmtM(totalDebt), c: totalDebt > 0 ? "#f85149" : "#3fb950", bg: "rgba(248,81,73,.08)", i: "🧾" },
      ];

  // Har bir filial uchun o'sha branchdagi userlar
  const branchUsers = (branch: string) =>
    staff.filter(s => s.branch === branch && s.active);

  return (
    <PageWrap
      title={`${user.branchIcon} ${user.branchName}`}
      sub={today}
      action={
        user.role === "shop" ? (
          <button className="btn-primary" onClick={() => setTab("shop-sales")}>
            <TrendingUp size={16} /> Savdo tahlili
          </button>
        ) : undefined
      }
    >
      {/* Stats */}
      <div className="stat-row" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 28 }}>
        {stats.map((s, i) => (
          <div
            key={i}
            className="stat-card fade-up"
            style={{ animationDelay: `${i * 60}ms`, borderTop: `3px solid ${s.c}`, background: `linear-gradient(160deg,${s.bg},var(--app-panel))` }}
          >
            <div style={{ fontSize: 28, marginBottom: 10 }}>{s.i}</div>
            <div style={{ color: "var(--app-muted)", fontSize: 11, fontWeight: 700, marginBottom: 6, letterSpacing: 0.3 }}>{s.l}</div>
            <div style={{ fontWeight: 900, fontSize: s.v.length > 10 ? 16 : 20, color: s.c, letterSpacing: -0.3 }}>{s.v}</div>
          </div>
        ))}
      </div>

      {/* Filiallar — faqat superadmin ko'radi, Django userlaridan quriladi */}
      {isSA && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
            🏢 Filiallar <span style={{ color: "var(--app-muted)", fontWeight: 500, fontSize: 13 }}>foydalanuvchilari</span>
          </div>
          <div className="branch-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
            {BRANCH_LIST.map((branch, i) => {
              const users = branchUsers(branch);
              const branchStat = reports.branchStats?.find((b: any) => b.branch === branch);
              const isShop = branch === "shop";

              if (users.length === 0) return null;

              return (
                <div
                  key={branch}
                  className="fade-up"
                  onClick={() => isShop && setTab("shop-sales")}
                  style={{
                    animationDelay: `${i * 80}ms`,
                    background: "var(--app-panel)",
                    border: "1px solid var(--app-border)",
                    borderRadius: 12, padding: 18,
                    transition: "all .2s",
                    cursor: isShop ? "pointer" : "default",
                  }}
                  onMouseEnter={e => { if (isShop) { e.currentTarget.style.borderColor = "rgba(115,103,240,.4)"; e.currentTarget.style.boxShadow = "0 8px 24px var(--app-shadow)"; } }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--app-border)"; e.currentTarget.style.boxShadow = "none"; }}
                >
                  {/* Branch header */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 8, background: "rgba(115,103,240,.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>
                      {BRANCH_ICONS[branch]}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 800, fontSize: 14 }}>{BRANCH_NAMES[branch]}</div>
                      <div style={{ fontSize: 11, color: "var(--app-muted)" }}>{users.length} ta foydalanuvchi</div>
                    </div>
                    {isShop && <span style={{ fontSize: 11, color: "var(--app-primary)", fontWeight: 700 }}>→</span>}
                  </div>

                  {/* Sklad va kam qoldi */}
                  {branchStat && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
                      <div style={{ background: "var(--app-panel-soft)", borderRadius: 10, padding: "9px 11px" }}>
                        <div style={{ fontSize: 10, color: "var(--app-muted)", marginBottom: 4, fontWeight: 700 }}>SKLAD</div>
                        <div style={{ fontWeight: 900, color: "#3fb950", fontSize: 13 }}>{fmtM(branchStat.stockValue)}</div>
                      </div>
                      <div style={{ background: "var(--app-panel-soft)", borderRadius: 10, padding: "9px 11px" }}>
                        <div style={{ fontSize: 10, color: "var(--app-muted)", marginBottom: 4, fontWeight: 700 }}>KAM QOLDI</div>
                        <div style={{ fontWeight: 900, color: branchStat.lowStockCount > 0 ? "#f85149" : "#3fb950", fontSize: 13 }}>
                          {branchStat.lowStockCount} ta
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Django userlar ro'yxati */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {users.map(u => (
                      <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", background: "var(--app-panel-soft)", borderRadius: 8 }}>
                        <div style={{ width: 28, height: 28, borderRadius: 6, background: "linear-gradient(135deg,#7367f0,#9985f5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 900, color: "#fff", flexShrink: 0 }}>
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{u.name}</div>
                          <div style={{ fontSize: 10, color: "var(--app-muted)", marginTop: 1 }}>{u.role}</div>
                        </div>
                        <div style={{ width: 7, height: 7, borderRadius: "50%", background: u.active ? "#3fb950" : "#f85149", flexShrink: 0 }} />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent transfers */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ fontSize: 15, fontWeight: 800 }}>🔄 Oxirgi transferlar</div>
        <button
          className="btn-icon"
          onClick={() => setTab("transfers")}
          style={{ color: "#7367f0", background: "rgba(115,103,240,.1)", borderColor: "rgba(115,103,240,.2)" }}
        >
          Barchasi →
        </button>
      </div>
      <div className="table-wrap">
        <table className="crm-table">
          <thead>
            <tr>
              <th>ID</th><th>Filial</th><th>Qiymat</th><th>Status</th>
              <th className="hide-mobile">Sana</th>
            </tr>
          </thead>
          <tbody>
            {visibleTransfers.slice(0, 6).map((tr: any) => {
              const st = TRANSFER_STATUS_CONFIG[tr.status as keyof typeof TRANSFER_STATUS_CONFIG];
              return (
                <tr key={tr.id}>
                  <td>
                    <span style={{ fontFamily: "monospace", fontSize: 11, color: "#7367f0", background: "rgba(115,103,240,.08)", padding: "2px 8px", borderRadius: 6 }}>
                      {tr.id.slice(-8)}
                    </span>
                  </td>
                  <td>{BRANCH_ICONS[tr.toBranch]} {BRANCH_NAMES[tr.toBranch]}</td>
                  <td style={{ color: "#3fb950", fontWeight: 800 }}>{fmtM(tr.totalValue)}</td>
                  <td><span className="badge" style={{ background: st.bg, color: st.c }}>{st.i} {st.l}</span></td>
                  <td className="hide-mobile" style={{ fontSize: 11, color: "var(--app-muted)" }}>{fmtD(tr.createdAt)}</td>
                </tr>
              );
            })}
            {visibleTransfers.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", color: "var(--app-muted)", padding: 32 }}>Transfer yo'q</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </PageWrap>
  );
}

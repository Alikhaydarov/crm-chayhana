"use client";

import { useMemo, useState } from "react";
import { CalendarClock, PackageSearch, TrendingDown } from "lucide-react";
import { PageWrap } from "@/components/ui";
import { BRANCH_ICONS, BRANCH_NAMES } from "@/lib/constants";
import { fmt, fmtDate, fmtM } from "@/lib/utils";
import type { Product, UserInfo } from "@/types";
import type { ProductBatch } from "@/types/domain";

type Props = {
  productBatches: ProductBatch[];
  products: Product[];
  user: UserInfo;
  t: Record<string, string>;
};

type Urgency = "expired" | "critical" | "warning" | "soon" | "ok" | "none";

const URGENCY_CONFIG: Record<Urgency, { c: string; bg: string; l: string; i: string }> = {
  expired: { c: "#f85149", bg: "rgba(248,81,73,.14)", l: "Muddati o'tgan", i: "⛔" },
  critical: { c: "#f85149", bg: "rgba(248,81,73,.1)", l: "3 kun qoldi", i: "🔴" },
  warning: { c: "#f0a500", bg: "rgba(240,165,0,.12)", l: "Bu hafta tugaydi", i: "⚠️" },
  soon: { c: "#3b82f6", bg: "rgba(59,130,246,.1)", l: "Bu oy tugaydi", i: "🔵" },
  ok: { c: "#3fb950", bg: "rgba(63,185,80,.1)", l: "Yaroqli", i: "✅" },
  none: { c: "var(--app-muted)", bg: "var(--app-panel-soft)", l: "Muddat kiritilmagan", i: "—" },
};

function daysUntil(dateStr?: string) {
  if (!dateStr) return null;
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

function urgencyOf(dateStr?: string): Urgency {
  const days = daysUntil(dateStr);
  if (days === null) return "none";
  if (days < 0) return "expired";
  if (days <= 3) return "critical";
  if (days <= 7) return "warning";
  if (days <= 30) return "soon";
  return "ok";
}

export function ExpiryTab({ productBatches, products, user, t }: Props) {
  const [filterBranch, setFilterBranch] = useState("all");
  const [filterUrgency, setFilterUrgency] = useState<"all" | "expired" | "week" | "month">("all");
  const [filterText, setFilterText] = useState("");

  const isSA = user.role === "superadmin";
  const priceById = useMemo(() => new Map(products.map((product) => [product.id, product.pricePerUnit || 0])), [products]);
  const batchValue = (batch: ProductBatch) => batch.quantity * (priceById.get(batch.productId) || 0);

  const filtered = useMemo(() => {
    const needle = filterText.trim().toLocaleLowerCase();
    return productBatches.filter((batch) => {
      if (isSA && filterBranch !== "all" && batch.branch !== filterBranch) return false;
      if (needle && !batch.productName.toLocaleLowerCase().includes(needle)) return false;
      const days = daysUntil(batch.expiryDate);
      if (filterUrgency === "expired") return days !== null && days < 0;
      if (filterUrgency === "week") return days !== null && days >= 0 && days <= 7;
      if (filterUrgency === "month") return days !== null && days >= 0 && days <= 30;
      return true;
    });
  }, [productBatches, isSA, filterBranch, filterText, filterUrgency]);

  const expired = useMemo(() => filtered.filter((batch) => urgencyOf(batch.expiryDate) === "expired"), [filtered]);
  const atRisk = useMemo(
    () => filtered.filter((batch) => ["critical", "warning"].includes(urgencyOf(batch.expiryDate))),
    [filtered],
  );
  const expiredValue = useMemo(() => expired.reduce((sum, batch) => sum + batchValue(batch), 0), [expired, priceById]);
  const atRiskValue = useMemo(() => atRisk.reduce((sum, batch) => sum + batchValue(batch), 0), [atRisk, priceById]);
  const totalValue = useMemo(() => filtered.reduce((sum, batch) => sum + batchValue(batch), 0), [filtered, priceById]);

  const branchBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    [...expired, ...atRisk].forEach((batch) => map.set(batch.branch, (map.get(batch.branch) || 0) + batchValue(batch)));
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [expired, atRisk, priceById]);
  const maxBranchValue = branchBreakdown[0]?.[1] || 0;

  const productBreakdown = useMemo(() => {
    const map = new Map<string, { name: string; qty: number; unit: string; value: number }>();
    [...expired, ...atRisk].forEach((batch) => {
      const current = map.get(batch.productId) || { name: batch.productName, qty: 0, unit: batch.unit, value: 0 };
      current.qty += batch.quantity;
      current.value += batchValue(batch);
      map.set(batch.productId, current);
    });
    return Array.from(map.values()).sort((a, b) => b.value - a.value).slice(0, 5);
  }, [expired, atRisk, priceById]);
  const maxProductValue = productBreakdown[0]?.value || 0;

  const groups = useMemo(() => {
    const order: Urgency[] = ["expired", "critical", "warning", "soon", "ok", "none"];
    const buckets = new Map<Urgency, ProductBatch[]>();
    filtered.forEach((batch) => {
      const key = urgencyOf(batch.expiryDate);
      const list = buckets.get(key);
      if (list) list.push(batch);
      else buckets.set(key, [batch]);
    });
    return order
      .filter((key) => buckets.has(key))
      .map((key) => ({
        key,
        config: URGENCY_CONFIG[key],
        items: (buckets.get(key) || []).sort((a, b) => {
          const da = a.expiryDate ? new Date(a.expiryDate).getTime() : Infinity;
          const db = b.expiryDate ? new Date(b.expiryDate).getTime() : Infinity;
          return da - db;
        }),
      }));
  }, [filtered]);

  return (
    <PageWrap title="Yaroqlilik muddati" sub="Partiyalar va yaroqlilik muddati bo'yicha kuzatuv">
      <div className="history-toolbar" style={{ marginBottom: 16 }}>
        <div className="history-filters">
          {(["all", "expired", "week", "month"] as const).map((value) => (
            <button
              key={value}
              className={filterUrgency === value ? "active" : ""}
              onClick={() => setFilterUrgency(value)}
            >
              {value === "all" ? "Barchasi" : value === "expired" ? "Muddati o'tgan" : value === "week" ? "7 kun ichida" : "30 kun ichida"}
            </button>
          ))}
        </div>
        <label>
          <PackageSearch size={16} />
          <input
            value={filterText}
            onChange={(event) => setFilterText(event.target.value)}
            placeholder="Mahsulot nomi bo'yicha qidirish"
          />
        </label>
        {isSA && (
          <select
            className="crm-input"
            style={{ maxWidth: 190 }}
            value={filterBranch}
            onChange={(event) => setFilterBranch(event.target.value)}
          >
            <option value="all">Barcha skladlar</option>
            {Object.entries(BRANCH_NAMES).map(([id, name]) => (
              <option key={id} value={id}>{BRANCH_ICONS[id] || "🏢"} {name}</option>
            ))}
          </select>
        )}
      </div>

      <div className="damage-stats">
        <div className="damage-stat-card">
          <div className="damage-stat-label"><CalendarClock size={13} /> Muddati o'tgan</div>
          <div className="damage-stat-value" style={{ color: "#f85149" }}>{expired.length} ta partiya</div>
          <div className="damage-stat-sub">{fmtM(expiredValue)}</div>
        </div>
        <div className="damage-stat-card">
          <div className="damage-stat-label"><TrendingDown size={13} /> 7 kun ichida tugaydi</div>
          <div className="damage-stat-value" style={{ color: "#f0a500" }}>{atRisk.length} ta partiya</div>
          <div className="damage-stat-sub">{fmtM(atRiskValue)}</div>
        </div>
        <div className="damage-stat-card">
          <div className="damage-stat-label">Jami (filtrlangan) qiymat</div>
          <div className="damage-stat-value">{fmtM(totalValue)}</div>
          <div className="damage-stat-sub">{filtered.length} ta partiya</div>
        </div>

        {isSA && (
          <div className="damage-stat-card">
            <div className="damage-stat-label">Xavf ostidagi sklad bo'yicha</div>
            <div className="damage-rank-list">
              {branchBreakdown.slice(0, 4).map(([branch, value]) => (
                <div className="damage-rank-row" key={branch}>
                  <span className="damage-rank-row-name">{BRANCH_ICONS[branch] || "🏢"} {BRANCH_NAMES[branch] || branch}</span>
                  <span className="damage-rank-row-value">{fmtM(value)}</span>
                  <div className="damage-rank-bar-track">
                    <div className="damage-rank-bar-fill" style={{ width: `${maxBranchValue ? (value / maxBranchValue) * 100 : 0}%` }} />
                  </div>
                </div>
              ))}
              {!branchBreakdown.length && <span style={{ fontSize: 12, color: "var(--app-muted)" }}>Xavf ostida hech narsa yo'q</span>}
            </div>
          </div>
        )}

        <div className="damage-stat-card">
          <div className="damage-stat-label">Xavf ostidagi mahsulot bo'yicha</div>
          <div className="damage-rank-list">
            {productBreakdown.map((item) => (
              <div className="damage-rank-row" key={item.name}>
                <span className="damage-rank-row-name">{item.name} · {fmt(item.qty)} {item.unit}</span>
                <span className="damage-rank-row-value">{fmtM(item.value)}</span>
                <div className="damage-rank-bar-track">
                  <div className="damage-rank-bar-fill" style={{ width: `${maxProductValue ? (item.value / maxProductValue) * 100 : 0}%` }} />
                </div>
              </div>
            ))}
            {!productBreakdown.length && <span style={{ fontSize: 12, color: "var(--app-muted)" }}>Xavf ostida hech narsa yo'q</span>}
          </div>
        </div>
      </div>

      {groups.map((group) => (
        <div key={group.key} style={{ marginBottom: 20 }}>
          <div className="damage-history-date" style={{ display: "flex", alignItems: "center", gap: 6, color: group.config.c }}>
            {group.config.i} {group.config.l} · {group.items.length} ta
          </div>
          <div className="table-wrap">
            <table className="crm-table mobile-card-table">
              <thead>
                <tr>
                  <th>Mahsulot</th>
                  {isSA && <th>Sklad</th>}
                  <th>Miqdor</th>
                  <th>Keldi</th>
                  <th>Muddati</th>
                  <th>Qiymat</th>
                </tr>
              </thead>
              <tbody>
                {group.items.map((batch) => {
                  const days = daysUntil(batch.expiryDate);
                  return (
                    <tr key={batch.id}>
                      <td data-label="Mahsulot" className="mobile-card-primary" style={{ fontWeight: 700 }}>{batch.productName}</td>
                      {isSA && <td data-label="Sklad">{BRANCH_ICONS[batch.branch] || "🏢"} {BRANCH_NAMES[batch.branch] || batch.branch}</td>}
                      <td data-label="Miqdor">{fmt(batch.quantity)} {batch.unit}</td>
                      <td data-label="Keldi" style={{ fontSize: 11, color: "var(--app-muted)" }}>{fmtDate(batch.receivedDate)}</td>
                      <td data-label="Muddati">
                        {batch.expiryDate ? (
                          <span className="badge" style={{ background: group.config.bg, color: group.config.c }}>
                            {fmtDate(batch.expiryDate)} {days !== null && (days < 0 ? `(${Math.abs(days)} kun o'tdi)` : `(${days} kun)`)}
                          </span>
                        ) : (
                          <span style={{ color: "var(--app-muted)", fontSize: 12 }}>—</span>
                        )}
                      </td>
                      <td data-label="Qiymat" style={{ fontWeight: 700 }}>{fmtM(batchValue(batch))}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {!groups.length && (
        <div className="history-empty">
          <CalendarClock size={28} />
          <strong>Partiyalar topilmadi</strong>
          <span>Order orqali mahsulot kelganda yaroqlilik muddati shu yerda ko'rinadi</span>
        </div>
      )}
    </PageWrap>
  );
}

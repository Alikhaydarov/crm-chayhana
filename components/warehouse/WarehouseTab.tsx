"use client";
import { useState } from "react";
import { PageWrap, Modal } from "@/components/ui";
import { updateStockApi } from "@/lib/api";
import { fmt, fmtM } from "@/lib/utils";
import type { Product, StockMap, UserInfo } from "@/types";

type Props = {
  products: Product[];
  stock: StockMap;
  shopStock: StockMap;
  user: UserInfo;
  fetchAll: () => void;
  showToast: (msg: string, type?: "success" | "error") => void;
  t: Record<string, string>;
};

const qtyColor = (qty: number, min: number) =>
  qty <= min ? "#f85149" : qty <= min * 2 ? "#f0a500" : "#3fb950";

export function WarehouseTab({ products, stock, shopStock, user, fetchAll, showToast, t }: Props) {
  const [search, setSearch] = useState("");
  const [editP, setEditP] = useState<Product | null>(null);
  const [newQty, setNewQty] = useState("");

  const isSA = user.role === "superadmin";
  const visibleStock = stock;
  const warehouseProducts = !isSA
    ? products.filter((p) => (visibleStock[p.id] || 0) > 0)
    : products;
  const totalVal = warehouseProducts.reduce(
    (sum, product) => sum + (visibleStock[product.id] || 0) * product.pricePerUnit,
    0,
  );
  const filtered = warehouseProducts.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()),
  );
  const lowStock = filtered.filter((p) => (visibleStock[p.id] || 0) <= p.minStock).length;

  const saveStock = async () => {
    if (!editP) return;
    const qty = parseFloat(newQty);
    if (isNaN(qty) || qty < 0) { showToast("Noto'g'ri miqdor", "error"); return; }
    const d = await updateStockApi(editP.id, qty);
    if (d.success) { showToast("Sklad yangilandi"); setEditP(null); fetchAll(); }
    else showToast("Xatolik", "error");
  };

  return (
    <PageWrap
      title="Sklad"
      sub={
        <>
          Jami: <strong style={{ color: "#3fb950" }}>{fmtM(totalVal)}</strong>
          {lowStock > 0 && <span style={{ color: "#f85149", marginLeft: 8 }}>⚠️ {lowStock} ta kam</span>}
        </>
      }
    >
      {editP && (
        <Modal onClose={() => setEditP(null)}>
          <div className="modal-title">{t.editStock}</div>
          <div
            style={{
              background: "var(--app-panel-soft)", borderRadius: 12, padding: 14,
              marginBottom: 18, display: "flex", justifyContent: "space-between", alignItems: "center",
            }}
          >
            <div>
              <div style={{ fontWeight: 800, fontSize: 15 }}>{editP.name}</div>
              <div style={{ fontSize: 12, color: "var(--app-muted)", marginTop: 2 }}>
                Hozirgi: <strong style={{ color: "#f0a500" }}>{fmt(visibleStock[editP.id] || 0)} {editP.unit}</strong>
              </div>
            </div>
            <div style={{ fontSize: 32 }}>{(visibleStock[editP.id] || 0) <= editP.minStock ? "🔴" : "🟢"}</div>
          </div>
          <div className="form-group">
            <label className="form-label">YANGI MIQDOR ({editP.unit})</label>
            <input
              className="crm-input"
              type="number"
              value={newQty}
              onChange={(e) => setNewQty(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && saveStock()}
              autoFocus
            />
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
            <button className="btn-ghost" onClick={() => setEditP(null)} style={{ flex: 1 }}>{t.cancel}</button>
            <button className="btn-primary" onClick={saveStock} style={{ flex: 2 }}>💾 {t.save}</button>
          </div>
        </Modal>
      )}

      <div style={{ marginBottom: 16, maxWidth: 320 }}>
        <input
          className="crm-input"
          placeholder={t.searchProduct}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="table-wrap">
        <table className="crm-table mobile-card-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Mahsulot</th>
              <th className="hide-mobile">Kategoriya</th>
              <th>Birlik</th>
              <th>Sklad</th>
              <th>Holat</th>
              {isSA && <th>Amal</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.map((p, i) => {
              const qty = visibleStock[p.id] || 0;
              const c = qtyColor(qty, p.minStock);
              const badge = qty <= p.minStock ? "Kam" : qty <= p.minStock * 2 ? "O'rta" : "Yaxshi";
              return (
                <tr key={p.id}>
                  <td className="mobile-card-index" style={{ color: "var(--app-muted)", fontSize: 11, width: 36 }}>{i + 1}</td>
                  <td data-label="Mahsulot" className="mobile-card-primary" style={{ fontWeight: 700 }}>{p.name}</td>
                  <td className="hide-mobile" style={{ fontSize: 12, color: "var(--app-muted)" }}>{p.category}</td>
                  <td data-label="Birlik" style={{ color: "var(--app-muted)", fontSize: 12 }}>{p.unit}</td>
                  <td data-label="Sklad"><span style={{ fontWeight: 900, color: c, fontSize: 15 }}>{fmt(qty)}</span></td>
                  <td data-label="Holat"><span className="badge" style={{ background: `${c}18`, color: c }}>{badge}</span></td>
                  {isSA && (
                    <td data-label="Amal" className="mobile-card-actions">
                      <button
                        className="btn-icon"
                        onClick={() => { setEditP(p); setNewQty(String(visibleStock[p.id] || 0)); }}
                        style={{ color: "#7367f0", background: "rgba(115,103,240,.1)", borderColor: "rgba(115,103,240,.2)" }}
                      >
                        {t.edit}
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", color: "var(--app-muted)", padding: 40 }}>Mahsulot topilmadi</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </PageWrap>
  );
}

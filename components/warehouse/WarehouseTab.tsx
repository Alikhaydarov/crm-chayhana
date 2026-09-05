"use client";
import { useState } from "react";
import { AlertTriangle, ImagePlus, PackageX } from "lucide-react";
import { PageWrap, Modal } from "@/components/ui";
import { createDamageRequestApi, updateStockApi } from "@/lib/api";
import { fmt, fmtM } from "@/lib/utils";
import type { Product, StockMap, UserInfo } from "@/types";
import type { OrderReceipt } from "@/types/domain";

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

function fileToReceipt(file: File): Promise<OrderReceipt> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ name: file.name, type: file.type, dataUrl: String(reader.result || "") });
    reader.onerror = () => reject(new Error("Rasmni o'qib bo'lmadi"));
    reader.readAsDataURL(file);
  });
}

export function WarehouseTab({ products, stock, shopStock, user, fetchAll, showToast, t }: Props) {
  const [search, setSearch] = useState("");
  const [editP, setEditP] = useState<Product | null>(null);
  const [newQty, setNewQty] = useState("");
  const [damageOpen, setDamageOpen] = useState(false);
  const [damageQty, setDamageQty] = useState("1");
  const [damageReason, setDamageReason] = useState("");
  const [damageImage, setDamageImage] = useState<OrderReceipt | undefined>();
  const [damageSaving, setDamageSaving] = useState(false);

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

  const openStockModal = (product: Product) => {
    setEditP(product);
    setNewQty(String(visibleStock[product.id] || 0));
    setDamageOpen(false);
    setDamageQty("1");
    setDamageReason("");
    setDamageImage(undefined);
  };

  const closeStockModal = () => {
    if (damageSaving) return;
    setEditP(null);
    setDamageOpen(false);
    setDamageImage(undefined);
  };

  const submitDamage = async () => {
    if (!editP) return;
    const currentQty = visibleStock[editP.id] || 0;
    const qty = Number(damageQty);
    if (!Number.isFinite(qty) || qty <= 0) { showToast("Brak miqdori noto'g'ri", "error"); return; }
    if (qty > currentQty) { showToast("Brak miqdori skladdagi miqdordan ko'p", "error"); return; }
    if (damageReason.trim().length < 3) { showToast("Brak sababini yozing", "error"); return; }
    if (!damageImage) { showToast("Brak rasmini kiriting", "error"); return; }
    setDamageSaving(true);
    const result = await createDamageRequestApi({ branch: "main", productId: editP.id, quantity: qty, reason: damageReason.trim(), image: damageImage });
    setDamageSaving(false);
    if (!result.success) { showToast((result as any).message || "Brakka chiqarishda xatolik", "error"); return; }
    showToast("Mahsulot brakka chiqarildi va main skladdan ayrildi");
    setDamageOpen(false);
    setDamageQty("1");
    setDamageReason("");
    setDamageImage(undefined);
    fetchAll();
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
        <Modal onClose={closeStockModal}>
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
          {isSA && (
            <div style={{ border: "1px solid var(--app-border)", borderRadius: 14, padding: 12, margin: "12px 0", background: "var(--app-panel-soft)" }}>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setDamageOpen((value) => !value)}
                style={{ width: "100%", justifyContent: "space-between", color: "#f59e0b" }}
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><PackageX size={16} /> Brakka chiqarish</span>
                <span>{damageOpen ? "Yopish" : "Ochish"}</span>
              </button>
              {damageOpen && (
                <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">MIQDOR ({editP.unit})</label>
                      <input className="crm-input" type="number" min={1} max={visibleStock[editP.id] || 0} value={damageQty} onChange={(e) => setDamageQty(e.target.value)} />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">RASMI</label>
                      <label className="damage-upload" style={{ minHeight: 42 }}>
                        <ImagePlus size={17} />
                        <span>{damageImage ? damageImage.name : "JPG, PNG yoki WEBP, 10 MB gacha"}</span>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          capture="environment"
                          hidden
                          onChange={async (event) => {
                            const file = event.target.files?.[0];
                            if (!file) return;
                            if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) { showToast("Faqat JPG, PNG yoki WEBP rasm", "error"); return; }
                            if (file.size > 10 * 1024 * 1024) { showToast("Rasm 10 MB dan kichik bo'lishi kerak", "error"); return; }
                            try { setDamageImage(await fileToReceipt(file)); } catch { showToast("Rasmni o'qib bo'lmadi", "error"); }
                          }}
                        />
                      </label>
                    </div>
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">SABAB</label>
                    <textarea className="crm-input" rows={3} value={damageReason} onChange={(e) => setDamageReason(e.target.value)} placeholder="Masalan: yaroqsiz, singan, muddati o'tgan..." />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--app-muted)", fontSize: 12 }}>
                    <AlertTriangle size={14} />
                    Tasdiqlanganda miqdor darhol main skladdan ayriladi va Brak tarixiga tushadi.
                  </div>
                  <button className="btn-primary" onClick={submitDamage} disabled={damageSaving} style={{ background: "linear-gradient(135deg, #f59e0b, #ef4444)" }}>
                    {damageSaving ? "Saqlanmoqda..." : "Brakka chiqarish"}
                  </button>
                </div>
              )}
            </div>
          )}
          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
            <button className="btn-ghost" onClick={closeStockModal} style={{ flex: 1 }}>{t.cancel}</button>
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
                        onClick={() => openStockModal(p)}
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

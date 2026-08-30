"use client";
import { useRef, useState } from "react";
import { CheckCircle2, ScanLine } from "lucide-react";
import { PageWrap, Modal } from "@/components/ui";
import { addProductApi } from "@/lib/api";
import { fmt, fmtM } from "@/lib/utils";
import type { Product, StockMap } from "@/types";
import type { Company } from "@/types/domain";

type Props = {
  products: Product[];
  stock: StockMap;
  companies: Company[];
  fetchAll: () => void;
  showToast: (msg: string, type?: "success" | "error") => void;
  t: Record<string, string>;
};

export function ProductsTab({ products, stock, companies, fetchAll, showToast, t }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");
  const [scannerReady, setScannerReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const barcodeRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    name: "", category: "gosht", unit: "kg",
    minStock: "0", pricePerUnit: "0", perBox: "0",
    boxUnit: "", qrCode: "", supplierId: "",
  });

const submit = async () => {
  if (!form.name.trim()) {
    showToast("Nom kiriting", "error");
    return;
  }
  const barcode = form.qrCode.trim();
  if (barcode && products.some((product) => product.qrCode?.trim() === barcode)) {
    showToast("Bu shtrix-kod boshqa mahsulotga biriktirilgan", "error");
    barcodeRef.current?.focus();
    return;
  }

  const payload = {
    id:
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : String(Date.now()),

    name: form.name.trim(),
    category: form.category,
    unit: form.unit,
    minStock: Number(form.minStock) || 0,
    pricePerUnit: Number(form.pricePerUnit) || 0,
    perBox: Number(form.perBox) || 0,
    boxUnit: form.boxUnit || "",
    qrCode: barcode,
    supplierId: form.supplierId,
  };

  try {
    setSaving(true);
    const d = await addProductApi(payload);

    if (d.success) {
      showToast("Mahsulot qo'shildi!");
      setShowModal(false);
      setScannerReady(false);

      setForm({
        name: "",
        category: "gosht",
        unit: "kg",
        minStock: "0",
        pricePerUnit: "0",
        perBox: "0",
        boxUnit: "",
        qrCode: "",
        supplierId: "",
      });

      fetchAll();
    } else {
      showToast((d as any).message || "Xatolik", "error");
    }
  } catch (error) {
    console.error(error);
    showToast("Server bilan bog'lanishda xatolik", "error");
  } finally {
    setSaving(false);
  }
};

  const armScanner = () => {
    setScannerReady(true);
    requestAnimationFrame(() => {
      barcodeRef.current?.focus();
      barcodeRef.current?.select();
    });
  };

  const confirmBarcode = () => {
    const barcode = form.qrCode.trim();
    if (!barcode) return;
    const duplicate = products.find((product) => product.qrCode?.trim() === barcode);
    if (duplicate) {
      setScannerReady(false);
      showToast(`Bu kod ${duplicate.name} mahsulotida mavjud`, "error");
      barcodeRef.current?.select();
      return;
    }
    setForm((current) => ({ ...current, qrCode: barcode }));
    setScannerReady(false);
    showToast("Shtrix-kod qabul qilindi");
  };

  const filtered = products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <PageWrap
      title="🏷️ Mahsulotlar"
      sub={`${products.length} ta mahsulot`}
      action={<button className="btn-primary" onClick={() => setShowModal(true)}>{t.addNewProduct}</button>}
    >
      {showModal && (
        <Modal onClose={() => { setShowModal(false); setScannerReady(false); }}>
          <div className="modal-title">🏷️ {t.addNewProduct}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 4 }}>
            <div style={{ gridColumn: "1/-1" }} className="form-group">
              <label className="form-label">MAHSULOT NOMI</label>
              <input className="crm-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nomini kiriting" autoFocus />
            </div>
            <div className="form-group">
              <label className="form-label">KATEGORIYA</label>
              <select className="crm-input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {["gosht", "sabzavot", "don", "sut", "meva", "ziravorlar", "ichimlik", "boshqa"].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">BIRLIK</label>
              <select className="crm-input" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
                {["kg", "g", "l", "ml", "dona", "qop", "quti", "karobka"].map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">MIN SKLAD</label>
              <input className="crm-input" type="number" value={form.minStock} onChange={(e) => setForm({ ...form, minStock: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">NARXI ()</label>
              <input className="crm-input" type="number" value={form.pricePerUnit} onChange={(e) => setForm({ ...form, pricePerUnit: e.target.value })} />
            </div>
            <div style={{ gridColumn: "1/-1" }} className="form-group">
              <label className="form-label">FIRMA</label>
              <select className="crm-input" value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })}>
                <option value="">— Firma tanlang —</option>
                {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">QUTIDAGI SONI</label>
              <input className="crm-input" type="number" value={form.perBox} onChange={(e) => setForm({ ...form, perBox: e.target.value })} placeholder="24" />
            </div>
            <div className="form-group">
              <label className="form-label">QUTI BIRLIGI</label>
              <input className="crm-input" value={form.boxUnit} onChange={(e) => setForm({ ...form, boxUnit: e.target.value })} placeholder="shisha, dona..." />
            </div>
            <div style={{ gridColumn: "1/-1" }} className="form-group">
              <label className="form-label">SHTRIX KOD / QR</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}>
                <input
                  ref={barcodeRef}
                  className="crm-input"
                  value={form.qrCode}
                  onChange={(e) => setForm({ ...form, qrCode: e.target.value })}
                  onFocus={() => setScannerReady(true)}
                  onBlur={() => setScannerReady(false)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      confirmBarcode();
                    }
                  }}
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="Skanerda uring yoki qo'lda kiriting"
                />
                <button type="button" onClick={armScanner} className="btn-ghost compact-btn" style={{ whiteSpace: "nowrap" }}>
                  <ScanLine size={17} /> Skaner
                </button>
              </div>
              <div style={{ minHeight: 18, marginTop: 6, color: scannerReady ? "var(--app-primary)" : form.qrCode ? "#28c76f" : "var(--app-muted)", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", gap: 5 }}>
                {scannerReady ? <><ScanLine size={14} /> Skaner tayyor. Kodni uring.</> : form.qrCode ? <><CheckCircle2 size={14} /> Kod kiritildi. Enter bilan tekshiriladi.</> : "USB yoki Bluetooth skaner qo'llab-quvvatlanadi."}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            <button className="btn-ghost" onClick={() => setShowModal(false)} style={{ flex: 1 }}>Bekor</button>
            <button className="btn-primary" onClick={submit} disabled={saving} style={{ flex: 2 }}>{saving ? "Saqlanmoqda..." : "Saqlash"}</button>
          </div>
        </Modal>
      )}

      <div style={{ marginBottom: 16, maxWidth: 320 }}>
        <input className="crm-input" placeholder="🔍 Mahsulot qidirish..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="table-wrap">
        <table className="crm-table">
          <thead>
            <tr>
              <th>#</th><th>Nomi</th><th className="hide-mobile">Kategoriya</th>
              <th>Birlik</th><th className="hide-mobile">QR / Shtrix</th><th>Narxi</th><th>Sklad</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p, i) => {
              const qty = stock[p.id] || 0;
              const c = qty <= p.minStock ? "#f85149" : qty <= p.minStock * 2 ? "#f0a500" : "#3fb950";
              return (
                <tr key={p.id}>
                  <td style={{ color: "var(--app-muted)", fontSize: 11, width: 36 }}>{i + 1}</td>
                  <td style={{ fontWeight: 700 }}>{p.name}</td>
                  <td className="hide-mobile"><span className="badge" style={{ background: "rgba(115,103,240,.08)", color: "#7367f0" }}>{p.category}</span></td>
                  <td style={{ color: "var(--app-muted)" }}>
                    {p.unit}
                    {p.perBox > 0 && <span style={{ marginLeft: 6, fontSize: 10, background: "rgba(59,130,246,.1)", color: "#3b82f6", padding: "2px 7px", borderRadius: 8 }}>1={p.perBox}{p.boxUnit}</span>}
                  </td>
                  <td className="hide-mobile" style={{ fontFamily: "monospace", fontSize: 11, color: "var(--app-muted)" }}>
                    {p.qrCode || <span style={{ color: "var(--app-border)" }}>—</span>}
                  </td>
                  <td style={{ color: "#7367f0", fontWeight: 800 }}>{fmtM(p.pricePerUnit)}</td>
                  <td><span style={{ fontWeight: 900, color: c, fontSize: 14 }}>{fmt(qty)}</span> <span style={{ fontSize: 10, color: "var(--app-muted)" }}>{p.unit}</span></td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", color: "var(--app-muted)", padding: 48 }}>
                  <div style={{ fontSize: 36, marginBottom: 8 }}>🏷️</div>Mahsulot topilmadi
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </PageWrap>
  );
}

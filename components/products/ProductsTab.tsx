"use client";
import { useMemo, useRef, useState } from "react";
import { Camera, CheckCircle2, Package, Search, Save, ScanLine, Trash2, X } from "lucide-react";
import { PageWrap, Modal } from "@/components/ui";
import { DeleteProductDialog, ProductDialog } from "@/components/ui/product-dialog";
import { CameraCodeScanner } from "@/components/products/CameraCodeScanner";
import { addProductApi, deleteProductApi, updateProductApi } from "@/lib/api";
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
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");
  const [searchCameraOpen, setSearchCameraOpen] = useState(false);
  const [scannerReady, setScannerReady] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [editCameraOpen, setEditCameraOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const barcodeRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    name: "", category: "gosht", unit: "kg",
    minStock: "0", pricePerUnit: "0", perBox: "0",
    boxUnit: "", qrCode: "", supplierId: "",
  });
  const [editForm, setEditForm] = useState({ name: "", category: "boshqa", unit: "dona", minStock: "0", pricePerUnit: "0", perBox: "0", boxUnit: "", qrCode: "", supplierId: "" });

  const openProduct = (product: Product) => {
    setSelectedProduct(product);
    setEditForm({ name: product.name, category: product.category, unit: product.unit, minStock: String(product.minStock), pricePerUnit: String(product.pricePerUnit), perBox: String(product.perBox || 0), boxUnit: product.boxUnit || "", qrCode: product.qrCode || "", supplierId: product.supplierId || "" });
  };

  const saveProduct = async () => {
    if (!selectedProduct || !editForm.name.trim()) { showToast("Mahsulot nomini kiriting", "error"); return; }
    const barcode = editForm.qrCode.trim();
    if (barcode && products.some((product) => product.id !== selectedProduct.id && product.qrCode?.trim() === barcode)) { showToast("Bu shtrix-kod boshqa mahsulotda mavjud", "error"); return; }
    setSaving(true);
    const result = await updateProductApi(selectedProduct.id, { name: editForm.name.trim(), category: editForm.category, unit: editForm.unit, minStock: Number(editForm.minStock) || 0, pricePerUnit: Number(editForm.pricePerUnit) || 0, perBox: Number(editForm.perBox) || 0, boxUnit: editForm.boxUnit.trim(), qrCode: barcode, supplierId: editForm.supplierId });
    setSaving(false);
    if (!result.success) { showToast(result.message || "Mahsulotni yangilab bo'lmadi", "error"); return; }
    showToast("Mahsulot ma'lumotlari yangilandi");
    setSelectedProduct(null);
    fetchAll();
  };

  const removeProduct = async () => {
    if (!selectedProduct) return;
    setDeleting(true);
    const result = await deleteProductApi(selectedProduct.id);
    setDeleting(false);
    if (!result.success) { showToast(result.message || "Mahsulotni o'chirib bo'lmadi", "error"); return; }
    setDeleteOpen(false);
    setSelectedProduct(null);
    showToast("Mahsulot o'chirildi");
    fetchAll();
  };


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
      setCameraOpen(false);

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

  const categories = useMemo(() => Array.from(new Set(products.map((product) => product.category).filter(Boolean))).sort(), [products]);
  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return products.filter((product) => {
      const company = companies.find((item) => item.id === product.supplierId);
      const haystack = `${product.name} ${product.qrCode || ""} ${product.category} ${product.unit} ${company?.name || ""}`.toLocaleLowerCase();
      const quantity = Number(stock[product.id] || 0);
      const matchesStock = stockFilter === "all" || (stockFilter === "available" && quantity > 0) || (stockFilter === "low" && quantity > 0 && quantity <= Number(product.minStock || 0)) || (stockFilter === "out" && quantity <= 0);
      return (!query || haystack.includes(query)) && (categoryFilter === "all" || product.category === categoryFilter) && matchesStock;
    }).sort((a, b) => {
      const aExact = a.qrCode?.trim().toLocaleLowerCase() === query || a.name.trim().toLocaleLowerCase() === query;
      const bExact = b.qrCode?.trim().toLocaleLowerCase() === query || b.name.trim().toLocaleLowerCase() === query;
      return Number(bExact) - Number(aExact) || a.name.localeCompare(b.name);
    });
  }, [products, companies, stock, search, categoryFilter, stockFilter]);
  const hasFilters = Boolean(search.trim() || categoryFilter !== "all" || stockFilter !== "all");
  const findExactProduct = (value: string) => products.find((product) => product.qrCode?.trim() === value.trim()) || products.find((product) => product.name.trim().toLocaleLowerCase() === value.trim().toLocaleLowerCase());
  const clearFilters = () => { setSearch(""); setCategoryFilter("all"); setStockFilter("all"); };

  return (
    <PageWrap
      title="🏷️ Mahsulotlar"
      sub={`${products.length} ta mahsulot`}
      action={<button className="btn-primary" onClick={() => setShowModal(true)}>{t.addNewProduct}</button>}
    >
      {showModal && (
        <Modal onClose={() => { setShowModal(false); setScannerReady(false); setCameraOpen(false); }}>
          <div className="modal-title">🏷️ {t.addNewProduct}</div>
          <div className="product-form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 4 }}>
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
              <label className="form-label">MINIMAL QOLDIQ</label>
              <input className="crm-input" type="number" value={form.minStock} onChange={(e) => setForm({ ...form, minStock: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">NARXI (WON)</label>
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
            <div style={{ gridColumn: "1/-1" }} className="form-group product-code-field">
              <label className="form-label">SHTRIX KOD / QR</label>
              <div className="barcode-input-row" style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 8 }}>
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
                <button type="button" onClick={() => setCameraOpen(true)} className="btn-primary compact-btn" style={{ whiteSpace: "nowrap" }}>
                  <Camera size={17} /> Shtrix-kod skanerlash
                </button>
                <button type="button" onClick={armScanner} className="btn-ghost compact-btn" style={{ whiteSpace: "nowrap" }}>
                  <ScanLine size={17} /> USB skaner
                </button>
              </div>
              <div style={{ minHeight: 18, marginTop: 6, color: scannerReady ? "var(--app-primary)" : form.qrCode ? "#28c76f" : "var(--app-muted)", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", gap: 5 }}>
                {scannerReady ? <><ScanLine size={14} /> Skaner tayyor. Kodni uring.</> : form.qrCode ? <><CheckCircle2 size={14} /> Kod kiritildi. Enter bilan tekshiriladi.</> : "Telefon kamerasi, USB yoki Bluetooth skaner qo'llab-quvvatlanadi."}
              </div>
            </div>
            <div className="product-camera-panel" style={{ gridColumn: "1/-1" }}><CameraCodeScanner open={cameraOpen} onClose={() => setCameraOpen(false)} onDetected={(code) => {
              const duplicate = products.find((product) => product.qrCode?.trim() === code);
              setCameraOpen(false);
              if (duplicate) { showToast(`Bu kod ${duplicate.name} mahsulotida mavjud`, "error"); return; }
              setForm((current) => ({ ...current, qrCode: code }));
              setScannerReady(false);
              showToast("Kod kameradan avtomatik olindi");
            }} /></div>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            <button className="btn-ghost" onClick={() => setShowModal(false)} style={{ flex: 1 }}>Bekor</button>
            <button className="btn-primary" onClick={submit} disabled={saving} style={{ flex: 2 }}>{saving ? "Saqlanmoqda..." : "Saqlash"}</button>
          </div>
        </Modal>
      )}

      <ProductDialog open={Boolean(selectedProduct)} onOpenChange={(open) => { if (!open) { setSelectedProduct(null); setEditCameraOpen(false); } }} title="Mahsulot ma'lumotlari" description="Ma'lumotlarni yangilang yoki mahsulotni bazadan o'chiring.">
        {selectedProduct && <>
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 12px", marginBottom: 16, borderRadius: 8, background: "var(--app-panel-soft)", border: "1px solid var(--app-border)" }}>
            <div style={{ display: "grid", width: 40, height: 40, placeItems: "center", borderRadius: 8, background: "rgba(115,103,240,.12)", color: "#7367f0" }}><Package size={20} /></div>
            <div style={{ minWidth: 0, flex: 1 }}><strong style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selectedProduct.name}</strong><span style={{ color: "var(--app-muted)", fontSize: 12 }}>Skladda: {fmt(stock[selectedProduct.id] || 0)} {selectedProduct.unit}</span></div>
            {selectedProduct.qrCode && <code style={{ color: "var(--app-muted)", fontSize: 11 }}>{selectedProduct.qrCode}</code>}
          </div>
          <div className="product-edit-grid">
            <div className="form-group product-edit-span"><label className="form-label">MAHSULOT NOMI</label><input className="crm-input" value={editForm.name} onChange={(event) => setEditForm({ ...editForm, name: event.target.value })} autoFocus /></div>
            <div className="form-group"><label className="form-label">KATEGORIYA</label><select className="crm-input" value={editForm.category} onChange={(event) => setEditForm({ ...editForm, category: event.target.value })}>{["gosht", "sabzavot", "don", "sut", "meva", "ziravorlar", "ichimlik", "boshqa"].map((value) => <option key={value} value={value}>{value}</option>)}</select></div>
            <div className="form-group"><label className="form-label">BIRLIK</label><select className="crm-input" value={editForm.unit} onChange={(event) => setEditForm({ ...editForm, unit: event.target.value })}>{["kg", "g", "l", "ml", "dona", "qop", "quti", "karobka"].map((value) => <option key={value} value={value}>{value}</option>)}</select></div>
            <div className="form-group"><label className="form-label">MINIMAL QOLDIQ</label><input className="crm-input" type="number" min="0" value={editForm.minStock} onChange={(event) => setEditForm({ ...editForm, minStock: event.target.value })} /></div>
            <div className="form-group"><label className="form-label">1 DONA NARXI (WON)</label><input className="crm-input" type="number" min="0" value={editForm.pricePerUnit} onChange={(event) => setEditForm({ ...editForm, pricePerUnit: event.target.value })} /></div>
            <div className="form-group"><label className="form-label">QUTIDAGI SONI</label><input className="crm-input" type="number" min="0" value={editForm.perBox} onChange={(event) => setEditForm({ ...editForm, perBox: event.target.value })} /></div>
            <div className="form-group"><label className="form-label">QUTI BIRLIGI</label><input className="crm-input" value={editForm.boxUnit} onChange={(event) => setEditForm({ ...editForm, boxUnit: event.target.value })} /></div>
            <div className="form-group product-edit-span"><label className="form-label">FIRMA</label><select className="crm-input" value={editForm.supplierId} onChange={(event) => setEditForm({ ...editForm, supplierId: event.target.value })}><option value="">— Firma tanlanmagan —</option>{companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</select></div>
            <div className="form-group product-edit-span"><label className="form-label">SHTRIX-KOD</label><div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}><input className="crm-input" inputMode="numeric" value={editForm.qrCode} onChange={(event) => setEditForm({ ...editForm, qrCode: event.target.value })} /><button type="button" className="btn-ghost" onClick={() => setEditCameraOpen(true)} title="Kamera bilan skanerlash"><Camera size={17} /></button></div></div>
          </div>
          <CameraCodeScanner open={editCameraOpen} onClose={() => setEditCameraOpen(false)} onDetected={(code) => { const duplicate = products.find((product) => product.id !== selectedProduct.id && product.qrCode?.trim() === code); setEditCameraOpen(false); if (duplicate) { showToast(`Bu kod ${duplicate.name} mahsulotida mavjud`, "error"); return; } setEditForm((current) => ({ ...current, qrCode: code })); }} />
          <div className="radix-dialog-actions" style={{ justifyContent: "space-between" }}><button type="button" className="btn-danger" onClick={() => setDeleteOpen(true)}><Trash2 size={16} /> O'chirish</button><div style={{ display: "flex", gap: 8 }}><button type="button" className="btn-ghost" onClick={() => setSelectedProduct(null)}>Bekor</button><button type="button" className="btn-primary" onClick={saveProduct} disabled={saving}><Save size={16} /> {saving ? "Saqlanmoqda..." : "Yangilash"}</button></div></div>
        </>}
      </ProductDialog>
      <DeleteProductDialog open={deleteOpen} onOpenChange={setDeleteOpen} productName={selectedProduct?.name || ""} loading={deleting} onConfirm={removeProduct} />

      <section className="product-search-panel">
        <div className="product-search-input"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { const product = findExactProduct(search); if (product) openProduct(product); } }} placeholder="Nomi, shtrix-kodi yoki firma..." autoComplete="off" />{search && <button type="button" onClick={() => setSearch("")} aria-label="Qidiruvni tozalash"><X size={15} /></button>}</div>
        <select className="crm-input product-filter-select" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} aria-label="Kategoriya filtri"><option value="all">Barcha kategoriyalar</option>{categories.map((category) => <option key={category} value={category}>{category}</option>)}</select>
        <select className="crm-input product-filter-select" value={stockFilter} onChange={(event) => setStockFilter(event.target.value)} aria-label="Sklad holati filtri"><option value="all">Barcha qoldiqlar</option><option value="available">Skladda mavjud</option><option value="low">Kam qolgan</option><option value="out">Tugagan</option></select>
        <button type="button" className="btn-primary product-search-scan" onClick={() => setSearchCameraOpen(true)}><Camera size={17} /><span>Shtrix-kod</span></button>
        {hasFilters && <button type="button" className="btn-ghost product-search-clear" onClick={clearFilters} title="Barcha filtrlarni tozalash"><X size={16} /></button>}
      </section>
      <div className="product-search-meta"><span><strong>{filtered.length}</strong> ta natija</span>{search.trim() && <span>“{search.trim()}” bo‘yicha</span>}</div>
      <CameraCodeScanner open={searchCameraOpen} onClose={() => setSearchCameraOpen(false)} onDetected={(code) => { setSearchCameraOpen(false); setSearch(code); const product = findExactProduct(code); if (product) { openProduct(product); showToast(`${product.name} topildi`); } else showToast("Bu shtrix-kod bo'yicha mahsulot topilmadi", "error"); }} />

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
                <tr key={p.id} className="product-row-clickable" tabIndex={0} onClick={() => openProduct(p)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openProduct(p); } }} aria-label={`${p.name} mahsulotini ochish`}>
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

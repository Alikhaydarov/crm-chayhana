"use client";
import { useMemo, useState } from "react";
import { Camera, FileText, PackagePlus, Search, ScanLine } from "lucide-react";
import { PageWrap, Modal } from "@/components/ui";
import { CameraCodeScanner } from "@/components/products/CameraCodeScanner";
import { addProductApi, createOrderApi, uploadOrderDocumentApi } from "@/lib/api";
import { PAY_STATUS_CONFIG } from "@/lib/constants";
import { fmtM, fmtDate } from "@/lib/utils";
import type { Product } from "@/types";
import type { Company, Order, OrderReceipt } from "@/types/domain";

type Props = {
  orders: Order[];
  products: Product[];
  companies: Company[];
  fetchAll: () => void;
  showToast: (msg: string, type?: "success" | "error") => void;
  t: Record<string, string>;
};

const todayValue = () => {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

export function OrdersTab({ orders, products, companies, fetchAll, showToast, t }: Props) {
  const [showModal, setShowModal] = useState(false);
  const emptyForm = () => ({
    companyId: "",
    note: "",
    payStatus: "unpaid" as "paid" | "unpaid",
    orderDate: todayValue(),
    receipt: null as OrderReceipt | null,
    productDocument: null as OrderReceipt | null,
  });
  const [form, setForm] = useState(emptyForm);
  const [items, setItems] = useState<{ pid: string; qty: number; price: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [createdProducts, setCreatedProducts] = useState<Product[]>([]);
  const [newProductOpen, setNewProductOpen] = useState(false);
  const [productSaving, setProductSaving] = useState(false);
  const [productDocumentFile, setProductDocumentFile] = useState<File | null>(null);
  const [productDraft, setProductDraft] = useState({ name: "", category: "boshqa", unit: "dona", minStock: "0", pricePerUnit: "0", qrCode: "", supplierId: "" });
  const availableProducts = useMemo(() => [...products, ...createdProducts.filter((created) => !products.some((product) => product.id === created.id))], [products, createdProducts]);
  const filteredProducts = availableProducts.filter((product) => `${product.name} ${product.qrCode || ""}`.toLowerCase().includes(productSearch.trim().toLowerCase()));

  const total = items.reduce((s, i) => s + i.qty * (i.price || 0), 0);
  const selectedCompany = companies.find((company) => company.id === form.companyId);

  const selectCompany = (companyId: string) => {
    setForm((current) => ({ ...current, companyId }));
    setItems([]);
    setProductSearch("");
    setNewProductOpen(false);
    setCameraOpen(false);
    setProductDraft((current) => ({ ...current, supplierId: companyId }));
  };

  const addProductToOrder = (product: Product) => {
    setItems((current) => {
      const existing = current.find((item) => item.pid === product.id);
      if (existing) return current.map((item) => item.pid === product.id ? { ...item, qty: item.qty + 1 } : item);
      return [...current, { pid: product.id, qty: 1, price: product.pricePerUnit || 0 }];
    });
  };

  const handleScannedCode = (code: string) => {
    setCameraOpen(false);
    setProductSearch(code);
    const product = availableProducts.find((item) => item.qrCode?.trim() === code);
    if (product) {
      addProductToOrder(product);
      setNewProductOpen(false);
      setProductSearch(product.name);
      showToast(`${product.name} orderga qo'shildi`);
      return;
    }
    setProductDraft((current) => ({ ...current, qrCode: code }));
    setNewProductOpen(true);
    showToast("Shtrix-kod kiritildi. Endi mahsulot nomi va narxini kiriting");
  };

  const selectFromSearch = () => {
    const query = productSearch.trim().toLowerCase();
    if (!query) return;
    const product = availableProducts.find((item) => item.qrCode?.trim().toLowerCase() === query)
      || availableProducts.find((item) => item.name.trim().toLowerCase() === query);
    if (!product) { showToast("Mahsulot topilmadi. Yangi mahsulot sifatida qo'shishingiz mumkin", "error"); return; }
    addProductToOrder(product);
    setProductSearch(product.name);
    showToast(`${product.name} orderga qo'shildi`);
  };

  const saveNewProduct = async () => {
    if (!productDraft.name.trim()) { showToast("Mahsulot nomini kiriting", "error"); return; }
    if (Number(productDraft.pricePerUnit) <= 0) { showToast("Mahsulot narxini kiriting", "error"); return; }
    if (productDraft.qrCode && availableProducts.some((product) => product.qrCode?.trim() === productDraft.qrCode.trim())) { showToast("Bu kod boshqa mahsulotda mavjud", "error"); return; }
    setProductSaving(true);
    const payload = { name: productDraft.name.trim(), category: productDraft.category, unit: productDraft.unit, minStock: Number(productDraft.minStock) || 0, pricePerUnit: Number(productDraft.pricePerUnit) || 0, perBox: 0, boxUnit: "", qrCode: productDraft.qrCode.trim(), supplierId: productDraft.supplierId };
    const result = await addProductApi(payload);
    setProductSaving(false);
    if (!result.success) { showToast((result as any).message || "Mahsulotni saqlab bo'lmadi", "error"); return; }
    const returned = (result as any).data || {};
    const product: Product = { ...payload, id: String(returned.id ?? returned.external_id ?? `p${Date.now()}`), name: returned.name ?? payload.name, qrCode: returned.qrCode ?? returned.qr_code ?? payload.qrCode, pricePerUnit: Number(returned.pricePerUnit ?? returned.price_per_unit ?? payload.pricePerUnit) };
    setCreatedProducts((current) => [...current, product]);
    addProductToOrder(product);
    setProductSearch(product.name);
    setNewProductOpen(false);
    setProductDraft({ name: "", category: "boshqa", unit: "dona", minStock: "0", pricePerUnit: "0", qrCode: "", supplierId: "" });
    showToast("Yangi mahsulot yaratildi va orderga qo'shildi");
    fetchAll();
  };

  const submit = async () => {
    if (!form.companyId) { showToast("Firma tanlang", "error"); return; }
    if (!form.orderDate) { showToast("Order sanasini kiriting", "error"); return; }
    const valid = items.filter((i) => i.pid && i.qty > 0 && i.price > 0);
    if (!valid.length) { showToast("Mahsulot va narx kiriting", "error"); return; }
    setLoading(true);
    let productDocument = form.productDocument || undefined;
    if (productDocumentFile) {
      const uploaded = await uploadOrderDocumentApi(productDocumentFile);
      if (!uploaded.success) { showToast(uploaded.message || "Mahsulot hujjatini yuklab bo'lmadi", "error"); setLoading(false); return; }
      productDocument = uploaded.document;
    }
    const d = await createOrderApi({
      companyId: form.companyId,
      items: valid.map((i) => ({ productId: i.pid, quantity: i.qty, pricePerUnit: i.price })),
      note: form.note,
      payStatus: form.payStatus,
      paidAmount: form.payStatus === "paid" ? total : 0,
      orderDate: form.orderDate,
      receipt: form.receipt || undefined,
      productDocument,
    });
    if (d.success) {
      showToast("Order saqlandi ✅");
      setShowModal(false);
      setCameraOpen(false);
      setNewProductOpen(false);
      setProductSearch("");
      setProductDocumentFile(null);
      setForm(emptyForm());
      setItems([]);
      fetchAll();
    } else showToast((d as any).message || "Xatolik", "error");
    setLoading(false);
  };

  const selectReceipt = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/") && file.type !== "application/pdf") { showToast("Chek faqat rasm yoki PDF", "error"); return; }
    if (file.size > 2 * 1024 * 1024) { showToast("Chek 2 MB dan kichik bo'lishi kerak", "error"); return; }
    const reader = new FileReader();
    reader.onload = () => setForm((cur) => ({ ...cur, receipt: { name: file.name, type: file.type, dataUrl: String(reader.result) } }));
    reader.onerror = () => showToast("Faylni o'qib bo'lmadi", "error");
    reader.readAsDataURL(file);
  };

  const selectProductDocument = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/") && file.type !== "application/pdf") { showToast("Mahsulot hujjati faqat rasm yoki PDF bo'lishi mumkin", "error"); return; }
    if (file.size > 10 * 1024 * 1024) { showToast("Mahsulot hujjati 10 MB dan kichik bo'lishi kerak", "error"); return; }
    setProductDocumentFile(file);
    setForm((current) => ({ ...current, productDocument: { name: file.name, type: file.type, dataUrl: "" } }));
  };

  return (
    <PageWrap
      title="Orderlar"
      sub={`${orders.length} ta order`}
      action={<button className="btn-primary" onClick={() => setShowModal(true)}>+ Yangi order</button>}
    >
      {showModal && (
        <Modal className={newProductOpen ? "order-modal-wide" : ""} onClose={() => { setShowModal(false); setCameraOpen(false); setNewProductOpen(false); }}>
          <div className="modal-title">Yangi order</div>
          <div className="order-modal-layout">
          <div className="order-main-form">

          <div className="form-group">
            <label className="form-label">1. FIRMANI TANLANG</label>
            <select className="crm-input" value={form.companyId} onChange={(e) => selectCompany(e.target.value)} autoFocus>
              <option value="">— Firma tanlang —</option>
              {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {companies.length === 0 && <div style={{ fontSize: 12, color: "#f0a500", marginTop: 6 }}>⚠️ Avval Firmalar bo'limida firma qo'shing</div>}
          </div>

          {form.companyId && (
            <>
              <div className="order-scan-first">
                <div className="form-label"><ScanLine size={14} /> 2. MAHSULOTNI QIDIRISH YOKI SKANERLASH</div>
                <div className="order-product-search"><Search size={17} /><input value={productSearch} onChange={(event) => setProductSearch(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); selectFromSearch(); } }} placeholder="Nomi yoki shtrix-kodi" /><button type="button" className="btn-primary" onClick={() => setCameraOpen(true)}><Camera size={17} /> Shtrix-kod skanerlash</button></div>
                {productSearch.trim() && (
                  <div style={{ display: "grid", gap: 6, marginTop: 8 }}>
                    {filteredProducts.slice(0, 6).map((product) => <button type="button" key={product.id} className="btn-ghost" onClick={() => { addProductToOrder(product); setProductSearch(product.name); showToast(`${product.name} orderga qo'shildi`); }} style={{ justifyContent: "space-between", textAlign: "left" }}><span>{product.name}</span><small style={{ color: "var(--app-muted)" }}>{product.qrCode || "Shtrix-kodsiz"}</small></button>)}
                    {filteredProducts.length === 0 && <div style={{ color: "var(--app-muted)", fontSize: 12, padding: "6px 2px" }}>Mahsulot topilmadi. Pastdagi yangi mahsulot tugmasi orqali qo'shing.</div>}
                  </div>
                )}
                <CameraCodeScanner open={cameraOpen} onClose={() => setCameraOpen(false)} onDetected={handleScannedCode} />
              </div>

              <div className="form-group">
                <label className="form-label">ORDER SANASI</label>
                <input className="crm-input" type="date" value={form.orderDate} onChange={(e) => setForm({ ...form, orderDate: e.target.value })} />
              </div>

              <div className="form-group">
                <label className="form-label">MAHSULOTLAR</label>
                {items.length === 0 && <div style={{ border: "1.5px dashed var(--app-border)", borderRadius: 10, padding: 14, color: "var(--app-muted)", fontSize: 12, textAlign: "center", marginBottom: 10 }}><ScanLine size={18} style={{ verticalAlign: "middle", marginRight: 7 }} />Yuqoridan shtrix-kodni skanerlang yoki nomi/kodini qidiring</div>}
                {items.map((item, i) => {
                  const prod = availableProducts.find((p) => p.id === item.pid);
                  return (
                    <div key={i} style={{ background: "var(--app-panel-soft)", borderRadius: 12, padding: 12, marginBottom: 10 }}>
                      <div className="order-item-fields" style={{ display: "grid", gridTemplateColumns: "1fr 80px 110px 36px", gap: 8, marginBottom: prod ? 8 : 0 }}>
                        <div className="crm-input" style={{ minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center" }}><strong style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{prod?.name || "Mahsulot topilmadi"}</strong>{prod?.qrCode && <small style={{ color: "var(--app-muted)" }}>{prod.qrCode}</small>}</div>
                        <input className="crm-input" aria-label="Miqdor" title="Miqdor" type="number" value={item.qty} min={1} placeholder="Son" onChange={(e) => { const n = [...items]; n[i].qty = parseFloat(e.target.value) || 1; setItems(n); }} />
                        <input className="crm-input" aria-label="Birlik narxi" title="1 dona narxi" type="number" value={item.price || ""} placeholder="1 dona narxi" onChange={(e) => { const n = [...items]; n[i].price = parseFloat(e.target.value) || 0; setItems(n); }} />
                        <button onClick={() => setItems(items.filter((_, idx) => idx !== i))} style={{ background: "rgba(248,81,73,.1)", border: "1.5px solid rgba(248,81,73,.25)", color: "#f85149", borderRadius: 9, cursor: "pointer", fontWeight: 900, fontSize: 16 }}>×</button>
                      </div>
                      {prod && item.price > 0 && (
                        <div style={{ fontSize: 12, color: "var(--app-muted)" }}>
                          {prod.name} × {item.qty} = <strong style={{ color: "#3fb950" }}>{fmtM(item.qty * item.price)}</strong>
                        </div>
                      )}
                    </div>
                  );
                })}
                <button type="button" className="order-new-product-button" onClick={() => setNewProductOpen((open) => !open)}><PackagePlus size={17} /> Yangi mahsulot kelganmi? Shu yerda qo'shing</button>
              </div>

              {total > 0 && (
                <div style={{ background: "linear-gradient(135deg,rgba(63,185,80,.08),rgba(63,185,80,.04))", border: "1px solid rgba(63,185,80,.25)", borderRadius: 12, padding: "14px 16px", marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "var(--app-muted)", fontWeight: 700 }}>Jami summa</span>
                  <span style={{ fontWeight: 900, fontSize: 22, color: "#3fb950" }}>{fmtM(total)}</span>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">TO'LOV HOLATI</label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {(["paid", "unpaid"] as const).map((m) => (
                    <button key={m} onClick={() => setForm({ ...form, payStatus: m, receipt: m === "paid" ? form.receipt : null })}
                      style={{ padding: "8px 16px", borderRadius: 10, border: `2px solid ${form.payStatus === m ? PAY_STATUS_CONFIG[m].c : "var(--app-border)"}`, background: form.payStatus === m ? PAY_STATUS_CONFIG[m].bg : "transparent", color: form.payStatus === m ? PAY_STATUS_CONFIG[m].c : "var(--app-muted)", cursor: "pointer", fontSize: 12, fontWeight: 800, fontFamily: "inherit", transition: "all .15s" }}>
                      {PAY_STATUS_CONFIG[m].l}
                    </button>
                  ))}
                </div>
              </div>

              {form.payStatus === "paid" && (
                <div className="form-group">
                  <label className="form-label">TO'LOV CHEKI</label>
                  <input id="order-receipt" type="file" accept="image/*,application/pdf" onChange={(e) => selectReceipt(e.target.files?.[0])} style={{ display: "none" }} />
                  <div style={{ display: "flex", gap: 8, alignItems: "stretch", flexWrap: "wrap" }}>
                    <label htmlFor="order-receipt" className="btn-ghost" style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", minHeight: 40 }}>
                      📎 {form.receipt ? "Chekni almashtirish" : "Chek qo'shish"}
                    </label>
                    {form.receipt && (
                      <>
                        <a href={form.receipt.dataUrl} download={form.receipt.name} className="btn-ghost" style={{ display: "inline-flex", alignItems: "center", textDecoration: "none", minWidth: 0, maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{form.receipt.name}</a>
                        <button className="btn-ghost" onClick={() => setForm({ ...form, receipt: null })}>×</button>
                      </>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--app-muted)", marginTop: 6 }}>Rasm yoki PDF, maksimal 2 MB</div>
                </div>
              )}

              <div className="form-group">
                <label className="form-label"><FileText size={14} /> MAHSULOT HUJJATI <span style={{ color: "var(--app-muted)", fontWeight: 500 }}>(ixtiyoriy)</span></label>
                <input id="order-product-document" type="file" accept="image/*,application/pdf" onChange={(event) => selectProductDocument(event.target.files?.[0])} style={{ display: "none" }} />
                <div style={{ display: "flex", gap: 8, alignItems: "stretch", flexWrap: "wrap" }}>
                  <label htmlFor="order-product-document" className="btn-ghost" style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", minHeight: 40 }}><FileText size={16} /> {form.productDocument ? "Hujjatni almashtirish" : "Rasm yoki PDF biriktirish"}</label>
                  {form.productDocument && <><span className="btn-ghost" style={{ display: "inline-flex", alignItems: "center", maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{form.productDocument.name}</span><button type="button" className="btn-ghost" onClick={() => { setProductDocumentFile(null); setForm({ ...form, productDocument: null }); }}>×</button></>}
                </div>
                <div style={{ fontSize: 11, color: "var(--app-muted)", marginTop: 6 }}>Firma bergan nakladnoy, mahsulot rasmi yoki boshqa hujjat. Bu to'lov cheki emas. Maksimal 10 MB.</div>
              </div>

              <div className="form-group">
                <label className="form-label">ESLATMA</label>
                <textarea className="crm-input" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} rows={2} style={{ resize: "vertical" }} />
              </div>
            </>
          )}

          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn-ghost" onClick={() => setShowModal(false)} style={{ flex: 1 }}>Bekor</button>
            <button className="btn-primary" onClick={submit} disabled={loading || !form.companyId} style={{ flex: 2 }}>
              {loading ? t.sending : `💾 ${t.save} + ${t.savedToStock}`}
            </button>
          </div>
          </div>

          {newProductOpen && <aside className="inline-product-panel">
            <div className="inline-product-title"><div><PackagePlus size={18} /> Yangi mahsulot</div><button type="button" onClick={() => setNewProductOpen(false)}>×</button></div>
            <p>Mahsulot saqlangach shu orderga avtomatik qo'shiladi.</p>
            <div className="form-group"><label className="form-label">QR / SHTRIX-KOD</label><div className="inline-code-row"><input className="crm-input" value={productDraft.qrCode} onChange={(e) => setProductDraft({ ...productDraft, qrCode: e.target.value })} placeholder="Kod" /><button type="button" className="btn-primary" onClick={() => setCameraOpen(true)} aria-label="Kamera bilan skanerlash"><Camera size={17} /></button></div></div>
            <div className="form-group"><label className="form-label">NOMI</label><input className="crm-input" value={productDraft.name} onChange={(e) => setProductDraft({ ...productDraft, name: e.target.value })} autoFocus /></div>
            <div className="inline-product-grid">
              <div className="form-group"><label className="form-label">KATEGORIYA</label><select className="crm-input" value={productDraft.category} onChange={(e) => setProductDraft({ ...productDraft, category: e.target.value })}>{["gosht", "sabzavot", "don", "sut", "meva", "ziravorlar", "ichimlik", "boshqa"].map((value) => <option key={value}>{value}</option>)}</select></div>
              <div className="form-group"><label className="form-label">BIRLIK</label><select className="crm-input" value={productDraft.unit} onChange={(e) => setProductDraft({ ...productDraft, unit: e.target.value })}>{["kg", "g", "l", "ml", "dona", "qop", "quti", "karobka"].map((value) => <option key={value}>{value}</option>)}</select></div>
              <div className="form-group"><label className="form-label">NARXI (WON)</label><input className="crm-input" type="number" value={productDraft.pricePerUnit} onChange={(e) => setProductDraft({ ...productDraft, pricePerUnit: e.target.value })} /></div>
              <div className="form-group"><label className="form-label">MINIMAL QOLDIQ</label><input className="crm-input" type="number" value={productDraft.minStock} onChange={(e) => setProductDraft({ ...productDraft, minStock: e.target.value })} /></div>
            </div>
            <div className="form-group"><label className="form-label">FIRMA</label><input className="crm-input" value={selectedCompany?.name || ""} readOnly /></div>
            <button type="button" className="btn-primary" onClick={saveNewProduct} disabled={productSaving} style={{ width: "100%" }}>{productSaving ? "Saqlanmoqda..." : "Saqlash va orderga qo'shish"}</button>
          </aside>}
          </div>
        </Modal>
      )}

      <div className="table-wrap">
        <table className="crm-table mobile-card-table">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Firma</th>
              <th className="hide-mobile">Mahsulotlar</th>
              <th>Jami</th>
              <th>To'lov</th>
              <th className="hide-mobile">Sana</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => {
              const pay = PAY_STATUS_CONFIG[o.payStatus];
              const debt = o.totalPrice - o.paidAmount;
              return (
                <tr key={o.id}>
                  <td data-label="Order ID" className="mobile-card-primary"><span style={{ fontFamily: "monospace", fontSize: 11, color: "var(--app-primary)", background: "var(--app-primary-soft)", padding: "2px 8px", borderRadius: 6 }}>{o.id.slice(-8)}</span></td>
                  <td data-label="Firma" style={{ fontWeight: 700 }}>{o.companyName}</td>
                  <td className="hide-mobile" style={{ color: "var(--app-muted)", fontSize: 12 }}>{o.items.length} ta</td>
                  <td data-label="Jami">
                    <div style={{ fontWeight: 900, color: "#3fb950" }}>{fmtM(o.totalPrice)}</div>
                    {debt > 0 && <div style={{ fontSize: 11, color: "#f85149" }}>Qarz: {fmtM(debt)}</div>}
                  </td>
                  <td data-label="To'lov">
                    <span className="badge" style={{ background: pay.bg, color: pay.c }}>{pay.l}</span>
                    {o.receipt && (
                      <a href={o.receipt.dataUrl} download={o.receipt.name} style={{ display: "block", fontSize: 11, color: "#7367f0", fontWeight: 700, marginTop: 5, textDecoration: "none" }}>📎 Chek</a>
                    )}
                    {o.productDocument && <a href={o.productDocument.dataUrl} download={o.productDocument.name} style={{ display: "block", fontSize: 11, color: "#2563eb", fontWeight: 700, marginTop: 5, textDecoration: "none" }}>📄 Mahsulot hujjati</a>}
                  </td>
                  <td className="hide-mobile" style={{ fontSize: 11, color: "var(--app-muted)" }}>{fmtDate(o.orderDate || o.createdAt)}</td>
                </tr>
              );
            })}
            {orders.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", color: "var(--app-muted)", padding: 48 }}>
                  <div style={{ fontSize: 36, marginBottom: 8 }}>🛒</div>
                  <div style={{ fontWeight: 700 }}>Order yo'q</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </PageWrap>
  );
}

"use client";
import { useMemo, useState } from "react";
import { AlertTriangle, Camera, CheckCircle2, ImagePlus, Search, XCircle } from "lucide-react";
import { PageWrap, Modal } from "@/components/ui";
import { approveDamageRequestApi, createDamageRequestApi, rejectDamageRequestApi } from "@/lib/api";
import { BRANCH_ICONS, BRANCH_NAMES, TRANSFER_STATUS_CONFIG } from "@/lib/constants";
import { fmt, fmtD } from "@/lib/utils";
import type { DamageRequest, Product, UserInfo } from "@/types";
import type { OrderReceipt } from "@/types/domain";
import { CameraCodeScanner } from "@/components/products/CameraCodeScanner";

type Props = {
  damages: DamageRequest[];
  products: Product[];
  user: UserInfo;
  fetchAll: () => void;
  showToast: (msg: string, type?: "success" | "error") => void;
  t: Record<string, string>;
};

function fileToReceipt(file: File): Promise<OrderReceipt> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ name: file.name, type: file.type, dataUrl: String(reader.result || "") });
    reader.onerror = () => reject(new Error("Rasmni o'qib bo'lmadi"));
    reader.readAsDataURL(file);
  });
}

export function DamagesTab({ damages, products, user, fetchAll, showToast, t }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState<{ branch: string; productId: string; quantity: number; reason: string }>({ branch: user.role === "superadmin" ? "shop" : user.role, productId: "", quantity: 1, reason: "" });
  const [image, setImage] = useState<OrderReceipt | undefined>();
  const isSA = user.role === "superadmin";
  const productMap = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);
  const filteredProducts = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    if (!needle) return products.slice(0, 80);
    return products.filter((product) => `${product.name} ${product.qrCode || ""} ${product.category}`.toLocaleLowerCase().includes(needle)).slice(0, 80);
  }, [products, query]);
  const pending = damages.filter((damage) => damage.status === "pending");
  const history = damages.filter((damage) => damage.status !== "pending");

  const detectProduct = (code: string) => {
    setScannerOpen(false);
    const found = products.find((product) => String(product.qrCode || "").trim() === code.trim());
    if (!found) {
      setQuery(code);
      showToast("Bu shtrix-koddagi mahsulot topilmadi", "error");
      return;
    }
    setForm((current) => ({ ...current, productId: found.id }));
    setQuery(found.name);
    showToast(`${found.name} tanlandi`);
  };

  const submit = async () => {
    if (!form.productId) { showToast("Mahsulot tanlang", "error"); return; }
    if (form.quantity <= 0) { showToast("Miqdor noto'g'ri", "error"); return; }
    if (form.reason.trim().length < 3) { showToast("Brak sababini yozing", "error"); return; }
    if (!image) { showToast("Brak rasmini kiriting", "error"); return; }
    setLoading(true);
    const result = await createDamageRequestApi({ ...form, branch: user.role, reason: form.reason.trim(), image });
    setLoading(false);
    if (!result.success) { showToast((result as any).message || "Xatolik", "error"); return; }
    showToast("Brak so'rovi adminga yuborildi");
    setShowModal(false);
    setImage(undefined);
    setForm({ branch: user.role, productId: "", quantity: 1, reason: "" });
    setQuery("");
    fetchAll();
  };

  const action = async (damage: DamageRequest, type: "approve" | "reject") => {
    setLoading(true);
    const result = type === "approve" ? await approveDamageRequestApi(damage.id, user.name) : await rejectDamageRequestApi(damage.id, user.name);
    setLoading(false);
    if (!result.success) { showToast((result as any).message || "Xatolik", "error"); return; }
    showToast(type === "approve" ? "Brak tasdiqlandi va skladdan ayrildi" : "Brak rad etildi");
    fetchAll();
  };

  const Card = ({ damage }: { damage: DamageRequest }) => {
    const st = TRANSFER_STATUS_CONFIG[damage.status as keyof typeof TRANSFER_STATUS_CONFIG];
    return <article className="damage-card">
      <div className="damage-card-media">{damage.image?.dataUrl ? <img src={damage.image.dataUrl} alt="" /> : <AlertTriangle size={22} />}</div>
      <div className="damage-card-main">
        <div className="damage-card-title"><strong>{damage.productName}</strong><span className="badge" style={{ background: st.bg, color: st.c }}>{st.i} {st.l}</span></div>
        <div className="damage-card-meta">{BRANCH_ICONS[damage.branch] || "🏢"} {BRANCH_NAMES[damage.branch] || damage.branch} · {fmt(damage.quantity)} {damage.unit} · {fmtD(damage.createdAt)}</div>
        <p>{damage.reason}</p>
      </div>
      {isSA && damage.status === "pending" && <div className="damage-actions"><button className="btn-ghost" disabled={loading} onClick={() => action(damage, "reject")}><XCircle size={15} /> Rad</button><button className="btn-primary" disabled={loading} onClick={() => action(damage, "approve")}><CheckCircle2 size={15} /> Accept</button></div>}
    </article>;
  };

  return <PageWrap title={t.damageRequests || "Brak so'rovlari"} sub="Brak mahsulotlar tarixi va skladdan ayrish" action={!isSA && <button className="btn-primary" onClick={() => setShowModal(true)}>{t.newDamageRequest || "+ Brak yuborish"}</button>}>
    {showModal && <Modal onClose={() => !loading && setShowModal(false)} className="damage-modal">
      <div className="modal-title">Brak so'rovi</div>
      <div className="damage-form-grid">
        <div className="form-group"><label className="form-label">YUBORUVCHI SKLAD</label><div className="crm-input">{user.branchIcon || BRANCH_ICONS[user.role]} {user.branchName}</div></div>
        <div className="form-group"><label className="form-label">SONI</label><input className="crm-input" type="number" min={1} value={form.quantity} onChange={(event) => setForm({ ...form, quantity: Number(event.target.value) || 1 })} /></div>
      </div>
      <div className="form-group">
        <label className="form-label">MAHSULOT</label>
        <div className="damage-search-row"><button type="button" className="btn-ghost" onClick={() => setScannerOpen(true)}><Camera size={15} /> Skan</button><label><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nomi yoki shtrix-kod" /></label></div>
        <select className="crm-input" value={form.productId} onChange={(event) => setForm({ ...form, productId: event.target.value })}>
          <option value="">Mahsulot tanlang</option>
          {filteredProducts.map((product) => <option key={product.id} value={product.id}>{product.name} · {product.qrCode || "kod yo'q"} · {product.unit}</option>)}
        </select>
        {form.productId && <small className="damage-selected">{productMap.get(form.productId)?.name}</small>}
      </div>
      <div className="form-group"><label className="form-label">{t.damageReason || "BRAK SABABI"}</label><textarea className="crm-input" rows={3} value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} /></div>
      <div className="form-group"><label className="form-label">{t.damageImage || "BRAK RASMI"}</label><label className="damage-upload"><ImagePlus size={17} /><span>{image ? image.name : "JPG, PNG yoki WEBP, 10 MB gacha"}</span><input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" hidden onChange={async (event) => { const file = event.target.files?.[0]; if (!file) return; if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) { showToast("Faqat JPG, PNG yoki WEBP rasm", "error"); return; } if (file.size > 10 * 1024 * 1024) { showToast("Rasm 10 MB dan kichik bo'lishi kerak", "error"); return; } try { setImage(await fileToReceipt(file)); } catch { showToast("Rasmni o'qib bo'lmadi", "error"); } }} /></label></div>
      <div className="modal-actions" style={{ display: "flex", gap: 10 }}><button className="btn-ghost" disabled={loading} onClick={() => setShowModal(false)} style={{ flex: 1 }}>{t.cancel}</button><button className="btn-primary" disabled={loading} onClick={submit} style={{ flex: 2 }}>{loading ? "Yuborilmoqda..." : t.send}</button></div>
      <CameraCodeScanner open={scannerOpen} onClose={() => setScannerOpen(false)} onDetected={detectProduct} />
    </Modal>}
    <section className="damage-summary"><div><AlertTriangle size={18} /><span>Kutilayotgan</span><strong>{pending.length}</strong></div><div><CheckCircle2 size={18} /><span>Tarix</span><strong>{history.length}</strong></div></section>
    <div className="damage-list">
      {pending.map((damage) => <Card key={damage.id} damage={damage} />)}
      {history.map((damage) => <Card key={damage.id} damage={damage} />)}
      {!damages.length && <div className="history-empty"><AlertTriangle size={28} /><strong>Brak so'rovlari yo'q</strong><span>Yangi brak requestlar shu yerda chiqadi</span></div>}
    </div>
  </PageWrap>;
}

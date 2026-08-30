"use client";
import { useState } from "react";
import { PageWrap, Modal } from "@/components/ui";
import { approveTransferApi, createTransferApi, rejectTransferApi } from "@/lib/api";
import { BRANCH_ICONS, BRANCH_NAMES, TRANSFER_STATUS_CONFIG } from "@/lib/constants";
import { fmtD, fmtM, fmt } from "@/lib/utils";
import type { Product, UserInfo } from "@/types";

function branchSlugFromName(value = "") {
  return value.trim().toLocaleLowerCase().replace(/['’`]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function TransferCard({ t, isSA, onDetail, onApprove, onReject }: { t: any; isSA: boolean; onDetail: () => void; onApprove: () => void; onReject: () => void; }) {
  const st = TRANSFER_STATUS_CONFIG[t.status as keyof typeof TRANSFER_STATUS_CONFIG];
  const branchName = t.branchName || t.toBranchName || BRANCH_NAMES[t.toBranch] || t.toBranch;
  return (
    <div style={{ background: "var(--app-panel)", border: "1px solid var(--app-border)", borderRadius: 14, padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, transition: "all .2s" }} onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(115,103,240,.3)")} onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--app-border)")}>
      <div>
        <div style={{ fontWeight: 800, marginBottom: 4, display: "flex", alignItems: "center", gap: 8 }}>{BRANCH_ICONS[t.toBranch] || "🏢"} {branchName}<span style={{ fontFamily: "monospace", fontSize: 10, color: "var(--app-muted)", background: "var(--app-panel-soft)", padding: "2px 7px", borderRadius: 6 }}>{t.id.slice(-8)}</span></div>
        <div style={{ fontSize: 12, color: "var(--app-muted)" }}>{fmtD(t.createdAt)} · {t.items.length} mahsulot · <strong style={{ color: "#3fb950" }}>{fmtM(t.totalValue)}</strong></div>
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <span className="badge" style={{ background: st.bg, color: st.c }}>{st.i} {st.l}</span>
        <button className="btn-icon" onClick={onDetail} style={{ color: "#7367f0", background: "rgba(115,103,240,.1)", borderColor: "rgba(115,103,240,.2)" }}>Ko'rish</button>
        {isSA && t.status === "pending" && <><button className="btn-icon" onClick={onApprove} style={{ color: "#3fb950", background: "rgba(63,185,80,.1)", borderColor: "rgba(63,185,80,.2)" }}>Jo'natish</button><button className="btn-icon" onClick={onReject} style={{ color: "#f85149", background: "rgba(248,81,73,.1)", borderColor: "rgba(248,81,73,.2)" }}>Rad</button></>}
      </div>
    </div>
  );
}

type Props = { transfers: any[]; products: Product[]; mainStock: Record<string, number>; user: UserInfo; fetchAll: () => void; showToast: (msg: string, type?: "success" | "error") => void; t: Record<string, string>; };

export function TransfersTab({ transfers, products, mainStock, user, fetchAll, showToast, t }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [detail, setDetail] = useState<any>(null);
  const [form, setForm] = useState({ note: "" });
  const [items, setItems] = useState([{ pid: "", qty: 1 }]);
  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState<{ transfer: any; quantities: Record<string, number> } | null>(null);
  const isSA = user.role === "superadmin";
  const requestProducts = products;

  const submit = async () => {
    const valid = items.filter((i) => i.pid && i.qty > 0);
    if (!valid.length) { showToast("Mahsulot tanlang", "error"); return; }
    const savedSlug = String(user.branchSlug || "").trim();
    const ownBranch = savedSlug && savedSlug !== "shop" ? savedSlug : branchSlugFromName(user.branchName);
    if (!ownBranch) { showToast("Filial aniqlanmadi", "error"); return; }
    setLoading(true);
    const d = await createTransferApi(ownBranch, valid.map((i) => ({ productId: i.pid, quantity: i.qty })), user.name, user.branchName, form.note);
    if (d.success) { showToast("So'rov yuborildi! ✅"); setShowModal(false); setItems([{ pid: "", qty: 1 }]); fetchAll(); }
    else showToast((d as any).message || "Xatolik", "error");
    setLoading(false);
  };

  const reject = async (id: string) => { const d = await rejectTransferApi(id, user.name); if (d.success) { showToast("Rad etildi"); fetchAll(); } else showToast((d as any).message || "Xatolik", "error"); };
  const openAction = (transfer: any) => {
    setAction({ transfer, quantities: Object.fromEntries((transfer.items || []).map((item: any) => [item.productId, Number(item.quantity || 0)])) });
  };
  const submitAction = async () => {
    if (!action) return;
    const source = action.transfer.items;
    const items = (source || []).map((item: any) => ({ productId: item.productId, quantity: Number(action.quantities[item.productId] ?? 0) }));
    const invalid = items.some((item: any, index: number) => item.quantity < 1 || item.quantity > Number(source[index].quantity || 0));
    if (invalid) { showToast("Miqdor so'ralgan yoki jo'natilgan sondan oshmasligi kerak", "error"); return; }
    setLoading(true);
    const result = await approveTransferApi(action.transfer.id, user.name, items);
    setLoading(false);
    if (!result.success) { showToast((result as any).message || "Xatolik", "error"); return; }
    showToast("Mahsulotlar filial skladiga o'tkazildi");
    setAction(null);
    setDetail(null);
    fetchAll();
  };
  const groups = { pending: transfers.filter((tr) => tr.status === "pending"), other: transfers.filter((tr) => tr.status !== "pending") };

  return (
    <PageWrap title="🔄 Transferlar" action={!isSA && <button className="btn-primary" onClick={() => setShowModal(true)}>+ Yangi so'rov</button>}>
      {showModal && <Modal onClose={() => setShowModal(false)}>
        <div className="modal-title">📤 Transfer so'rovi</div>
        <div className="form-group"><label className="form-label">FILIAL</label><div className="crm-input" style={{ display: "flex", alignItems: "center", opacity: .9 }}>{user.branchIcon || BRANCH_ICONS[user.role] || "🏢"} {user.branchName}</div></div>
        <div className="form-group">
          <label className="form-label">MAHSULOTLAR</label>
          {items.map((item, i) => <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 90px 36px", gap: 8, marginBottom: 8 }}>
            <select className="crm-input" value={item.pid} onChange={(e) => { const n = [...items]; n[i].pid = e.target.value; setItems(n); }}>
              <option value="">Mahsulot tanlang</option>
              {requestProducts.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>)}
            </select>
            <input className="crm-input" type="number" value={item.qty} min={1} onChange={(e) => { const n = [...items]; n[i].qty = parseFloat(e.target.value) || 1; setItems(n); }} />
            <button onClick={() => setItems(items.filter((_, idx) => idx !== i))} style={{ background: "rgba(248,81,73,.1)", border: "1.5px solid rgba(248,81,73,.25)", color: "#f85149", borderRadius: 9, cursor: "pointer", fontWeight: 900, fontSize: 16 }}>×</button>
          </div>)}
          <button onClick={() => setItems([...items, { pid: "", qty: 1 }])} style={{ width: "100%", padding: "9px", borderRadius: 10, border: "1.5px dashed rgba(115,103,240,.4)", background: "rgba(115,103,240,.05)", color: "#7367f0", cursor: "pointer", fontWeight: 700, fontSize: 13, fontFamily: "inherit" }}>+ Mahsulot qo'shish</button>
        </div>
        <div className="form-group"><label className="form-label">ESLATMA</label><textarea className="crm-input" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} rows={2} style={{ resize: "vertical" }} /></div>
        <div style={{ display: "flex", gap: 10 }}><button className="btn-ghost" onClick={() => setShowModal(false)} style={{ flex: 1 }}>{t.cancel}</button><button className="btn-primary" onClick={submit} disabled={loading} style={{ flex: 2 }}>{loading ? "Yuborilmoqda..." : `📤 ${t.send}`}</button></div>
      </Modal>}

      {action && <Modal onClose={() => !loading && setAction(null)}>
        <div className="modal-title">Mahsulotlarni jo'natish</div>
        <div style={{ color: "var(--app-muted)", fontSize: 12, marginBottom: 16 }}>
          Haqiqatan berilayotgan miqdorni kiriting. Tasdiqlangach bosh skladdan ayrilib, filial skladiga avtomatik qo'shiladi.
        </div>
        <div style={{ display: "grid", gap: 9, marginBottom: 18 }}>
          {action.transfer.items.map((item: any) => (
            <div key={item.productId} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 110px", gap: 10, alignItems: "center", padding: 11, borderRadius: 10, background: "var(--app-panel-soft)" }}>
              <div><div style={{ fontWeight: 800 }}>{item.productName}</div><div style={{ color: "var(--app-muted)", fontSize: 11, marginTop: 3 }}>{`So'raldi: ${fmt(item.quantity)} ${item.unit} · Bosh sklad: ${fmt(mainStock[item.productId] || 0)}`}</div></div>
              <input className="crm-input" type="number" min={1} max={item.quantity} value={action.quantities[item.productId] ?? 0} onChange={(event) => setAction((current) => current ? { ...current, quantities: { ...current.quantities, [item.productId]: Number(event.target.value) } } : current)} />
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 10 }}><button className="btn-ghost" disabled={loading} onClick={() => setAction(null)} style={{ flex: 1 }}>Bekor</button><button className="btn-primary" disabled={loading} onClick={submitAction} style={{ flex: 2 }}>{loading ? "Saqlanmoqda..." : "Jo'natish va skladga qo'shish"}</button></div>
      </Modal>}

      {detail && <Modal onClose={() => setDetail(null)}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}><div className="modal-title" style={{ margin: 0 }}>Transfer #{detail.id.slice(-8)}</div><span className="badge" style={{ background: TRANSFER_STATUS_CONFIG[detail.status as keyof typeof TRANSFER_STATUS_CONFIG].bg, color: TRANSFER_STATUS_CONFIG[detail.status as keyof typeof TRANSFER_STATUS_CONFIG].c }}>{TRANSFER_STATUS_CONFIG[detail.status as keyof typeof TRANSFER_STATUS_CONFIG].i} {TRANSFER_STATUS_CONFIG[detail.status as keyof typeof TRANSFER_STATUS_CONFIG].l}</span></div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 18 }}>{[["Filial", `${BRANCH_ICONS[detail.toBranch] || "🏢"} ${detail.branchName || detail.toBranchName || BRANCH_NAMES[detail.toBranch] || detail.toBranch}`], ["So'ragan", detail.requestedBy], ["Sana", fmtD(detail.createdAt)], ["Tasdiqlagan", detail.approvedBy || "—"]].map(([l, v]) => <div key={String(l)} style={{ background: "var(--app-panel-soft)", borderRadius: 11, padding: "11px 13px" }}><div style={{ fontSize: 10, color: "var(--app-muted)", marginBottom: 4, fontWeight: 700 }}>{l}</div><div style={{ fontWeight: 700 }}>{v}</div></div>)}</div>
        <div style={{ background: "var(--app-panel-soft)", borderRadius: 12, padding: 14, marginBottom: 14 }}>{detail.items.map((it: any, i: number) => { const sent = detail.sentItems?.find((value: any) => value.productId === it.productId); const received = detail.receivedItems?.find((value: any) => value.productId === it.productId); return <div key={i} className="transfer-quantity-row" style={{ borderBottom: i < detail.items.length - 1 ? "1px solid var(--app-border)" : "none" }}><span style={{ fontWeight: 700 }}>{it.productName}</span><span style={{ color: "var(--app-muted)" }}>So'raldi: {fmt(it.quantity)}</span><span style={{ color: "#3b82f6" }}>Berildi: {sent ? fmt(sent.quantity) : "—"}</span><span style={{ color: "#3fb950" }}>Qabul: {received ? fmt(received.quantity) : "—"} {it.unit}</span></div>; })}</div>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderTop: "1px solid var(--app-border)", marginBottom: 16 }}><span style={{ fontWeight: 700, color: "var(--app-muted)" }}>Jami qiymat</span><span style={{ fontWeight: 900, color: "#3fb950", fontSize: 16 }}>{fmtM(detail.totalValue)}</span></div>
        {isSA && detail.status === "pending" && <div style={{ display: "flex", gap: 10 }}><button onClick={() => { reject(detail.id); setDetail(null); }} className="btn-ghost" style={{ flex: 1, color: "#f85149" }}>Rad etish</button><button onClick={() => openAction(detail)} className="btn-primary" style={{ flex: 2 }}>Jo'natish</button></div>}
      </Modal>}

      {groups.pending.length > 0 && <div style={{ marginBottom: 24 }}><div style={{ fontSize: 13, fontWeight: 800, color: "#f0a500", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>⏳ Kutilayotgan <span style={{ background: "rgba(240,165,0,.15)", padding: "2px 8px", borderRadius: 12 }}>{groups.pending.length}</span></div><div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{groups.pending.map((tr: any) => <TransferCard key={tr.id} t={tr} isSA={isSA} onDetail={() => setDetail(tr)} onApprove={() => openAction(tr)} onReject={() => reject(tr.id)} />)}</div></div>}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{groups.other.map((tr: any) => <TransferCard key={tr.id} t={tr} isSA={isSA} onDetail={() => setDetail(tr)} onApprove={() => openAction(tr)} onReject={() => reject(tr.id)} />)}{transfers.length === 0 && <div style={{ textAlign: "center", padding: 60, color: "var(--app-muted)" }}>Transfer yo'q</div>}</div>
    </PageWrap>
  );
}

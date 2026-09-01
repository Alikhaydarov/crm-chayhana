"use client";
import { useState } from "react";
import { PageWrap, Modal } from "@/components/ui";
import { addCompanyApi, payOrderApi } from "@/lib/api";
import { PAY_STATUS_CONFIG } from "@/lib/constants";
import { fmtM, fmtDate } from "@/lib/utils";
import type { Company, Order, CompanyPayment, OrderReceipt } from "@/types/domain";

type Props = {
  companies: Company[];
  orders: Order[];
  companyPayments: CompanyPayment[];
  fetchAll: () => void;
  showToast: (msg: string, type?: "success" | "error") => void;
  t: Record<string, string>;
};

export function SuppliersTab({ companies, orders, companyPayments, fetchAll, showToast, t }: Props) {
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState<Company | null>(null);
  const [view, setView] = useState<"info" | "pay" | "history">("info");
  const [payModal, setPayModal] = useState<Order | null>(null);
  const [payAmt, setPayAmt] = useState("");
  const [payNote, setPayNote] = useState("");
  const [payReceipt, setPayReceipt] = useState<OrderReceipt | null>(null);
  const [addForm, setAddForm] = useState({ name: "", address: "", phone: "" });

  const cOrders = (id: string) => orders.filter((o) => o.companyId === id);
  const cDebt = (id: string) => cOrders(id).reduce((s, o) => s + (o.totalPrice - o.paidAmount), 0);
  const cTotal = (id: string) => cOrders(id).reduce((s, o) => s + o.totalPrice, 0);
  const cPaid = (id: string) => cOrders(id).reduce((s, o) => s + o.paidAmount, 0);
  const cHistory = (id: string) => companyPayments.filter((p) => p.companyId === id);

  const addCompany = async () => {
    if (!addForm.name.trim()) { showToast("Firma nomini kiriting", "error"); return; }
    const d = await addCompanyApi(addForm);
    if (!d.success) { showToast((d as any).message || "Xatolik", "error"); return; }
    showToast("Firma qo'shildi!");
    setShowAdd(false);
    setAddForm({ name: "", address: "", phone: "" });
    fetchAll();
  };

  const closePayModal = () => {
    setPayModal(null);
    setPayAmt("");
    setPayNote("");
    setPayReceipt(null);
  };

  const selectPayReceipt = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/") && file.type !== "application/pdf") { showToast("Chek faqat rasm yoki PDF", "error"); return; }
    if (file.size > 2 * 1024 * 1024) { showToast("Chek 2 MB dan kichik bo'lishi kerak", "error"); return; }
    const reader = new FileReader();
    reader.onload = () => setPayReceipt({ name: file.name, type: file.type, dataUrl: String(reader.result) });
    reader.onerror = () => showToast("Faylni o'qib bo'lmadi", "error");
    reader.readAsDataURL(file);
  };

  const payOrder = async () => {
    if (!payModal) return;
    const amt = parseFloat(payAmt);
    if (!amt || amt <= 0) { showToast("Summani kiriting", "error"); return; }
    const d = await payOrderApi(payModal.id, amt, payNote, payReceipt || undefined);
    if (d.success) {
      showToast("To'lov saqlandi! ✅");
      closePayModal();
      setSelected(null);
      fetchAll();
    } else showToast((d as any).message || "Xatolik", "error");
  };

  return (
    <PageWrap
      title="Firmalar"
      sub={`${companies.length} ta firma`}
      action={<button className="btn-primary" onClick={() => setShowAdd(true)}>+ Yangi firma</button>}
    >
      {showAdd && (
        <Modal onClose={() => setShowAdd(false)}>
          <div className="modal-title">Yangi firma</div>
          {[["FIRMA NOMI", "name", "Masalan: Mars LLC"], ["MANZIL", "address", "Toshkent, Chilonzor"], ["TELEFON", "phone", "+998 90 123 45 67"]].map(([l, k, p]) => (
            <div key={k} className="form-group">
              <label className="form-label">{l}</label>
              <input className="crm-input" value={(addForm as any)[k]} onChange={(e) => setAddForm({ ...addForm, [k]: e.target.value })} placeholder={p} />
            </div>
          ))}
          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            <button className="btn-ghost" onClick={() => setShowAdd(false)} style={{ flex: 1 }}>{t.cancel}</button>
            <button className="btn-primary" onClick={addCompany} style={{ flex: 2 }}>💾 Saqlash</button>
          </div>
        </Modal>
      )}

      {payModal && (
        <Modal onClose={closePayModal}>
          <div className="modal-title">To'lov kiritish</div>
          <div style={{ background: "linear-gradient(135deg,rgba(115,103,240,.1),rgba(101,91,211,.05))", border: "1px solid rgba(115,103,240,.25)", borderRadius: 14, padding: "18px 20px", marginBottom: 20, textAlign: "center" }}>
            <div style={{ fontSize: 12, color: "var(--app-muted)", marginBottom: 6, fontWeight: 700 }}>Order #{payModal.id.slice(-8)} · Qolgan qarz</div>
            <div style={{ fontWeight: 900, fontSize: 32, color: "#7367f0" }}>{fmtM(payModal.totalPrice - payModal.paidAmount)}</div>
          </div>
          <div className="form-group">
            <label className="form-label">TO'LOV SUMMASI</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input className="crm-input" type="number" value={payAmt} onChange={(e) => setPayAmt(e.target.value)} placeholder="Summani kiriting" style={{ flex: 1 }} />
              <button onClick={() => setPayAmt(String(payModal.totalPrice - payModal.paidAmount))} style={{ padding: "0 14px", borderRadius: 10, border: "1.5px solid rgba(63,185,80,.3)", background: "rgba(63,185,80,.1)", color: "#3fb950", cursor: "pointer", fontWeight: 800, fontSize: 12, fontFamily: "inherit", whiteSpace: "nowrap" }}>Hammasi</button>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">IZOH</label>
            <input className="crm-input" value={payNote} onChange={(e) => setPayNote(e.target.value)} placeholder="Naqd, bank o'tkazmasi..." />
          </div>
          <div className="form-group">
            <label className="form-label">TO'LOV CHEKI</label>
            <input id="pay-receipt" type="file" accept="image/*,application/pdf" onChange={(e) => selectPayReceipt(e.target.files?.[0])} style={{ display: "none" }} />
            <div style={{ display: "flex", gap: 8, alignItems: "stretch", flexWrap: "wrap" }}>
              <label htmlFor="pay-receipt" className="btn-ghost" style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", minHeight: 40 }}>
                📎 {payReceipt ? "Chekni almashtirish" : "Chek qo'shish"}
              </label>
              {payReceipt && (
                <>
                  <a href={payReceipt.dataUrl} download={payReceipt.name} className="btn-ghost" style={{ display: "inline-flex", alignItems: "center", textDecoration: "none", minWidth: 0, maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{payReceipt.name}</a>
                  <button className="btn-ghost" onClick={() => setPayReceipt(null)}>×</button>
                </>
              )}
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            <button className="btn-ghost" onClick={closePayModal} style={{ flex: 1 }}>{t.cancel}</button>
            <button className="btn-primary" onClick={payOrder} style={{ flex: 2 }}>✅ To'lovni saqlash</button>
          </div>
        </Modal>
      )}

      {selected && !payModal && (
        <Modal onClose={() => setSelected(null)}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
            <div>
              <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 2 }}>🏢 {selected.name}</div>
              {selected.phone && <div style={{ fontSize: 12, color: "var(--app-muted)" }}>{selected.phone}</div>}
            </div>
            <div style={{ background: cDebt(selected.id) > 0 ? "rgba(248,81,73,.1)" : "rgba(63,185,80,.1)", border: `1px solid ${cDebt(selected.id) > 0 ? "rgba(248,81,73,.3)" : "rgba(63,185,80,.3)"}`, borderRadius: 12, padding: "6px 14px", textAlign: "right" }}>
              <div style={{ fontSize: 10, color: "var(--app-muted)", fontWeight: 700 }}>QARZ</div>
              <div style={{ fontWeight: 900, color: cDebt(selected.id) > 0 ? "#f85149" : "#3fb950", fontSize: 16 }}>{cDebt(selected.id) > 0 ? fmtM(cDebt(selected.id)) : "✓ Yo'q"}</div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 6, marginBottom: 20, background: "var(--app-panel-soft)", borderRadius: 12, padding: 4 }}>
            {(["info", "pay", "history"] as const).map((v) => (
              <button key={v} onClick={() => setView(v)} style={{ flex: 1, padding: "9px 4px", borderRadius: 9, border: "none", background: view === v ? "var(--app-panel)" : "transparent", color: view === v ? "#7367f0" : "var(--app-muted)", fontWeight: 800, cursor: "pointer", fontSize: 12, fontFamily: "inherit", boxShadow: view === v ? "0 2px 8px rgba(0,0,0,.15)" : "none", transition: "all .15s" }}>
                {v === "info" ? t.info : v === "pay" ? t.pay : t.history}
              </button>
            ))}
          </div>

          {view === "info" && (
            <div style={{ display: "grid", gap: 10 }}>
              {[["🏢 Nomi", selected.name], ["📍 Manzil", selected.address || "—"], ["📞 Telefon", selected.phone || "—"], ["📅 Qo'shilgan", fmtDate(selected.createdAt)], ["📦 Orderlar", `${cOrders(selected.id).length} ta · ${fmtM(cTotal(selected.id))}`]].map(([l, v]) => (
                <div key={String(l)} style={{ background: "var(--app-panel-soft)", borderRadius: 11, padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                  <span style={{ color: "var(--app-muted)", fontSize: 13, flexShrink: 0 }}>{l}</span>
                  <span style={{ fontWeight: 700, textAlign: "right" }}>{v}</span>
                </div>
              ))}
            </div>
          )}

          {view === "pay" && (
            <div>
              <div style={{ textAlign: "center", borderRadius: 16, padding: "24px 20px", marginBottom: 20, background: cDebt(selected.id) > 0 ? "linear-gradient(135deg,rgba(248,81,73,.08),transparent)" : "linear-gradient(135deg,rgba(63,185,80,.08),transparent)", border: `1px solid ${cDebt(selected.id) > 0 ? "rgba(248,81,73,.2)" : "rgba(63,185,80,.2)"}` }}>
                <div style={{ fontSize: 12, color: "var(--app-muted)", marginBottom: 8, fontWeight: 700, letterSpacing: 0.5 }}>UMUMIY QARZ</div>
                <div style={{ fontWeight: 900, fontSize: 38, color: cDebt(selected.id) > 0 ? "#f85149" : "#3fb950", letterSpacing: -1 }}>{fmtM(cDebt(selected.id))}</div>
                <div style={{ display: "flex", justifyContent: "center", gap: 24, marginTop: 12 }}>
                  <div style={{ fontSize: 12, color: "var(--app-muted)" }}>Jami <strong style={{ color: "var(--app-text)" }}>{fmtM(cTotal(selected.id))}</strong></div>
                  <div style={{ fontSize: 12, color: "var(--app-muted)" }}>To'langan <strong style={{ color: "#3fb950" }}>{fmtM(cPaid(selected.id))}</strong></div>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {cOrders(selected.id).map((o) => {
                  const debt = o.totalPrice - o.paidAmount;
                  const pay = PAY_STATUS_CONFIG[o.payStatus];
                  return (
                    <div key={o.id} style={{ background: "var(--app-panel-soft)", borderRadius: 12, padding: "13px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                      <div>
                        <div style={{ fontWeight: 800 }}>Order <span style={{ fontFamily: "monospace", color: "#7367f0", fontSize: 12 }}>#{o.id.slice(-8)}</span></div>
                        <div style={{ fontSize: 11, color: "var(--app-muted)", marginTop: 2 }}>{fmtDate(o.orderDate || o.createdAt)} · {fmtM(o.totalPrice)}</div>
                        {debt > 0 && <div style={{ fontSize: 12, color: "#f85149", fontWeight: 700, marginTop: 2 }}>Qarz: {fmtM(debt)}</div>}
                        {o.receipt && <a href={o.receipt.dataUrl} download={o.receipt.name} onClick={(e) => e.stopPropagation()} style={{ display: "inline-block", fontSize: 11, color: "#7367f0", fontWeight: 700, marginTop: 5, textDecoration: "none" }}>📎 Chekni yuklash</a>}
                      </div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <span className="badge" style={{ background: pay.bg, color: pay.c }}>{pay.l}</span>
                        {debt > 0 && <button className="btn-primary" onClick={() => setPayModal(o)} style={{ padding: "7px 14px", fontSize: 12 }}>💳 Pay</button>}
                      </div>
                    </div>
                  );
                })}
                {cOrders(selected.id).length === 0 && <div style={{ textAlign: "center", padding: 32, color: "var(--app-muted)" }}>Order yo'q</div>}
              </div>
            </div>
          )}

          {view === "history" && (
            <div>
              {cHistory(selected.id).length === 0 ? (
                <div style={{ textAlign: "center", padding: 40, color: "var(--app-muted)" }}>
                  <div style={{ fontSize: 36, marginBottom: 8 }}>📜</div>To'lov tarixi yo'q
                </div>
              ) : (
                <div className="table-wrap">
                  <table className="crm-table">
                    <thead><tr><th>Order</th><th>Summa</th><th>Izoh</th><th>Sana</th></tr></thead>
                    <tbody>
                      {cHistory(selected.id).map((p) => (
                        <tr key={p.id}>
                          <td style={{ fontFamily: "monospace", fontSize: 11, color: "#7367f0" }}>{p.orderId.slice(-8)}</td>
                          <td style={{ color: "#3fb950", fontWeight: 800 }}>+{fmtM(p.amount)}</td>
                          <td style={{ color: "var(--app-muted)", fontSize: 12 }}>{p.note || "—"}</td>
                          <td style={{ fontSize: 11, color: "var(--app-muted)" }}>{fmtDate(p.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </Modal>
      )}

      <div className="firm-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 14 }}>
        {companies.map((c, i) => {
          const debt = cDebt(c.id);
          const orderCnt = cOrders(c.id).length;
          return (
            <div
              key={c.id}
              className="fade-up"
              style={{ animationDelay: `${i * 50}ms`, background: "var(--app-panel)", border: `1px solid ${debt > 0 ? "rgba(248,81,73,.25)" : "var(--app-border)"}`, borderRadius: 18, padding: "20px 20px", cursor: "pointer", transition: "all .2s" }}
              onClick={() => { setSelected(c); setView("info"); }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 12px 32px rgba(0,0,0,.2)"; e.currentTarget.style.borderColor = debt > 0 ? "rgba(248,81,73,.4)" : "rgba(115,103,240,.35)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; e.currentTarget.style.borderColor = debt > 0 ? "rgba(248,81,73,.25)" : "var(--app-border)"; }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
                <div>
                  <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 4 }}>🏢 {c.name}</div>
                  {c.address && <div style={{ fontSize: 11, color: "var(--app-muted)", marginBottom: 2 }}>📍 {c.address}</div>}
                  {c.phone && <div style={{ fontSize: 11, color: "var(--app-muted)" }}>📞 {c.phone}</div>}
                </div>
                <div style={{ fontSize: 22, opacity: 0.4 }}>→</div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div style={{ background: "var(--app-panel-soft)", borderRadius: 11, padding: "11px 12px" }}>
                  <div style={{ fontSize: 10, color: "var(--app-muted)", marginBottom: 4, fontWeight: 700 }}>ORDERLAR</div>
                  <div style={{ fontWeight: 800, color: "#3b82f6", fontSize: 14 }}>{orderCnt} ta</div>
                  <div style={{ fontSize: 11, color: "var(--app-muted)", marginTop: 1 }}>{fmtM(cTotal(c.id))}</div>
                </div>
                <div style={{ background: debt > 0 ? "rgba(248,81,73,.08)" : "rgba(63,185,80,.08)", border: `1px solid ${debt > 0 ? "rgba(248,81,73,.2)" : "rgba(63,185,80,.2)"}`, borderRadius: 11, padding: "11px 12px" }}>
                  <div style={{ fontSize: 10, color: "var(--app-muted)", marginBottom: 4, fontWeight: 700 }}>QARZ</div>
                  <div style={{ fontWeight: 900, color: debt > 0 ? "#f85149" : "#3fb950", fontSize: 14 }}>{debt > 0 ? fmtM(debt) : "✓ Yo'q"}</div>
                </div>
              </div>
            </div>
          );
        })}
        {companies.length === 0 && (
          <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "60px 20px", color: "var(--app-muted)" }}>
            <div style={{ fontSize: 56, marginBottom: 12 }}>🏢</div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>Hali firma qo'shilmagan</div>
            <div style={{ fontSize: 13, marginTop: 6 }}>Yuqoridagi "+ Yangi firma" tugmasini bosing</div>
          </div>
        )}
      </div>
    </PageWrap>
  );
}

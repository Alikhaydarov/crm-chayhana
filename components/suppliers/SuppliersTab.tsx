"use client";
import { memo, useState } from "react";
import { Banknote, Building2, CalendarDays, ChevronRight, CreditCard, FileCheck2, MapPin, Pencil, Phone, Save, Settings2, X } from "lucide-react";
import { PageWrap, Modal } from "@/components/ui";
import { PaymentMethodsPanel } from "@/components/settings/PaymentMethodsPanel";
import { addCompanyApi, getPaymentMethodsApi, payOrderApi, updateCompanyApi } from "@/lib/api";
import { PAY_STATUS_CONFIG } from "@/lib/constants";
import { fmtM, fmtDate } from "@/lib/utils";
import type { Company, Order, CompanyPayment, OrderReceipt, PaymentMethods } from "@/types/domain";

type Props = {
  companies: Company[];
  orders: Order[];
  companyPayments: CompanyPayment[];
  fetchAll: () => void;
  showToast: (msg: string, type?: "success" | "error") => void;
  t: Record<string, string>;
};

function currentLocalDate() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

const SupplierCard = memo(function SupplierCard({
  company,
  orderCount,
  totalValue,
  debt,
  countSuffix,
  debtLabel,
  noDebtLabel,
  onOpen,
}: {
  company: Company;
  orderCount: number;
  totalValue: number;
  debt: number;
  countSuffix: string;
  debtLabel: string;
  noDebtLabel: string;
  onOpen: (company: Company) => void;
}) {
  const hasDebt = debt > 0;
  return (
    <article
      className={`supplier-card${hasDebt ? " supplier-card--debt" : ""}`}
      onClick={() => onOpen(company)}
    >
      <div className="supplier-card-top">
        <div className="supplier-identity">
          <div className="supplier-avatar">
            <Building2 size={17} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div className="supplier-name">{company.name}</div>
            {(company.address || company.phone) && (
              <div className="supplier-contact">
                {company.address && <span><MapPin size={11} /> {company.address}</span>}
                {company.phone && <span><Phone size={11} /> {company.phone}</span>}
              </div>
            )}
          </div>
        </div>
        <div className="supplier-arrow">
          <ChevronRight size={15} />
        </div>
      </div>

      <div className="supplier-stats">
        <div className="supplier-stat">
          <div className="supplier-stat-label">Orderlar</div>
          <div className="supplier-stat-value">{orderCount} {countSuffix}</div>
          <div className="supplier-stat-sub">{fmtM(totalValue)}</div>
        </div>
        <div className={`supplier-stat ${hasDebt ? "supplier-stat--debt" : "supplier-stat--ok"}`}>
          <div className="supplier-stat-label">{debtLabel}</div>
          <div className="supplier-stat-value">{hasDebt ? fmtM(debt) : `✓ ${noDebtLabel}`}</div>
        </div>
      </div>
    </article>
  );
});

export function SuppliersTab({ companies, orders, companyPayments, fetchAll, showToast, t }: Props) {
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState<Company | null>(null);
  const [view, setView] = useState<"info" | "pay" | "history" | "settings">("info");
  const [payModal, setPayModal] = useState<Order | null>(null);
  const [payAmt, setPayAmt] = useState("");
  const [payNote, setPayNote] = useState("");
  const [payReceipt, setPayReceipt] = useState<OrderReceipt | null>(null);
  const [payMethod, setPayMethod] = useState<"cash" | "card">("cash");
  const [payDate, setPayDate] = useState(currentLocalDate);
  const [ourAccountId, setOurAccountId] = useState("");
  const [companyAccountId, setCompanyAccountId] = useState("");
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethods>({ ourAccounts: [], companyAccounts: [] });
  const [methodsLoading, setMethodsLoading] = useState(false);
  const [paying, setPaying] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", address: "", phone: "" });
  const [editingCompany, setEditingCompany] = useState(false);
  const [editCompanyForm, setEditCompanyForm] = useState({ name: "", address: "", phone: "" });
  const [companySaving, setCompanySaving] = useState(false);

  const cOrders = (id: string) => orders.filter((o) => o.companyId === id);
  const cDebt = (id: string) => cOrders(id).reduce((s, o) => s + (o.totalPrice - o.paidAmount), 0);
  const cTotal = (id: string) => cOrders(id).reduce((s, o) => s + o.totalPrice, 0);
  const cPaid = (id: string) => cOrders(id).reduce((s, o) => s + o.paidAmount, 0);
  const cHistory = (id: string) => companyPayments.filter((p) => p.companyId === id);

  const addCompany = async () => {
    if (!addForm.name.trim()) { showToast(t.firmNameRequired, "error"); return; }
    const d = await addCompanyApi(addForm);
    if (!d.success) { showToast((d as any).message || "Xatolik", "error"); return; }
    showToast(t.firmAdded);
    setShowAdd(false);
    setAddForm({ name: "", address: "", phone: "" });
    fetchAll();
  };

  const closePayModal = () => {
    setPayModal(null);
    setPayAmt("");
    setPayNote("");
    setPayReceipt(null);
    setPayMethod("cash");
    setPayDate(currentLocalDate());
    setOurAccountId("");
    setCompanyAccountId("");
  };

  const openCompany = (company: Company) => {
    setSelected(company);
    setView("info");
    setEditingCompany(false);
    setEditCompanyForm({ name: company.name, address: company.address || "", phone: company.phone || "" });
  };

  const startCompanyEdit = () => {
    if (!selected) return;
    setEditCompanyForm({ name: selected.name, address: selected.address || "", phone: selected.phone || "" });
    setEditingCompany(true);
  };

  const saveCompany = async () => {
    if (!selected) return;
    if (!editCompanyForm.name.trim()) { showToast(t.firmNameRequired, "error"); return; }
    setCompanySaving(true);
    const result = await updateCompanyApi(selected.id, {
      name: editCompanyForm.name.trim(),
      address: editCompanyForm.address.trim(),
      phone: editCompanyForm.phone.trim(),
    });
    setCompanySaving(false);
    if (!result.success) { showToast((result as any).message || "Firmani yangilab bo'lmadi", "error"); return; }
    const updated = { ...selected, ...editCompanyForm, name: editCompanyForm.name.trim(), address: editCompanyForm.address.trim(), phone: editCompanyForm.phone.trim() };
    setSelected(updated);
    setEditingCompany(false);
    showToast("Firma ma'lumotlari yangilandi");
    fetchAll();
  };

  const openPayModal = async (order: Order) => {
    setPayModal(order);
    setPayAmt("");
    setPayNote("");
    setPayReceipt(null);
    setPayMethod("cash");
    setPayDate(currentLocalDate());
    setOurAccountId("");
    setCompanyAccountId("");
    setPaymentMethods({ ourAccounts: [], companyAccounts: [] });
    setMethodsLoading(true);
    const result = await getPaymentMethodsApi(order.companyId);
    if (result.success) {
      setPaymentMethods(result.methods);
      if (result.methods.ourAccounts.length === 1) setOurAccountId(result.methods.ourAccounts[0].id);
      if (result.methods.companyAccounts.length === 1) setCompanyAccountId(result.methods.companyAccounts[0].id);
    }
    else showToast(result.message, "error");
    setMethodsLoading(false);
  };

  const selectPayReceipt = (file?: File) => {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) { showToast(t.receiptHint, "error"); return; }
    if (file.size > 5 * 1024 * 1024) { showToast(t.receiptHint, "error"); return; }
    const reader = new FileReader();
    reader.onload = () => setPayReceipt({ name: file.name, type: file.type, dataUrl: String(reader.result) });
    reader.onerror = () => showToast(t.fileReadFailed, "error");
    reader.readAsDataURL(file);
  };

  const payOrder = async () => {
    if (!payModal) return;
    const amt = parseFloat(payAmt);
    if (!amt || amt <= 0) { showToast(t.enterAmount, "error"); return; }
    const debt = payModal.totalPrice - payModal.paidAmount;
    if (amt > debt) { showToast(`${t.maxPayment}: ${fmtM(debt)}`, "error"); return; }
    if (!payDate) { showToast(t.paymentDate, "error"); return; }
    if (payMethod === "card" && (!ourAccountId || !companyAccountId)) { showToast(t.selectBothCards, "error"); return; }
    setPaying(true);
    const d = await payOrderApi(payModal.id, {
      amount: amt,
      note: payNote,
      paymentDate: payDate,
      paymentMethod: payMethod,
      ourAccountId: payMethod === "card" ? ourAccountId : undefined,
      companyAccountId: payMethod === "card" ? companyAccountId : undefined,
      receipt: payReceipt || undefined,
    });
    if (d.success) {
      showToast(t.paymentSavedToPayFlow);
      closePayModal();
      setView("history");
      await fetchAll();
    } else showToast((d as any).message || "Xatolik", "error");
    setPaying(false);
  };

  return (
    <PageWrap
      title={t.suppliers}
      sub={`${companies.length} ${t.companyCountSuffix}`}
      action={<button className="btn-primary" onClick={() => setShowAdd(true)}>{t.addFirm}</button>}
    >
      {showAdd && (
        <Modal onClose={() => setShowAdd(false)}>
          <div className="modal-title">{t.newFirmTitle}</div>
          {[[t.firmName, "name", "Mars LLC"], [t.address, "address", "Seoul"], [t.phone, "phone", "+82 10 1234 5678"]].map(([l, k, p]) => (
            <div key={k} className="form-group">
              <label className="form-label">{l}</label>
              <input className="crm-input" value={(addForm as any)[k]} onChange={(e) => setAddForm({ ...addForm, [k]: e.target.value })} placeholder={p} />
            </div>
          ))}
          <div className="modal-actions" style={{ display: "flex", gap: 10, marginTop: 4 }}>
            <button className="btn-ghost" onClick={() => setShowAdd(false)} style={{ flex: 1 }}>{t.cancel}</button>
            <button className="btn-primary" onClick={addCompany} style={{ flex: 2 }}>{t.save}</button>
          </div>
        </Modal>
      )}

      {payModal && (
        <Modal onClose={closePayModal} className="payflow-payment-modal">
          <div className="payflow-payment-head">
            <div>
              <div className="modal-title">{t.enterPayment}</div>
              <span>{t.orders} #{payModal.id.slice(-8)}</span>
            </div>
            <div className="payflow-debt">
              <span>{t.remainingDebt}</span>
              <strong>{fmtM(payModal.totalPrice - payModal.paidAmount)}</strong>
            </div>
          </div>

          <div className="form-group payflow-company-field">
            <label className="form-label">{t.firmName}</label>
            <input className="crm-input" value={payModal.companyName || selected?.name || ""} readOnly />
          </div>

          <div className="form-group">
            <label className="form-label">{t.paymentMethods}</label>
            <div className="pay-method-segment" role="group" aria-label={t.paymentMethods}>
              <button type="button" className={payMethod === "cash" ? "active" : ""} onClick={() => setPayMethod("cash")}><Banknote size={16} /> {t.cash}</button>
              <button type="button" className={payMethod === "card" ? "active" : ""} onClick={() => setPayMethod("card")}><CreditCard size={16} /> {t.card}</button>
            </div>
          </div>

          {payMethod === "card" && (
            <div className="pay-account-box">
              <div className="pay-account-grid">
                <div className="form-group">
                  <label className="form-label">{t.ourCards}</label>
                  <select className="crm-input" value={ourAccountId} onChange={(event) => setOurAccountId(event.target.value)} disabled={methodsLoading}>
                    <option value="">{methodsLoading ? t.loading : t.selectOurCard}</option>
                    {paymentMethods.ourAccounts.map((account) => <option key={account.id} value={account.id}>{account.label}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">{t.companyCards}</label>
                  <select className="crm-input" value={companyAccountId} onChange={(event) => setCompanyAccountId(event.target.value)} disabled={methodsLoading}>
                    <option value="">{methodsLoading ? t.loading : t.selectCompanyCard}</option>
                    {paymentMethods.companyAccounts.map((account) => <option key={account.id} value={account.id}>{account.label}</option>)}
                  </select>
                </div>
              </div>
              {(!paymentMethods.ourAccounts.length || !paymentMethods.companyAccounts.length) && !methodsLoading && (
                <button type="button" className="payment-settings-link" onClick={() => { closePayModal(); setView("settings"); }}><Settings2 size={15} /> {t.manageCards}</button>
              )}
            </div>
          )}

          <div className="payflow-form-row">
            <div className="form-group">
              <label className="form-label">{t.paymentDate}</label>
              <div className="pay-date-field"><CalendarDays size={16} /><input className="crm-input" type="date" value={payDate} onChange={(event) => setPayDate(event.target.value)} /></div>
            </div>
            <div className="form-group">
              <label className="form-label">{t.payAmount}</label>
              <div className="payflow-amount-field">
                <input className="crm-input" type="number" value={payAmt} onChange={(e) => setPayAmt(e.target.value)} placeholder={t.enterAmount} />
                <button type="button" onClick={() => setPayAmt(String(payModal.totalPrice - payModal.paidAmount))}>{t.payAll}</button>
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">{t.note}</label>
            <textarea className="crm-input payflow-note" rows={3} value={payNote} onChange={(e) => setPayNote(e.target.value)} placeholder={t.note} />
          </div>

          <div className="form-group payflow-receipt-field">
            <label className="form-label">{t.receipt}</label>
            <input id="pay-receipt" type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => selectPayReceipt(e.target.files?.[0])} style={{ display: "none" }} />
            <div style={{ display: "flex", gap: 8, alignItems: "stretch", flexWrap: "wrap" }}>
              <label htmlFor="pay-receipt" className="btn-ghost" style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", minHeight: 40 }}>
                <FileCheck2 size={16} /> {payReceipt ? t.changeReceipt : t.addReceipt}
              </label>
              {payReceipt && (
                <>
                  <a href={payReceipt.dataUrl} download={payReceipt.name} className="btn-ghost" style={{ display: "inline-flex", alignItems: "center", textDecoration: "none", minWidth: 0, maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{payReceipt.name}</a>
                  <button type="button" className="btn-ghost" onClick={() => setPayReceipt(null)}>×</button>
                </>
              )}
            </div>
            <div className="payment-file-hint">{t.receiptHint}</div>
          </div>

          <div className="modal-actions" style={{ display: "flex", gap: 10, marginTop: 4 }}>
            <button className="btn-ghost" onClick={closePayModal} disabled={paying} style={{ flex: 1 }}>{t.cancel}</button>
            <button className="btn-primary" onClick={payOrder} disabled={paying || methodsLoading || (payMethod === "card" && (!ourAccountId || !companyAccountId))} style={{ flex: 2 }}>{paying ? t.sending : t.save}</button>
          </div>
        </Modal>
      )}

      {selected && !payModal && (
        <Modal onClose={() => { setSelected(null); setEditingCompany(false); }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
            <div>
              <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 2 }}>🏢 {selected.name}</div>
              {selected.phone && <div style={{ fontSize: 12, color: "var(--app-muted)" }}>{selected.phone}</div>}
            </div>
            <div style={{ background: cDebt(selected.id) > 0 ? "rgba(248,81,73,.1)" : "rgba(63,185,80,.1)", border: `1px solid ${cDebt(selected.id) > 0 ? "rgba(248,81,73,.3)" : "rgba(63,185,80,.3)"}`, borderRadius: 12, padding: "6px 14px", textAlign: "right" }}>
              <div style={{ fontSize: 10, color: "var(--app-muted)", fontWeight: 700 }}>{t.debt}</div>
              <div style={{ fontWeight: 900, color: cDebt(selected.id) > 0 ? "#f85149" : "#3fb950", fontSize: 16 }}>{cDebt(selected.id) > 0 ? fmtM(cDebt(selected.id)) : `✓ ${t.noDebt}`}</div>
            </div>
          </div>

          <div className="firm-detail-tabs">
            {(["info", "pay", "history", "settings"] as const).map((v) => (
              <button key={v} onClick={() => setView(v)} style={{ flex: 1, padding: "9px 4px", borderRadius: 9, border: "none", background: view === v ? "var(--app-panel)" : "transparent", color: view === v ? "#7367f0" : "var(--app-muted)", fontWeight: 800, cursor: "pointer", fontSize: 12, fontFamily: "inherit", boxShadow: view === v ? "0 2px 8px rgba(0,0,0,.15)" : "none", transition: "all .15s" }}>
                {v === "info" ? t.info : v === "pay" ? t.pay : v === "history" ? t.history : t.paymentSettings}
              </button>
            ))}
          </div>

          {view === "info" && (
            <div className="firm-info-panel">
              <div className="firm-info-actions">
                <strong>{editingCompany ? "Firma ma'lumotlarini tahrirlash" : "Firma ma'lumotlari"}</strong>
                {editingCompany ? (
                  <div>
                    <button className="btn-ghost" disabled={companySaving} onClick={() => setEditingCompany(false)}><X size={15} /> {t.cancel}</button>
                    <button className="btn-primary" disabled={companySaving} onClick={saveCompany}><Save size={15} /> {companySaving ? "Saqlanmoqda..." : t.save}</button>
                  </div>
                ) : (
                  <button className="btn-ghost" onClick={startCompanyEdit}><Pencil size={15} /> {t.edit}</button>
                )}
              </div>
              {editingCompany ? (
                <div className="company-edit-grid">
                  <div className="form-group"><label className="form-label">{t.firmName}</label><input className="crm-input" value={editCompanyForm.name} onChange={(event) => setEditCompanyForm({ ...editCompanyForm, name: event.target.value })} /></div>
                  <div className="form-group"><label className="form-label">{t.phone}</label><input className="crm-input" value={editCompanyForm.phone} onChange={(event) => setEditCompanyForm({ ...editCompanyForm, phone: event.target.value })} /></div>
                  <div className="form-group company-edit-span"><label className="form-label">{t.address}</label><textarea className="crm-input" rows={3} value={editCompanyForm.address} onChange={(event) => setEditCompanyForm({ ...editCompanyForm, address: event.target.value })} /></div>
                </div>
              ) : (
                <div style={{ display: "grid", gap: 10 }}>
                  {[[t.firmName, selected.name], [t.address, selected.address || "—"], [t.phone, selected.phone || "—"], [t.addedDate, fmtDate(selected.createdAt)], [t.totalOrders, `${cOrders(selected.id).length} · ${fmtM(cTotal(selected.id))}`]].map(([l, v]) => (
                    <div key={String(l)} style={{ background: "var(--app-panel-soft)", borderRadius: 11, padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                      <span style={{ color: "var(--app-muted)", fontSize: 13, flexShrink: 0 }}>{l}</span>
                      <span style={{ fontWeight: 700, textAlign: "right" }}>{v}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {view === "pay" && (
            <div>
              <div style={{ textAlign: "center", borderRadius: 16, padding: "24px 20px", marginBottom: 20, background: cDebt(selected.id) > 0 ? "linear-gradient(135deg,rgba(248,81,73,.08),transparent)" : "linear-gradient(135deg,rgba(63,185,80,.08),transparent)", border: `1px solid ${cDebt(selected.id) > 0 ? "rgba(248,81,73,.2)" : "rgba(63,185,80,.2)"}` }}>
                <div style={{ fontSize: 12, color: "var(--app-muted)", marginBottom: 8, fontWeight: 700, letterSpacing: 0.5 }}>{t.totalDebt}</div>
                <div style={{ fontWeight: 900, fontSize: 38, color: cDebt(selected.id) > 0 ? "#f85149" : "#3fb950", letterSpacing: -1 }}>{fmtM(cDebt(selected.id))}</div>
                <div style={{ display: "flex", justifyContent: "center", gap: 24, marginTop: 12 }}>
                  <div style={{ fontSize: 12, color: "var(--app-muted)" }}>{t.total} <strong style={{ color: "var(--app-text)" }}>{fmtM(cTotal(selected.id))}</strong></div>
                  <div style={{ fontSize: 12, color: "var(--app-muted)" }}>{t.totalPaid} <strong style={{ color: "#3fb950" }}>{fmtM(cPaid(selected.id))}</strong></div>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {cOrders(selected.id).map((o) => {
                  const debt = o.totalPrice - o.paidAmount;
                  const pay = PAY_STATUS_CONFIG[o.payStatus];
                  return (
                    <div key={o.id} style={{ background: "var(--app-panel-soft)", borderRadius: 12, padding: "13px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                      <div>
                        <div style={{ fontWeight: 800 }}>{t.orders} <span style={{ fontFamily: "monospace", color: "#7367f0", fontSize: 12 }}>#{o.id.slice(-8)}</span></div>
                        <div style={{ fontSize: 11, color: "var(--app-muted)", marginTop: 2 }}>{fmtDate(o.orderDate || o.createdAt)} · {fmtM(o.totalPrice)}</div>
                        {debt > 0 && <div style={{ fontSize: 12, color: "#f85149", fontWeight: 700, marginTop: 2 }}>{t.debt}: {fmtM(debt)}</div>}
                        {o.receipt && <a href={o.receipt.dataUrl} download={o.receipt.name} onClick={(e) => e.stopPropagation()} className="payment-receipt-link" style={{ marginTop: 5 }}><FileCheck2 size={14} /> {t.downloadReceipt}</a>}
                      </div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <span className="badge" style={{ background: pay.bg, color: pay.c }}>{t[o.payStatus] || pay.l}</span>
                        {debt > 0 && <button className="btn-primary" onClick={() => void openPayModal(o)} style={{ padding: "7px 14px", fontSize: 12 }}><CreditCard size={15} /> {t.pay}</button>}
                      </div>
                    </div>
                  );
                })}
                {cOrders(selected.id).length === 0 && <div style={{ textAlign: "center", padding: 32, color: "var(--app-muted)" }}>{t.noOrders}</div>}
              </div>
            </div>
          )}

          {view === "history" && (
            <div>
              {cHistory(selected.id).length === 0 ? (
                <div style={{ textAlign: "center", padding: 40, color: "var(--app-muted)" }}>
                  <div style={{ fontSize: 36, marginBottom: 8 }}>📜</div>{t.noHistory}
                </div>
              ) : (
                <div className="table-wrap">
                  <table className="crm-table">
                    <thead><tr><th>{t.orders}</th><th>{t.totalAmount}</th><th>{t.paymentMethods}</th><th>{t.note}</th><th>{t.date}</th><th>{t.receipt}</th></tr></thead>
                    <tbody>
                      {cHistory(selected.id).map((p) => (
                        <tr key={p.id}>
                          <td style={{ fontFamily: "monospace", fontSize: 11, color: "#7367f0" }}>{p.orderId.slice(-8)}</td>
                          <td style={{ color: "#3fb950", fontWeight: 800 }}>+{fmtM(p.amount)}</td>
                          <td><span className="badge payment-history-method">{p.paymentMethod === "card" ? t.card : t.cash}</span></td>
                          <td style={{ color: "var(--app-muted)", fontSize: 12 }}>{p.note || "—"}</td>
                          <td style={{ fontSize: 11, color: "var(--app-muted)" }}>{fmtDate(p.paymentDate || p.createdAt)}</td>
                          <td>{p.receipt?.dataUrl ? <a className="payment-receipt-link" href={p.receipt.dataUrl} target="_blank" rel="noreferrer"><FileCheck2 size={14} /> {t.view}</a> : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {view === "settings" && (
            <PaymentMethodsPanel key={selected.id} kind="COMPANY" companyId={selected.id} t={t} showToast={showToast} />
          )}
        </Modal>
      )}

      <div className="supplier-grid">
        {companies.map((c) => (
          <SupplierCard
            key={c.id}
            company={c}
            orderCount={cOrders(c.id).length}
            totalValue={cTotal(c.id)}
            debt={cDebt(c.id)}
            countSuffix={t.countSuffix}
            debtLabel={t.debt}
            noDebtLabel={t.noDebt}
            onOpen={openCompany}
          />
        ))}
        {companies.length === 0 && (
          <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "60px 20px", color: "var(--app-muted)" }}>
            <Building2 size={40} style={{ marginBottom: 12, opacity: 0.5 }} />
            <div style={{ fontWeight: 700, fontSize: 16 }}>Hali firma qo'shilmagan</div>
            <div style={{ fontSize: 13, marginTop: 6 }}>Yuqoridagi "+ Yangi firma" tugmasini bosing</div>
          </div>
        )}
      </div>
    </PageWrap>
  );
}

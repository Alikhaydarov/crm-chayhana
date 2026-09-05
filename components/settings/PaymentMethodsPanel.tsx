"use client";

import { useCallback, useEffect, useState } from "react";
import { CreditCard, LoaderCircle, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { addPaymentMethodApi, deletePaymentMethodApi, getPaymentMethodsApi } from "@/lib/api";
import type { PaymentAccount, PaymentMethods } from "@/types/domain";

type Props = {
  kind: "OUR" | "COMPANY";
  companyId?: string;
  t: Record<string, string>;
  showToast: (message: string, type?: "success" | "error") => void;
  onChange?: (methods: PaymentMethods) => void;
};

const emptyMethods: PaymentMethods = { ourAccounts: [], companyAccounts: [] };

export function PaymentMethodsPanel({ kind, companyId, t, showToast, onChange }: Props) {
  const [methods, setMethods] = useState<PaymentMethods>(emptyMethods);
  const [label, setLabel] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const result = await getPaymentMethodsApi(companyId);
    if (result.success) {
      setMethods(result.methods);
      onChange?.(result.methods);
    } else {
      showToast(result.message, "error");
    }
    setLoading(false);
  }, [companyId, onChange, showToast]);

  useEffect(() => { void load(); }, [load]);

  const accounts: PaymentAccount[] = kind === "OUR" ? methods.ourAccounts : methods.companyAccounts;

  const add = async () => {
    const value = label.trim();
    if (value.length < 2) {
      showToast(t.cardLabelHint, "error");
      return;
    }
    setSaving(true);
    const result = await addPaymentMethodApi({ kind, label: value, companyId });
    if (result.success) {
      setLabel("");
      showToast(t.addCard);
      await load();
    } else showToast(result.message, "error");
    setSaving(false);
  };

  const remove = async (account: PaymentAccount) => {
    const question = `${account.label}: ${t.delete || "O'chirish"}?`;
    if (!window.confirm(question)) return;
    setDeletingId(account.id);
    const result = await deletePaymentMethodApi(account.id, companyId);
    if (result.success) {
      showToast(t.delete || "O'chirildi");
      await load();
    } else showToast(result.message, "error");
    setDeletingId("");
  };

  return (
    <section className="payment-method-panel">
      <header className="payment-method-head">
        <div className="payment-method-title">
          <span><CreditCard size={18} /></span>
          <div>
            <h2>{kind === "OUR" ? t.ourCards : t.companyCards}</h2>
            <p>{t.cardLabelHint}</p>
          </div>
        </div>
        <span className="payment-method-secure"><ShieldCheck size={14} /> PayFlow</span>
      </header>

      <div className="payment-method-form">
        <label>
          <span className="form-label">{t.cardLabel}</span>
          <input
            className="crm-input"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            onKeyDown={(event) => { if (event.key === "Enter") void add(); }}
            placeholder="Woori Bank •••• 1234"
            maxLength={120}
            autoComplete="off"
          />
        </label>
        <button className="btn-primary" onClick={add} disabled={saving || label.trim().length < 2}>
          {saving ? <LoaderCircle className="spin" size={16} /> : <Plus size={16} />}
          {t.addCard}
        </button>
      </div>

      <div className="payment-method-list" aria-busy={loading}>
        {loading ? (
          <div className="payment-method-empty"><LoaderCircle className="spin" size={20} /> {t.loading}</div>
        ) : accounts.length ? accounts.map((account) => (
          <div className="payment-method-row" key={account.id}>
            <span className="payment-method-icon"><CreditCard size={17} /></span>
            <div><strong>{account.label}</strong><small>{kind === "OUR" ? t.ourCards : t.companyCards}</small></div>
            <button className="btn-icon payment-method-delete" onClick={() => void remove(account)} disabled={deletingId === account.id} aria-label={t.delete || "O'chirish"} title={t.delete || "O'chirish"}>
              {deletingId === account.id ? <LoaderCircle className="spin" size={15} /> : <Trash2 size={15} />}
            </button>
          </div>
        )) : (
          <div className="payment-method-empty"><CreditCard size={21} /> {t.noCards}</div>
        )}
      </div>
    </section>
  );
}

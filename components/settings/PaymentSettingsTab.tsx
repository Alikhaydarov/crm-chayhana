"use client";

import { WalletCards } from "lucide-react";
import { PageWrap } from "@/components/ui";
import { PaymentMethodsPanel } from "@/components/settings/PaymentMethodsPanel";

export function PaymentSettingsTab({ t, showToast }: { t: Record<string, string>; showToast: (message: string, type?: "success" | "error") => void }) {
  return (
    <PageWrap title={t.paymentSettings} sub={t.paymentMethods}>
      <div className="settings-intro">
        <span><WalletCards size={20} /></span>
        <div>
          <strong>{t.ourCards}</strong>
          <p>{t.cardLabelHint}. {t.cardSecurity}.</p>
        </div>
      </div>
      <PaymentMethodsPanel kind="OUR" t={t} showToast={showToast} />
    </PageWrap>
  );
}

"use client";

import { PaymentSettingsTab } from "@/components/settings/PaymentSettingsTab";
import { useApp } from "@/lib/AppContext";

export default function SettingsPage() {
  const { t, showToast } = useApp();
  return <PaymentSettingsTab t={t} showToast={showToast} />;
}

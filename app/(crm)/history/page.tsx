"use client";
import { HistoryTab } from "@/components/history/HistoryTab";
import { useApp } from "@/lib/AppContext";

export default function HistoryPage() {
  const { orders, companyPayments, companies, damages, lang } = useApp();
  return <HistoryTab orders={orders} payments={companyPayments} companies={companies} damages={damages} lang={lang} />;
}

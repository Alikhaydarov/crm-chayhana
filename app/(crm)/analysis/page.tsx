"use client";
import { useApp } from "@/lib/AppContext";
import { ShopSalesTab } from "@/components/shop-sales/ShopSalesTab";

export default function AnalysisPage() {
  const ctx = useApp();
  return <ShopSalesTab {...ctx} setTab={ctx.setTab as any} />;
}

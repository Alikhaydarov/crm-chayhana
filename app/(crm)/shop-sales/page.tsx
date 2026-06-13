"use client";
import { useApp } from "@/lib/AppContext";
import { ShopSalesTab } from "@/components/shop-sales/ShopSalesTab";
export default function ShopSalesPage() {
  const ctx = useApp();
  return <ShopSalesTab {...ctx} setTab={ctx.setTab as any} />;
}

"use client";
import { useApp } from "@/lib/AppContext";
import { OrdersTab } from "@/components/orders/OrdersTab";
export default function OrdersPage() {
  const ctx = useApp();
  return <OrdersTab {...ctx} />;
}

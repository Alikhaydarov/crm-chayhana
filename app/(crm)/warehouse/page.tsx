"use client";
import { useApp } from "@/lib/AppContext";
import { WarehouseTab } from "@/components/warehouse/WarehouseTab";
export default function WarehousePage() {
  const ctx = useApp();
  return <WarehouseTab {...ctx} />;
}

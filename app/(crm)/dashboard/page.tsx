"use client";
import { useApp } from "@/lib/AppContext";
import { DashboardTab } from "@/components/dashboard/DashboardTab";
export default function DashboardPage() {
  const ctx = useApp();
  return <DashboardTab {...ctx} setTab={ctx.setTab as any} />;
}

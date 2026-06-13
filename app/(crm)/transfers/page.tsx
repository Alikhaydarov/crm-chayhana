"use client";
import { useApp } from "@/lib/AppContext";
import { TransfersTab } from "@/components/transfers/TransfersTab";
export default function TransfersPage() {
  const ctx = useApp();
  return <TransfersTab {...ctx} />;
}

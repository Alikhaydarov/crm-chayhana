"use client";
import { useApp } from "@/lib/AppContext";
import { SuppliersTab } from "@/components/suppliers/SuppliersTab";
export default function SuppliersPage() {
  const ctx = useApp();
  return <SuppliersTab {...ctx} />;
}

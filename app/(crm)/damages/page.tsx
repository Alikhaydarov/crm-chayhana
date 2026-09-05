"use client";
import { DamagesTab } from "@/components/damages/DamagesTab";
import { useApp } from "@/lib/AppContext";

export default function DamagesPage() {
  const ctx = useApp();
  return <DamagesTab {...ctx} />;
}

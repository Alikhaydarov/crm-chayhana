"use client";
import { ExpiryTab } from "@/components/expiry/ExpiryTab";
import { useApp } from "@/lib/AppContext";

export default function ExpiryPage() {
  const ctx = useApp();
  return <ExpiryTab {...ctx} />;
}

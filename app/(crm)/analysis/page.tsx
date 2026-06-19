"use client";
import { useSearchParams } from "next/navigation";
import { useApp } from "@/lib/AppContext";
import { ShopSalesTab } from "@/components/shop-sales/ShopSalesTab";

export default function AnalysisPage() {
  const ctx = useApp();
  const searchParams = useSearchParams();
  const selectedBranchSlug = searchParams.get("branch") || ctx.user.branchSlug || "";
  return (
    <ShopSalesTab
      {...ctx}
      selectedBranchSlug={selectedBranchSlug}
      setTab={ctx.setTab as any}
    />
  );
}

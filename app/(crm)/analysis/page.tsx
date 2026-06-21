"use client";
import { useSearchParams } from "next/navigation";
import { useApp } from "@/lib/AppContext";
import { ShopSalesTab } from "@/components/shop-sales/ShopSalesTab";

function slugFromName(value = "") {
  return value
    .trim()
    .toLocaleLowerCase()
    .replace(/['’`]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function AnalysisPage() {
  const ctx = useApp();
  const searchParams = useSearchParams();
  const userSlug = String(ctx.user.branchSlug || "").trim();
  const selectedBranchSlug =
    searchParams.get("branch") ||
    (userSlug && userSlug !== "shop" ? userSlug : slugFromName(ctx.user.branchName));

  return (
    <ShopSalesTab
      {...ctx}
      selectedBranchSlug={selectedBranchSlug}
      setTab={ctx.setTab as any}
    />
  );
}

"use client";
import { useSearchParams } from "next/navigation";
import { useApp } from "@/lib/AppContext";
import { PosExcelImport } from "@/components/shop-sales/PosExcelImport";
import { ShopSalesTab } from "@/components/shop-sales/ShopSalesTab";

export default function AnalysisPage() {
  const ctx = useApp();
  const searchParams = useSearchParams();
  const selectedBranchSlug = searchParams.get("branch") || ctx.user.branchSlug || "";
  return (
    <>
      {ctx.user.role !== "superadmin" && (
        <PosExcelImport
          products={ctx.products}
          user={ctx.user}
          branches={ctx.branches}
          selectedBranchSlug={selectedBranchSlug}
          fetchAll={ctx.fetchAll}
          showToast={ctx.showToast}
        />
      )}
      <ShopSalesTab
        {...ctx}
        selectedBranchSlug={selectedBranchSlug}
        setTab={ctx.setTab as any}
      />
    </>
  );
}

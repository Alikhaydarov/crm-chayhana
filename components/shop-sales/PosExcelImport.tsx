"use client";
import { useState } from "react";
import { FileSpreadsheet } from "lucide-react";
import { importShopSalesApi } from "@/lib/api";
import type { Product, UserInfo } from "@/types";
import type { Branch } from "@/types/domain";

function productBarcode(product: any) {
  return String(product?.qrCode ?? product?.qr_code ?? product?.barcode ?? "").trim();
}

function productId(product: any) {
  return String(product?.external_id ?? product?.externalId ?? product?.id ?? "").trim();
}

async function parsePosWorkbook(file: File, products: Product[]) {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());
  const sheet = workbook.worksheets.find((item) => item.actualRowCount > 2) ?? workbook.worksheets[0];
  if (!sheet) return [];
  const productsByBarcode = new Map(products.map((product) => [productBarcode(product), product]));
  const rows: any[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber <= 2) return;
    const cells = row.values as any[];
    const barcode = String(cells[1] ?? "").trim();
    const sourceName = String(cells[2] ?? "").trim();
    const quantity = Number(cells[7] ?? 0);
    if (!barcode || !sourceName || !Number.isFinite(quantity) || quantity <= 0) return;
    const product = productsByBarcode.get(barcode);
    rows.push({
      barcode,
      sourceName,
      supplier: String(cells[3] ?? "").trim(),
      quantity,
      averagePrice: Number(cells[8] ?? 0) || 0,
      salesAmount: Number(cells[17] ?? cells[4] ?? 0) || 0,
      costAmount: Number(cells[25] ?? 0) || 0,
      profitAmount: Number(cells[26] ?? 0) || 0,
      productId: product ? productId(product) : "",
    });
  });
  return rows;
}

type Props = {
  products: Product[];
  user: UserInfo;
  branches: Branch[];
  selectedBranchSlug?: string;
  fetchAll: () => void | Promise<void>;
  showToast: (message: string, type?: "success" | "error") => void;
};

export function PosExcelImport({ products, user, branches, selectedBranchSlug = "", fetchAll, showToast }: Props) {
  const [saleDate, setSaleDate] = useState("");
  const [loading, setLoading] = useState(false);
  const currentBranch = branches.find((branch) =>
    branch.slug === user.branchSlug || String(branch.id) === String(user.branchId ?? "") || branch.name === user.branchName
  );
  const branchSlug = selectedBranchSlug || user.branchSlug || currentBranch?.slug || "";

  const upload = async (file?: File) => {
    if (!file) return;
    if (!saleDate) { showToast("Avval import sanasini tanlang", "error"); return; }
    if (!branchSlug) { showToast("Do'kon branch aniqlanmadi", "error"); return; }
    setLoading(true);
    try {
      const rows = await parsePosWorkbook(file, products);
      if (!rows.length) throw new Error("Excel ichida sotuv qatorlari topilmadi");
      const matched = rows.filter((row) => row.productId);
      const skipped = rows.filter((row) => !row.productId);
      if (!matched.length) throw new Error("Excel o'qildi, ammo shtrix-kodlar CRM mahsulotlariga mos kelmadi");
      const result = await importShopSalesApi({
        sourceKey: `${file.name}:${file.size}:${file.lastModified}:${saleDate}:${branchSlug}`,
        fileName: file.name,
        saleDate,
        rows: matched,
        skippedRows: skipped.map((row) => ({ barcode: row.barcode, sourceName: row.sourceName, quantity: row.quantity })),
        branch: branchSlug,
        branchSlug,
      });
      if (!result.success) throw new Error((result as any).message || "Import amalga oshmadi");
      showToast(`${matched.length} ta mahsulot import qilindi${skipped.length ? `, ${skipped.length} ta barcode topilmadi` : ""}`);
      await fetchAll();
    } catch (error: any) {
      showToast(error?.message || "Excelni o'qib bo'lmadi", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`label:has(> input[data-testid="shop-sales-excel-input"]) { display: none !important; }`}</style>
      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "end", gap: 10, padding: "14px 24px 0", flexWrap: "wrap" }}>
        <label style={{ display: "grid", gap: 5, fontSize: 11, fontWeight: 800, color: "var(--app-muted)" }}>
          SAVDO SANASI
          <input className="crm-input" type="date" value={saleDate} onChange={(event) => setSaleDate(event.target.value)} />
        </label>
        <label className="btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer", position: "relative", overflow: "hidden" }}>
          <FileSpreadsheet size={17} /> {loading ? "O'qilmoqda..." : "POS Excel import"}
          <input type="file" accept=".xlsx" disabled={loading} onChange={(event) => { void upload(event.target.files?.[0]); event.target.value = ""; }} style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }} />
        </label>
      </div>
    </>
  );
}

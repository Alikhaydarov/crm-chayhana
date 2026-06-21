"use client";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, FileSpreadsheet, Package, TrendingUp, Upload } from "lucide-react";
import { PageWrap } from "@/components/ui";
import { importShopSalesApi, uploadShopSalesExcelApi } from "@/lib/api";
import { fmt, fmtDate, fmtKRW } from "@/lib/utils";
import type { ParsedShopSale, Product, StockMap, TabId, UserInfo } from "@/types";
import type { Branch, ShopSaleImport } from "@/types/domain";

const API_BASE = "/api/backend";

function unwrapList(data: any): any[] {
  const value = data?.data?.results ?? data?.data?.items ?? data?.data?.shopSales ?? data?.data?.shop_sales ?? data?.results ?? data?.items ?? data?.shopSales ?? data?.shop_sales ?? data?.data ?? data;
  return Array.isArray(value) ? value : [];
}
function sourceHash(text: string) { let hash = 2166136261; for (let i = 0; i < text.length; i++) { hash ^= text.charCodeAt(i); hash = Math.imul(hash, 16777619); } return (hash >>> 0).toString(36); }
function isDuplicateImportMessage(message = "") { return /oldin import|avval import|already import|already exists|duplicate|takror/i.test(message); }
function n(value: any) { const num = Number(value); return Number.isFinite(num) ? num : 0; }
function productBarcode(product: any) { return String(product?.qrCode ?? product?.qr_code ?? product?.barcode ?? "").trim(); }
function productId(product: any) { return String(product?.external_id ?? product?.externalId ?? product?.id ?? "").trim(); }
function normalizeSaleItem(item: any) {
  return { ...item, barcode: String(item?.barcode ?? item?.bar_code ?? item?.qrCode ?? item?.qr_code ?? ""), sourceName: item?.sourceName ?? item?.source_name ?? item?.name ?? "", supplier: item?.supplier ?? item?.supplier_name ?? "", productId: String(item?.productId ?? item?.product_id ?? item?.product?.id ?? item?.product ?? ""), productName: item?.productName ?? item?.product_name ?? item?.product?.name ?? item?.sourceName ?? item?.source_name ?? "", quantity: n(item?.quantity ?? item?.qty), salesAmount: n(item?.salesAmount ?? item?.sales_amount ?? item?.total_sales ?? item?.sales ?? item?.amount), costAmount: n(item?.costAmount ?? item?.cost_amount ?? item?.total_cost ?? item?.cost), profitAmount: n(item?.profitAmount ?? item?.profit_amount ?? item?.total_profit ?? item?.profit), averagePrice: n(item?.averagePrice ?? item?.average_price ?? item?.price), stockBefore: n(item?.stockBefore ?? item?.stock_before), stockAfter: n(item?.stockAfter ?? item?.stock_after), shortage: n(item?.shortage) };
}
function branchOf(item: any) { return String(item?.branchSlug ?? item?.branch_slug ?? item?.branch?.slug ?? item?.warehouseSlug ?? item?.warehouse_slug ?? item?.warehouse?.slug ?? item?.shopSlug ?? item?.shop_slug ?? "").trim(); }
function normalizeShopSale(raw: any): ShopSaleImport {
  const items = unwrapList(raw?.items ?? raw?.sale_items ?? raw?.shop_sale_items ?? raw?.rows ?? []).map(normalizeSaleItem);
  const saleDate = String(raw?.saleDate ?? raw?.sale_date ?? raw?.date ?? raw?.created_at ?? "").slice(0, 10);
  const branchSlug = branchOf(raw);
  return { ...raw, id: String(raw?.id ?? raw?.external_id ?? raw?.sourceKey ?? raw?.source_key ?? `${saleDate}-${raw?.file_name ?? raw?.fileName ?? Math.random()}`), sourceKey: raw?.sourceKey ?? raw?.source_key ?? "", fileName: raw?.fileName ?? raw?.file_name ?? raw?.filename ?? raw?.name ?? "Excel import", saleDate, branchSlug, branch_slug: branchSlug, items, totalQuantity: n(raw?.totalQuantity ?? raw?.total_quantity) || items.reduce((s: number, row: any) => s + row.quantity, 0), totalSales: n(raw?.totalSales ?? raw?.total_sales) || items.reduce((s: number, row: any) => s + row.salesAmount, 0), totalCost: n(raw?.totalCost ?? raw?.total_cost) || items.reduce((s: number, row: any) => s + row.costAmount, 0), totalProfit: n(raw?.totalProfit ?? raw?.total_profit) || items.reduce((s: number, row: any) => s + row.profitAmount, 0), shortageCount: n(raw?.shortageCount ?? raw?.shortage_count), skippedRows: raw?.skippedRows ?? raw?.skipped_rows ?? [], createdAt: raw?.createdAt ?? raw?.created_at ?? "" } as ShopSaleImport;
}

async function parseShopWorkbook(file: File, products: Product[]): Promise<ParsedShopSale[]> {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());
  const ws = workbook.worksheets[0];
  if (!ws) throw new Error("Excel varag'i topilmadi");
  const rows: any[][] = [];
  ws.eachRow({ includeEmpty: true }, (row) => rows.push(Array.from({ length: ws.columnCount }, (_, i) => { const cell = row.getCell(i + 1); return i === 0 ? cell.text.trim() : cell.value; })));
  const headerIndex = rows.findIndex((row, i) => { const next = rows[i + 1]; return i < 10 && Boolean(row?.[0]) && Boolean(next?.[0]) && Number(next?.[6]) > 0 && !Number(row?.[6]); });
  if (headerIndex < 0) throw new Error("Excel savdo ustunlari tanilmadi");
  return rows.slice(headerIndex + 1).flatMap((row) => {
    const barcode = String(row?.[0] ?? "").trim();
    const sourceName = String(row?.[1] ?? "").trim();
    const quantity = Number(row?.[6] || 0);
    if (!barcode || !sourceName || quantity <= 0) return [];
    const product = products.find((p: any) => productBarcode(p) === barcode);
    return [{ barcode, sourceName, supplier: String(row?.[2] ?? "").trim(), quantity, salesAmount: Number(row?.[16] ?? row?.[3] ?? 0), averagePrice: Number(row?.[7] || 0), costAmount: Number(row?.[24] || 0), profitAmount: Number(row?.[25] || 0), productId: product ? productId(product) : "" }];
  });
}

type Props = { products: Product[]; shopStock: StockMap; shopSales: ShopSaleImport[]; user: UserInfo; branches: Branch[]; selectedBranchSlug?: string; fetchAll: () => void | Promise<void>; showToast: (msg: string, type?: "success" | "error") => void; setTab: (tab: TabId) => void; };

export function ShopSalesTab({ products, shopStock, shopSales, user, branches, selectedBranchSlug = "", fetchAll, showToast, setTab }: Props) {
  const [remoteSales, setRemoteSales] = useState<any[]>([]);
  const [loadingSales, setLoadingSales] = useState(false);
  const [importDate, setImportDate] = useState("");
  const [reading, setReading] = useState(false);
  const [dateFilter, setDateFilter] = useState("all");
  const [period, setPeriod] = useState<"daily" | "monthly" | "yearly">("daily");
  const [detail, setDetail] = useState<ShopSaleImport | null>(null);
  const selectedBranch = branches.find((branch) => branch.slug === selectedBranchSlug);
  const currentBranch = branches.find((branch) => branch.slug === user.branchSlug || String(branch.id) === String(user.branchId || "") || branch.name === user.branchName);
  const effectiveBranchSlug = selectedBranchSlug || user.branchSlug || currentBranch?.slug || "";
  const canImportExcel = user.role !== "superadmin";

  const loadShopSales = async () => {
    setLoadingSales(true);
    try {
      const token = localStorage.getItem("crm-access-token");
      const headers = new Headers({ accept: "application/json" });
      if (token) headers.set("authorization", `Bearer ${token}`);
      const params = new URLSearchParams({ page_size: "1000" });
      if (effectiveBranchSlug) { params.set("branch", effectiveBranchSlug); params.set("branch_slug", effectiveBranchSlug); params.set("warehouse_slug", effectiveBranchSlug); }
      const response = await fetch(`${API_BASE}/shop-sales/?${params.toString()}`, { headers, cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.message || data?.detail || `Shop sales GET xatosi (${response.status})`);
      setRemoteSales(unwrapList(data));
    } catch (error) { console.warn("[shop-sales] direct GET failed", error); }
    finally { setLoadingSales(false); }
  };
  useEffect(() => { void loadShopSales(); }, [effectiveBranchSlug]);

  const imports = useMemo(() => {
    const map = new Map<string, ShopSaleImport>();
    [...(shopSales || []), ...remoteSales].map(normalizeShopSale).forEach((item: any) => {
      const rowBranch = branchOf(item);
      if (effectiveBranchSlug && rowBranch && rowBranch !== effectiveBranchSlug) return;
      if (effectiveBranchSlug && !rowBranch && user.role !== "superadmin") return;
      map.set(String(item.id || item.sourceKey || item.fileName), item);
    });
    return Array.from(map.values()).sort((a, b) => String(b.saleDate).localeCompare(String(a.saleDate)));
  }, [shopSales, remoteSales, effectiveBranchSlug, user.role]);
  const filteredImports = dateFilter === "all" ? imports : imports.filter((i) => i.saleDate === dateFilter);
  const totalSales = filteredImports.reduce((s, i) => s + n(i.totalSales), 0);
  const totalCost = filteredImports.reduce((s, i) => s + n(i.totalCost), 0);
  const totalProfit = filteredImports.reduce((s, i) => s + n(i.totalProfit), 0);
  const totalQuantity = filteredImports.reduce((s, i) => s + n(i.totalQuantity), 0);
  const margin = totalSales > 0 ? totalProfit / totalSales * 100 : 0;
  const daily = Object.values(imports.reduce((map: Record<string, { date: string; sales: number; profit: number; quantity: number }>, item) => { if (!item.saleDate) return map; const cur = map[item.saleDate] || { date: item.saleDate, sales: 0, profit: 0, quantity: 0 }; cur.sales += n(item.totalSales); cur.profit += n(item.totalProfit); cur.quantity += n(item.totalQuantity); map[item.saleDate] = cur; return map; }, {})).sort((a, b) => b.date.localeCompare(a.date));
  const periodStats = Object.values(imports.reduce((map: Record<string, { key: string; sales: number; profit: number; quantity: number }>, item) => { const key = period === "daily" ? item.saleDate : period === "monthly" ? item.saleDate.slice(0, 7) : item.saleDate.slice(0, 4); if (!key) return map; const cur = map[key] || { key, sales: 0, profit: 0, quantity: 0 }; cur.sales += n(item.totalSales); cur.profit += n(item.totalProfit); cur.quantity += n(item.totalQuantity); map[key] = cur; return map; }, {})).sort((a, b) => b.key.localeCompare(a.key));
  const productStats = Object.values(filteredImports.flatMap((i) => i.items || []).reduce((map: Record<string, any>, item: any) => { const id = item.productId || item.barcode || item.productName; const cur = map[id] || { id, name: item.productName || item.sourceName, barcode: item.barcode, quantity: 0, sales: 0, profit: 0 }; cur.quantity += n(item.quantity); cur.sales += n(item.salesAmount); cur.profit += n(item.profitAmount); map[id] = cur; return map; }, {})).sort((a: any, b: any) => b.sales - a.sales);

  const refreshAfterUpload = async (message: string) => { showToast(message); await fetchAll(); await new Promise((resolve) => setTimeout(resolve, 700)); await loadShopSales(); };
  const readFile = async (file?: File) => {
    if (!file) return;
    if (!importDate) { showToast("Avval import sanasini tanlang", "error"); return; }
    if (!effectiveBranchSlug) { showToast("Do'kon branch aniqlanmadi. Import to'xtatildi", "error"); return; }
    if (!/\.xlsx$/i.test(file.name)) { showToast("Faqat Excel .xlsx fayl tanlang", "error"); return; }
    setReading(true);
    try {
      const uploadResult = await uploadShopSalesExcelApi(file, importDate, effectiveBranchSlug);
      if (uploadResult.success) { await refreshAfterUpload("Excel yuborildi. Analysis data yangilandi"); return; }
      const uploadMessage = (uploadResult as any).message || "";
      if (isDuplicateImportMessage(uploadMessage)) { await refreshAfterUpload("Bu Excel avval import qilingan. Analysis qayta yuklandi"); return; }

      const parsedRows = await parseShopWorkbook(file, products);
      const matched = parsedRows.filter((row) => row.productId);
      const unmatched = parsedRows.filter((row) => !row.productId);
      if (!matched.length) throw new Error(parsedRows.length ? "Excel o'qildi, lekin mahsulot shtrix-kodlari Products bilan mos kelmadi" : "Excel ichida savdo ma'lumoti topilmadi");
      const importResult = await importShopSalesApi({ sourceKey: sourceHash(`${file.name}:${file.size}:${file.lastModified}:${importDate}:${effectiveBranchSlug}`), fileName: file.name, saleDate: importDate, rows: matched, skippedRows: unmatched.map((row) => ({ barcode: row.barcode, sourceName: row.sourceName, quantity: row.quantity })), branch: effectiveBranchSlug, branchSlug: effectiveBranchSlug });
      if (importResult.success) { await refreshAfterUpload(`${matched.length} ta mahsulot import qilindi`); return; }
      const importMessage = (importResult as any).message || "Import amalga oshmadi";
      if (isDuplicateImportMessage(importMessage)) { await refreshAfterUpload("Bu Excel avval import qilingan. Analysis qayta yuklandi"); return; }
      throw new Error(importMessage);
    } catch (error: any) { showToast(error?.message || "Excel faylni yuborib bo'lmadi", "error"); }
    finally { setReading(false); }
  };

  return <PageWrap title={<span style={{ display: "flex", alignItems: "center", gap: 10 }}><button className="topbar-control" onClick={() => setTab("dashboard")} title="Dashboardga qaytish"><ArrowLeft size={18} /></button>{selectedBranch?.name || user.branchName} — savdo tahlili</span>} sub="Kunlik, oylik va yillik savdo, foyda hamda sklad harakati" action={canImportExcel ? <label className="btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer", position: "relative", overflow: "hidden" }}><Upload size={17} />{reading ? "Yuborilmoqda..." : "Excel import"}<input aria-label="Excel faylni tanlash" data-testid="shop-sales-excel-input" type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(e) => { void readFile(e.target.files?.[0]); e.target.value = ""; }} disabled={reading} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0, cursor: "pointer" }} /></label> : undefined}>
    <div className="sales-filter-row"><div><div className="form-label" style={{ marginBottom: 6 }}>HISOBOT DAVRI</div><select className="crm-input" value={period} onChange={(e) => setPeriod(e.target.value as any)} style={{ minWidth: 190 }}><option value="daily">Kunlik</option><option value="monthly">Oylik</option><option value="yearly">Yillik</option></select></div><div><div className="form-label" style={{ marginBottom: 6 }}>IMPORT SANASI</div><input className="crm-input" type="date" value={importDate} onChange={(e) => setImportDate(e.target.value)} style={{ minWidth: 190 }} /></div><div><div className="form-label" style={{ marginBottom: 6 }}>DAVR BO'YICHA QIDIRISH</div><select className="crm-input" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} style={{ minWidth: 190 }}><option value="all">Barcha sanalar</option>{daily.map((d) => <option key={d.date} value={d.date}>{fmtDate(`${d.date}T12:00:00`)}</option>)}</select></div><div style={{ fontSize: 12, color: "var(--app-muted)", alignSelf: "end", paddingBottom: 10 }}>{loadingSales ? "Yuklanmoqda..." : `${filteredImports.length} ta import`}</div></div>
    <section className="sales-panel" style={{ marginBottom: 16 }}><div className="sales-panel-head"><div><div className="sales-panel-title">{period === "daily" ? "Kunlik" : period === "monthly" ? "Oylik" : "Yillik"} savdo natijalari</div><div className="sales-panel-sub">{selectedBranch?.name || user.branchName}</div></div></div><div className="table-wrap"><table className="crm-table"><thead><tr><th>Davr</th><th>Savdo</th><th>Foyda</th><th>Sotildi</th></tr></thead><tbody>{periodStats.map((item) => <tr key={item.key}><td style={{ fontWeight: 800 }}>{item.key}</td><td style={{ fontWeight: 900 }}>{fmtKRW(item.sales)}</td><td style={{ fontWeight: 900, color: item.profit >= 0 ? "#28c76f" : "#ea5455" }}>{fmtKRW(item.profit)}</td><td>{fmt(item.quantity)} dona</td></tr>)}{!periodStats.length && <tr><td colSpan={4} style={{ padding: 30, textAlign: "center", color: "var(--app-muted)" }}>Ma'lumot yo'q</td></tr>}</tbody></table></div></section>
    <div className="shop-kpi-grid">{[{ label: "Jami savdo", value: fmtKRW(totalSales), color: "#3b82f6", icon: <TrendingUp size={20} /> }, { label: "Sof foyda", value: fmtKRW(totalProfit), color: totalProfit >= 0 ? "#28c76f" : "#ea5455", icon: <span>₩</span> }, { label: "Foyda marjasi", value: `${margin.toFixed(1)}%`, color: "#7367f0", icon: <span>%</span> }, { label: "Sotilgan", value: `${fmt(totalQuantity)} dona`, color: "#ff9f43", icon: <Package size={20} /> }].map((item) => <div key={item.label} className="sales-kpi"><div className="sales-kpi-icon" style={{ color: item.color, background: `${item.color}16` }}>{item.icon}</div><div><div style={{ fontSize: 11, color: "var(--app-muted)", fontWeight: 700 }}>{item.label}</div><div style={{ fontSize: 18, fontWeight: 900, color: item.color, marginTop: 4 }}>{item.value}</div></div></div>)}</div>
    <div className="shop-sales-layout"><section className="sales-panel"><div className="sales-panel-head"><div><div className="sales-panel-title">Kunlik natija</div><div className="sales-panel-sub">Savdo va foyda dinamikasi</div></div></div><div className="daily-chart">{daily.slice(0, 14).reverse().map((d) => <button key={d.date} className="daily-bar-item" onClick={() => setDateFilter(d.date)} title={`${d.date}: ${fmtKRW(d.sales)}`}><div className="daily-bar-value">{fmt(d.sales)}</div><div className="daily-bar-track"><div className="daily-bar-fill" style={{ height: `${Math.max(8, d.sales / Math.max(1, ...daily.map((x) => x.sales)) * 100)}%` }} /></div><div className="daily-bar-date">{d.date.slice(5).replace("-", "/")}</div></button>)}{!daily.length && <div className="empty-sales"><FileSpreadsheet size={34} /><strong>Hali savdo import qilinmagan</strong><span>Excel faylni yuklang</span></div>}</div></section><section className="sales-panel"><div className="sales-panel-head"><div><div className="sales-panel-title">Importlar tarixi</div><div className="sales-panel-sub">Faqat shu do'kon importlari</div></div></div><div className="import-history">{imports.slice(0, 8).map((item) => <button key={item.id} className="import-history-row" onClick={() => setDetail(item)}><div className="file-square"><FileSpreadsheet size={18} /></div><div style={{ minWidth: 0, flex: 1 }}><div className="history-file">{item.fileName}</div><div className="history-meta">{item.saleDate ? fmtDate(`${item.saleDate}T12:00:00`) : "Sana yo'q"} · {(item.items || []).length} mahsulot</div></div><div style={{ textAlign: "right" }}><div style={{ fontWeight: 900, color: "#28c76f", fontSize: 13 }}>{fmtKRW(item.totalProfit)}</div><div style={{ fontSize: 10, color: "var(--app-muted)" }}>{fmt(item.totalQuantity)} dona</div></div></button>)}{!imports.length && <div style={{ padding: 28, textAlign: "center", color: "var(--app-muted)", fontSize: 13 }}>Importlar yo'q</div>}</div></section></div>
    <section className="sales-panel" style={{ marginTop: 16 }}><div className="sales-panel-head"><div><div className="sales-panel-title">Mahsulotlar bo'yicha savdo</div><div className="sales-panel-sub">Tanlangan davr natijalari</div></div></div><div className="table-wrap"><table className="crm-table"><thead><tr><th>Mahsulot</th><th>Shtrix-kod</th><th>Sotildi</th><th>Savdo</th><th>Foyda</th><th>Do'kon skladi</th></tr></thead><tbody>{productStats.map((item: any) => <tr key={item.id}><td style={{ fontWeight: 800 }}>{item.name}</td><td style={{ fontFamily: "monospace", fontSize: 11, color: "var(--app-muted)" }}>{item.barcode}</td><td>{fmt(item.quantity)}</td><td style={{ fontWeight: 800 }}>{fmtKRW(item.sales)}</td><td style={{ fontWeight: 900, color: item.profit >= 0 ? "#28c76f" : "#ea5455" }}>{fmtKRW(item.profit)}</td><td style={{ fontWeight: 800, color: (shopStock[item.id] || 0) < 0 ? "#ea5455" : "var(--app-text)" }}>{fmt(shopStock[item.id] || 0)}</td></tr>)}{!productStats.length && <tr><td colSpan={6} style={{ padding: 36, textAlign: "center", color: "var(--app-muted)" }}>Tanlangan davrda savdo yo'q</td></tr>}</tbody></table></div></section>
    {detail && <div className="modal-backdrop" onClick={() => setDetail(null)}><div className="modal-card" onClick={(e) => e.stopPropagation()}><div className="modal-title">{detail.saleDate ? fmtDate(`${detail.saleDate}T12:00:00`) : "Import"} savdosi</div><div className="import-summary-grid"><div><span>Savdo</span><strong>{fmtKRW(detail.totalSales)}</strong></div><div><span>Tannarx</span><strong>{fmtKRW(detail.totalCost)}</strong></div><div><span>Foyda</span><strong style={{ color: detail.totalProfit >= 0 ? "#28c76f" : "#ea5455" }}>{fmtKRW(detail.totalProfit)}</strong></div><div><span>Sotildi</span><strong>{fmt(detail.totalQuantity)} dona</strong></div></div><div className="import-preview">{(detail.items || []).map((item: any, index: number) => <div key={`${detail.id}-${item.barcode}-${index}`} className="mapping-row matched"><div><div style={{ fontWeight: 800 }}>{item.productName || item.sourceName}</div><div style={{ fontSize: 11, color: "var(--app-muted)", marginTop: 3 }}>{item.barcode} · {fmt(item.quantity)} dona</div></div><div style={{ textAlign: "right" }}><div style={{ fontWeight: 800 }}>{fmtKRW(item.salesAmount)}</div><div style={{ fontSize: 11, color: item.profitAmount >= 0 ? "#28c76f" : "#ea5455" }}>{fmtKRW(item.profitAmount)} foyda</div></div></div>)}</div><button className="btn-primary" onClick={() => setDetail(null)} style={{ width: "100%" }}>Yopish</button></div></div>}
  </PageWrap>;
}

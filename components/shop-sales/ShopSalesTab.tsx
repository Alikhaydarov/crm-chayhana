"use client";
import { useState } from "react";
import { ArrowLeft, FileSpreadsheet, Package, TrendingUp, Upload } from "lucide-react";
import { PageWrap, Modal } from "@/components/ui";
import { importShopSalesApi, uploadShopSalesExcelApi } from "@/lib/api";
import { fmt, fmtDate, fmtKRW } from "@/lib/utils";
import type { Product, StockMap, TabId, ParsedShopSale } from "@/types";
import type { ShopSaleImport } from "@/types/domain";

function sourceHash(text: string) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

async function parseShopWorkbook(file: File, products: Product[]): Promise<ParsedShopSale[]> {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());
  const ws = workbook.worksheets[0];
  const rows: any[][] = [];
  ws.eachRow({ includeEmpty: true }, (row) => {
    rows.push(Array.from({ length: ws.columnCount }, (_, i) => {
      const cell = row.getCell(i + 1);
      return i === 0 ? cell.text.trim() : cell.value;
    }));
  });
  const headerIndex = rows.findIndex((row, i) => {
    const next = rows[i + 1];
    return i < 10 && Boolean(row?.[0]) && Boolean(next?.[0]) && Number(next?.[6]) > 0 && !Number(row?.[6]);
  });
  if (headerIndex < 0) throw new Error("Excel savdo ustunlari tanilmadi");
  return rows.slice(headerIndex + 1).flatMap((row) => {
    const barcode = String(row?.[0] ?? "").trim();
    const sourceName = String(row?.[1] ?? "").trim();
    const quantity = Number(row?.[6] || 0);
    if (!barcode || !sourceName || quantity <= 0) return [];
    const product = products.find((p) => p.qrCode?.trim() === barcode);
    return [{
      barcode, sourceName,
      supplier: String(row?.[2] ?? "").trim(),
      quantity,
      salesAmount: Number(row?.[16] ?? row?.[3] ?? 0),
      averagePrice: Number(row?.[7] || 0),
      costAmount: Number(row?.[24] || 0),
      profitAmount: Number(row?.[25] || 0),
      productId: product?.id || "",
    }];
  });
}

type Props = {
  products: Product[];
  shopStock: StockMap;
  shopSales: ShopSaleImport[];
  fetchAll: () => void;
  showToast: (msg: string, type?: "success" | "error") => void;
  setTab: (tab: TabId) => void;
};

export function ShopSalesTab({ products, shopStock, shopSales, fetchAll, showToast, setTab }: Props) {
  const [showImport, setShowImport] = useState(false);
  const [rows, setRows] = useState<ParsedShopSale[]>([]);
  const [fileName, setFileName] = useState("");
  const [sourceKey, setSourceKey] = useState("");
  const [importDate, setImportDate] = useState("");
  const [reading, setReading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dateFilter, setDateFilter] = useState("all");
  const [detail, setDetail] = useState<ShopSaleImport | null>(null);

  const imports = shopSales;
  const filteredImports = dateFilter === "all" ? imports : imports.filter((i) => i.saleDate === dateFilter);
  const totalSales = filteredImports.reduce((s, i) => s + i.totalSales, 0);
  const totalCost = filteredImports.reduce((s, i) => s + i.totalCost, 0);
  const totalProfit = filteredImports.reduce((s, i) => s + i.totalProfit, 0);
  const totalQuantity = filteredImports.reduce((s, i) => s + i.totalQuantity, 0);
  const margin = totalSales > 0 ? (totalProfit / totalSales) * 100 : 0;

  const daily = Object.values(
    imports.reduce((map: Record<string, { date: string; sales: number; profit: number; quantity: number }>, item) => {
      const cur = map[item.saleDate] || { date: item.saleDate, sales: 0, profit: 0, quantity: 0 };
      cur.sales += item.totalSales;
      cur.profit += item.totalProfit;
      cur.quantity += item.totalQuantity;
      map[item.saleDate] = cur;
      return map;
    }, {})
  ).sort((a, b) => b.date.localeCompare(a.date));
  const maxDaily = Math.max(1, ...daily.map((d) => d.sales));

  const productStats = Object.values(
    filteredImports.flatMap((i) => i.items).reduce((map: Record<string, any>, item) => {
      const cur = map[item.productId] || { id: item.productId, name: item.productName, barcode: item.barcode, quantity: 0, sales: 0, profit: 0 };
      cur.quantity += item.quantity;
      cur.sales += item.salesAmount;
      cur.profit += item.profitAmount;
      map[item.productId] = cur;
      return map;
    }, {})
  ).sort((a, b) => b.sales - a.sales);

  const matchedRows = rows.filter((r) => r.productId);
  const unmatchedRows = rows.filter((r) => !r.productId);
  const matchedSales = matchedRows.reduce((s, r) => s + r.salesAmount, 0);

  const resetImport = () => { setRows([]); setFileName(""); setSourceKey(""); setShowImport(false); };

  const readFile = async (file?: File) => {
    if (!file) return;
    if (!importDate) { showToast("Avval import sanasini tanlang", "error"); return; }
    if (!/\.xlsx$/i.test(file.name)) { showToast("Faqat Excel .xlsx fayl tanlang", "error"); return; }
    setReading(true);
    try {
      const result = await uploadShopSalesExcelApi(file, importDate);
      if (!result.success) throw new Error((result as any).message || "Excel import amalga oshmadi");
      showToast("Excel yuklandi va savdo tahlili yangilandi");
      await fetchAll();
    } catch (err: any) {
      showToast(err?.message || "Excel faylni o'qib bo'lmadi", "error");
    } finally {
      setReading(false);
    }
  };

  const submitImport = async () => {
    if (!importDate) { showToast("Import sanasini tanlang", "error"); return; }
    if (!matchedRows.length) { showToast("Mos shtrix-kod topilmadi", "error"); return; }
    setSaving(true);
    const result = await importShopSalesApi({
      sourceKey, fileName, saleDate: importDate,
      rows: matchedRows,
      skippedRows: unmatchedRows.map((r) => ({ barcode: r.barcode, sourceName: r.sourceName, quantity: r.quantity })),
    });
    if (result.success) {
      showToast(`${matchedRows.length} ta mahsulot skladdan ayrildi${unmatchedRows.length ? `, ${unmatchedRows.length} ta topilmadi` : ""}`);
      resetImport(); fetchAll();
    } else showToast((result as any).message || "Import amalga oshmadi", "error");
    setSaving(false);
  };

  return (
    <PageWrap
      title={
        <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button className="topbar-control" onClick={() => setTab("dashboard")} title="Dashboardga qaytish">
            <ArrowLeft size={18} />
          </button>
          Do'kon savdo tahlili
        </span>
      }
      sub="Excel savdolar, foyda va sklad harakati"
      action={
        <label className="btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
          <Upload size={17} />{reading ? "O'qilmoqda..." : "Excel import"}
          <input type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(e) => readFile(e.target.files?.[0])} disabled={reading} style={{ display: "none" }} />
        </label>
      }
    >
      {/* Date filters */}
      <div className="sales-filter-row">
        <div>
          <div className="form-label" style={{ marginBottom: 6 }}>IMPORT SANASI</div>
          <input className="crm-input" type="date" value={importDate} onChange={(e) => setImportDate(e.target.value)} style={{ minWidth: 190 }} />
        </div>
        <div>
          <div className="form-label" style={{ marginBottom: 6 }}>DAVR BO'YICHA QIDIRISH</div>
          <select className="crm-input" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} style={{ minWidth: 190 }}>
            <option value="all">Barcha sanalar</option>
            {daily.map((d) => <option key={d.date} value={d.date}>{fmtDate(`${d.date}T12:00:00`)}</option>)}
          </select>
        </div>
        <div style={{ fontSize: 12, color: "var(--app-muted)", alignSelf: "end", paddingBottom: 10 }}>
          {filteredImports.length} ta import
        </div>
      </div>

      {/* KPI cards */}
      <div className="shop-kpi-grid">
        {[
          { label: "Jami savdo", value: fmtKRW(totalSales), color: "#3b82f6", icon: <TrendingUp size={20} /> },
          { label: "Sof foyda", value: fmtKRW(totalProfit), color: totalProfit >= 0 ? "#28c76f" : "#ea5455", icon: <span>₩</span> },
          { label: "Foyda marjasi", value: `${margin.toFixed(1)}%`, color: "#7367f0", icon: <span>%</span> },
          { label: "Sotilgan", value: `${fmt(totalQuantity)} dona`, color: "#ff9f43", icon: <Package size={20} /> },
        ].map((item) => (
          <div key={item.label} className="sales-kpi">
            <div className="sales-kpi-icon" style={{ color: item.color, background: `${item.color}16` }}>{item.icon}</div>
            <div>
              <div style={{ fontSize: 11, color: "var(--app-muted)", fontWeight: 700 }}>{item.label}</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: item.color, marginTop: 4 }}>{item.value}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="shop-sales-layout">
        {/* Daily chart */}
        <section className="sales-panel">
          <div className="sales-panel-head">
            <div>
              <div className="sales-panel-title">Kunlik natija</div>
              <div className="sales-panel-sub">Savdo va foyda dinamikasi</div>
            </div>
          </div>
          <div className="daily-chart">
            {daily.slice(0, 14).reverse().map((d) => (
              <button key={d.date} className="daily-bar-item" onClick={() => setDateFilter(d.date)} title={`${d.date}: ${fmtKRW(d.sales)}`}>
                <div className="daily-bar-value">{fmt(d.sales)}</div>
                <div className="daily-bar-track">
                  <div className="daily-bar-fill" style={{ height: `${Math.max(8, (d.sales / maxDaily) * 100)}%` }} />
                </div>
                <div className="daily-bar-date">{d.date.slice(5).replace("-", "/")}</div>
              </button>
            ))}
            {!daily.length && (
              <div className="empty-sales">
                <FileSpreadsheet size={34} />
                <strong>Hali savdo import qilinmagan</strong>
                <span>Excel faylni yuklang</span>
              </div>
            )}
          </div>
        </section>

        {/* Import history */}
        <section className="sales-panel">
          <div className="sales-panel-head">
            <div>
              <div className="sales-panel-title">Importlar tarixi</div>
              <div className="sales-panel-sub">Skladga qo'llangan fayllar</div>
            </div>
          </div>
          <div className="import-history">
            {imports.slice(0, 8).map((item) => (
              <button key={item.id} className="import-history-row" onClick={() => setDetail(item)}>
                <div className="file-square"><FileSpreadsheet size={18} /></div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="history-file">{item.fileName}</div>
                  <div className="history-meta">{fmtDate(`${item.saleDate}T12:00:00`)} · {item.items.length} mahsulot</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 900, color: "#28c76f", fontSize: 13 }}>{fmtKRW(item.totalProfit)}</div>
                  <div style={{ fontSize: 10, color: "var(--app-muted)" }}>{fmt(item.totalQuantity)} dona</div>
                </div>
              </button>
            ))}
            {!imports.length && (
              <div style={{ padding: 28, textAlign: "center", color: "var(--app-muted)", fontSize: 13 }}>Importlar yo'q</div>
            )}
          </div>
        </section>
      </div>

      {/* Products table */}
      <section className="sales-panel" style={{ marginTop: 16 }}>
        <div className="sales-panel-head">
          <div>
            <div className="sales-panel-title">Mahsulotlar bo'yicha savdo</div>
            <div className="sales-panel-sub">Tanlangan davr natijalari</div>
          </div>
        </div>
        <div className="table-wrap">
          <table className="crm-table">
            <thead>
              <tr><th>Mahsulot</th><th>Shtrix-kod</th><th>Sotildi</th><th>Savdo</th><th>Foyda</th><th>Do'kon skladi</th></tr>
            </thead>
            <tbody>
              {productStats.map((item) => (
                <tr key={item.id}>
                  <td style={{ fontWeight: 800 }}>{item.name}</td>
                  <td style={{ fontFamily: "monospace", fontSize: 11, color: "var(--app-muted)" }}>{item.barcode}</td>
                  <td>{fmt(item.quantity)}</td>
                  <td style={{ fontWeight: 800 }}>{fmtKRW(item.sales)}</td>
                  <td style={{ fontWeight: 900, color: item.profit >= 0 ? "#28c76f" : "#ea5455" }}>{fmtKRW(item.profit)}</td>
                  <td style={{ fontWeight: 800, color: (shopStock[item.id] || 0) < 0 ? "#ea5455" : "var(--app-text)" }}>{fmt(shopStock[item.id] || 0)}</td>
                </tr>
              ))}
              {!productStats.length && (
                <tr><td colSpan={6} style={{ padding: 36, textAlign: "center", color: "var(--app-muted)" }}>Tanlangan davrda savdo yo'q</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Import preview modal */}
      {showImport && (
        <Modal onClose={resetImport}>
          <div className="modal-title" style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <FileSpreadsheet size={20} /> Excel importni tekshirish
          </div>
          <div className="import-summary-grid">
            <div><span>Fayl</span><strong title={fileName}>{fileName}</strong></div>
            <div><span>Savdo sanasi</span><strong>{fmtDate(`${importDate}T12:00:00`)}</strong></div>
            <div><span>Topildi</span><strong style={{ color: "#28c76f" }}>{matchedRows.length} ta</strong></div>
            <div><span>Topilmadi</span><strong style={{ color: unmatchedRows.length ? "#ea5455" : "#28c76f" }}>{unmatchedRows.length} ta</strong></div>
          </div>
          <div className="import-preview">
            {rows.map((row, i) => {
              const product = products.find((p) => p.id === row.productId);
              return (
                <div key={`${row.barcode}-${i}`} className={`mapping-row${row.productId ? " matched" : " unresolved"}`}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.sourceName}</div>
                    <div style={{ fontFamily: "monospace", fontSize: 11, color: "var(--app-muted)", marginTop: 3 }}>{row.barcode} · {fmt(row.quantity)} dona</div>
                  </div>
                  <div style={{ fontWeight: 800, textAlign: "right" }}>{fmtKRW(row.salesAmount)}</div>
                  <div className="barcode-match-status" style={{ color: product ? "#28c76f" : "#ea5455" }}>
                    {product ? `✓ ${product.name}` : "Topilmadi · skladga ta'sir qilmaydi"}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="import-warning">
            Faqat shtrix-kodi bazadagi mahsulot bilan aynan mos kelgan qatorlar Do'kon skladidan ayiriladi.
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn-ghost" onClick={resetImport} style={{ flex: 1 }}>Bekor</button>
            <button className="btn-primary" onClick={submitImport} disabled={saving || !importDate || !matchedRows.length} style={{ flex: 2 }}>
              {saving ? "Saqlanmoqda..." : `Import qilish · ${matchedRows.length} mahsulot · ${fmtKRW(matchedSales)}`}
            </button>
          </div>
        </Modal>
      )}

      {/* Detail modal */}
      {detail && (
        <Modal onClose={() => setDetail(null)}>
          <div className="modal-title">{fmtDate(`${detail.saleDate}T12:00:00`)} savdosi</div>
          <div className="import-summary-grid">
            <div><span>Savdo</span><strong>{fmtKRW(detail.totalSales)}</strong></div>
            <div><span>Tannarx</span><strong>{fmtKRW(detail.totalCost)}</strong></div>
            <div><span>Foyda</span><strong style={{ color: detail.totalProfit >= 0 ? "#28c76f" : "#ea5455" }}>{fmtKRW(detail.totalProfit)}</strong></div>
            <div><span>Sotildi</span><strong>{fmt(detail.totalQuantity)} dona</strong></div>
          </div>
          {!!detail.skippedRows?.length && (
            <div className="import-warning">{detail.skippedRows.length} ta shtrix-kod bazada topilmagan.</div>
          )}
          <div className="import-preview">
            {detail.items.map((item) => (
              <div key={`${detail.id}-${item.barcode}`} className="mapping-row matched">
                <div>
                  <div style={{ fontWeight: 800 }}>{item.productName}</div>
                  <div style={{ fontSize: 11, color: "var(--app-muted)", marginTop: 3 }}>{item.barcode} · {fmt(item.quantity)} dona</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 800 }}>{fmtKRW(item.salesAmount)}</div>
                  <div style={{ fontSize: 11, color: item.profitAmount >= 0 ? "#28c76f" : "#ea5455" }}>{fmtKRW(item.profitAmount)} foyda</div>
                </div>
                <div style={{ textAlign: "right", fontSize: 12, color: item.shortage > 0 ? "#ea5455" : "var(--app-muted)" }}>
                  Sklad {fmt(item.stockBefore)} → {fmt(item.stockAfter)}
                </div>
              </div>
            ))}
          </div>
          <button className="btn-primary" onClick={() => setDetail(null)} style={{ width: "100%" }}>Yopish</button>
        </Modal>
      )}
    </PageWrap>
  );
}

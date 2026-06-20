import { Buffer } from "node:buffer";
import { NextRequest, NextResponse } from "next/server";

const DEFAULT_BACKEND_URL =
  "https://remedial-coral-dispatch.ngrok-free.dev/api/v1";

const EXCEL_FILE_FIELDS = ["file", "excel", "excel_file"] as const;

function listFrom(data: any) {
  const value = data?.data?.results ?? data?.data?.items ?? data?.results ?? data?.items ?? data?.data ?? data;
  return Array.isArray(value) ? value : [];
}

async function shopSalesUploadBody(request: NextRequest) {
  const incoming = await request.formData();
  const uploaded = EXCEL_FILE_FIELDS
    .map((field) => incoming.get(field))
    .find((value): value is File => value instanceof File && value.size > 0);

  if (!uploaded) throw new Error("Excel fayl brauzerdan bo'sh yuborildi");

  const outgoing = new FormData();
  incoming.forEach((value, key) => {
    if (!EXCEL_FILE_FIELDS.includes(key as (typeof EXCEL_FILE_FIELDS)[number])) outgoing.append(key, value);
  });
  for (const field of EXCEL_FILE_FIELDS) outgoing.append(field, uploaded, uploaded.name);
  outgoing.set("file_name", uploaded.name);
  outgoing.set("filename", uploaded.name);

  return { body: outgoing, file: uploaded, fields: incoming };
}

async function parsePosExcel(file: File, products: any[]) {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(Buffer.from(await file.arrayBuffer()));
  const worksheet = workbook.worksheets.find((sheet) => sheet.actualRowCount > 2) ?? workbook.worksheets[0];
  if (!worksheet) return [];

  const productByBarcode = new Map<string, any>();
  products.forEach((product) => {
    const barcode = String(product?.qrCode ?? product?.qr_code ?? product?.barcode ?? "").trim();
    if (barcode) productByBarcode.set(barcode, product);
  });

  const rows: any[] = [];
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber <= 2) return;
    const cells = row.values as any[];
    const barcode = String(cells[1] ?? "").trim();
    const sourceName = String(cells[2] ?? "").trim();
    const quantity = Number(cells[7] ?? 0);
    if (!barcode || !sourceName || !Number.isFinite(quantity) || quantity <= 0) return;
    const product = productByBarcode.get(barcode);
    rows.push({
      barcode,
      sourceName,
      source_name: sourceName,
      supplier: String(cells[3] ?? "").trim(),
      quantity,
      averagePrice: Number(cells[8] ?? 0) || 0,
      average_price: Number(cells[8] ?? 0) || 0,
      salesAmount: Number(cells[17] ?? cells[4] ?? 0) || 0,
      sales_amount: Number(cells[17] ?? cells[4] ?? 0) || 0,
      costAmount: Number(cells[25] ?? 0) || 0,
      cost_amount: Number(cells[25] ?? 0) || 0,
      profitAmount: Number(cells[26] ?? 0) || 0,
      profit_amount: Number(cells[26] ?? 0) || 0,
      productId: product?.external_id ?? product?.externalId ?? product?.id ?? "",
      product_id: product?.external_id ?? product?.externalId ?? product?.id ?? "",
    });
  });
  return rows;
}

async function importParsedPosExcel(baseUrl: string, headers: Headers, file: File, fields: FormData) {
  const productsResponse = await fetch(`${baseUrl}/products/?page_size=1000`, { headers, cache: "no-store" });
  const productsData = await productsResponse.json().catch(() => ([]));
  const rows = await parsePosExcel(file, listFrom(productsData));
  if (!rows.length) throw new Error("Excel ichida sotuv qatorlari topilmadi");

  const saleDate = String(fields.get("sale_date") ?? fields.get("saleDate") ?? "");
  const branchSlug = String(
    fields.get("branch_slug") ?? fields.get("branch") ??
    fields.get("warehouse_slug") ?? fields.get("warehouse") ?? "",
  );
  const sourceKey = `${file.name}:${file.size}:${saleDate}:${branchSlug}`;
  const skippedRows = rows
    .filter((row) => !row.productId)
    .map((row) => ({ barcode: row.barcode, sourceName: row.sourceName, quantity: row.quantity }));
  const matchedRows = rows.filter((row) => row.productId);
  if (!matchedRows.length) throw new Error("Excel o'qildi, lekin shtrix-kodlar CRM mahsulotlariga mos kelmadi");

  const importHeaders = new Headers(headers);
  importHeaders.set("content-type", "application/json");
  const payload = {
    sourceKey,
    source_key: sourceKey,
    fileName: file.name,
    file_name: file.name,
    saleDate,
    sale_date: saleDate,
    branch: branchSlug,
    branch_slug: branchSlug,
    warehouse: branchSlug,
    warehouse_slug: branchSlug,
    rows: matchedRows,
    skippedRows,
    skipped_rows: skippedRows,
    deduct_stock: true,
    deductStock: true,
  };
  return fetch(`${baseUrl}/shop-sales/import_sales/`, {
    method: "POST",
    headers: importHeaders,
    body: JSON.stringify(payload),
    cache: "no-store",
  });
}

async function forward(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const routePath = path.join("/");
  const baseUrl = (process.env.DJANGO_API_BASE_URL || DEFAULT_BACKEND_URL).replace(/\/$/, "");
  const target = new URL(`${baseUrl}/${routePath}/`);
  request.nextUrl.searchParams.forEach((value, key) => target.searchParams.append(key, value));

  const headers = new Headers();
  const authorization = request.headers.get("authorization");
  const contentType = request.headers.get("content-type");
  const acceptLanguage = request.headers.get("accept-language");
  const isShopSalesUpload = request.method === "POST" && routePath === "shop-sales/upload";
  if (authorization) headers.set("authorization", authorization);
  if (contentType && !isShopSalesUpload) headers.set("content-type", contentType);
  if (acceptLanguage) headers.set("accept-language", acceptLanguage);
  headers.set("accept", "application/json");
  headers.set("ngrok-skip-browser-warning", "true");

  try {
    const upload = isShopSalesUpload ? await shopSalesUploadBody(request) : null;
    const body = request.method === "GET" || request.method === "HEAD"
      ? undefined
      : upload?.body ?? await request.arrayBuffer();

    let response = await fetch(target, { method: request.method, headers, body, cache: "no-store" });

    if (upload && !response.ok) {
      const errorText = await response.clone().text();
      if (/bo['‘’]?sh|empty|no data|qator.*topilmadi|row.*not found/i.test(errorText)) {
        response = await importParsedPosExcel(baseUrl, headers, upload.file, upload.fields);
      }
    }

    if (response.status >= 500) {
      console.error("[django-proxy] Backend request failed", { method: request.method, path: routePath, status: response.status });
    }
    const responseHeaders = new Headers();
    const responseContentType = response.headers.get("content-type");
    if (responseContentType) responseHeaders.set("content-type", responseContentType);
    return new NextResponse(response.body, { status: response.status, headers: responseHeaders });
  } catch (error) {
    console.error("[django-proxy] Backend is unreachable", {
      method: request.method,
      path: routePath,
      error: error instanceof Error ? error.message : String(error),
    });
    const message = error instanceof Error ? error.message : "Backend server bilan bog'lanib bo'lmadi";
    const clientError = /Excel|shtrix-kod|sotuv qatorlari/i.test(message);
    return NextResponse.json({ success: false, message }, { status: clientError ? 400 : 502 });
  }
}

export const GET = forward;
export const POST = forward;
export const PUT = forward;
export const PATCH = forward;
export const DELETE = forward;
export const OPTIONS = forward;

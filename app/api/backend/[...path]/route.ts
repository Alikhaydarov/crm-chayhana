import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { hash } from "bcryptjs";
import type { Role } from "@/types";

export const runtime = "nodejs";
export const preferredRegion = "icn1";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const AUTH_SECRET = process.env.AUTH_SECRET;
const MAX_LIST_ROWS = 500;
const MAX_PAYMENT_RECEIPT_BYTES = 5 * 1024 * 1024;
const MAX_DAMAGE_IMAGE_BYTES = 10 * 1024 * 1024;
const ACCESS_TOKEN_TTL = 15 * 60;
const REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60;

type AppUser = { id: string; name: string; role: Role; branchName: string; branchIcon: string };

const branchNames: Record<Role, string> = {
  superadmin: "Bosh Admin",
  restaurant1: "Oshxona-1",
  restaurant2: "Oshxona-2",
  shop: "Do'kon",
};

const branchIcons: Record<Role, string> = {
  superadmin: "M",
  restaurant1: "R1",
  restaurant2: "R2",
  shop: "S",
};

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

function envMissing() {
  return json(
    {
      success: false,
      message: "Server sozlanmagan. SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY va AUTH_SECRET env qiymatlarini kiriting.",
    },
    500,
  );
}

function apiUrl(table: string, query = "") {
  return `${SUPABASE_URL!.replace(/\/$/, "")}/rest/v1/${table}${query}`;
}

async function sb<T>(table: string, init: RequestInit = {}, query = ""): Promise<T> {
  if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error("Supabase env missing");
  const headers = new Headers(init.headers);
  headers.set("apikey", SUPABASE_KEY);
  headers.set("authorization", `Bearer ${SUPABASE_KEY}`);
  headers.set("accept", "application/json");
  if (init.body && !headers.has("content-type")) headers.set("content-type", "application/json");
  const response = await fetch(apiUrl(table, query), { ...init, headers, cache: "no-store" });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(data?.message || data?.hint || data?.details || `Supabase ${response.status}`);
  return data as T;
}

async function rpc<T>(name: string, body: Record<string, unknown>): Promise<T> {
  return sb<T>(`rpc/${name}`, { method: "POST", body: JSON.stringify(body) });
}

async function readBody(request: NextRequest) {
  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("multipart/form-data")) return {};
  const text = await request.text();
  if (Buffer.byteLength(text, "utf8") > 4 * 1024 * 1024) throw new Error("So'rov hajmi juda katta");
  return text ? JSON.parse(text) : {};
}

async function removeStorageObject(bucket: string, path: string) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return;
  await fetch(`${SUPABASE_URL.replace(/\/$/, "")}/storage/v1/object/${bucket}/${path}`, {
    method: "DELETE",
    headers: { apikey: SUPABASE_KEY, authorization: `Bearer ${SUPABASE_KEY}` },
    cache: "no-store",
  }).catch(() => null);
}

const paymentReceiptTypes: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const stockBranches = ["main", "restaurant1", "restaurant2", "shop"] as const;
const requestBranches = ["restaurant1", "restaurant2", "shop"] as const;
const damageImageTypes = paymentReceiptTypes;

type PaymentReceiptUpload = {
  paymentId: string;
  path: string;
  name: string;
  type: string;
  size: number;
  userId: string;
  exp: number;
};

function signPaymentReceiptUpload(payload: PaymentReceiptUpload) {
  if (!AUTH_SECRET) throw new Error("AUTH_SECRET env missing");
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = createHmac("sha256", AUTH_SECRET).update(`payment-receipt.${encoded}`).digest("base64url");
  return `${encoded}.${signature}`;
}

type DamageImageUpload = {
  requestId: string;
  path: string;
  name: string;
  type: string;
  size: number;
  userId: string;
  exp: number;
};

function signDamageImageUpload(payload: DamageImageUpload) {
  if (!AUTH_SECRET) throw new Error("AUTH_SECRET env missing");
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = createHmac("sha256", AUTH_SECRET).update(`damage-image.${encoded}`).digest("base64url");
  return `${encoded}.${signature}`;
}

function verifyDamageImageUpload(value: unknown, user: AppUser): DamageImageUpload | null {
  if (!AUTH_SECRET || typeof value !== "string") return null;
  try {
    const [encoded, signature] = value.split(".");
    if (!encoded || !signature) return null;
    const expected = createHmac("sha256", AUTH_SECRET).update(`damage-image.${encoded}`).digest();
    const actual = Buffer.from(signature, "base64url");
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as DamageImageUpload;
    const extension = damageImageTypes[payload.type];
    if (
      payload.userId !== user.id
      || payload.exp <= Math.floor(Date.now() / 1000)
      || payload.size <= 0
      || payload.size > MAX_DAMAGE_IMAGE_BYTES
      || !extension
      || !payload.path.startsWith(`${payload.requestId}/`)
      || !payload.path.endsWith(`.${extension}`)
    ) return null;
    return payload;
  } catch {
    return null;
  }
}

function verifyPaymentReceiptUpload(value: unknown, user: AppUser): PaymentReceiptUpload | null {
  if (!AUTH_SECRET || typeof value !== "string") return null;
  try {
    const [encoded, signature] = value.split(".");
    if (!encoded || !signature) return null;
    const expected = createHmac("sha256", AUTH_SECRET).update(`payment-receipt.${encoded}`).digest();
    const actual = Buffer.from(signature, "base64url");
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as PaymentReceiptUpload;
    const extension = paymentReceiptTypes[payload.type];
    if (
      payload.userId !== user.id
      || payload.exp <= Math.floor(Date.now() / 1000)
      || payload.size <= 0
      || payload.size > MAX_PAYMENT_RECEIPT_BYTES
      || !extension
      || !payload.path.startsWith(`${payload.paymentId}/`)
      || !payload.path.endsWith(`.${extension}`)
    ) return null;
    return payload;
  } catch {
    return null;
  }
}

async function removeUnlinkedPaymentReceipt(upload: PaymentReceiptUpload) {
  const existing = await sb<any[]>("company_payments", {}, `?select=id&id=eq.${encodeURIComponent(upload.paymentId)}&limit=1`);
  if (!existing.length) await removeStorageObject("payflow-receipts", upload.path);
}

async function storageRequest(path: string, init: RequestInit = {}) {
  if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error("Supabase env missing");
  const headers = new Headers(init.headers);
  headers.set("apikey", SUPABASE_KEY);
  headers.set("authorization", `Bearer ${SUPABASE_KEY}`);
  if (init.body) headers.set("content-type", "application/json");
  const response = await fetch(`${SUPABASE_URL.replace(/\/$/, "")}/storage/v1${path}`, { ...init, headers, cache: "no-store" });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.message || data?.error || "Storage xatosi");
  return data;
}

async function readOrderFile(request: NextRequest, field: "receipt") {
  const form = await request.formData();
  const file = form.get(field) ?? form.get("files");
  if (!(file instanceof File)) throw new Error("Chek fayli topilmadi");
  if (!file.type.startsWith("image/") && file.type !== "application/pdf") throw new Error("Fayl faqat rasm yoki PDF bo'lishi kerak");
  if (file.size > 2 * 1024 * 1024) throw new Error("Fayl 2 MB dan kichik bo'lishi kerak");
  const dataUrl = `data:${file.type};base64,${Buffer.from(await file.arrayBuffer()).toString("base64")}`;
  return { orderId: String(form.get("orderId") || ""), file: { name: file.name.slice(0, 180), type: file.type, dataUrl } };
}

function encodeToken(user: AppUser, type: "access" | "refresh") {
  if (!AUTH_SECRET) throw new Error("AUTH_SECRET env missing");
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(JSON.stringify({ ...user, type, iat: now, exp: now + (type === "access" ? ACCESS_TOKEN_TTL : REFRESH_TOKEN_TTL) }), "utf8").toString("base64url");
  const signature = createHmac("sha256", AUTH_SECRET).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

function decodeToken(value?: string | null, expectedType: "access" | "refresh" = "access"): AppUser | null {
  if (!value) return null;
  try {
    if (!AUTH_SECRET) return null;
    const [payload, signature] = value.replace(/^Bearer\s+/i, "").split(".");
    if (!payload || !signature) return null;
    const expected = createHmac("sha256", AUTH_SECRET).update(payload).digest();
    const actual = Buffer.from(signature, "base64url");
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (data.type !== expectedType || Number(data.exp) <= Math.floor(Date.now() / 1000)) return null;
    if (!Object.prototype.hasOwnProperty.call(branchNames, data.role)) return null;
    return {
      id: String(data.id),
      name: String(data.name),
      role: data.role,
      branchName: data.branchName || branchNames[data.role as Role],
      branchIcon: data.branchIcon || branchIcons[data.role as Role],
    };
  } catch {
    return null;
  }
}

function requireRole(user: AppUser, roles: Role[]) {
  if (!roles.includes(user.role)) throw new Error("Ruxsat yo'q");
}

function authUser(request: NextRequest) {
  const user = decodeToken(request.headers.get("authorization"));
  if (!user) throw new Error("Avtorizatsiya kerak");
  return user;
}

function errorStatus(message: string) {
  if (message === "Avtorizatsiya kerak") return 401;
  if (message === "Ruxsat yo'q" || message.includes("ruxsat yo'q")) return 403;
  if (/fayli topilmadi/i.test(message)) return 400;
  if (/topilmadi/i.test(message)) return 404;
  if (/duplicate key|unique constraint|already exists|avval import/i.test(message)) return 409;
  if (/noto'g'ri|kerak|kichik bo'lishi|katta|yo'q|musbat|yetarli/i.test(message)) return 400;
  return 500;
}

function toProduct(row: any) {
  return {
    id: row.id,
    name: row.name,
    category: row.category || "boshqa",
    unit: row.unit || "dona",
    minStock: Number(row.min_stock || 0),
    pricePerUnit: Number(row.price_per_unit || 0),
    perBox: Number(row.per_box || 0),
    boxUnit: row.box_unit || "",
    qrCode: row.qr_code || "",
    supplierId: row.supplier_id || "",
  };
}

function productRow(data: any) {
  return {
    id: data.id || crypto.randomUUID(),
    name: data.name,
    category: data.category || "boshqa",
    unit: data.unit || "dona",
    min_stock: Number(data.minStock || 0),
    price_per_unit: Number(data.pricePerUnit || 0),
    per_box: Number(data.perBox || 0),
    box_unit: data.boxUnit || "",
    qr_code: data.qrCode || null,
    supplier_id: data.supplierId || null,
  };
}

function toStock(rows: any[]) {
  return Object.fromEntries(rows.map((row) => [String(row.product_id), Number(row.quantity || 0)]));
}

async function products() {
  return (await sb<any[]>("products", {}, `?select=*&order=name.asc&limit=${MAX_LIST_ROWS}`)).map(toProduct);
}

async function stock(branch = "main") {
  const rows = await sb<any[]>("stock", {}, `?select=product_id,quantity&branch=eq.${encodeURIComponent(branch)}`);
  return toStock(rows);
}

async function companyForUser(user: AppUser, companyId: string) {
  const [company] = await sb<any[]>("companies", {}, `?select=*&id=eq.${encodeURIComponent(companyId)}&limit=1`);
  if (!company) throw new Error("Firma topilmadi");
  if (user.role === "shop" || (user.role !== "superadmin" && company.branch !== user.role)) {
    throw new Error("Firma uchun ruxsat yo'q");
  }
  return company;
}

function mapOrder(row: any) {
  return {
    id: row.id,
    companyId: row.company_id,
    companyName: row.company_name || "",
    items: row.items || [],
    totalPrice: Number(row.total_price || 0),
    paidAmount: Number(row.paid_amount || 0),
    payStatus: row.pay_status,
    note: row.note || "",
    receipt: row.receipt || undefined,
    productDocument: row.items?.find?.((item: any) => item?.orderDocument)?.orderDocument || undefined,
    orderDate: row.order_date || "",
    createdAt: row.created_at,
  };
}

async function snapshot(user: AppUser) {
  const branchFilter = encodeURIComponent(user.role);
  const transferQuery = user.role === "superadmin"
    ? `?select=*&order=created_at.desc&limit=${MAX_LIST_ROWS}`
    : `?select=*&or=(to_branch.eq.${branchFilter},from_branch.eq.${branchFilter})&order=created_at.desc&limit=${MAX_LIST_ROWS}`;
  const damageQuery = user.role === "superadmin"
    ? `?select=*&order=created_at.desc&limit=${MAX_LIST_ROWS}`
    : `?select=*&branch=eq.${branchFilter}&order=created_at.desc&limit=${MAX_LIST_ROWS}`;
  const companyQuery = user.role === "superadmin"
    ? `?select=*&order=created_at.desc&limit=${MAX_LIST_ROWS}`
    : `?select=*&branch=eq.${branchFilter}&order=created_at.desc&limit=${MAX_LIST_ROWS}`;
  const orderQuery = user.role === "superadmin"
    ? `?select=*&order=created_at.desc&limit=${MAX_LIST_ROWS}`
    : `?select=*&branch=eq.${branchFilter}&order=created_at.desc&limit=${MAX_LIST_ROWS}`;
  const staffQuery = user.role === "superadmin"
    ? `?select=*&order=name.asc&limit=${MAX_LIST_ROWS}`
    : `?select=*&branch=eq.${branchFilter}&order=name.asc&limit=${MAX_LIST_ROWS}`;
  const [
    productList,
    mainStock,
    shopStock,
    transfers,
    damages,
    companies,
    orders,
    staff,
    suppliers,
    shopSales,
  ] = await Promise.all([
    products(),
    stock(user.role === "superadmin" ? "main" : user.role),
    user.role === "superadmin" || user.role === "shop" ? stock("shop") : Promise.resolve({}),
    sb<any[]>("transfers", {}, transferQuery),
    sb<any[]>("damaged_requests", {}, damageQuery).catch(() => []),
    user.role === "shop" ? Promise.resolve([]) : sb<any[]>("companies", {}, companyQuery),
    user.role === "shop" ? Promise.resolve([]) : sb<any[]>("orders", {}, orderQuery),
    sb<any[]>("staff", {}, staffQuery),
    sb<any[]>("suppliers", {}, `?select=*&order=created_at.desc&limit=${MAX_LIST_ROWS}`).catch(() => []),
    user.role === "restaurant1" || user.role === "restaurant2"
      ? Promise.resolve([])
      : sb<any[]>("shop_sales", {}, `?select=*&order=sale_date.desc&limit=${MAX_LIST_ROWS}`),
  ]);

  const companyIds = companies.map((company) => String(company.id));
  const payments = user.role === "shop" || (user.role !== "superadmin" && companyIds.length === 0)
    ? []
    : await sb<any[]>("company_payments", {}, user.role === "superadmin"
      ? `?select=*&order=created_at.desc&limit=${MAX_LIST_ROWS}`
      : `?select=*&company_id=in.(${companyIds.join(",")})&order=created_at.desc&limit=${MAX_LIST_ROWS}`);

  const warehouseStocks = user.role === "superadmin"
    ? Object.fromEntries(await Promise.all((["restaurant1", "restaurant2", "shop"] as Role[]).map(async (branch) => [branch, branch === "shop" ? shopStock : await stock(branch)])))
    : { [user.role]: mainStock };
  const stockSummary = (stockMap: Record<string, number>) => {
    const entries = Object.entries(stockMap);
    return {
      stockValue: entries.reduce((sum, [productId, quantity]) => sum + quantity * Number(productList.find((product) => product.id === productId)?.pricePerUnit || 0), 0),
      lowStockCount: entries.filter(([productId, quantity]) => quantity <= Number(productList.find((product) => product.id === productId)?.minStock || 0)).length,
      productCount: entries.filter(([, quantity]) => quantity > 0).length,
    };
  };
  const mainSummary = stockSummary(mainStock);
  const adminAccounts = user.role === "superadmin" ? await sb<any[]>("admin_users", {}, "?select=id,user_id,name,role,branch_name,branch_icon,active&role=neq.superadmin&order=role.asc") : [];

  return {
    products: productList,
    stock: mainStock,
    shopStock,
    transfers: transfers.map((tr) => ({
      id: tr.id,
      fromBranch: tr.from_branch || "main",
      toBranch: tr.to_branch,
      items: tr.items || [],
      totalValue: Number(tr.total_value || 0),
      requestedBy: tr.requested_by,
      approvedBy: tr.approved_by || "",
      sentItems: tr.sent_items || [],
      receivedItems: tr.received_items || [],
      receivedBy: tr.received_by || "",
      receivedAt: tr.received_at || "",
      status: tr.status,
      note: tr.note || "",
      createdAt: tr.created_at,
      updatedAt: tr.updated_at,
    })),
    damages: damages.map(mapDamage),
    reports: {
      totalProducts: productList.length,
      mainStockValue: mainSummary.stockValue,
      mainLowStockCount: mainSummary.lowStockCount,
      mainProductCount: mainSummary.productCount,
      branchStats: (["restaurant1", "restaurant2", "shop"] as Role[]).map((branch) => ({
        branch,
        ...stockSummary(warehouseStocks[branch] || {}),
      })),
    },
    companies: companies.map((c) => ({ id: c.id, name: c.name, address: c.address || "", phone: c.phone || "", createdAt: c.created_at })),
    orders: orders.map(mapOrder),
    companyPayments: payments.map((p) => ({
      id: p.id,
      companyId: p.company_id,
      orderId: p.order_id,
      amount: Number(p.amount || 0),
      note: p.note || "",
      paymentMethod: p.payment_method || "cash",
      ourAccountId: p.our_account_id || undefined,
      companyAccountId: p.company_account_id || undefined,
      ourCardAccountText: p.our_card_account_text || "",
      companyCardAccountText: p.company_card_account_text || "",
      paymentDate: p.payment_date || String(p.created_at || "").slice(0, 10),
      receipt: p.receipt || undefined,
      createdAt: p.created_at,
    })),
    shopSales: shopSales.map((s) => ({
      id: s.id,
      sourceKey: s.source_key,
      fileName: s.file_name,
      saleDate: s.sale_date,
      items: s.items || [],
      totalQuantity: Number(s.total_quantity || 0),
      totalSales: Number(s.total_sales || 0),
      totalCost: Number(s.total_cost || 0),
      totalProfit: Number(s.total_profit || 0),
      shortageCount: Number(s.shortage_count || 0),
      skippedRows: s.skipped_rows || [],
      createdAt: s.created_at,
    })),
    staff: staff
      .filter((member) => user.role === "superadmin" || member.branch === user.role)
      .map((s) => ({ id: s.id, name: s.name, role: s.role, branch: s.branch, phone: s.phone || "", salary: Number(s.salary || 0), joinDate: s.join_date || "", active: Boolean(s.active) })),
    accounts: adminAccounts.map((account) => ({ id: account.id, userId: account.user_id, name: account.name, role: account.role, branchName: account.branch_name || branchNames[account.role as Role], branchSlug: account.role, active: Boolean(account.active) })),
    suppliers,
  };
}

async function handler(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  if (!SUPABASE_URL || !SUPABASE_KEY || !AUTH_SECRET || AUTH_SECRET.length < 32) return envMissing();
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 12 * 1024 * 1024) {
    return json({ success: false, message: "Fayl yoki so'rov hajmi 12 MB dan oshmasligi kerak" }, 413);
  }
  const { path } = await context.params;
  const route = path.join("/");
  const method = request.method;

  try {
    if (route === "auth/login" && method === "POST") {
      const body = await readBody(request);
      if (typeof body.userId !== "string" || typeof body.password !== "string" || body.userId.length > 100 || body.password.length > 200) {
        return json({ success: false, message: "Login ma'lumotlari noto'g'ri" }, 400);
      }
      const users = await rpc<any[]>("authenticate_admin", { p_user_id: body.userId.trim(), p_password: body.password });
      const row = users[0];
      if (!row) {
        return json({ success: false, message: "Login yoki parol xato" }, 401);
      }
      const user: AppUser = {
        id: row.id,
        name: row.name,
        role: row.role,
        branchName: row.branch_name || branchNames[row.role as Role],
        branchIcon: row.branch_icon || branchIcons[row.role as Role],
      };
      return json({ access: encodeToken(user, "access"), refresh: encodeToken(user, "refresh"), user });
    }
    if (route === "auth/me" && method === "GET") return json({ user: authUser(request) });
    if (route === "auth/logout") return json({ success: true });
    if (route === "auth/token/refresh" && method === "POST") {
      const body = await readBody(request);
      const user = decodeToken(body.refresh, "refresh");
      if (!user) return json({ success: false, message: "Sessiya tugagan" }, 401);
      return json({ access: encodeToken(user, "access"), refresh: encodeToken(user, "refresh") });
    }

    const user = authUser(request);
    if (route === "snapshot" && method === "GET") return json(await snapshot(user));
    if (route === "products" && method === "GET") return json(await products());
    const warehouseAdmin = route.match(/^warehouses\/(restaurant1|restaurant2|shop)$/);
    if (warehouseAdmin && method === "PATCH") {
      requireRole(user, ["superadmin"]);
      const role = warehouseAdmin[1] as Role;
      const body = await readBody(request);
      const branchName = String(body.branchName || "").trim();
      const adminName = String(body.adminName || "").trim();
      const userId = String(body.userId || "").trim();
      const password = String(body.password || "");
      if (!branchName || !adminName || !userId) return json({ success: false, message: "Sklad nomi, admin nomi va loginni kiriting" }, 400);
      if (branchName.length > 100 || adminName.length > 100 || userId.length > 100) return json({ success: false, message: "Kiritilgan ma'lumot juda uzun" }, 400);
      if (password && password.length < 8) return json({ success: false, message: "Yangi parol kamida 8 ta belgidan iborat bo'lsin" }, 400);
      const duplicates = await sb<any[]>("admin_users", {}, `?select=id&user_id=eq.${encodeURIComponent(userId)}&role=neq.${role}&limit=1`);
      if (duplicates.length) return json({ success: false, message: "Bu login boshqa adminda mavjud" }, 409);
      const update: Record<string, unknown> = { branch_name: branchName, name: adminName, user_id: userId };
      if (password) update.password = (await hash(password, 12)).replace(/^\$2b\$/, "$2a$");
      const [updated] = await sb<any[]>("admin_users", { method: "PATCH", headers: { prefer: "return=representation" }, body: JSON.stringify(update) }, `?role=eq.${role}`);
      if (!updated) return json({ success: false, message: "Sklad admini topilmadi" }, 404);
      return json({ id: updated.id, userId: updated.user_id, name: updated.name, role: updated.role, branchName: updated.branch_name, branchSlug: updated.role, active: updated.active });
    }
    if (route === "products" && method === "POST") {
      requireRole(user, ["superadmin"]);
      const [created] = await sb<any[]>("products", {
        method: "POST",
        headers: { prefer: "return=representation" },
        body: JSON.stringify(productRow(await readBody(request))),
      });
      await sb("stock", {
        method: "POST",
        headers: { prefer: "resolution=merge-duplicates" },
        body: JSON.stringify({ product_id: created.id, branch: "main", quantity: 0 }),
      }, "?on_conflict=product_id,branch");
      return json(toProduct(created), 201);
    }
    const productDetail = route.match(/^products\/([^/]+)$/);
    if (productDetail && method === "PATCH") {
      requireRole(user, ["superadmin"]);
      const id = decodeURIComponent(productDetail[1]);
      const body = await readBody(request);
      if (!String(body.name || "").trim()) return json({ success: false, message: "Mahsulot nomini kiriting" }, 400);
      const barcode = String(body.qrCode || "").trim();
      if (barcode) {
        const duplicates = await sb<any[]>("products", {}, `?select=id,name&qr_code=eq.${encodeURIComponent(barcode)}&id=neq.${encodeURIComponent(id)}&limit=1`);
        if (duplicates.length) return json({ success: false, message: `Bu shtrix-kod ${duplicates[0].name} mahsulotida mavjud` }, 409);
      }
      const { id: _ignored, ...row } = productRow({ ...body, id });
      const [updated] = await sb<any[]>("products", { method: "PATCH", headers: { prefer: "return=representation" }, body: JSON.stringify(row) }, `?id=eq.${encodeURIComponent(id)}`);
      if (!updated) return json({ success: false, message: "Mahsulot topilmadi" }, 404);
      return json(toProduct(updated));
    }
    if (productDetail && method === "DELETE") {
      requireRole(user, ["superadmin"]);
      const id = decodeURIComponent(productDetail[1]);
      const existing = await sb<any[]>("products", {}, `?select=id&id=eq.${encodeURIComponent(id)}&limit=1`);
      if (!existing.length) return json({ success: false, message: "Mahsulot topilmadi" }, 404);
      await sb("products", { method: "DELETE" }, `?id=eq.${encodeURIComponent(id)}`);
      return json({ success: true });
    }

    if (route === "stock/main" && method === "GET") return json(await stock("main"));
    const stockMain = route.match(/^stock\/main\/([^/]+)$/);
    if (stockMain && method === "PATCH") {
      requireRole(user, ["superadmin"]);
      const body = await readBody(request);
      await sb("stock", {
        method: "POST",
        headers: { prefer: "resolution=merge-duplicates" },
        body: JSON.stringify({ product_id: decodeURIComponent(stockMain[1]), branch: "main", quantity: Number(body.quantity || 0) }),
      }, "?on_conflict=product_id,branch");
      return json({ success: true });
    }
    const stockBranch = route.match(/^stock\/branches\/([^/]+)$/);
    if (stockBranch && method === "GET") return json(await stock(decodeURIComponent(stockBranch[1])));

    if (route === "transfers" && method === "GET") return json((await snapshot(user)).transfers);
    if (route === "transfers" && method === "POST") {
      const body = await readBody(request);
      const fromBranch = user.role === "superadmin" ? String(body.fromBranch || "main") : user.role;
      const toBranch = String(body.toBranch || "");
      if (!(stockBranches as readonly string[]).includes(fromBranch) || !(requestBranches as readonly string[]).includes(toBranch) || fromBranch === toBranch) {
        return json({ success: false, message: "Filial noto'g'ri" }, 400);
      }
      const productList = await products();
      const items = (body.items || []).map((item: any) => {
        const p = productList.find((product) => product.id === item.productId);
        return { productId: item.productId, productName: p?.name || item.productId, quantity: Number(item.quantity || 0), unit: p?.unit || "", pricePerUnit: Number(p?.pricePerUnit || 0) };
      });
      const total = items.reduce((sum: number, item: any) => {
        const p = productList.find((product) => product.id === item.productId);
        return sum + item.quantity * Number(p?.pricePerUnit || 0);
      }, 0);
      const [created] = await sb<any[]>("transfers", {
        method: "POST",
        headers: { prefer: "return=representation" },
        body: JSON.stringify({ from_branch: fromBranch, to_branch: toBranch, items, total_value: total, requested_by: user.name, note: body.note || "", status: "pending" }),
      });
      return json(created, 201);
    }
    const transferAction = route.match(/^transfers\/([^/]+)\/(approve|reject)$/);
    if (transferAction && method === "POST") {
      requireRole(user, ["superadmin"]);
      const id = decodeURIComponent(transferAction[1]);
      const action = transferAction[2];
      const body = await readBody(request);
      const updated = action === "approve"
        ? await rpc<any>("dispatch_transfer", { p_transfer_id: id, p_items: body.items || [], p_approved_by: body.approvedBy || user.name })
        : await rpc<any>("process_transfer", { p_transfer_id: id, p_action: action, p_approved_by: body.approvedBy || user.name });
      return json(updated);
    }

    if (route === "damages" && method === "GET") return json((await snapshot(user)).damages);
    if (route === "damages/image-upload-url" && method === "POST") {
      const body = await readBody(request);
      const type = String(body.type || "");
      const size = Number(body.size || 0);
      const extension = damageImageTypes[type];
      if (!extension) return json({ success: false, message: "Brak rasmi faqat JPG, PNG yoki WEBP bo'lishi kerak" }, 400);
      if (size <= 0 || size > MAX_DAMAGE_IMAGE_BYTES) return json({ success: false, message: "Brak rasmi 10 MB dan kichik bo'lishi kerak" }, 400);
      const requestId = crypto.randomUUID();
      const path = `${requestId}/${crypto.randomUUID()}.${extension}`;
      const signed = await storageRequest(`/object/upload/sign/damage-images/${path}`, { method: "POST", body: "{}" });
      const upload: DamageImageUpload = { requestId, path, name: String(body.name || "damage").slice(0, 180), type, size, userId: user.id, exp: Math.floor(Date.now() / 1000) + 15 * 60 };
      return json({ requestId, path, uploadUrl: `${SUPABASE_URL!.replace(/\/$/, "")}/storage/v1${signed.url}`, uploadToken: signDamageImageUpload(upload) });
    }
    if (route === "damages" && method === "POST") {
      if (user.role === "superadmin") return json({ success: false, message: "Brak so'rovini faqat sklad admin yuboradi" }, 403);
      const body = await readBody(request);
      const branch = user.role;
      if (!(requestBranches as readonly string[]).includes(branch)) return json({ success: false, message: "Sklad noto'g'ri" }, 400);
      const quantity = Number(body.quantity || 0);
      const reason = String(body.reason || "").trim();
      if (quantity <= 0) return json({ success: false, message: "Miqdor noto'g'ri" }, 400);
      if (reason.length < 3) return json({ success: false, message: "Brak sababini yozing" }, 400);
      const productId = String(body.productId || "");
      const [product] = await sb<any[]>("products", {}, `?select=*&id=eq.${encodeURIComponent(productId)}&limit=1`);
      if (!product) return json({ success: false, message: "Mahsulot topilmadi" }, 404);

      const upload = body.imageUploadToken ? verifyDamageImageUpload(body.imageUploadToken, user) : null;
      if (body.imageUploadToken && !upload) throw new Error("Brak rasmi imzosi eskirgan yoki noto'g'ri");
      let image: Record<string, unknown> | null = null;
      if (upload) {
        await storageRequest(`/object/info/damage-images/${upload.path}`);
        const signed = await storageRequest(`/object/sign/damage-images/${upload.path}`, { method: "POST", body: JSON.stringify({ expiresIn: 31536000 }) });
        const signedPath = signed.signedURL || signed.signedUrl;
        image = { name: upload.name, type: upload.type, storagePath: upload.path, dataUrl: signedPath ? `${SUPABASE_URL!.replace(/\/$/, "")}/storage/v1${signedPath}` : "" };
      }
      const [created] = await sb<any[]>("damaged_requests", {
        method: "POST",
        headers: { prefer: "return=representation" },
        body: JSON.stringify({ id: upload?.requestId || crypto.randomUUID(), branch, product_id: product.id, product_name: product.name, quantity, unit: product.unit || "", reason, image, requested_by: user.name, status: "pending" }),
      });
      return json(mapDamage(created), 201);
    }
    const damageAction = route.match(/^damages\/([^/]+)\/(approve|reject)$/);
    if (damageAction && method === "POST") {
      requireRole(user, ["superadmin"]);
      const id = decodeURIComponent(damageAction[1]);
      const action = damageAction[2];
      const body = await readBody(request);
      const updated = await rpc<any>("process_damaged_request", { p_request_id: id, p_action: action, p_approved_by: body.approvedBy || user.name });
      return json(mapDamage(updated));
    }

    if (route === "companies" && method === "GET") return json((await snapshot(user)).companies);
    if (route === "companies" && method === "POST") {
      requireRole(user, ["superadmin", "restaurant1", "restaurant2"]);
      const body = await readBody(request);
      const [created] = await sb<any[]>("companies", { method: "POST", headers: { prefer: "return=representation" }, body: JSON.stringify({ name: body.name, address: body.address || "", phone: body.phone || "", branch: user.role === "superadmin" ? null : user.role }) });
      return json(created, 201);
    }
    const companyDetail = route.match(/^companies\/([^/]+)$/);
    if (companyDetail && method === "PATCH") {
      requireRole(user, ["superadmin", "restaurant1", "restaurant2"]);
      const id = decodeURIComponent(companyDetail[1]);
      const body = await readBody(request);
      const name = String(body.name || "").trim();
      if (!name) return json({ success: false, message: "Firma nomini kiriting" }, 400);
      const company = await companyForUser(user, id);
      const [updated] = await sb<any[]>("companies", {
        method: "PATCH",
        headers: { prefer: "return=representation" },
        body: JSON.stringify({ name, address: String(body.address || ""), phone: String(body.phone || "") }),
      }, `?id=eq.${encodeURIComponent(id)}`);
      if (!updated) return json({ success: false, message: "Firma topilmadi" }, 404);
      if (company.name !== name) {
        await sb("orders", { method: "PATCH", body: JSON.stringify({ company_name: name }) }, `?company_id=eq.${encodeURIComponent(id)}`);
      }
      return json({ id: updated.id, name: updated.name, address: updated.address || "", phone: updated.phone || "", createdAt: updated.created_at });
    }

    if (route === "payment-methods" && method === "GET") {
      requireRole(user, ["superadmin", "restaurant1", "restaurant2"]);
      const companyId = request.nextUrl.searchParams.get("companyId");
      const company = companyId ? await companyForUser(user, companyId) : null;
      if (!company && user.role !== "superadmin") throw new Error("Ruxsat yo'q");
      const methods = await rpc<any>("payflow_payment_methods", { p_company_name: company?.name || null });
      return json(methods);
    }
    if (route === "payment-methods" && method === "POST") {
      requireRole(user, ["superadmin", "restaurant1", "restaurant2"]);
      const body = await readBody(request);
      const kind = String(body.kind || "").toUpperCase();
      let company: any = null;
      if (kind === "OUR") requireRole(user, ["superadmin"]);
      else if (kind === "COMPANY") {
        if (!body.companyId) throw new Error("Firma ID kerak");
        company = await companyForUser(user, String(body.companyId));
      } else throw new Error("To'lov usuli turi noto'g'ri");
      const created = await rpc<any>("payflow_add_payment_method", {
        p_kind: kind,
        p_label: String(body.label || ""),
        p_company_name: company?.name || null,
      });
      return json(created, 201);
    }
    const paymentMethodItem = route.match(/^payment-methods\/([^/]+)$/);
    if (paymentMethodItem && method === "DELETE") {
      requireRole(user, ["superadmin", "restaurant1", "restaurant2"]);
      const body = await readBody(request);
      const company = body.companyId ? await companyForUser(user, String(body.companyId)) : null;
      if (!company && user.role !== "superadmin") throw new Error("Ruxsat yo'q");
      const methods = await rpc<any>("payflow_payment_methods", { p_company_name: company?.name || null });
      const allowed = company ? methods?.companyAccounts || [] : methods?.ourAccounts || [];
      const accountId = decodeURIComponent(paymentMethodItem[1]);
      if (!allowed.some((account: any) => account.id === accountId)) throw new Error("Karta topilmadi yoki ruxsat yo'q");
      const removed = await rpc<boolean>("payflow_delete_payment_method", { p_account_id: accountId });
      if (!removed) throw new Error("Karta topilmadi");
      return json({ success: true });
    }

    if (route === "orders" && method === "GET") return json((await snapshot(user)).orders);
    if (route === "orders" && method === "POST") {
      requireRole(user, ["superadmin", "restaurant1", "restaurant2"]);
      const body = await readBody(request);
      const company = (await sb<any[]>("companies", {}, `?select=*&id=eq.${encodeURIComponent(body.companyId)}&limit=1`))[0];
      const total = (body.items || []).reduce((sum: number, item: any) => sum + Number(item.quantity || 0) * Number(item.pricePerUnit || 0), 0);
      if (!company || (user.role !== "superadmin" && company.branch !== user.role)) {
        return json({ success: false, message: "Firma topilmadi yoki ruxsat yo'q" }, 404);
      }
      const payStatus = body.payStatus === "paid" ? "paid" : "unpaid";
      const orderItems = Array.isArray(body.items) ? body.items.map((item: any, index: number) => index === 0 && body.productDocument ? { ...item, orderDocument: body.productDocument } : item) : [];
      const [created] = await sb<any[]>("orders", { method: "POST", headers: { prefer: "return=representation" }, body: JSON.stringify({ company_id: body.companyId, company_name: company.name || "", branch: user.role === "superadmin" ? company.branch : user.role, items: orderItems, total_price: total, paid_amount: payStatus === "paid" ? total : 0, pay_status: payStatus, note: body.note || "", order_date: body.orderDate || new Date().toISOString().slice(0, 10) }) });
      return json(mapOrder(created), 201);
    }
    if (route === "orders/payment-receipt-upload-url" && method === "POST") {
      requireRole(user, ["superadmin", "restaurant1", "restaurant2"]);
      const body = await readBody(request);
      const type = String(body.type || "");
      const size = Number(body.size || 0);
      const extension = paymentReceiptTypes[type];
      if (!extension) return json({ success: false, message: "Chek faqat JPG, PNG yoki WEBP rasm bo'lishi kerak" }, 400);
      if (size <= 0 || size > MAX_PAYMENT_RECEIPT_BYTES) return json({ success: false, message: "Chek 5 MB dan kichik bo'lishi kerak" }, 400);

      const paymentId = crypto.randomUUID();
      const path = `${paymentId}/${crypto.randomUUID()}.${extension}`;
      const signed = await storageRequest(`/object/upload/sign/payflow-receipts/${path}`, { method: "POST", body: "{}" });
      const upload: PaymentReceiptUpload = {
        paymentId,
        path,
        name: String(body.name || "receipt").slice(0, 180),
        type,
        size,
        userId: user.id,
        exp: Math.floor(Date.now() / 1000) + 15 * 60,
      };
      return json({
        paymentId,
        path,
        uploadUrl: `${SUPABASE_URL!.replace(/\/$/, "")}/storage/v1${signed.url}`,
        uploadToken: signPaymentReceiptUpload(upload),
      });
    }
    if (route === "orders/payment-receipt-upload" && method === "DELETE") {
      requireRole(user, ["superadmin", "restaurant1", "restaurant2"]);
      const body = await readBody(request);
      const upload = verifyPaymentReceiptUpload(body.uploadToken, user);
      if (!upload) return json({ success: false, message: "Chek yuklash imzosi eskirgan yoki noto'g'ri" }, 400);
      await removeUnlinkedPaymentReceipt(upload);
      return json({ success: true });
    }
    if (route === "orders/document-upload-url" && method === "POST") {
      requireRole(user, ["superadmin", "restaurant1", "restaurant2"]);
      const body = await readBody(request);
      const size = Number(body.size || 0);
      const type = String(body.type || "");
      if (size <= 0 || size > 10 * 1024 * 1024) return json({ success: false, message: "Hujjat 10 MB dan kichik bo'lishi kerak" }, 400);
      if (!type.startsWith("image/") && type !== "application/pdf") return json({ success: false, message: "Hujjat faqat rasm yoki PDF bo'lishi kerak" }, 400);
      const extension = String(body.name || "file").split(".").pop()?.replace(/[^a-z0-9]/gi, "").toLowerCase() || "bin";
      const path = `${user.role}/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${extension}`;
      const signed = await storageRequest(`/object/upload/sign/order-documents/${path}`, { method: "POST", body: "{}" });
      const download = await storageRequest(`/object/sign/order-documents/${path}`, { method: "POST", body: JSON.stringify({ expiresIn: 31536000 }) });
      return json({ path, uploadUrl: `${SUPABASE_URL!.replace(/\/$/, "")}/storage/v1${signed.url}`, downloadUrl: `${SUPABASE_URL!.replace(/\/$/, "")}/storage/v1${download.signedURL || download.signedUrl}` });
    }
    if (route === "orders/upload-receipt" && method === "POST") {
      requireRole(user, ["superadmin", "restaurant1", "restaurant2"]);
      const upload = await readOrderFile(request, "receipt");
      if (upload.orderId) {
        const [order] = await sb<any[]>("orders", {}, `?select=id,branch&id=eq.${encodeURIComponent(upload.orderId)}&limit=1`);
        if (!order) return json({ success: false, message: "Order topilmadi" }, 404);
        if (user.role !== "superadmin" && order.branch !== user.role) return json({ success: false, message: "Ruxsat yo'q" }, 403);
        await sb("orders", { method: "PATCH", body: JSON.stringify({ receipt: upload.file }) }, `?id=eq.${encodeURIComponent(upload.orderId)}`);
      }
      return json({ receipt: upload.file, receipts: [upload.file] }, 201);
    }
    const orderPayments = route.match(/^orders\/([^/]+)\/payments$/);
    if (orderPayments && method === "POST") {
      requireRole(user, ["superadmin", "restaurant1", "restaurant2"]);
      const body = await readBody(request);
      const orderId = decodeURIComponent(orderPayments[1]);
      const [order] = await sb<any[]>("orders", {}, `?select=id,branch&id=eq.${encodeURIComponent(orderId)}&limit=1`);
      if (!order) return json({ success: false, message: "Order topilmadi" }, 404);
      if (user.role !== "superadmin" && order.branch !== user.role) return json({ success: false, message: "Ruxsat yo'q" }, 403);
      const paymentMethod = String(body.paymentMethod || "cash").toLowerCase();
      const paymentDate = String(body.paymentDate || new Date().toISOString().slice(0, 10));
      if (!/^\d{4}-\d{2}-\d{2}$/.test(paymentDate)) throw new Error("To'lov sanasi noto'g'ri");
      if (!(["cash", "card"] as string[]).includes(paymentMethod)) throw new Error("To'lov usuli noto'g'ri");
      if (paymentMethod === "card" && (!body.ourAccountId || !body.companyAccountId)) {
        throw new Error("Ikkala karta ham tanlanishi kerak");
      }

      const upload = body.receiptUploadToken ? verifyPaymentReceiptUpload(body.receiptUploadToken, user) : null;
      if (body.receiptUploadToken && !upload) throw new Error("Chek yuklash imzosi eskirgan yoki noto'g'ri");
      let receipt: Record<string, unknown> | null = null;
      if (upload) {
        await storageRequest(`/object/info/payflow-receipts/${upload.path}`);
        const signed = await storageRequest(`/object/sign/payflow-receipts/${upload.path}`, {
          method: "POST",
          body: JSON.stringify({ expiresIn: 31536000 }),
        });
        const signedPath = signed.signedURL || signed.signedUrl;
        receipt = {
          name: upload.name,
          type: upload.type,
          storagePath: upload.path,
          dataUrl: signedPath ? `${SUPABASE_URL!.replace(/\/$/, "")}/storage/v1${signedPath}` : "",
        };
      }

      const paymentId = upload?.paymentId || crypto.randomUUID();
      try {
        const payment = await rpc<any>("pay_order_with_payflow", {
          p_payment_id: paymentId,
          p_order_id: orderId,
          p_amount: Number(body.amount || 0),
          p_note: String(body.note || ""),
          p_payment_date: paymentDate,
          p_payment_method: paymentMethod,
          p_our_account_id: paymentMethod === "card" ? String(body.ourAccountId) : null,
          p_company_account_id: paymentMethod === "card" ? String(body.companyAccountId) : null,
          p_receipt_paths: upload ? [upload.path] : [],
          p_receipt: receipt,
        });
        return json(payment, 201);
      } catch (error) {
        if (upload) await removeUnlinkedPaymentReceipt(upload);
        throw error;
      }
    }

    if (route === "staff" && method === "POST") {
      requireRole(user, ["superadmin"]);
      const body = await readBody(request);
      const [created] = await sb<any[]>("staff", { method: "POST", headers: { prefer: "return=representation" }, body: JSON.stringify({ name: body.name, role: body.role, branch: body.branch, phone: body.phone || "", salary: Number(body.salary || 0), join_date: body.joinDate || new Date().toISOString().slice(0, 10), active: body.active ?? true }) });
      return json(created, 201);
    }
    const staffToggle = route.match(/^staff\/([^/]+)\/toggle$/);
    if (staffToggle && method === "POST") {
      requireRole(user, ["superadmin"]);
      const id = decodeURIComponent(staffToggle[1]);
      const [member] = await sb<any[]>("staff", {}, `?select=*&id=eq.${encodeURIComponent(id)}&limit=1`);
      const [updated] = await sb<any[]>("staff", { method: "PATCH", headers: { prefer: "return=representation" }, body: JSON.stringify({ active: !member?.active }) }, `?id=eq.${encodeURIComponent(id)}`);
      return json(updated);
    }

    if (route === "suppliers" && method === "POST") {
      requireRole(user, ["superadmin"]);
      const body = await readBody(request);
      const [created] = await sb<any[]>("suppliers", { method: "POST", headers: { prefer: "return=representation" }, body: JSON.stringify({ firm: body.firm, doc_number: body.docNumber, delivery_date: body.deliveryDate, note: body.note || "", items: body.items || [], total_price: Number(body.totalPrice || 0), pay_status: body.payStatus || "unpaid", paid_amount: Number(body.paidAmount || 0) }) });
      return json(created, 201);
    }
    const supplierPayment = route.match(/^suppliers\/([^/]+)\/payment$/);
    if (supplierPayment && method === "PATCH") {
      requireRole(user, ["superadmin"]);
      const body = await readBody(request);
      const [updated] = await sb<any[]>("suppliers", { method: "PATCH", headers: { prefer: "return=representation" }, body: JSON.stringify({ pay_status: body.payStatus, paid_amount: Number(body.paidAmount || 0) }) }, `?id=eq.${encodeURIComponent(supplierPayment[1])}`);
      return json(updated);
    }

    if (route === "shop-sales/import_sales" && method === "POST") {
      requireRole(user, ["superadmin", "shop"]);
      const body = await readBody(request);
      if (!body.sourceKey || !body.fileName || !body.saleDate || !Array.isArray(body.rows) || body.rows.length === 0) {
        return json({ success: false, message: "Import ma'lumotlari to'liq emas" }, 400);
      }
      const created = await rpc<any>("import_shop_sale", {
        p_source_key: body.sourceKey,
        p_file_name: body.fileName,
        p_sale_date: body.saleDate,
        p_items: body.rows,
        p_skipped_rows: body.skippedRows || [],
      });
      return json(created, 201);
    }

    return json({ success: false, message: `Endpoint topilmadi: ${method} /${route}` }, 404);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Server xatosi";
    return json({ success: false, message }, errorStatus(message));
  }
}

function mapDamage(row: any) {
  return {
    id: row.id,
    branch: row.branch,
    productId: row.product_id,
    productName: row.product_name || "",
    quantity: Number(row.quantity || 0),
    unit: row.unit || "",
    reason: row.reason || "",
    image: row.image || undefined,
    requestedBy: row.requested_by || "",
    approvedBy: row.approved_by || "",
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const GET = handler;
export const POST = handler;
export const PATCH = handler;
export const PUT = handler;
export const DELETE = handler;

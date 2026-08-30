import { NextRequest, NextResponse } from "next/server";
import type { Role } from "@/types";

export const runtime = "nodejs";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

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
      message: "Supabase ulanmagan. SUPABASE_URL va SUPABASE_SERVICE_ROLE_KEY env qiymatlarini kiriting.",
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

async function readBody(request: NextRequest) {
  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("multipart/form-data")) return {};
  const text = await request.text();
  return text ? JSON.parse(text) : {};
}

function encodeToken(user: AppUser) {
  return Buffer.from(JSON.stringify({ ...user, iat: Date.now() }), "utf8").toString("base64url");
}

function decodeToken(value?: string | null): AppUser | null {
  if (!value) return null;
  try {
    const data = JSON.parse(Buffer.from(value.replace(/^Bearer\s+/i, ""), "base64url").toString("utf8"));
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

function authUser(request: NextRequest) {
  const user = decodeToken(request.headers.get("authorization"));
  if (!user) throw new Error("Avtorizatsiya kerak");
  return user;
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
  return (await sb<any[]>("products", {}, "?select=*&order=name.asc")).map(toProduct);
}

async function stock(branch = "main") {
  const rows = await sb<any[]>("stock", {}, `?select=product_id,quantity&branch=eq.${encodeURIComponent(branch)}`);
  return toStock(rows);
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
    createdAt: row.created_at,
  };
}

async function snapshot(user: AppUser) {
  const [
    productList,
    mainStock,
    shopStock,
    transfers,
    companies,
    orders,
    payments,
    staff,
    suppliers,
    shopSales,
  ] = await Promise.all([
    products(),
    stock(user.role === "superadmin" ? "main" : user.role),
    user.role === "superadmin" || user.role === "shop" ? stock("shop") : Promise.resolve({}),
    sb<any[]>("transfers", {}, "?select=*&order=created_at.desc"),
    user.role === "shop" ? Promise.resolve([]) : sb<any[]>("companies", {}, "?select=*&order=created_at.desc"),
    user.role === "shop" ? Promise.resolve([]) : sb<any[]>("orders", {}, "?select=*&order=created_at.desc"),
    user.role === "shop" ? Promise.resolve([]) : sb<any[]>("company_payments", {}, "?select=*&order=created_at.desc"),
    sb<any[]>("staff", {}, "?select=*&order=name.asc"),
    sb<any[]>("suppliers", {}, "?select=*&order=created_at.desc").catch(() => []),
    user.role === "restaurant1" || user.role === "restaurant2"
      ? Promise.resolve([])
      : sb<any[]>("shop_sales", {}, "?select=*&order=sale_date.desc"),
  ]);

  const visibleTransfers = user.role === "superadmin"
    ? transfers
    : transfers.filter((tr) => tr.to_branch === user.role);

  return {
    products: productList,
    stock: mainStock,
    shopStock,
    transfers: visibleTransfers.map((tr) => ({
      id: tr.id,
      toBranch: tr.to_branch,
      items: tr.items || [],
      totalValue: Number(tr.total_value || 0),
      requestedBy: tr.requested_by,
      approvedBy: tr.approved_by || "",
      status: tr.status,
      note: tr.note || "",
      createdAt: tr.created_at,
      updatedAt: tr.updated_at,
    })),
    reports: {
      totalProducts: productList.length,
      branchStats: (["restaurant1", "restaurant2", "shop"] as Role[]).map((branch) => ({
        branch,
        stockValue: 0,
        lowStockCount: 0,
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
    suppliers,
  };
}

async function handler(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return envMissing();
  const { path } = await context.params;
  const route = path.join("/");
  const method = request.method;

  try {
    if (route === "auth/login" && method === "POST") {
      const body = await readBody(request);
      const users = await sb<any[]>("admin_users", {}, `?select=*&user_id=eq.${encodeURIComponent(body.userId)}&limit=1`);
      const row = users[0];
      if (!row || String(row.password) !== String(body.password)) {
        return json({ success: false, message: "Login yoki parol xato" }, 401);
      }
      const user: AppUser = {
        id: row.id,
        name: row.name,
        role: row.role,
        branchName: row.branch_name || branchNames[row.role as Role],
        branchIcon: row.branch_icon || branchIcons[row.role as Role],
      };
      const token = encodeToken(user);
      return json({ access: token, refresh: token, user });
    }
    if (route === "auth/me" && method === "GET") return json({ user: authUser(request) });
    if (route === "auth/logout" || route === "auth/token/refresh") return json({});

    const user = authUser(request);
    if (route === "snapshot" && method === "GET") return json(await snapshot(user));
    if (route === "products" && method === "GET") return json(await products());
    if (route === "products" && method === "POST") {
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

    if (route === "stock/main" && method === "GET") return json(await stock("main"));
    const stockMain = route.match(/^stock\/main\/([^/]+)$/);
    if (stockMain && method === "PATCH") {
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
      const productList = await products();
      const items = (body.items || []).map((item: any) => {
        const p = productList.find((product) => product.id === item.productId);
        return { productId: item.productId, productName: p?.name || item.productId, quantity: Number(item.quantity || 0), unit: p?.unit || "" };
      });
      const total = items.reduce((sum: number, item: any) => {
        const p = productList.find((product) => product.id === item.productId);
        return sum + item.quantity * Number(p?.pricePerUnit || 0);
      }, 0);
      const [created] = await sb<any[]>("transfers", {
        method: "POST",
        headers: { prefer: "return=representation" },
        body: JSON.stringify({ to_branch: body.toBranch, items, total_value: total, requested_by: body.requestedBy, note: body.note || "", status: "pending" }),
      });
      return json(created, 201);
    }
    const transferAction = route.match(/^transfers\/([^/]+)\/(approve|reject)$/);
    if (transferAction && method === "POST") {
      const id = decodeURIComponent(transferAction[1]);
      const action = transferAction[2];
      const body = await readBody(request);
      const [transfer] = await sb<any[]>("transfers", {}, `?select=*&id=eq.${encodeURIComponent(id)}&limit=1`);
      if (!transfer) return json({ success: false, message: "Transfer topilmadi" }, 404);
      if (action === "approve") {
        for (const item of transfer.items || []) {
          const mainRows = await sb<any[]>("stock", {}, `?select=*&product_id=eq.${encodeURIComponent(item.productId)}&branch=eq.main&limit=1`);
          const nextMain = Math.max(0, Number(mainRows[0]?.quantity || 0) - Number(item.quantity || 0));
          await sb("stock", { method: "POST", headers: { prefer: "resolution=merge-duplicates" }, body: JSON.stringify({ product_id: item.productId, branch: "main", quantity: nextMain }) }, "?on_conflict=product_id,branch");
          const branchRows = await sb<any[]>("stock", {}, `?select=*&product_id=eq.${encodeURIComponent(item.productId)}&branch=eq.${encodeURIComponent(transfer.to_branch)}&limit=1`);
          const nextBranch = Number(branchRows[0]?.quantity || 0) + Number(item.quantity || 0);
          await sb("stock", { method: "POST", headers: { prefer: "resolution=merge-duplicates" }, body: JSON.stringify({ product_id: item.productId, branch: transfer.to_branch, quantity: nextBranch }) }, "?on_conflict=product_id,branch");
        }
      }
      const [updated] = await sb<any[]>("transfers", { method: "PATCH", headers: { prefer: "return=representation" }, body: JSON.stringify({ status: action === "approve" ? "approved" : "rejected", approved_by: body.approvedBy || user.name, updated_at: new Date().toISOString() }) }, `?id=eq.${encodeURIComponent(id)}`);
      return json(updated);
    }

    if (route === "companies" && method === "GET") return json((await snapshot(user)).companies);
    if (route === "companies" && method === "POST") {
      const body = await readBody(request);
      const [created] = await sb<any[]>("companies", { method: "POST", headers: { prefer: "return=representation" }, body: JSON.stringify({ name: body.name, address: body.address || "", phone: body.phone || "" }) });
      return json(created, 201);
    }

    if (route === "orders" && method === "GET") return json((await snapshot(user)).orders);
    if (route === "orders" && method === "POST") {
      const body = await readBody(request);
      const company = (await sb<any[]>("companies", {}, `?select=*&id=eq.${encodeURIComponent(body.companyId)}&limit=1`))[0];
      const total = (body.items || []).reduce((sum: number, item: any) => sum + Number(item.quantity || 0) * Number(item.pricePerUnit || 0), 0);
      const [created] = await sb<any[]>("orders", { method: "POST", headers: { prefer: "return=representation" }, body: JSON.stringify({ company_id: body.companyId, company_name: company?.name || "", items: body.items || [], total_price: total, paid_amount: Number(body.paidAmount || 0), pay_status: body.payStatus, note: body.note || "", order_date: body.orderDate || new Date().toISOString().slice(0, 10) }) });
      return json(mapOrder(created), 201);
    }
    const orderPayments = route.match(/^orders\/([^/]+)\/payments$/);
    if (orderPayments && method === "POST") {
      const body = await readBody(request);
      const orderId = decodeURIComponent(orderPayments[1]);
      const [order] = await sb<any[]>("orders", {}, `?select=*&id=eq.${encodeURIComponent(orderId)}&limit=1`);
      const paidAmount = Number(order?.paid_amount || 0) + Number(body.amount || 0);
      const payStatus = paidAmount >= Number(order?.total_price || 0) ? "paid" : "unpaid";
      await sb("orders", { method: "PATCH", body: JSON.stringify({ paid_amount: paidAmount, pay_status: payStatus }) }, `?id=eq.${encodeURIComponent(orderId)}`);
      const [payment] = await sb<any[]>("company_payments", { method: "POST", headers: { prefer: "return=representation" }, body: JSON.stringify({ company_id: order?.company_id, order_id: orderId, amount: Number(body.amount || 0), note: body.note || "" }) });
      return json(payment, 201);
    }
    if (route === "orders/upload-receipt" && method === "POST") return json({ success: true });

    if (route === "staff" && method === "POST") {
      const body = await readBody(request);
      const [created] = await sb<any[]>("staff", { method: "POST", headers: { prefer: "return=representation" }, body: JSON.stringify({ name: body.name, role: body.role, branch: body.branch, phone: body.phone || "", salary: Number(body.salary || 0), join_date: body.joinDate || new Date().toISOString().slice(0, 10), active: body.active ?? true }) });
      return json(created, 201);
    }
    const staffToggle = route.match(/^staff\/([^/]+)\/toggle$/);
    if (staffToggle && method === "POST") {
      const id = decodeURIComponent(staffToggle[1]);
      const [member] = await sb<any[]>("staff", {}, `?select=*&id=eq.${encodeURIComponent(id)}&limit=1`);
      const [updated] = await sb<any[]>("staff", { method: "PATCH", headers: { prefer: "return=representation" }, body: JSON.stringify({ active: !member?.active }) }, `?id=eq.${encodeURIComponent(id)}`);
      return json(updated);
    }

    if (route === "suppliers" && method === "POST") {
      const body = await readBody(request);
      const [created] = await sb<any[]>("suppliers", { method: "POST", headers: { prefer: "return=representation" }, body: JSON.stringify({ firm: body.firm, doc_number: body.docNumber, delivery_date: body.deliveryDate, note: body.note || "", items: body.items || [], total_price: Number(body.totalPrice || 0), pay_status: body.payStatus || "unpaid", paid_amount: Number(body.paidAmount || 0) }) });
      return json(created, 201);
    }
    const supplierPayment = route.match(/^suppliers\/([^/]+)\/payment$/);
    if (supplierPayment && method === "PATCH") {
      const body = await readBody(request);
      const [updated] = await sb<any[]>("suppliers", { method: "PATCH", headers: { prefer: "return=representation" }, body: JSON.stringify({ pay_status: body.payStatus, paid_amount: Number(body.paidAmount || 0) }) }, `?id=eq.${encodeURIComponent(supplierPayment[1])}`);
      return json(updated);
    }

    if (route === "shop-sales/import_sales" && method === "POST") {
      const body = await readBody(request);
      const productList = await products();
      const items = (body.rows || []).map((row: any) => {
        const product = productList.find((p) => p.id === row.productId);
        return { ...row, productName: product?.name || row.sourceName, stockBefore: 0, stockAfter: -Number(row.quantity || 0), shortage: 0 };
      });
      const [created] = await sb<any[]>("shop_sales", {
        method: "POST",
        headers: { prefer: "return=representation" },
        body: JSON.stringify({
          source_key: body.sourceKey,
          file_name: body.fileName,
          sale_date: body.saleDate,
          items,
          total_quantity: items.reduce((s: number, i: any) => s + Number(i.quantity || 0), 0),
          total_sales: items.reduce((s: number, i: any) => s + Number(i.salesAmount || 0), 0),
          total_cost: items.reduce((s: number, i: any) => s + Number(i.costAmount || 0), 0),
          total_profit: items.reduce((s: number, i: any) => s + Number(i.profitAmount || 0), 0),
          shortage_count: 0,
          skipped_rows: body.skippedRows || [],
        }),
      });
      return json(created, 201);
    }

    return json({ success: false, message: `Endpoint topilmadi: ${method} /${route}` }, 404);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Server xatosi";
    return json({ success: false, message }, message === "Avtorizatsiya kerak" ? 401 : 500);
  }
}

export const GET = handler;
export const POST = handler;
export const PATCH = handler;
export const PUT = handler;
export const DELETE = handler;

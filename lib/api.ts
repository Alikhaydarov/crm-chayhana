import type {
  Company,
  OrderReceipt,
  Staff,
  Supplier,
} from "@/types/domain";
import type { PayStatus, Product, UserInfo as AppUserInfo } from "@/types";
import { branchForRole } from "@/lib/permissions";

const API_BASE = "/api/backend";
const ACCESS_TOKEN_KEY = "crm-access-token";
const REFRESH_TOKEN_KEY = "crm-refresh-token";

type ApiResult<T = undefined> =
  | ({ success: true } & (T extends undefined ? Record<string, never> : T))
  | { success: false; message: string; errors?: unknown };

type RequestOptions = RequestInit & { retryAuth?: boolean };

function isBrowser() {
  return typeof window !== "undefined";
}

function getToken(key: string) {
  return isBrowser() ? localStorage.getItem(key) : null;
}

function saveTokens(access?: string, refresh?: string) {
  if (!isBrowser()) return;
  if (access) localStorage.setItem(ACCESS_TOKEN_KEY, access);
  if (refresh) localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
}

export function clearSession() {
  if (!isBrowser()) return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function hasSession() {
  return Boolean(getToken(ACCESS_TOKEN_KEY) || getToken(REFRESH_TOKEN_KEY));
}

async function parseResponse(response: Response) {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) return response.json();
  const text = await response.text();
  return text ? { message: text } : {};
}

function errorMessage(data: any, fallback = "Server bilan aloqa xatosi") {
  if (typeof data?.message === "string") return data.message;
  if (typeof data?.detail === "string") return data.detail;
  if (typeof data?.errors?.detail === "string") return data.errors.detail;
  const firstError = data?.errors && Object.values(data.errors).flat()[0];
  return typeof firstError === "string" ? firstError : fallback;
}

async function refreshAccessToken() {
  const refresh = getToken(REFRESH_TOKEN_KEY);
  if (!refresh) return false;

  const response = await fetch(`${API_BASE}/auth/token/refresh/`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ refresh }),
    cache: "no-store",
  });
  const data = await parseResponse(response);
  if (!response.ok || !data?.access) {
    clearSession();
    return false;
  }
  saveTokens(data.access, data.refresh);
  return true;
}

async function request<T = any>(path: string, options: RequestOptions = {}): Promise<T> {
  const { retryAuth = true, ...fetchOptions } = options;
  const headers = new Headers(fetchOptions.headers);
  const access = getToken(ACCESS_TOKEN_KEY);
  if (access) headers.set("authorization", `Bearer ${access}`);
  if (fetchOptions.body && !(fetchOptions.body instanceof FormData) && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...fetchOptions,
    headers,
    cache: "no-store",
  });

  if (response.status === 401 && retryAuth && await refreshAccessToken()) {
    return request<T>(path, { ...options, retryAuth: false });
  }

  const data = await parseResponse(response);
  if (!response.ok || data?.success === false) {
    if (response.status === 401) clearSession();
    throw new Error(errorMessage(data, `Server xatosi (${response.status})`));
  }
  return data as T;
}

function success<T extends object>(value?: T): ApiResult<T> {
  return { success: true, ...(value || {}) } as ApiResult<T>;
}

function failure(error: unknown): ApiResult<any> {
  return {
    success: false,
    message: error instanceof Error ? error.message : "Noma'lum xatolik",
  };
}

function unwrap<T>(data: any): T {
  return (data?.data ?? data?.results ?? data) as T;
}

function unwrapList<T>(data: any): T[] {
  const value =
    data?.data?.results ??
    data?.data?.items ??
    data?.data?.products ??
    data?.data?.companies ??
    data?.data?.transfers ??
    data?.data?.orders ??
    data?.data?.shopSales ??
    data?.results ??
    data?.items ??
    data?.products ??
    data?.companies ??
    data?.transfers ??
    data?.orders ??
    data?.shopSales ??
    data?.data ??
    data;
  return Array.isArray(value) ? value : [];
}

function normalizeStock(data: any): Record<string, number> {
  const value = data?.data?.stock ?? data?.data ?? data?.stock ?? data;
  if (Array.isArray(value)) {
    return Object.fromEntries(value.map(item => [
      String(item.productId ?? item.product_id ?? item.product?.id ?? item.id),
      Number(item.quantity ?? item.stock ?? item.amount ?? 0),
    ]));
  }
  if (!value || typeof value !== "object") return {};
  return Object.fromEntries(
    Object.entries(value).map(([key, quantity]) => [key, Number(quantity) || 0]),
  );
}

async function optionalRequest<T>(path: string, fallback: T): Promise<T> {
  try {
    return await request<T>(path);
  } catch (error) {
    console.warn(`[crm-api] ${path} failed`, error);
    return fallback;
  }
}

function dataUrlToFile(receipt: OrderReceipt) {
  const [meta, encoded = ""] = receipt.dataUrl.split(",");
  const mime = meta.match(/data:([^;]+)/)?.[1] || receipt.type || "application/octet-stream";
  const bytes = Uint8Array.from(atob(encoded), char => char.charCodeAt(0));
  return new File([bytes], receipt.name, { type: mime });
}

export async function loginApi(userId: string, password: string): Promise<ApiResult<{ user: AppUserInfo }>> {
  try {
    const data = await request<any>("/auth/login/", {
      method: "POST",
      body: JSON.stringify({ userId, password }),
      retryAuth: false,
    });
    saveTokens(data.access, data.refresh);
    return success({ user: unwrap<AppUserInfo>(data.user) });
  } catch (error) {
    return failure(error);
  }
}

export async function restoreSessionApi(): Promise<ApiResult<{ user: AppUserInfo }>> {
  try {
    if (!hasSession()) throw new Error("Sessiya topilmadi");
    const data = await request<any>("/auth/me/");
    return success({ user: unwrap<AppUserInfo>(data.user ?? data) });
  } catch (error) {
    return failure(error);
  }
}

export async function logoutApi() {
  try {
    const refresh = getToken(REFRESH_TOKEN_KEY);
    if (refresh) {
      await request("/auth/logout/", {
        method: "POST",
        body: JSON.stringify({ refresh }),
        retryAuth: false,
      });
    }
  } catch {
    // Local token cleanup must still happen if the backend session already expired.
  } finally {
    clearSession();
  }
}

export async function getSnapshotApi(user: AppUserInfo) {
  // Snapshot is intentionally bypassed until the Django snapshot contract is
  // stable. Each screen is fed from its own canonical API endpoint so one
  // broken resource cannot empty every CRM section.
  const canUseCompanies = user.role === "superadmin" || user.role.startsWith("restaurant");
  const canUseShopSales = user.role === "superadmin" || user.role === "shop";

  const [
    productsData,
    stockData,
    shopStockData,
    transfersData,
    reportsData,
    companiesData,
    ordersData,
    shopSalesData,
    staffData,
  ] = await Promise.all([
    optionalRequest<any>("/products/?page_size=1000", []),
    optionalRequest<any>(
      user.role === "superadmin"
        ? "/stock/main/"
        : `/stock/branches/${encodeURIComponent(branchForRole(user.role))}/`,
      {},
    ),
    canUseShopSales
      ? optionalRequest<any>("/stock/branches/shop/", {})
      : Promise.resolve({}),
    optionalRequest<any>("/transfers/", []),
    optionalRequest<any>("/reports/", null),
    canUseCompanies
      ? optionalRequest<any>("/companies/", [])
      : Promise.resolve([]),
    canUseCompanies
      ? optionalRequest<any>("/orders/", [])
      : Promise.resolve([]),
    canUseShopSales
      ? optionalRequest<any>("/shop-sales/", [])
      : Promise.resolve([]),
    optionalRequest<any>("/staff/", []),
  ]);

  const companies = unwrapList<Company>(companiesData);
  const paymentGroups = await Promise.all(
    companies.map(company =>
      optionalRequest<any>(`/companies/${encodeURIComponent(company.id)}/payments/`, []),
    ),
  );

  const allTransfers = unwrapList<any>(transfersData);
  const allStaff = unwrapList<any>(staffData);

  return {
    products: unwrapList<Product>(productsData),
    stock: normalizeStock(stockData),
    shopStock: normalizeStock(shopStockData),
    transfers: user.role === "superadmin"
      ? allTransfers
      : allTransfers.filter(transfer => transfer.toBranch === user.role),
    reports: unwrap<any>(reportsData),
    companies,
    orders: unwrapList<any>(ordersData),
    companyPayments: paymentGroups.flatMap(group => unwrapList<any>(group)),
    shopSales: unwrapList<any>(shopSalesData),
    staff: user.role === "superadmin"
      ? allStaff
      : allStaff.filter(member => member.branch === user.role),
  };
}

async function mutation(path: string, method: string, body?: unknown): Promise<ApiResult<any>> {
  try {
    const data = await request<any>(path, {
      method,
      body: body instanceof FormData ? body : body === undefined ? undefined : JSON.stringify(body),
    });
    return success({ data: unwrap(data) });
  } catch (error) {
    return failure(error);
  }
}

export const updateStockApi = (productId: string, quantity: number) =>
  mutation(`/stock/main/${encodeURIComponent(productId)}/`, "PATCH", { quantity });

export const createTransferApi = (
  toBranch: string,
  items: { productId: string; quantity: number }[],
  requestedBy: string,
  note?: string,
) => mutation("/transfers/", "POST", { toBranch, items, requestedBy, note });

export const approveTransferApi = (id: string, approvedBy: string) =>
  mutation(`/transfers/${encodeURIComponent(id)}/approve/`, "POST", { approvedBy });

export const rejectTransferApi = (id: string, approvedBy: string) =>
  mutation(`/transfers/${encodeURIComponent(id)}/reject/`, "POST", { approvedBy });

export const addProductApi = (data: Omit<Product, "id">) =>
  mutation("/products/", "POST", {
    ...data,
    id: `p${Date.now()}`,
    qrCode: data.qrCode?.trim() || null,
  });

export const addCompanyApi = (data: Omit<Company, "id" | "createdAt">) =>
  mutation("/companies/", "POST", data);

export async function createOrderApi(data: {
  companyId: string;
  items: { productId: string; quantity: number; pricePerUnit: number }[];
  note: string;
  payStatus: PayStatus;
  paidAmount: number;
  orderDate: string;
  receipt?: OrderReceipt;
}) {
  const { receipt, ...payload } = data;
  const result = await mutation("/orders/", "POST", payload);
  if (!result.success || !receipt) return result;

  const order = (result as any).data;
  const orderId = order?.external_id ?? order?.externalId ?? order?.id;
  if (!orderId) return result;

  const form = new FormData();
  form.append("orderId", String(orderId));
  form.append("receipt", dataUrlToFile(receipt));
  return mutation("/orders/upload-receipt/", "POST", form);
}

export async function payOrderApi(orderId: string, amount: number, note: string, receipt?: OrderReceipt) {
  const result = await mutation(`/orders/${encodeURIComponent(orderId)}/payments/`, "POST", { amount, note });
  if (!result.success || !receipt) return result;

  const form = new FormData();
  form.append("orderId", String(orderId));
  form.append("receipt", dataUrlToFile(receipt));
  return mutation("/orders/upload-receipt/", "POST", form);
}

export const addStaffApi = (data: Omit<Staff, "id">) =>
  mutation("/staff/", "POST", data);

export const toggleStaffApi = (id: string) =>
  mutation(`/staff/${encodeURIComponent(id)}/toggle/`, "POST");

export const updateSupplierPayApi = (id: string, payStatus: PayStatus, paidAmount: number) =>
  mutation(`/suppliers/${encodeURIComponent(id)}/payment/`, "PATCH", { payStatus, paidAmount });

export const addSupplierApi = (data: Omit<Supplier, "id" | "createdAt">) =>
  mutation("/suppliers/", "POST", data);

export async function importShopSalesApi(data: {
  sourceKey: string;
  fileName: string;
  saleDate: string;
  rows: unknown[];
  skippedRows?: unknown[];
}) {
  return mutation("/shop-sales/import_sales/", "POST", data);
}

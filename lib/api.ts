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
let sessionUserCache: AppUserInfo | null = null;
let restoreSessionPromise: Promise<ApiResult<{ user: AppUserInfo }>> | null = null;

type ApiResult<T = undefined> =
  | ({ success: true } & (T extends undefined ? Record<string, never> : T))
  | { success: false; message: string; errors?: unknown };

type RequestOptions = RequestInit & { retryAuth?: boolean };

function isBrowser() { return typeof window !== "undefined"; }
function getToken(key: string) { return isBrowser() ? localStorage.getItem(key) : null; }
function saveTokens(access?: string, refresh?: string) { if (!isBrowser()) return; if (access) localStorage.setItem(ACCESS_TOKEN_KEY, access); if (refresh) localStorage.setItem(REFRESH_TOKEN_KEY, refresh); }
export function clearSession() { sessionUserCache = null; restoreSessionPromise = null; if (!isBrowser()) return; localStorage.removeItem(ACCESS_TOKEN_KEY); localStorage.removeItem(REFRESH_TOKEN_KEY); }
export function hasSession() { return Boolean(getToken(ACCESS_TOKEN_KEY) || getToken(REFRESH_TOKEN_KEY)); }

async function parseResponse(response: Response) { const contentType = response.headers.get("content-type") || ""; if (contentType.includes("application/json")) return response.json(); const text = await response.text(); return text ? { message: text } : {}; }
function errorMessage(data: any, fallback = "Server bilan aloqa xatosi") { if (typeof data?.message === "string") return data.message; if (typeof data?.detail === "string") return data.detail; if (typeof data?.errors?.detail === "string") return data.errors.detail; const firstError = data?.errors && Object.values(data.errors).flat()[0]; return typeof firstError === "string" ? firstError : fallback; }
async function refreshAccessToken() { const refresh = getToken(REFRESH_TOKEN_KEY); if (!refresh) return false; const response = await fetch(`${API_BASE}/auth/token/refresh/`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ refresh }), cache: "no-store" }); const data = await parseResponse(response); if (!response.ok || !data?.access) { clearSession(); return false; } saveTokens(data.access, data.refresh); return true; }
async function request<T = any>(path: string, options: RequestOptions = {}): Promise<T> { const { retryAuth = true, ...fetchOptions } = options; const headers = new Headers(fetchOptions.headers); const access = getToken(ACCESS_TOKEN_KEY); if (access) headers.set("authorization", `Bearer ${access}`); if (fetchOptions.body && !(fetchOptions.body instanceof FormData) && !headers.has("content-type")) headers.set("content-type", "application/json"); const response = await fetch(`${API_BASE}${path}`, { ...fetchOptions, headers, cache: "no-store" }); if (response.status === 401 && retryAuth && await refreshAccessToken()) return request<T>(path, { ...options, retryAuth: false }); const data = await parseResponse(response); if (!response.ok || data?.success === false) { if (response.status === 401) clearSession(); throw new Error(errorMessage(data, `Server xatosi (${response.status})`)); } return data as T; }
function success<T extends object>(value?: T): ApiResult<T> { return { success: true, ...(value || {}) } as ApiResult<T>; }
function failure(error: unknown): ApiResult<any> { return { success: false, message: error instanceof Error ? error.message : "Noma'lum xatolik" }; }
function unwrap<T>(data: any): T { return (data?.data ?? data?.results ?? data) as T; }
function unwrapList<T>(data: any): T[] { const value = data?.data?.results ?? data?.data?.items ?? data?.data?.products ?? data?.data?.companies ?? data?.data?.transfers ?? data?.data?.orders ?? data?.data?.shopSales ?? data?.results ?? data?.items ?? data?.products ?? data?.companies ?? data?.transfers ?? data?.orders ?? data?.shopSales ?? data?.data ?? data; return Array.isArray(value) ? value : []; }

function normalizeUser(data: any): AppUserInfo { const unwrapped = unwrap<any>(data); const value = unwrapped?.user ?? unwrapped; const rawAccountRole = value?.role ?? value?.accountRole; const accountRole = typeof rawAccountRole === "string" ? rawAccountRole.toLowerCase() : rawAccountRole; const branchId = value?.branch_id ?? value?.branchId ?? value?.branch?.id ?? (typeof value?.branch === "number" || typeof value?.branch === "string" ? value.branch : undefined); const branchSlug = value?.branch_slug ?? value?.branchSlug ?? value?.branch?.slug; const branchType = value?.branch_type ?? value?.branchType ?? value?.branch?.branch_type; const branchName = value?.branchName ?? value?.branch_name ?? value?.branch?.name ?? ""; const isShopBranch = branchType === "shop" || /shop|dokon|do-kon|do'kon/i.test(`${branchSlug || ""} ${branchName}`); const role = accountRole === "ceo" || accountRole === "super_admin" ? "superadmin" : isShopBranch ? "shop" : accountRole === "admin" ? "restaurant1" : accountRole ?? value?.branchCode ?? branchSlug; return { ...value, id: String(value?.id ?? value?.userId ?? value?.username ?? ""), name: value?.name || value?.fullName || [value?.first_name, value?.last_name].filter(Boolean).join(" ") || value?.username || value?.userId || "", role, accountRole, branchId, branchSlug: branchSlug || (isShopBranch ? "shop" : undefined), branchType, branchName: branchName || branchSlug || role || "", branchIcon: value?.branchIcon ?? value?.branch_icon ?? value?.branch?.icon ?? "" } as AppUserInfo; }
function normalizeAccount(value: any) { return { ...value, id: String(value?.id ?? value?.username ?? ""), name: value?.name || [value?.first_name, value?.last_name].filter(Boolean).join(" ") || value?.username || "", role: value?.role ?? "", branchName: value?.branchName ?? value?.branch_name ?? value?.branch_slug ?? "", branchSlug: value?.branchSlug ?? value?.branch_slug ?? "", active: value?.active ?? value?.is_active ?? true }; }
async function enrichUserBranch(user: AppUserInfo): Promise<AppUserInfo> { if (user.accountRole !== "admin") return user; let value: any = null; if (user.branchSlug) value = unwrap<any>(await optionalRequest<any>(`/branches/${encodeURIComponent(user.branchSlug)}/`, null)); if (!value) { const branches = unwrapList<any>(await optionalRequest<any>("/branches/?page_size=1000", [])); value = branches.find((branch) => (user.branchId != null && String(branch.id) === String(user.branchId)) || (user.branchName && branch.name === user.branchName)); } if (!value) return user; return { ...user, role: value.branch_type === "shop" ? "shop" : "restaurant1", branchId: value.id, branchSlug: value.slug, branchType: value.branch_type, branchName: value.name || user.branchName, branchIcon: value.branch_type === "shop" ? "🏪" : "🍽️" }; }
function normalizeStock(data: any): Record<string, number> { const value = data?.data?.stock ?? data?.data?.mainStock ?? data?.data?.main_stock ?? data?.stock ?? data?.mainStock ?? data?.main_stock ?? data?.data?.results ?? data?.results ?? data?.data ?? data; if (Array.isArray(value)) return Object.fromEntries(value.map(item => [String(item.productId ?? item.product_id ?? item.product?.id ?? item.id), Number(item.quantity ?? item.stock ?? item.amount ?? 0)])); if (!value || typeof value !== "object") return {}; return Object.fromEntries(Object.entries(value).map(([key, quantity]) => [key, Number(quantity) || 0])); }
async function optionalRequest<T>(path: string, fallback: T): Promise<T> { try { return await request<T>(path); } catch (error) { console.warn(`[crm-api] ${path} failed`, error); return fallback; } }
function dataUrlToFile(receipt: OrderReceipt) { const [meta, encoded = ""] = receipt.dataUrl.split(","); const mime = meta.match(/data:([^;]+)/)?.[1] || receipt.type || "application/octet-stream"; const bytes = Uint8Array.from(atob(encoded), char => char.charCodeAt(0)); return new File([bytes], receipt.name, { type: mime }); }

export async function loginApi(userId: string, password: string): Promise<ApiResult<{ user: AppUserInfo }>> { try { const data = await request<any>("/auth/login/", { method: "POST", body: JSON.stringify({ userId, password }), retryAuth: false }); saveTokens(data.access, data.refresh); sessionUserCache = await enrichUserBranch(normalizeUser(data.user)); return success({ user: sessionUserCache }); } catch (error) { return failure(error); } }
export function restoreSessionApi(): Promise<ApiResult<{ user: AppUserInfo }>> {
  if (sessionUserCache) return Promise.resolve(success({ user: sessionUserCache }));
  if (restoreSessionPromise) return restoreSessionPromise;
  restoreSessionPromise = (async () => {
    try {
      if (!hasSession()) throw new Error("Sessiya topilmadi");
      const data = await request<any>("/auth/me/");
      sessionUserCache = await enrichUserBranch(normalizeUser(data.user ?? data));
      return success({ user: sessionUserCache });
    } catch (error) {
      return failure(error);
    } finally {
      restoreSessionPromise = null;
    }
  })();
  return restoreSessionPromise;
}
export async function logoutApi() { try { const refresh = getToken(REFRESH_TOKEN_KEY); if (refresh) await request("/auth/logout/", { method: "POST", body: JSON.stringify({ refresh }), retryAuth: false }); } catch {} finally { clearSession(); } }

export async function getSnapshotApi(user: AppUserInfo) {
  try {
    const snapshot = unwrap<any>(await request("/snapshot/"));
    const embeddedMainStock = snapshot.mainStock ?? snapshot.main_stock ?? snapshot.mainWarehouseStock ?? snapshot.main_warehouse_stock;
    snapshot.products = unwrapList<Product>(snapshot.products); snapshot.stock = normalizeStock(snapshot.stock); snapshot.shopStock = normalizeStock(snapshot.shopStock); snapshot.transfers = unwrapList<any>(snapshot.transfers); snapshot.companies = unwrapList<Company>(snapshot.companies); snapshot.orders = unwrapList<any>(snapshot.orders); snapshot.companyPayments = unwrapList<any>(snapshot.companyPayments); snapshot.shopSales = unwrapList<any>(snapshot.shopSales); snapshot.staff = unwrapList<any>(snapshot.staff); snapshot.accounts = unwrapList<any>(snapshot.accounts).map(normalizeAccount); snapshot.mainStock = normalizeStock(user.role === "superadmin" ? snapshot.stock : embeddedMainStock ?? {});
    if (user.role !== "superadmin") { snapshot.transfers = (snapshot.transfers || []).filter((transfer: any) => transfer.toBranch === (user.branchSlug || user.role)); if (user.role === "shop") { snapshot.companies = []; snapshot.orders = []; snapshot.companyPayments = []; snapshot.staff = (snapshot.staff || []).filter((member: any) => member.branch === "shop"); } else { snapshot.shopSales = []; snapshot.shopStock = {}; snapshot.staff = (snapshot.staff || []).filter((member: any) => member.branch === user.role); } }
    return snapshot;
  } catch (snapshotError) {
    console.warn("[crm-api] Snapshot endpoint failed, loading resources separately", snapshotError);
    const [productsData, mainStockData, shopStockData, transfersData, reportsData, companiesData, ordersData, shopSalesData, branchesData, usersData] = await Promise.all([
      optionalRequest<any>("/products/?page_size=1000", []),
      optionalRequest<any>(user.role === "superadmin" ? "/stock/main/" : `/stock/branches/${encodeURIComponent(user.branchSlug || branchForRole(user.role))}/`, {}),
      user.role === "superadmin" || user.role === "shop" ? optionalRequest<any>("/stock/branches/shop/", {}) : Promise.resolve({}),
      optionalRequest<any>("/transfers/?page_size=1000", []), optionalRequest<any>("/reports/", null),
      user.role === "superadmin" || user.role.startsWith("restaurant") ? optionalRequest<any>("/companies/?page_size=1000", []) : Promise.resolve([]),
      user.role === "superadmin" || user.role.startsWith("restaurant") ? optionalRequest<any>("/orders/?page_size=1000", []) : Promise.resolve([]),
      user.role === "superadmin" || user.role === "shop" ? optionalRequest<any>("/shop-sales/?page_size=1000", []) : Promise.resolve([]),
      optionalRequest<any>("/branches/?page_size=1000", []), user.role === "superadmin" ? optionalRequest<any>("/auth/users/?page_size=1000", []) : Promise.resolve([]),
    ]);
    const companies = unwrapList<Company>(companiesData);
    const paymentGroups = await Promise.all(companies.map(company => optionalRequest<any>(`/companies/${encodeURIComponent(company.id)}/payments/`, [])));
    return { products: unwrapList<Product>(productsData), stock: normalizeStock(mainStockData), mainStock: normalizeStock(mainStockData), shopStock: normalizeStock(shopStockData), transfers: user.role === "superadmin" ? unwrapList<any>(transfersData) : unwrapList<any>(transfersData).filter(transfer => transfer.toBranch === (user.branchSlug || user.role)), reports: unwrap<any>(reportsData), companies, orders: unwrapList<any>(ordersData), companyPayments: paymentGroups.flatMap(group => unwrapList<any>(group)), shopSales: unwrapList<any>(shopSalesData), branches: unwrapList<any>(branchesData), accounts: unwrapList<any>(usersData).map(normalizeAccount) };
  }
}

async function mutation(path: string, method: string, body?: unknown): Promise<ApiResult<any>> { try { const data = await request<any>(path, { method, body: body instanceof FormData ? body : body === undefined ? undefined : JSON.stringify(body) }); return success({ data: unwrap(data) }); } catch (error) { return failure(error); } }

export const updateStockApi = (productId: string, quantity: number) => mutation(`/stock/main/${encodeURIComponent(productId)}/`, "PATCH", { quantity });
export const createTransferApi = (toBranch: string, items: { productId: string; quantity: number }[], requestedBy: string, branchName: string, note?: string) => mutation("/transfers/", "POST", { toBranch, items, requestedBy, branchName, note });
export const approveTransferApi = (id: string, approvedBy: string) => mutation(`/transfers/${encodeURIComponent(id)}/approve/`, "POST", { approvedBy });
export const rejectTransferApi = (id: string, approvedBy: string) => mutation(`/transfers/${encodeURIComponent(id)}/reject/`, "POST", { approvedBy });
export const addProductApi = (data: Omit<Product, "id">) => mutation("/products/", "POST", { ...data, id: `p${Date.now()}`, categoryName: data.category, qrCode: data.qrCode?.trim() || null });
export const addCompanyApi = (data: Omit<Company, "id" | "createdAt">) => mutation("/companies/", "POST", { ...data, phone_number: data.phone });
export async function createOrderApi(data: { companyId: string; items: { productId: string; quantity: number; pricePerUnit: number }[]; note: string; payStatus: PayStatus; paidAmount: number; orderDate: string; receipt?: OrderReceipt }) { const { receipt, ...payload } = data; const result = await mutation("/orders/", "POST", payload); if (!result.success || !receipt) return result; const order = (result as any).data; const orderId = order?.external_id ?? order?.externalId ?? order?.id; if (!orderId) return result; const form = new FormData(); form.append("orderId", String(orderId)); form.append("receipt", dataUrlToFile(receipt)); return mutation("/orders/upload-receipt/", "POST", form); }
export async function payOrderApi(orderId: string, amount: number, note: string, receipt?: OrderReceipt) { let uploadedReceipt: OrderReceipt | undefined; if (receipt) { const file = dataUrlToFile(receipt); const form = new FormData(); form.append("files", file); form.append("receipt", file); const upload = await mutation("/orders/upload-receipt/", "POST", form); if (!upload.success) return upload; const uploadData = (upload as any).data; uploadedReceipt = uploadData?.receipts?.[0] ?? uploadData?.receipt ?? (Array.isArray(uploadData) ? uploadData[0] : undefined); if (!uploadedReceipt) return { success: false, message: "Chek serverga yuklandi, lekin javob formati noto'g'ri" }; } return mutation(`/orders/${encodeURIComponent(orderId)}/payments/`, "POST", { amount, note, ...(uploadedReceipt ? { receipt: uploadedReceipt, receipts: [uploadedReceipt] } : {}) }); }
export async function getBranchesApi() { return unwrapList<any>(await request<any>("/branches/?page_size=1000")); }
export async function getAccountsApi() { return unwrapList<any>(await request<any>("/auth/users/?page_size=1000")).map(normalizeAccount); }
export const addStaffApi = (data: Omit<Staff, "id">) => mutation("/staff/", "POST", data);
export const toggleStaffApi = (id: string) => mutation(`/staff/${encodeURIComponent(id)}/toggle/`, "POST");
export const updateSupplierPayApi = (id: string, payStatus: PayStatus, paidAmount: number) => mutation(`/suppliers/${encodeURIComponent(id)}/payment/`, "PATCH", { payStatus, paidAmount });
export const addSupplierApi = (data: Omit<Supplier, "id" | "createdAt">) => mutation("/suppliers/", "POST", data);

export async function importShopSalesApi(data: { sourceKey: string; fileName: string; saleDate: string; rows: unknown[]; skippedRows?: unknown[]; branch?: string; branchSlug?: string }) {
  const branchSlug = data.branchSlug || data.branch;
  return mutation("/shop-sales/import_sales/", "POST", { ...data, sale_date: data.saleDate, source_key: data.sourceKey, file_name: data.fileName, skipped_rows: data.skippedRows, branch_slug: branchSlug, warehouse_slug: branchSlug, deduct_stock: true, deductStock: true, stock_action: "deduct", action: "deduct" });
}

export async function uploadShopSalesExcelApi(file: File, saleDate: string, branchSlug?: string) {
  if (!branchSlug) return { success: false, message: "Do'kon skladi aniqlanmadi. Branch slug yo'q, import to'xtatildi." } as ApiResult<any>;
  const form = new FormData();
  form.append("file", file);
  form.append("sale_date", saleDate);
  form.append("saleDate", saleDate);
  form.append("branch", branchSlug);
  form.append("branch_slug", branchSlug);
  form.append("warehouse", branchSlug);
  form.append("warehouse_slug", branchSlug);
  form.append("deduct_stock", "true");
  form.append("deductStock", "true");
  form.append("stock_action", "deduct");
  form.append("action", "deduct");
  form.append("source", "shop_sales_excel");
  return mutation("/shop-sales/upload/", "POST", form);
}

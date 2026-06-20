import type { StockMap } from "@/types";

const API_BASE = "/api/backend";
const ACCESS_TOKEN_KEY = "crm-access-token";

function normalizeMainStock(data: any): StockMap {
  const value =
    data?.data?.stock ??
    data?.data?.mainStock ??
    data?.data?.main_stock ??
    data?.stock ??
    data?.mainStock ??
    data?.main_stock ??
    data?.data?.results ??
    data?.results ??
    data?.data ??
    data;

  if (Array.isArray(value)) {
    return Object.fromEntries(value.map((item: any) => [
      String(item.productId ?? item.product_id ?? item.product?.external_id ?? item.product?.id ?? item.id),
      Number(item.quantity ?? item.stock ?? item.amount ?? 0) || 0,
    ]));
  }

  if (!value || typeof value !== "object") return {};
  return Object.fromEntries(
    Object.entries(value).map(([productId, quantity]) => [productId, Number(quantity) || 0]),
  );
}

export async function getMainStockApi(): Promise<StockMap> {
  const headers = new Headers({ accept: "application/json" });
  const token = typeof window !== "undefined" ? localStorage.getItem(ACCESS_TOKEN_KEY) : null;
  if (token) headers.set("authorization", `Bearer ${token}`);

  const response = await fetch(`${API_BASE}/stock/main/`, {
    headers,
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.message || data?.detail || `Bosh sklad xatosi (${response.status})`);
  }
  return normalizeMainStock(data);
}

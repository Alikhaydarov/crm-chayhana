import type { StockMap } from "@/types";

const API_BASE = "/api/backend";
const ACCESS_TOKEN_KEY = "crm-access-token";

function addStockAliases(stock: StockMap, item: any, quantity: number) {
  const aliases = [
    item?.productId,
    item?.product_id,
    item?.external_id,
    item?.externalId,
    item?.product?.external_id,
    item?.product?.externalId,
    item?.product?.id,
    item?.id,
  ];
  aliases.forEach((id) => {
    if (id !== undefined && id !== null && String(id).trim()) {
      stock[String(id)] = quantity;
    }
  });
}

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
    return value.reduce((stock: StockMap, item: any) => {
      const quantity = Number(item.quantity ?? item.stock ?? item.amount ?? item.balance ?? 0) || 0;
      addStockAliases(stock, item, quantity);
      return stock;
    }, {});
  }

  if (!value || typeof value !== "object") return {};
  const stock: StockMap = {};
  Object.entries(value).forEach(([productId, raw]) => {
    if (raw && typeof raw === "object") {
      const item = raw as any;
      const quantity = Number(item.quantity ?? item.stock ?? item.amount ?? item.balance ?? 0) || 0;
      stock[productId] = quantity;
      addStockAliases(stock, item, quantity);
    } else {
      stock[productId] = Number(raw) || 0;
    }
  });
  return stock;
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

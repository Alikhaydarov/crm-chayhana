import type { StockMap } from "@/types";

const API_BASE = "/api/backend";
const ACCESS_TOKEN_KEY = "crm-access-token";

function addStockAliases(stock: StockMap, item: any, quantity: number) {
  const aliases = [
    item?.productId, item?.product_id, item?.external_id, item?.externalId,
    item?.product?.external_id, item?.product?.externalId, item?.product?.id, item?.id,
  ];
  aliases.forEach((id) => {
    if (id !== undefined && id !== null && String(id).trim()) stock[String(id)] = quantity;
  });
}

function findStockValue(data: any): any {
  const direct =
    data?.stock ?? data?.mainStock ?? data?.main_stock ?? data?.items ?? data?.stocks ??
    data?.balances ?? data?.inventory ?? data?.warehouse_items ?? data?.results;
  if (direct !== undefined) return direct;
  if (data?.data !== undefined) return findStockValue(data.data);
  if (data?.warehouse !== undefined) return findStockValue(data.warehouse);
  if (data?.main_warehouse !== undefined) return findStockValue(data.main_warehouse);
  return data;
}

function normalizeMainStock(data: any): StockMap {
  const value = findStockValue(data);
  if (Array.isArray(value)) {
    return value.reduce((stock: StockMap, item: any) => {
      const quantity = Number(
        item.quantity ?? item.stock ?? item.amount ?? item.balance ??
        item.available_quantity ?? item.available ?? item.on_hand ?? 0,
      ) || 0;
      addStockAliases(stock, item, quantity);
      return stock;
    }, {});
  }

  if (!value || typeof value !== "object") return {};
  const stock: StockMap = {};
  Object.entries(value).forEach(([productId, raw]) => {
    if (raw && typeof raw === "object") {
      const item = raw as any;
      const quantity = Number(
        item.quantity ?? item.stock ?? item.amount ?? item.balance ??
        item.available_quantity ?? item.available ?? item.on_hand ?? 0,
      ) || 0;
      stock[productId] = quantity;
      addStockAliases(stock, item, quantity);
    } else {
      stock[productId] = Number(raw) || 0;
    }
  });
  return stock;
}

async function fetchJson(path: string, headers: Headers) {
  const response = await fetch(`${API_BASE}${path}`, { headers, cache: "no-store" });
  const data = await response.json().catch(() => ({}));
  return { response, data };
}

export async function getMainStockApi(): Promise<StockMap> {
  const headers = new Headers({ accept: "application/json" });
  const token = typeof window !== "undefined" ? localStorage.getItem(ACCESS_TOKEN_KEY) : null;
  if (token) headers.set("authorization", `Bearer ${token}`);

  const candidates = ["/stock/main/", "/warehouses/main/stock/", "/stock/?warehouse=main&page_size=1000"];
  let lastMessage = "Bosh sklad ma'lumoti topilmadi";
  for (const path of candidates) {
    const { response, data } = await fetchJson(path, headers);
    if (!response.ok) {
      lastMessage = data?.message || data?.detail || `Bosh sklad xatosi (${response.status})`;
      continue;
    }
    const stock = normalizeMainStock(data);
    if (Object.keys(stock).length) return stock;
  }
  throw new Error(lastMessage);
}

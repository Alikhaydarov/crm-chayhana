export type Role = "superadmin" | "restaurant1" | "restaurant2" | "shop";

export type UserInfo = {
  id: string;
  name: string;
  role: Role;
  branchName: string;
  branchIcon: string;
  branchId?: number | string;
  branchSlug?: string;
  branchType?: string;
};

export type Product = {
  id: string;
  name: string;
  category: string;
  unit: string;
  minStock: number;
  pricePerUnit: number;
  perBox: number;
  boxUnit: string;
  qrCode: string;
  supplierId?: string;
};

export type StockMap = Record<string, number>;

export type Transfer = {
  id: string;
  fromBranch: string;
  toBranch: string;
  items: { productId: string; productName: string; quantity: number; unit: string; pricePerUnit: number }[];
  totalValue: number;
  requestedBy: string;
  approvedBy?: string;
  sentItems: { productId: string; productName: string; quantity: number; unit: string; pricePerUnit: number }[];
  receivedItems: { productId: string; productName: string; quantity: number; unit: string; pricePerUnit: number }[];
  receivedBy?: string;
  receivedAt?: string;
  status: "pending" | "approved" | "received" | "rejected";
  note: string;
  createdAt: string;
  updatedAt: string;
};

export type DamageRequest = {
  id: string;
  branch: string;
  productId: string;
  productName: string;
  quantity: number;
  unit: string;
  reason: string;
  image?: {
    name: string;
    type: string;
    dataUrl: string;
    storagePath?: string;
  };
  requestedBy: string;
  approvedBy?: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  updatedAt: string;
};

export type ThemeMode = "dark" | "light";
export type Lang = "uz" | "ko";

export type ParsedShopSale = {
  barcode: string;
  sourceName: string;
  supplier: string;
  quantity: number;
  salesAmount: number;
  costAmount: number;
  profitAmount: number;
  averagePrice: number;
  productId: string;
  productName: string;
  status: "matched" | "unmatched" | "duplicate";
};

export type PayStatus = "unpaid" | "paid";

export type TabId =
  | "dashboard"
  | "warehouse"
  | "transfers"
  | "damages"
  | "orders"
  | "products"
  | "suppliers"
  | "history"
  | "settings"
  | "analysis"
  | "expiry";

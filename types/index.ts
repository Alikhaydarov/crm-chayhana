export type Role = "superadmin" | "restaurant1" | "restaurant2" | "shop";

export type UserInfo = {
  id: string;
  name: string;
  role: Role;
  branchName: string;
  branchIcon: string;
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
  qrCode?: string;
  supplierId?: string;
};

export type StockMap = Record<string, number>;

export type Transfer = {
  id: string;
  toBranch: string;
  items: TransferItem[];
  totalValue: number;
  requestedBy: string;
  approvedBy?: string;
  status: "pending" | "approved" | "rejected";
  note?: string;
  createdAt: string;
  updatedAt: string;
};

export type TransferItem = {
  productId: string;
  productName: string;
  quantity: number;
  unit: string;
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
};

export type TabId =
  | "dashboard"
  | "warehouse"
  | "transfers"
  | "orders"
  | "products"
  | "suppliers"
  | "shop-sales";

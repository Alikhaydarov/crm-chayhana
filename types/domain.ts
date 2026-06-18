import type { PayStatus, Role, StockMap, Transfer } from "@/types";

export type Company = {
  id: string;
  name: string;
  address: string;
  phone: string;
  createdAt: string;
};

export type CompanyPayment = {
  id: string;
  companyId: string;
  orderId: string;
  amount: number;
  note: string;
  createdAt: string;
};

export type OrderReceipt = {
  name: string;
  type: string;
  dataUrl: string;
};

export type OrderItem = {
  productId: string;
  productName: string;
  quantity: number;
  unit: string;
  pricePerUnit: number;
};

export type Order = {
  id: string;
  companyId: string;
  companyName: string;
  items: OrderItem[];
  totalPrice: number;
  paidAmount: number;
  payStatus: PayStatus;
  note: string;
  receipt?: OrderReceipt;
  createdAt: string;
};

export type ShopSaleItem = {
  barcode: string;
  sourceName: string;
  supplier: string;
  productId: string;
  productName: string;
  quantity: number;
  salesAmount: number;
  costAmount: number;
  profitAmount: number;
  averagePrice: number;
  stockBefore: number;
  stockAfter: number;
  shortage: number;
};

export type ShopSaleImport = {
  id: string;
  sourceKey: string;
  fileName: string;
  saleDate: string;
  items: ShopSaleItem[];
  totalQuantity: number;
  totalSales: number;
  totalCost: number;
  totalProfit: number;
  shortageCount: number;
  skippedRows?: { barcode: string; sourceName: string; quantity: number }[];
  createdAt: string;
};

export type Staff = {
  id: string;
  name: string;
  role: string;
  branch: string;
  phone: string;
  salary: number;
  joinDate: string;
  active: boolean;
};

export type Account = {
  id: string;
  name: string;
  role: string;
  branchName: string;
  branchSlug?: string;
  branchIcon?: string;
  active?: boolean;
};

export type Branch = {
  id: number;
  name: string;
  slug: string;
  description?: string;
  branch_type: "restaurant" | "shop";
  address: string;
  phone_number?: string;
  is_active: boolean;
  warehouse?: {
    id: number;
    name: string;
    is_main: boolean;
    branch_id: number | null;
    branch_slug: string | null;
  };
};

export type Supplier = {
  id: string;
  firm: string;
  docNumber: string;
  deliveryDate: string;
  note: string;
  items: unknown[];
  totalPrice: number;
  payStatus: PayStatus;
  paidAmount: number;
  createdAt: string;
};

export type Snapshot = {
  products: import("@/types").Product[];
  stock: StockMap;
  shopStock: StockMap;
  transfers: Transfer[];
  reports: ReportSummary | null;
  companies: Company[];
  orders: Order[];
  companyPayments: CompanyPayment[];
  shopSales: ShopSaleImport[];
  staff: Staff[];
  accounts: Account[];
  branches: Branch[];
};

export type BranchReport = {
  branch: Exclude<Role, "superadmin">;
  stockValue: number;
  lowStockCount: number;
};

export type ReportSummary = {
  mainStockValue?: number;
  totalProducts?: number;
  branchStats?: BranchReport[];
  [key: string]: unknown;
};

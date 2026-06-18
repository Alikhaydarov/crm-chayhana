"use client";
import { createContext, useContext } from "react";
import type { Product, StockMap, Transfer } from "@/types";
import type { Company, Order, CompanyPayment, ShopSaleImport, Staff, ReportSummary } from "@/types/domain";

export type AppContextType = {
  products: Product[];
  stock: StockMap;
  shopStock: StockMap;
  transfers: Transfer[];
  reports: ReportSummary | null;
  companies: Company[];
  orders: Order[];
  companyPayments: CompanyPayment[];
  shopSales: ShopSaleImport[];
  staff: Staff[];
  fetchAll: () => void;
  showToast: (msg: string, type?: "success" | "error") => void;
  t: Record<string, string>;
  lang: string;
  user: import("@/types").UserInfo;
  setTab: (tab: string) => void;
};

export const AppContext = createContext<AppContextType | null>(null);

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppContext.Provider");
  return ctx;
}

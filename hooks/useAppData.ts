"use client";
import { useState, useEffect, useCallback } from "react";
import { getSnapshotApi } from "@/lib/api";
import type { Company, Order, CompanyPayment, ShopSaleImport, Staff } from "@/lib/localStore";
import type { Product, StockMap, Transfer } from "@/types";
import { useToast } from "./useToast";

export function useAppData(userId: string | null) {
  const [products, setProducts] = useState<Product[]>([]);
  const [stock, setStock] = useState<StockMap>({});
  const [shopStock, setShopStock] = useState<StockMap>({});
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [reports, setReports] = useState<any>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [companyPayments, setCompanyPayments] = useState<CompanyPayment[]>([]);
  const [shopSales, setShopSales] = useState<ShopSaleImport[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const { toast, show: showToast } = useToast();

  const fetchAll = useCallback(async () => {
    if (!userId) return;
    try {
      const d: any = await getSnapshotApi();
      setProducts(d.products || []);
      setStock(d.stock || {});
      setShopStock(d.shopStock || {});
      setTransfers(d.transfers || []);
      setReports(d.reports);
      setCompanies(d.companies || []);
      setOrders(d.orders || []);
      setCompanyPayments(d.companyPayments || []);
      setShopSales(d.shopSales || []);
      setStaff(d.staff || []);
    } catch (error: any) {
      showToast(error?.message || "Ma'lumotlarni yuklab bo'lmadi", "error");
    }
  }, [userId, showToast]);

  useEffect(() => {
    if (userId) fetchAll();
  }, [userId, fetchAll]);

  return {
    products,
    stock,
    shopStock,
    transfers,
    reports,
    companies,
    orders,
    companyPayments,
    shopSales,
    staff,
    fetchAll,
    showToast,
    toast,
  };
}

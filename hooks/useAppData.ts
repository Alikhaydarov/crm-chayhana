"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { getSnapshotApi } from "@/lib/api";
import type { Company, Order, CompanyPayment, ShopSaleImport, Staff, ReportSummary } from "@/types/domain";
import type { Product, StockMap, Transfer, UserInfo } from "@/types";
import { useToast } from "./useToast";

export function useAppData(user: UserInfo | null) {
  const [products, setProducts] = useState<Product[]>([]);
  const [stock, setStock] = useState<StockMap>({});
  const [shopStock, setShopStock] = useState<StockMap>({});
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [reports, setReports] = useState<ReportSummary | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [companyPayments, setCompanyPayments] = useState<CompanyPayment[]>([]);
  const [shopSales, setShopSales] = useState<ShopSaleImport[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const { toast, show: showToast } = useToast();
  const loadingRef = useRef(false);

  const fetchAll = useCallback(async () => {
    if (!user || loadingRef.current) return;
    loadingRef.current = true;
    try {
      const d: any = await getSnapshotApi(user);
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
    } finally {
      loadingRef.current = false;
    }
  }, [user, showToast]);

  useEffect(() => {
    if (user) fetchAll();
  }, [user, fetchAll]);

  useEffect(() => {
    if (!user) return;

    const refreshIfVisible = () => {
      if (document.visibilityState === "visible") fetchAll();
    };
    const interval = window.setInterval(refreshIfVisible, 5000);

    window.addEventListener("focus", refreshIfVisible);
    window.addEventListener("online", refreshIfVisible);
    document.addEventListener("visibilitychange", refreshIfVisible);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshIfVisible);
      window.removeEventListener("online", refreshIfVisible);
      document.removeEventListener("visibilitychange", refreshIfVisible);
    };
  }, [user, fetchAll]);

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

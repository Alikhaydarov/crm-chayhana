"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { getSnapshotApi } from "@/lib/api";
import type { Account, Branch, Company, Order, CompanyPayment, ShopSaleImport, Staff, ReportSummary } from "@/types/domain";
import type { DamageRequest, Product, StockMap, Transfer, UserInfo } from "@/types";
import { useToast } from "./useToast";

export function useAppData(user: UserInfo | null) {
  const [products, setProducts] = useState<Product[]>([]);
  const [stock, setStock] = useState<StockMap>({});
  const [mainStock, setMainStock] = useState<StockMap>({});
  const [shopStock, setShopStock] = useState<StockMap>({});
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [damages, setDamages] = useState<DamageRequest[]>([]);
  const [reports, setReports] = useState<ReportSummary | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [companyPayments, setCompanyPayments] = useState<CompanyPayment[]>([]);
  const [shopSales, setShopSales] = useState<ShopSaleImport[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast, show: showToast } = useToast();
  const loadingRef = useRef(false);
  const pendingRefreshRef = useRef(false);
  const pendingRefreshSilentRef = useRef(true);
  const hasDataRef = useRef(false);

  const fetchAll = useCallback(async (silent = false) => {
    if (!user) return;
    if (loadingRef.current) {
      pendingRefreshRef.current = true;
      pendingRefreshSilentRef.current = pendingRefreshSilentRef.current && silent;
      return;
    }
    loadingRef.current = true;
    setIsRefreshing(true);
    if (!silent && !hasDataRef.current) setIsLoading(true);
    try {
      const d: any = await getSnapshotApi(user);
      setProducts(d.products || []);
      setStock(d.stock || {});
      setMainStock(d.mainStock || (user.role === "superadmin" ? d.stock : {}));
      setShopStock(user.role === "shop" ? (d.stock || d.shopStock || {}) : (d.shopStock || {}));
      setTransfers(d.transfers || []);
      setDamages(d.damages || []);
      setReports(d.reports);
      setCompanies(d.companies || []);
      setOrders(d.orders || []);
      setCompanyPayments(d.companyPayments || []);
      setShopSales(d.shopSales || []);
      setStaff(d.staff || []);
      const accountData =
        d.accounts?.results ??
        d.accounts?.accounts ??
        d.accounts ??
        d.users?.results ??
        d.users?.users ??
        d.users ??
        [];
      setAccounts(Array.isArray(accountData) ? accountData : []);
      setBranches(Array.isArray(d.branches) ? d.branches : []);
      hasDataRef.current = true;
    } catch (error: any) {
      if (!silent) {
        showToast(error?.message || "Ma'lumotlarni yuklab bo'lmadi", "error");
      }
    } finally {
      loadingRef.current = false;
      setIsLoading(false);
      setIsRefreshing(false);
      if (pendingRefreshRef.current) {
        const nextSilent = pendingRefreshSilentRef.current;
        pendingRefreshRef.current = false;
        pendingRefreshSilentRef.current = true;
        queueMicrotask(() => fetchAll(nextSilent));
      }
    }
  }, [user, showToast]);

  useEffect(() => {
    if (user) fetchAll();
  }, [user, fetchAll]);

  useEffect(() => {
    if (!user) return;

    const refreshIfVisible = () => {
      if (document.visibilityState === "visible") fetchAll(true);
    };
    window.addEventListener("focus", refreshIfVisible);
    window.addEventListener("online", refreshIfVisible);
    document.addEventListener("visibilitychange", refreshIfVisible);
    const interval = window.setInterval(refreshIfVisible, 5000);

    return () => {
      window.removeEventListener("focus", refreshIfVisible);
      window.removeEventListener("online", refreshIfVisible);
      document.removeEventListener("visibilitychange", refreshIfVisible);
      window.clearInterval(interval);
    };
  }, [user, fetchAll]);

  return {
    products,
    stock,
    mainStock,
    shopStock,
    transfers,
    damages,
    reports,
    companies,
    orders,
    companyPayments,
    shopSales,
    staff,
    accounts,
    branches,
    isLoading,
    isRefreshing,
    fetchAll,
    showToast,
    toast,
  };
}

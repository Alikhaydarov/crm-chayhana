"use client";
import { useApp } from "@/lib/AppContext";
import { ProductsTab } from "@/components/products/ProductsTab";
export default function ProductsPage() {
  const ctx = useApp();
  return <ProductsTab {...ctx} />;
}

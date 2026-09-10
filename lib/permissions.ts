import type { Role, TabId } from "@/types";

export const ROLE_TABS: Record<Role, readonly TabId[]> = {
  superadmin: ["dashboard", "warehouse", "transfers", "damages", "orders", "products", "suppliers", "history", "settings", "analysis", "expiry"],
  restaurant1: ["dashboard", "warehouse", "transfers", "damages", "orders", "expiry"],
  restaurant2: ["dashboard", "warehouse", "transfers", "damages", "orders", "expiry"],
  shop: ["dashboard", "warehouse", "transfers", "damages", "analysis", "expiry"],
};

export function canAccessTab(role: Role, tab: TabId) {
  return Boolean(ROLE_TABS[role]?.includes(tab));
}

export function branchForRole(role: Role) {
  return role === "superadmin" ? "main" : role;
}

import type { Role, TabId } from "@/types";

export const ROLE_TABS: Record<Role, readonly TabId[]> = {
  superadmin: ["dashboard", "warehouse", "transfers", "orders", "products", "suppliers", "analysis"],
  restaurant1: ["dashboard", "warehouse", "transfers", "orders"],
  restaurant2: ["dashboard", "warehouse", "transfers", "orders"],
  shop: ["dashboard", "warehouse", "transfers", "analysis"],
};

export function canAccessTab(role: Role, tab: TabId) {
  return Boolean(ROLE_TABS[role]?.includes(tab));
}

export function branchForRole(role: Role) {
  return role === "superadmin" ? "main" : role;
}

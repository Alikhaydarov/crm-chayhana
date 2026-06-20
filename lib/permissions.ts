import type { Role, TabId, UserInfo } from "@/types";
import type { Branch } from "@/types/domain";

export const ROLE_TABS: Record<Role, readonly TabId[]> = {
  superadmin: ["dashboard", "warehouse", "transfers", "orders", "products", "suppliers", "analysis"],
  restaurant1: ["dashboard", "warehouse", "transfers", "orders"],
  restaurant2: ["dashboard", "warehouse", "transfers", "orders"],
  shop: ["dashboard", "warehouse", "transfers", "analysis"],
};

function normalized(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

export function branchTypeOf(value: any): "shop" | "restaurant" | "" {
  const type = normalized(
    value?.branch_type ??
    value?.branchType ??
    value?.type ??
    value?.branch?.branch_type ??
    value?.branch?.branchType ??
    value?.branch?.type ??
    value?.branch_detail?.branch_type ??
    value?.branch_detail?.branchType ??
    value?.branch_detail?.type
  );

  if (["shop", "store", "market", "dokon", "do'kon"].includes(type)) return "shop";
  if (["restaurant", "cafe", "chayhana", "oshxona"].includes(type)) return "restaurant";
  return "";
}

export function branchSlugOf(value: any) {
  return String(
    value?.branch_slug ??
    value?.branchSlug ??
    value?.slug ??
    value?.branch?.slug ??
    value?.branch_detail?.slug ??
    value?.warehouse?.branch_slug ??
    ""
  ).trim();
}

export function findUserBranch(user: UserInfo | null | undefined, branches: Branch[]) {
  if (!user) return null;
  const rawUser = user as any;
  const ids = [user.branchId, rawUser.branch_id, rawUser.branch?.id, rawUser.branch_detail?.id]
    .filter((value) => value != null)
    .map(String);
  const slugs = [branchSlugOf(user), rawUser.branch?.slug, rawUser.branch_detail?.slug]
    .map(normalized)
    .filter(Boolean);
  const names = [user.branchName, rawUser.branch_name, rawUser.branch?.name, rawUser.branch_detail?.name]
    .map(normalized)
    .filter(Boolean);

  return branches.find((branch: any) =>
    ids.includes(String(branch.id)) ||
    slugs.includes(normalized(branch.slug)) ||
    slugs.includes(normalized(branch.warehouse?.branch_slug)) ||
    names.includes(normalized(branch.name))
  ) || null;
}

export function isShopBranchUser(user: UserInfo | null | undefined, branches: Branch[]) {
  if (!user || user.role === "superadmin") return false;
  const branch = findUserBranch(user, branches);
  return branchTypeOf(branch) === "shop" || branchTypeOf(user) === "shop" || user.role === "shop";
}

export function branchForUser(user: UserInfo, branches: Branch[] = []) {
  if (user.role === "superadmin") return "main";
  const branch = findUserBranch(user, branches);
  return branchSlugOf(branch) || branchSlugOf(user) || user.role;
}

export function canAccessTab(role: Role, tab: TabId) {
  return Boolean(ROLE_TABS[role]?.includes(tab));
}

export function canAccessUserTab(user: UserInfo | null | undefined, branches: Branch[], tab: TabId) {
  if (!user) return false;
  if (isShopBranchUser(user, branches)) {
    return ["dashboard", "warehouse", "transfers", "analysis"].includes(tab);
  }
  return canAccessTab(user.role, tab);
}

export function branchForRole(role: Role) {
  return role === "superadmin" ? "main" : role;
}

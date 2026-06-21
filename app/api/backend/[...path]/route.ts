import { NextRequest, NextResponse } from "next/server";

const DEFAULT_BACKEND_URL =
  "https://remedial-coral-dispatch.ngrok-free.dev/api/v1";

const SHOP_SALES_BRANCH_PARAMS = new Set(["branch", "branch_slug", "warehouse_slug"]);

function saleBranch(item: any) {
  return String(
    item?.branchSlug ?? item?.branch_slug ?? item?.branch?.slug ??
    item?.warehouseSlug ?? item?.warehouse_slug ?? item?.warehouse?.slug ?? "",
  ).trim();
}

function shopSalesList(payload: any): any[] {
  const value =
    payload?.data?.results ?? payload?.data?.items ?? payload?.data?.shopSales ?? payload?.data?.shop_sales ??
    payload?.results ?? payload?.items ?? payload?.shopSales ?? payload?.shop_sales ?? payload?.data ?? payload;
  return Array.isArray(value) ? value : [];
}

function scopeShopSalesList(value: unknown, branchSlug: string) {
  if (!Array.isArray(value)) return value;
  return value
    .filter((item) => {
      const existingBranch = saleBranch(item);
      return !existingBranch || existingBranch === branchSlug;
    })
    .map((item) => {
      if (!item || typeof item !== "object" || saleBranch(item)) return item;
      return { ...item, branchSlug, branch_slug: branchSlug };
    });
}

function scopeShopSalesPayload(payload: any, branchSlug: string): any {
  if (!branchSlug) return payload;
  if (Array.isArray(payload)) return scopeShopSalesList(payload, branchSlug);
  if (!payload || typeof payload !== "object") return payload;

  const next = { ...payload };
  for (const key of ["results", "items", "shopSales", "shop_sales"]) {
    if (Array.isArray(next[key])) next[key] = scopeShopSalesList(next[key], branchSlug);
  }
  if (Array.isArray(next.data)) next.data = scopeShopSalesList(next.data, branchSlug);
  else if (next.data && typeof next.data === "object") {
    next.data = scopeShopSalesPayload(next.data, branchSlug);
  }
  return next;
}

async function getShopSalesCount(baseUrl: string, headers: Headers) {
  try {
    const response = await fetch(`${baseUrl}/shop-sales/?page_size=1000`, {
      headers: {
        accept: "application/json",
        authorization: headers.get("authorization") || "",
        "ngrok-skip-browser-warning": "true",
      },
      cache: "no-store",
    });
    if (!response.ok) return null;
    return shopSalesList(await response.json()).length;
  } catch {
    return null;
  }
}

async function forward(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const baseUrl = (process.env.DJANGO_API_BASE_URL || DEFAULT_BACKEND_URL).replace(/\/$/, "");
  const pathName = path.join("/");
  const target = new URL(`${baseUrl}/${pathName}/`);
  const isShopSalesGet = request.method === "GET" && pathName === "shop-sales";
  const isShopSalesUpload = request.method === "POST" && pathName === "shop-sales/upload";
  const requestedBranch =
    request.nextUrl.searchParams.get("branch_slug") ||
    request.nextUrl.searchParams.get("branch") ||
    request.nextUrl.searchParams.get("warehouse_slug") ||
    "";

  request.nextUrl.searchParams.forEach((value, key) => {
    if (isShopSalesGet && SHOP_SALES_BRANCH_PARAMS.has(key)) return;
    target.searchParams.append(key, value);
  });

  const headers = new Headers();
  const authorization = request.headers.get("authorization");
  const contentType = request.headers.get("content-type");
  const acceptLanguage = request.headers.get("accept-language");

  if (authorization) headers.set("authorization", authorization);
  if (contentType) headers.set("content-type", contentType);
  if (acceptLanguage) headers.set("accept-language", acceptLanguage);
  headers.set("accept", "application/json");
  headers.set("ngrok-skip-browser-warning", "true");

  try {
    const countBefore = isShopSalesUpload
      ? await getShopSalesCount(baseUrl, headers)
      : null;
    const response = await fetch(target, {
      method: request.method,
      headers,
      body: request.method === "GET" || request.method === "HEAD"
        ? undefined
        : await request.arrayBuffer(),
      cache: "no-store",
    });

    if (isShopSalesUpload && response.status >= 500 && countBefore !== null) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      const countAfter = await getShopSalesCount(baseUrl, headers);
      if (countAfter !== null && countAfter > countBefore) {
        return NextResponse.json({
          success: true,
          message: "Excel import qilindi",
          saved_after_backend_error: true,
        });
      }
    }

    if (response.status >= 500) {
      console.error("[django-proxy] Backend request failed", {
        method: request.method,
        path: pathName,
        status: response.status,
      });
    }

    const responseContentType = response.headers.get("content-type") || "";
    if (isShopSalesGet && response.ok && responseContentType.includes("application/json")) {
      const payload = await response.json();
      return NextResponse.json(scopeShopSalesPayload(payload, requestedBranch), {
        status: response.status,
      });
    }

    const responseHeaders = new Headers();
    if (responseContentType) responseHeaders.set("content-type", responseContentType);

    return new NextResponse(response.body, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("[django-proxy] Backend is unreachable", {
      method: request.method,
      path: pathName,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      {
        success: false,
        message: "Backend server bilan bog'lanib bo'lmadi. Keyinroq qayta urinib ko'ring.",
      },
      { status: 502 },
    );
  }
}

export const GET = forward;
export const POST = forward;
export const PUT = forward;
export const PATCH = forward;
export const DELETE = forward;
export const OPTIONS = forward;

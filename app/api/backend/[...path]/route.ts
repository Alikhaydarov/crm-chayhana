import { NextRequest, NextResponse } from "next/server";

const DEFAULT_BACKEND_URL =
  "https://remedial-coral-dispatch.ngrok-free.dev/api/v1";

const EXCEL_FILE_FIELDS = ["file", "excel", "excel_file"] as const;

async function shopSalesUploadBody(request: NextRequest) {
  const incoming = await request.formData();
  const uploaded = EXCEL_FILE_FIELDS
    .map((field) => incoming.get(field))
    .find((value): value is File => value instanceof File && value.size > 0);

  if (!uploaded) {
    throw new Error("Excel fayl brauzerdan bo'sh yuborildi");
  }

  const outgoing = new FormData();
  incoming.forEach((value, key) => {
    if (!EXCEL_FILE_FIELDS.includes(key as (typeof EXCEL_FILE_FIELDS)[number])) {
      outgoing.append(key, value);
    }
  });

  // Backend versiyalarida upload maydoni turlicha nomlangan. Bir xil haqiqiy
  // faylni barcha qo'llab-quvvatlanadigan nomlarda yuboramiz. fetch yangi
  // multipart boundary va Content-Length'ni o'zi hisoblaydi.
  for (const field of EXCEL_FILE_FIELDS) {
    outgoing.append(field, uploaded, uploaded.name);
  }
  outgoing.set("file_name", uploaded.name);
  outgoing.set("filename", uploaded.name);

  return outgoing;
}

async function forward(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const routePath = path.join("/");
  const baseUrl = (process.env.DJANGO_API_BASE_URL || DEFAULT_BACKEND_URL).replace(/\/$/, "");
  const target = new URL(`${baseUrl}/${routePath}/`);

  request.nextUrl.searchParams.forEach((value, key) => target.searchParams.append(key, value));

  const headers = new Headers();
  const authorization = request.headers.get("authorization");
  const contentType = request.headers.get("content-type");
  const acceptLanguage = request.headers.get("accept-language");
  const isShopSalesUpload = request.method === "POST" && routePath === "shop-sales/upload";

  if (authorization) headers.set("authorization", authorization);
  if (contentType && !isShopSalesUpload) headers.set("content-type", contentType);
  if (acceptLanguage) headers.set("accept-language", acceptLanguage);
  headers.set("accept", "application/json");
  headers.set("ngrok-skip-browser-warning", "true");

  try {
    const body = request.method === "GET" || request.method === "HEAD"
      ? undefined
      : isShopSalesUpload
        ? await shopSalesUploadBody(request)
        : await request.arrayBuffer();

    const response = await fetch(target, {
      method: request.method,
      headers,
      body,
      cache: "no-store",
    });

    if (response.status >= 500) {
      console.error("[django-proxy] Backend request failed", {
        method: request.method,
        path: routePath,
        status: response.status,
      });
    }

    const responseHeaders = new Headers();
    const responseContentType = response.headers.get("content-type");
    if (responseContentType) responseHeaders.set("content-type", responseContentType);

    return new NextResponse(response.body, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("[django-proxy] Backend is unreachable", {
      method: request.method,
      path: routePath,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error && error.message.includes("Excel fayl")
          ? error.message
          : "Backend server bilan bog'lanib bo'lmadi. Keyinroq qayta urinib ko'ring.",
      },
      { status: error instanceof Error && error.message.includes("Excel fayl") ? 400 : 502 },
    );
  }
}

export const GET = forward;
export const POST = forward;
export const PUT = forward;
export const PATCH = forward;
export const DELETE = forward;
export const OPTIONS = forward;

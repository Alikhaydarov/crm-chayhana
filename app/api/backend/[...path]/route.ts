import { NextRequest, NextResponse } from "next/server";

const DEFAULT_BACKEND_URL =
  "https://remedial-coral-dispatch.ngrok-free.dev/api/v1";

async function forward(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const baseUrl = (process.env.DJANGO_API_BASE_URL || DEFAULT_BACKEND_URL).replace(/\/$/, "");
  const target = new URL(`${baseUrl}/${path.join("/")}/`);

  request.nextUrl.searchParams.forEach((value, key) => target.searchParams.append(key, value));

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
    const response = await fetch(target, {
      method: request.method,
      headers,
      body: request.method === "GET" || request.method === "HEAD"
        ? undefined
        : await request.arrayBuffer(),
      cache: "no-store",
    });

    if (response.status >= 500) {
      console.error("[django-proxy] Backend request failed", {
        method: request.method,
        path: path.join("/"),
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
      path: path.join("/"),
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

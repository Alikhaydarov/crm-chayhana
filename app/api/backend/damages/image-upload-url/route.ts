import { NextRequest, NextResponse } from "next/server";
import {
  DAMAGE_BUCKET,
  MAX_DAMAGE_IMAGE_BYTES,
  authDamageUser,
  damageErrorStatus,
  damageExtension,
  readDamageBody,
  signDamageImageUpload,
  storageApiUrl,
  storageRequest,
  type DamageImageUpload,
} from "@/lib/server/damage-backend";

export const runtime = "nodejs";
export const preferredRegion = "icn1";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function storageAdminFetch(path: string, init: RequestInit = {}) {
  if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error("Supabase env missing");
  const headers = new Headers(init.headers);
  headers.set("apikey", SUPABASE_KEY);
  headers.set("authorization", `Bearer ${SUPABASE_KEY}`);
  headers.set("accept", "application/json");
  if (init.body && !headers.has("content-type")) headers.set("content-type", "application/json");
  return fetch(`${SUPABASE_URL.replace(/\/$/, "")}/storage/v1${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });
}

async function storagePayload(response: Response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

function storageMessage(data: any, fallback: string) {
  return data?.message || data?.error || data?.hint || data?.details || fallback;
}

async function ensureDamageBucketForUpload() {
  const existing = await storageAdminFetch(`/bucket/${DAMAGE_BUCKET}`);
  if (existing.ok) {
    await existing.arrayBuffer().catch(() => null);
    return;
  }

  const existingData = await storagePayload(existing);
  const existingMessage = storageMessage(existingData, `Storage ${existing.status}`);
  const isMissing = existing.status === 404 || /bucket not found/i.test(existingMessage);
  if (!isMissing) throw new Error(existingMessage);

  const created = await storageAdminFetch("/bucket", {
    method: "POST",
    body: JSON.stringify({
      id: DAMAGE_BUCKET,
      name: DAMAGE_BUCKET,
      public: false,
    }),
  });

  if (created.ok) {
    await created.arrayBuffer().catch(() => null);
    return;
  }

  const createData = await storagePayload(created);
  const recheck = await storageAdminFetch(`/bucket/${DAMAGE_BUCKET}`);
  if (recheck.ok) {
    await recheck.arrayBuffer().catch(() => null);
    return;
  }
  await recheck.arrayBuffer().catch(() => null);
  throw new Error(storageMessage(createData, `Storage bucket yaratilmadi (${created.status})`));
}

export async function POST(request: NextRequest) {
  try {
    const user = authDamageUser(request);
    const body = await readDamageBody(request);
    const type = String(body.type || "");
    const size = Number(body.size || 0);
    const extension = damageExtension(type);

    if (!extension) {
      return NextResponse.json(
        { success: false, message: "Brak rasmi faqat JPG, PNG yoki WEBP bo'lishi kerak" },
        { status: 400 },
      );
    }
    if (!Number.isFinite(size) || size <= 0 || size > MAX_DAMAGE_IMAGE_BYTES) {
      return NextResponse.json(
        { success: false, message: "Brak rasmi 10 MB dan kichik bo'lishi kerak" },
        { status: 400 },
      );
    }

    await ensureDamageBucketForUpload();

    const requestId = crypto.randomUUID();
    const path = `${requestId}/${crypto.randomUUID()}.${extension}`;
    const signed = await storageRequest<any>(`/object/upload/sign/${DAMAGE_BUCKET}/${path}`, {
      method: "POST",
      body: "{}",
    });
    if (!signed?.url) throw new Error("Storage upload URL qaytarmadi");

    const upload: DamageImageUpload = {
      requestId,
      path,
      name: String(body.name || "damage").slice(0, 180),
      type,
      size,
      userId: user.id,
      exp: Math.floor(Date.now() / 1000) + 15 * 60,
    };

    return NextResponse.json({
      requestId,
      path,
      uploadUrl: storageApiUrl(signed.url),
      uploadToken: signDamageImageUpload(upload),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Server xatosi";
    console.error("[crm:damage-image-upload-url]", message);
    return NextResponse.json({ success: false, message }, { status: damageErrorStatus(message) });
  }
}

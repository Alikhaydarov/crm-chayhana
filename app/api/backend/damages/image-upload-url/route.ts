import { NextRequest, NextResponse } from "next/server";
import {
  DAMAGE_BUCKET,
  MAX_DAMAGE_IMAGE_BYTES,
  authDamageUser,
  damageErrorStatus,
  damageExtension,
  ensureDamageBucket,
  readDamageBody,
  signDamageImageUpload,
  storageApiUrl,
  storageRequest,
  type DamageImageUpload,
} from "@/lib/server/damage-backend";

export const runtime = "nodejs";
export const preferredRegion = "icn1";

export async function POST(request: NextRequest) {
  try {
    const user = authDamageUser(request);
    const body = await readDamageBody(request);
    const type = String(body.type || "");
    const size = Number(body.size || 0);
    const extension = damageExtension(type);

    if (!extension) {
      return NextResponse.json({ success: false, message: "Brak rasmi faqat JPG, PNG yoki WEBP bo'lishi kerak" }, { status: 400 });
    }
    if (!Number.isFinite(size) || size <= 0 || size > MAX_DAMAGE_IMAGE_BYTES) {
      return NextResponse.json({ success: false, message: "Brak rasmi 10 MB dan kichik bo'lishi kerak" }, { status: 400 });
    }

    await ensureDamageBucket();

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

import { NextRequest, NextResponse } from "next/server";
import {
  DAMAGE_BUCKET,
  authDamageUser,
  damageErrorStatus,
  damageRpc,
  mapDamage,
  readDamageBody,
  removeDamageImage,
  storageApiUrl,
  storageRequest,
  supabaseRest,
  verifyDamageImageUpload,
  type DamageImageUpload,
} from "@/lib/server/damage-backend";

export const runtime = "nodejs";
export const preferredRegion = "icn1";

const REQUEST_BRANCHES = new Set(["restaurant1", "restaurant2", "shop"]);
const MAX_LIST_ROWS = 500;

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export async function GET(request: NextRequest) {
  try {
    const user = authDamageUser(request);
    const query = user.role === "superadmin"
      ? `?select=*&order=created_at.desc&limit=${MAX_LIST_ROWS}`
      : `?select=*&branch=eq.${encodeURIComponent(user.role)}&order=created_at.desc&limit=${MAX_LIST_ROWS}`;
    const rows = await supabaseRest<any[]>("damaged_requests", {}, query);
    return json(rows.map(mapDamage));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Server xatosi";
    console.error("[crm:damages:get]", message);
    return json({ success: false, message }, damageErrorStatus(message));
  }
}

export async function POST(request: NextRequest) {
  let uploadForCleanup: DamageImageUpload | null = null;
  let rowCreated = false;

  try {
    const user = authDamageUser(request);
    const body = await readDamageBody(request);
    const isMainStockDamage = user.role === "superadmin";
    const branch = isMainStockDamage ? "main" : user.role;
    if (!isMainStockDamage && !REQUEST_BRANCHES.has(branch)) throw new Error("Sklad noto'g'ri");

    const quantity = Number(body.quantity || 0);
    const reason = String(body.reason || "").trim();
    const productId = String(body.productId || "").trim();
    if (!Number.isFinite(quantity) || quantity <= 0) throw new Error("Miqdor noto'g'ri");
    if (reason.length < 3) throw new Error("Brak sababini yozing");
    if (!productId) throw new Error("Mahsulot kerak");
    if (!body.imageUploadToken) throw new Error("Brak rasmi shart");

    const upload = verifyDamageImageUpload(body.imageUploadToken, user);
    if (!upload) throw new Error("Brak rasmi imzosi eskirgan yoki noto'g'ri");
    uploadForCleanup = upload;

    await storageRequest(`/object/info/${DAMAGE_BUCKET}/${upload.path}`);

    const [product] = await supabaseRest<any[]>(
      "products",
      {},
      `?select=*&id=eq.${encodeURIComponent(productId)}&limit=1`,
    );
    if (!product) throw new Error("Mahsulot topilmadi");

    if (isMainStockDamage) {
      const [stockRow] = await supabaseRest<any[]>(
        "stock",
        {},
        `?select=quantity&product_id=eq.${encodeURIComponent(product.id)}&branch=eq.main&limit=1`,
      );
      if (Number(stockRow?.quantity || 0) < quantity) {
        throw new Error("Skladda brak miqdori uchun yetarli mahsulot yo'q");
      }
    }

    const signed = await storageRequest<any>(`/object/sign/${DAMAGE_BUCKET}/${upload.path}`, {
      method: "POST",
      body: JSON.stringify({ expiresIn: 31536000 }),
    });
    const signedPath = signed?.signedURL || signed?.signedUrl;
    if (!signedPath) throw new Error("Brak rasmi uchun ko'rish URL yaratilmadi");

    const image = {
      name: upload.name,
      type: upload.type,
      storagePath: upload.path,
      dataUrl: storageApiUrl(signedPath),
    };

    const [created] = await supabaseRest<any[]>("damaged_requests", {
      method: "POST",
      headers: { prefer: "return=representation" },
      body: JSON.stringify({
        id: upload.requestId,
        branch,
        product_id: product.id,
        product_name: product.name,
        quantity,
        unit: product.unit || "",
        reason,
        image,
        requested_by: user.name,
        status: "pending",
      }),
    });
    if (!created) throw new Error("Brak so'rovi saqlanmadi");
    rowCreated = true;

    if (!isMainStockDamage) return json(mapDamage(created), 201);

    try {
      const updated = await damageRpc<any>("process_damaged_request", {
        p_request_id: created.id,
        p_action: "approve",
        p_approved_by: user.name,
      });
      return json(mapDamage(updated), 201);
    } catch (processError) {
      let existing: any = null;
      try {
        [existing] = await supabaseRest<any[]>(
          "damaged_requests",
          {},
          `?select=*&id=eq.${encodeURIComponent(created.id)}&limit=1`,
        );
      } catch {
        // If state cannot be verified, keep the row/image rather than risking data loss.
      }

      if (existing?.status === "approved") return json(mapDamage(existing), 201);

      if (existing?.status === "pending") {
        try {
          await supabaseRest("damaged_requests", { method: "DELETE" }, `?id=eq.${encodeURIComponent(created.id)}`);
          rowCreated = false;
          await removeDamageImage(upload.path);
          uploadForCleanup = null;
        } catch {
          // Preserve the pending row if rollback itself fails; this is safer than deleting its image only.
        }
      }

      throw processError;
    }
  } catch (error) {
    if (uploadForCleanup && !rowCreated) await removeDamageImage(uploadForCleanup.path);
    const message = error instanceof Error ? error.message : "Server xatosi";
    console.error("[crm:damages:post]", message);
    return json({ success: false, message }, damageErrorStatus(message));
  }
}

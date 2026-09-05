import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

export const MAX_DAMAGE_IMAGE_BYTES = 10 * 1024 * 1024;
export const DAMAGE_BUCKET = "damage-images";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const AUTH_SECRET = process.env.AUTH_SECRET;
const DAMAGE_MIME_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const DAMAGE_ROLES = new Set(["superadmin", "restaurant1", "restaurant2", "shop"]);

export type DamageUser = {
  id: string;
  name: string;
  role: "superadmin" | "restaurant1" | "restaurant2" | "shop";
};

export type DamageImageUpload = {
  requestId: string;
  path: string;
  name: string;
  type: string;
  size: number;
  userId: string;
  exp: number;
};

function requireSupabaseEnv() {
  if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error("Supabase env missing");
}

function requireAuthSecret() {
  if (!AUTH_SECRET) throw new Error("AUTH_SECRET env missing");
}

function baseUrl() {
  requireSupabaseEnv();
  return SUPABASE_URL!.replace(/\/$/, "");
}

async function responsePayload(response: Response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

function responseMessage(data: any, fallback: string) {
  return data?.message || data?.error || data?.hint || data?.details || fallback;
}

export async function readDamageBody(request: NextRequest) {
  const text = await request.text();
  if (Buffer.byteLength(text, "utf8") > 1024 * 1024) throw new Error("So'rov hajmi juda katta");
  if (!text) return {} as Record<string, any>;
  try {
    return JSON.parse(text) as Record<string, any>;
  } catch {
    throw new Error("So'rov ma'lumoti noto'g'ri");
  }
}

export function authDamageUser(request: NextRequest): DamageUser {
  requireAuthSecret();
  const raw = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!raw) throw new Error("Avtorizatsiya kerak");

  try {
    const [payload, signature] = raw.split(".");
    if (!payload || !signature) throw new Error("invalid token");
    const expected = createHmac("sha256", AUTH_SECRET!).update(payload).digest();
    const actual = Buffer.from(signature, "base64url");
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new Error("invalid token");
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (data.type !== "access" || Number(data.exp) <= Math.floor(Date.now() / 1000) || !DAMAGE_ROLES.has(data.role)) {
      throw new Error("invalid token");
    }
    return { id: String(data.id), name: String(data.name || ""), role: data.role } as DamageUser;
  } catch {
    throw new Error("Avtorizatsiya kerak");
  }
}

export async function supabaseRest<T>(table: string, init: RequestInit = {}, query = ""): Promise<T> {
  requireSupabaseEnv();
  const headers = new Headers(init.headers);
  headers.set("apikey", SUPABASE_KEY!);
  headers.set("authorization", `Bearer ${SUPABASE_KEY}`);
  headers.set("accept", "application/json");
  if (init.body && !headers.has("content-type")) headers.set("content-type", "application/json");
  const response = await fetch(`${baseUrl()}/rest/v1/${table}${query}`, { ...init, headers, cache: "no-store" });
  const data = await responsePayload(response);
  if (!response.ok) throw new Error(responseMessage(data, `Supabase ${response.status}`));
  return data as T;
}

export function damageRpc<T>(name: string, body: Record<string, unknown>) {
  return supabaseRest<T>(`rpc/${name}`, { method: "POST", body: JSON.stringify(body) });
}

async function storageFetch(path: string, init: RequestInit = {}) {
  requireSupabaseEnv();
  const headers = new Headers(init.headers);
  headers.set("apikey", SUPABASE_KEY!);
  headers.set("authorization", `Bearer ${SUPABASE_KEY}`);
  if (init.body && !headers.has("content-type")) headers.set("content-type", "application/json");
  return fetch(`${baseUrl()}/storage/v1${path}`, { ...init, headers, cache: "no-store" });
}

export async function storageRequest<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await storageFetch(path, init);
  const data = await responsePayload(response);
  if (!response.ok) throw new Error(responseMessage(data, `Storage ${response.status}`));
  return data as T;
}

let damageBucketReady: Promise<void> | null = null;

export async function ensureDamageBucket() {
  if (!damageBucketReady) {
    damageBucketReady = (async () => {
      const existing = await storageFetch(`/bucket/${DAMAGE_BUCKET}`);
      if (existing.ok) {
        await existing.arrayBuffer().catch(() => null);
        return;
      }
      const existingData = await responsePayload(existing);
      if (existing.status !== 404) throw new Error(responseMessage(existingData, `Storage ${existing.status}`));

      const created = await storageFetch("/bucket", {
        method: "POST",
        body: JSON.stringify({ id: DAMAGE_BUCKET, name: DAMAGE_BUCKET, public: false }),
      });
      if (created.ok) {
        await created.arrayBuffer().catch(() => null);
        return;
      }

      const createData = await responsePayload(created);
      const recheck = await storageFetch(`/bucket/${DAMAGE_BUCKET}`);
      if (recheck.ok) {
        await recheck.arrayBuffer().catch(() => null);
        return;
      }
      await recheck.arrayBuffer().catch(() => null);
      throw new Error(responseMessage(createData, `Storage bucket yaratilmadi (${created.status})`));
    })().catch((error) => {
      damageBucketReady = null;
      throw error;
    });
  }
  return damageBucketReady;
}

export function damageExtension(type: string) {
  return DAMAGE_MIME_TYPES[type] || null;
}

export function signDamageImageUpload(payload: DamageImageUpload) {
  requireAuthSecret();
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = createHmac("sha256", AUTH_SECRET!).update(`damage-image.${encoded}`).digest("base64url");
  return `${encoded}.${signature}`;
}

export function verifyDamageImageUpload(value: unknown, user: DamageUser): DamageImageUpload | null {
  if (!AUTH_SECRET || typeof value !== "string") return null;
  try {
    const [encoded, signature] = value.split(".");
    if (!encoded || !signature) return null;
    const expected = createHmac("sha256", AUTH_SECRET).update(`damage-image.${encoded}`).digest();
    const actual = Buffer.from(signature, "base64url");
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as DamageImageUpload;
    const extension = damageExtension(payload.type);
    if (
      payload.userId !== user.id
      || payload.exp <= Math.floor(Date.now() / 1000)
      || payload.size <= 0
      || payload.size > MAX_DAMAGE_IMAGE_BYTES
      || !extension
      || !payload.path.startsWith(`${payload.requestId}/`)
      || !payload.path.endsWith(`.${extension}`)
    ) return null;
    return payload;
  } catch {
    return null;
  }
}

export function storageApiUrl(path: string) {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${baseUrl()}/storage/v1${normalized}`;
}

export async function removeDamageImage(path: string) {
  if (!path) return;
  try {
    const response = await storageFetch(`/object/${DAMAGE_BUCKET}/${path}`, { method: "DELETE" });
    await response.arrayBuffer().catch(() => null);
  } catch {
    // Cleanup must never hide the original API error.
  }
}

export function mapDamage(row: any) {
  return {
    id: row.id,
    branch: row.branch,
    productId: row.product_id,
    productName: row.product_name || "",
    quantity: Number(row.quantity || 0),
    unit: row.unit || "",
    reason: row.reason || "",
    image: row.image || undefined,
    requestedBy: row.requested_by || "",
    approvedBy: row.approved_by || "",
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function damageErrorStatus(message: string) {
  if (message === "Avtorizatsiya kerak") return 401;
  if (/ruxsat yo'q/i.test(message)) return 403;
  if (/topilmadi/i.test(message)) return 404;
  if (/duplicate key|unique constraint|already exists|avval qayta ishlangan/i.test(message)) return 409;
  if (/noto'g'ri|kerak|shart|eskirgan|kichik bo'lishi|katta|yo'q|musbat|yetarli|miqdor|sabab/i.test(message)) return 400;
  return 500;
}

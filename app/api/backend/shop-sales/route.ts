import { NextRequest, NextResponse } from "next/server";
import { authDamageUser, damageErrorStatus, supabaseRest } from "@/lib/server/damage-backend";

export const runtime = "nodejs";
export const preferredRegion = "icn1";

const MAX_LIST_ROWS = 500;

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

function missingShopSalesTable(message: string) {
  return /shop_sales/i.test(message) && /not found|does not exist|schema cache|topilmadi/i.test(message);
}

function mapShopSale(row: any) {
  return {
    id: row.id,
    sourceKey: row.source_key || "",
    fileName: row.file_name || "",
    saleDate: row.sale_date || "",
    items: row.items || [],
    totalQuantity: Number(row.total_quantity || 0),
    totalSales: Number(row.total_sales || 0),
    totalCost: Number(row.total_cost || 0),
    totalProfit: Number(row.total_profit || 0),
    shortageCount: Number(row.shortage_count || 0),
    skippedRows: row.skipped_rows || [],
    createdAt: row.created_at,
  };
}

export async function GET(request: NextRequest) {
  try {
    const user = authDamageUser(request);
    if (user.role !== "superadmin" && user.role !== "shop") return json([]);

    try {
      const rows = await supabaseRest<any[]>(
        "shop_sales",
        {},
        `?select=*&order=sale_date.desc&limit=${MAX_LIST_ROWS}`,
      );
      return json(rows.map(mapShopSale));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Server xatosi";
      if (missingShopSalesTable(message)) {
        console.warn("[crm:shop-sales:get] shop_sales table missing; returning empty list");
        return json([]);
      }
      throw error;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Server xatosi";
    console.error("[crm:shop-sales:get]", message);
    return json({ success: false, message }, damageErrorStatus(message));
  }
}

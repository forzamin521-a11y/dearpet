"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getAuthContext, hasPermission } from "@/lib/auth";
import type { ActionResult } from "./auth";
import type { SaleItem } from "@/lib/types";

export interface SaleInput {
  sale_date: string;
  staff_id: string | null;
  items: SaleItem[];
  cash_amount: number;
  card_amount: number;
  transfer_amount: number;
  memo: string;
}

async function requireStats() {
  const ctx = await getAuthContext();
  if (!ctx.profile || !ctx.shop) return null;
  if (!hasPermission(ctx.profile, "stats")) return null;
  return ctx;
}

export async function createSale(input: SaleInput): Promise<ActionResult> {
  const ctx = await requireStats();
  if (!ctx) return { ok: false, error: "매출 권한이 없습니다." };

  const total = input.items.reduce((sum, item) => sum + item.amount, 0);
  const supabase = await createClient();
  const { error } = await supabase.from("sales").insert({
    shop_id: ctx.shop!.id,
    sale_date: input.sale_date,
    staff_id: input.staff_id,
    items: input.items,
    total_amount: total,
    cash_amount: input.cash_amount,
    card_amount: input.card_amount,
    transfer_amount: input.transfer_amount,
    memo: input.memo,
  });
  if (error) return { ok: false, error: "매출 등록에 실패했습니다." };

  revalidatePath("/sales");
  return { ok: true };
}

export async function updateSale(
  saleId: string,
  input: SaleInput
): Promise<ActionResult> {
  const ctx = await requireStats();
  if (!ctx) return { ok: false, error: "매출 권한이 없습니다." };

  const total = input.items.reduce((sum, item) => sum + item.amount, 0);
  const supabase = await createClient();
  const { error } = await supabase
    .from("sales")
    .update({
      sale_date: input.sale_date,
      staff_id: input.staff_id,
      items: input.items,
      total_amount: total,
      cash_amount: input.cash_amount,
      card_amount: input.card_amount,
      transfer_amount: input.transfer_amount,
      memo: input.memo,
    })
    .eq("id", saleId)
    .eq("shop_id", ctx.shop!.id);
  if (error) return { ok: false, error: "매출 수정에 실패했습니다." };

  revalidatePath("/sales");
  return { ok: true };
}

export async function deleteSale(saleId: string): Promise<ActionResult> {
  const ctx = await requireStats();
  if (!ctx) return { ok: false, error: "매출 권한이 없습니다." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("sales")
    .delete()
    .eq("id", saleId)
    .eq("shop_id", ctx.shop!.id);
  if (error) return { ok: false, error: "매출 삭제에 실패했습니다." };

  revalidatePath("/sales");
  return { ok: true };
}

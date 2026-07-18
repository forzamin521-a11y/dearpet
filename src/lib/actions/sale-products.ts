"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/auth";
import type { ActionResult } from "./auth";
import type { SaleProduct, SaleProductCategory } from "@/lib/types";

/** 매장관리자(원장)만 판매 상품을 관리할 수 있다 */
async function requireOwner() {
  const ctx = await getAuthContext();
  if (!ctx.profile || !ctx.shop || ctx.profile.role !== "owner") return null;
  return ctx;
}

async function requireShop() {
  const ctx = await getAuthContext();
  if (!ctx.profile || !ctx.shop) return null;
  return ctx;
}

const SETTINGS_PATH = "/settings/sale-products";

// ---------------- 조회 (매출 등록 화면용) ----------------

export interface SaleProductGroup {
  category: SaleProductCategory;
  products: SaleProduct[];
}

/**
 * 카테고리별 판매 상품 목록.
 * staffId를 주면: 그 담당자의 개별 세트가 있으면 개별 세트, 없으면 기본 세트(staff_id null).
 */
export async function listSaleProducts(
  staffId?: string | null
): Promise<SaleProductGroup[]> {
  const ctx = await requireShop();
  if (!ctx) return [];

  const supabase = await createClient();
  const [catRes, prodRes] = await Promise.all([
    supabase
      .from("sale_product_categories")
      .select("*")
      .eq("shop_id", ctx.shop!.id)
      .order("sort_order")
      .order("created_at"),
    supabase
      .from("sale_products")
      .select("*")
      .eq("shop_id", ctx.shop!.id)
      .order("sort_order")
      .order("created_at"),
  ]);

  const categories = (catRes.data ?? []) as SaleProductCategory[];
  const all = (prodRes.data ?? []) as SaleProduct[];
  const hasOwnSet = !!staffId && all.some((p) => p.staff_id === staffId);
  const products = all.filter((p) =>
    hasOwnSet ? p.staff_id === staffId : p.staff_id === null
  );
  return categories.map((category) => ({
    category,
    products: products.filter((p) => p.category_id === category.id),
  }));
}

// ---------------- 카테고리 CRUD ----------------

export async function createSaleCategory(name: string): Promise<ActionResult> {
  const ctx = await requireOwner();
  if (!ctx) return { ok: false, error: "매장관리자만 관리할 수 있습니다." };
  if (!name.trim()) return { ok: false, error: "카테고리명을 입력해 주세요." };

  const supabase = await createClient();
  const { data: last } = await supabase
    .from("sale_product_categories")
    .select("sort_order")
    .eq("shop_id", ctx.shop!.id)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("sale_product_categories").insert({
    shop_id: ctx.shop!.id,
    name: name.trim(),
    sort_order: (last?.sort_order ?? -1) + 1,
  });
  if (error) return { ok: false, error: "등록에 실패했습니다." };
  revalidatePath(SETTINGS_PATH);
  return { ok: true };
}

export async function updateSaleCategory(
  id: string,
  name: string
): Promise<ActionResult> {
  const ctx = await requireOwner();
  if (!ctx) return { ok: false, error: "매장관리자만 관리할 수 있습니다." };
  if (!name.trim()) return { ok: false, error: "카테고리명을 입력해 주세요." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("sale_product_categories")
    .update({ name: name.trim() })
    .eq("id", id)
    .eq("shop_id", ctx.shop!.id);
  if (error) return { ok: false, error: "수정에 실패했습니다." };
  revalidatePath(SETTINGS_PATH);
  return { ok: true };
}

export async function deleteSaleCategory(id: string): Promise<ActionResult> {
  const ctx = await requireOwner();
  if (!ctx) return { ok: false, error: "매장관리자만 관리할 수 있습니다." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("sale_product_categories")
    .delete()
    .eq("id", id)
    .eq("shop_id", ctx.shop!.id);
  if (error) return { ok: false, error: "삭제에 실패했습니다." };
  revalidatePath(SETTINGS_PATH);
  return { ok: true };
}

// ---------------- 상품 CRUD ----------------

export interface SaleProductInput {
  name: string;
  price: number;
}

export async function createSaleProduct(
  categoryId: string,
  input: SaleProductInput,
  staffId: string | null
): Promise<ActionResult> {
  const ctx = await requireOwner();
  if (!ctx) return { ok: false, error: "매장관리자만 관리할 수 있습니다." };
  if (!input.name.trim()) return { ok: false, error: "상품명을 입력해 주세요." };
  if (input.price < 0) return { ok: false, error: "금액을 확인해 주세요." };

  const supabase = await createClient();
  const { data: last } = await supabase
    .from("sale_products")
    .select("sort_order")
    .eq("shop_id", ctx.shop!.id)
    .eq("category_id", categoryId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("sale_products").insert({
    shop_id: ctx.shop!.id,
    category_id: categoryId,
    staff_id: staffId,
    name: input.name.trim(),
    price: Math.round(input.price),
    sort_order: (last?.sort_order ?? -1) + 1,
  });
  if (error) return { ok: false, error: "등록에 실패했습니다." };
  revalidatePath(SETTINGS_PATH);
  return { ok: true };
}

export async function updateSaleProduct(
  id: string,
  input: SaleProductInput
): Promise<ActionResult> {
  const ctx = await requireOwner();
  if (!ctx) return { ok: false, error: "매장관리자만 관리할 수 있습니다." };
  if (!input.name.trim()) return { ok: false, error: "상품명을 입력해 주세요." };
  if (input.price < 0) return { ok: false, error: "금액을 확인해 주세요." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("sale_products")
    .update({ name: input.name.trim(), price: Math.round(input.price) })
    .eq("id", id)
    .eq("shop_id", ctx.shop!.id);
  if (error) return { ok: false, error: "수정에 실패했습니다." };
  revalidatePath(SETTINGS_PATH);
  return { ok: true };
}

export async function deleteSaleProduct(id: string): Promise<ActionResult> {
  const ctx = await requireOwner();
  if (!ctx) return { ok: false, error: "매장관리자만 관리할 수 있습니다." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("sale_products")
    .delete()
    .eq("id", id)
    .eq("shop_id", ctx.shop!.id);
  if (error) return { ok: false, error: "삭제에 실패했습니다." };
  revalidatePath(SETTINGS_PATH);
  return { ok: true };
}

// ---------------- 담당자별 세트 ----------------

/**
 * 세트 복사: source(기본 또는 다른 담당자)의 상품 전체를 target 담당자 세트로 복사한다.
 * target의 기존 개별 세트는 삭제 후 덮어쓴다. target이 null이면 기본 세트를 덮어쓴다.
 */
export async function copySaleProductSet(
  sourceStaffId: string | null,
  targetStaffId: string | null
): Promise<ActionResult> {
  const ctx = await requireOwner();
  if (!ctx) return { ok: false, error: "매장관리자만 관리할 수 있습니다." };
  if (sourceStaffId === targetStaffId) {
    return { ok: false, error: "같은 대상으로는 복사할 수 없습니다." };
  }

  const supabase = await createClient();
  let sourceQuery = supabase
    .from("sale_products")
    .select("category_id, name, price, sort_order")
    .eq("shop_id", ctx.shop!.id);
  sourceQuery = sourceStaffId
    ? sourceQuery.eq("staff_id", sourceStaffId)
    : sourceQuery.is("staff_id", null);
  const { data: source } = await sourceQuery;
  if (!source || source.length === 0) {
    return { ok: false, error: "복사할 상품이 없습니다." };
  }

  let deleteQuery = supabase
    .from("sale_products")
    .delete()
    .eq("shop_id", ctx.shop!.id);
  deleteQuery = targetStaffId
    ? deleteQuery.eq("staff_id", targetStaffId)
    : deleteQuery.is("staff_id", null);
  const { error: deleteError } = await deleteQuery;
  if (deleteError) return { ok: false, error: "기존 세트 정리에 실패했습니다." };

  const { error } = await supabase.from("sale_products").insert(
    source.map((p) => ({
      shop_id: ctx.shop!.id,
      category_id: p.category_id,
      staff_id: targetStaffId,
      name: p.name,
      price: p.price,
      sort_order: p.sort_order,
    }))
  );
  if (error) return { ok: false, error: "복사에 실패했습니다." };
  revalidatePath(SETTINGS_PATH);
  return { ok: true };
}

/** 담당자의 개별 세트 삭제 → 기본 세트(모든 담당자 공통)를 다시 적용 */
export async function resetSaleProductSet(
  staffId: string
): Promise<ActionResult> {
  const ctx = await requireOwner();
  if (!ctx) return { ok: false, error: "매장관리자만 관리할 수 있습니다." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("sale_products")
    .delete()
    .eq("shop_id", ctx.shop!.id)
    .eq("staff_id", staffId);
  if (error) return { ok: false, error: "초기화에 실패했습니다." };
  revalidatePath(SETTINGS_PATH);
  return { ok: true };
}

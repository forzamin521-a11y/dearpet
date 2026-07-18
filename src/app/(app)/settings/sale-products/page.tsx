import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/auth";
import { redirect } from "next/navigation";
import type { SaleProduct, SaleProductCategory } from "@/lib/types";
import { SaleProductsManager } from "./sale-products-manager";

export const metadata: Metadata = { title: "판매 상품" };

export default async function SaleProductsSettingsPage() {
  const { shop } = await getAuthContext();
  if (!shop) redirect("/pending");

  const supabase = await createClient();
  const [catRes, prodRes, staffRes] = await Promise.all([
    supabase
      .from("sale_product_categories")
      .select("*")
      .eq("shop_id", shop.id)
      .order("sort_order")
      .order("created_at"),
    supabase
      .from("sale_products")
      .select("*")
      .eq("shop_id", shop.id)
      .order("sort_order")
      .order("created_at"),
    supabase
      .from("profiles")
      .select("id, name, emoji")
      .eq("shop_id", shop.id)
      .eq("is_active", true)
      .order("created_at"),
  ]);

  return (
    <div className="max-w-3xl space-y-4">
      <div>
        <h2 className="text-lg font-bold">판매 상품</h2>
        <p className="text-sm text-muted-foreground">
          매출 등록 화면에서 선택하는 상품 목록입니다. 예약 시간 계산에 쓰는
          &lsquo;미용 서비스&rsquo;와는 별개이며, 여기서 카테고리·상품·금액을
          자유롭게 관리할 수 있습니다.
        </p>
      </div>
      <SaleProductsManager
        categories={(catRes.data ?? []) as SaleProductCategory[]}
        products={(prodRes.data ?? []) as SaleProduct[]}
        staff={(staffRes.data ?? []) as Array<{
          id: string;
          name: string;
          emoji: string;
        }>}
      />
    </div>
  );
}

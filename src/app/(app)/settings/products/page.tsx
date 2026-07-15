import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/auth";
import { redirect } from "next/navigation";
import type { GroomingProduct, ProductOption } from "@/lib/types";
import { ProductsManager } from "./products-manager";

export const metadata: Metadata = { title: "미용 상품" };

export default async function ProductsSettingsPage() {
  const { shop } = await getAuthContext();
  if (!shop) redirect("/pending");

  const supabase = await createClient();
  const [{ data: products }, { data: options }] = await Promise.all([
    supabase
      .from("grooming_products")
      .select("*")
      .eq("shop_id", shop.id)
      .order("sort_order")
      .order("created_at"),
    supabase
      .from("product_options")
      .select("*")
      .eq("shop_id", shop.id)
      .order("sort_order")
      .order("created_at"),
  ]);

  return (
    <div className="max-w-3xl space-y-4">
      <div>
        <h2 className="text-lg font-bold">미용 상품</h2>
        <p className="text-sm text-muted-foreground">
          상품과 세부 옵션(소요시간·가격)을 설정합니다. 예약 시 옵션의
          소요시간으로 종료시간이 자동 계산됩니다.
        </p>
      </div>
      <ProductsManager
        products={(products ?? []) as GroomingProduct[]}
        options={(options ?? []) as ProductOption[]}
      />
    </div>
  );
}

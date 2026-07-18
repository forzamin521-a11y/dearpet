import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/auth";
import { redirect } from "next/navigation";
import type { Service } from "@/lib/types";
import { ServicesManager } from "./services-manager";

export const metadata: Metadata = { title: "미용 서비스" };

export default async function ProductsSettingsPage() {
  const { shop } = await getAuthContext();
  if (!shop) redirect("/pending");

  const supabase = await createClient();
  const { data: services } = await supabase
    .from("services")
    .select("*")
    .eq("shop_id", shop.id)
    .order("sort_order")
    .order("created_at");

  return (
    <div className="max-w-3xl space-y-4">
      <div>
        <h2 className="text-lg font-bold">미용 서비스 (예약)</h2>
        <p className="text-sm text-muted-foreground">
          예약 시 선택하는 서비스 목록입니다. 서비스의 소요시간으로 종료시간이
          자동 계산됩니다. 매출 등록에 쓰는 상품·금액은 &lsquo;판매 상품&rsquo;
          메뉴에서 관리합니다.
        </p>
      </div>
      <ServicesManager services={(services ?? []) as Service[]} />
    </div>
  );
}

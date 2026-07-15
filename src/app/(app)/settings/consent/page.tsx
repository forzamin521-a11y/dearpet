import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/auth";
import type { ConsentForm } from "@/lib/types";
import { ConsentManager } from "./consent-manager";

export const metadata: Metadata = { title: "동의서 설정" };

export default async function ConsentSettingsPage() {
  const { shop } = await getAuthContext();
  if (!shop) redirect("/pending");

  const supabase = await createClient();
  const { data: forms } = await supabase
    .from("consent_forms")
    .select("*")
    .eq("shop_id", shop.id)
    .order("sort_order")
    .order("created_at");

  return (
    <div className="max-w-3xl space-y-4">
      <div>
        <h2 className="text-lg font-bold">동의서 설정</h2>
        <p className="text-sm text-muted-foreground">
          매장의 동의서 내용을 설정합니다. 예약 시 동의서 알림톡을 선택하면
          고객이 휴대폰에서 서명할 수 있는 링크가 발송됩니다.
        </p>
      </div>
      <ConsentManager
        forms={(forms ?? []) as ConsentForm[]}
        shopName={shop.name}
      />
    </div>
  );
}

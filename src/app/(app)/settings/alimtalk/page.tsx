import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/auth";
import type { AlimtalkLog, AlimtalkTemplate } from "@/lib/types";
import { AlimtalkManager } from "./alimtalk-manager";

export const metadata: Metadata = { title: "알림톡 설정" };

export default async function AlimtalkSettingsPage() {
  const { shop } = await getAuthContext();
  if (!shop) redirect("/pending");

  const supabase = await createClient();
  const [{ data: templates }, { data: logs }] = await Promise.all([
    supabase
      .from("alimtalk_templates")
      .select("*")
      .eq("shop_id", shop.id),
    supabase
      .from("alimtalk_logs")
      .select("*")
      .eq("shop_id", shop.id)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  return (
    <div className="max-w-3xl space-y-4">
      <div>
        <h2 className="text-lg font-bold">알림톡 설정</h2>
        <p className="text-sm text-muted-foreground">
          알림톡 본문은 카카오 승인 템플릿으로 고정되어 있으며, 매장 안내문구와
          상황별 자동 발송 여부만 설정할 수 있습니다.
        </p>
      </div>
      <AlimtalkManager
        templates={(templates ?? []) as AlimtalkTemplate[]}
        logs={(logs ?? []) as AlimtalkLog[]}
        shopName={shop.name}
        shopPhone={shop.phone}
      />
    </div>
  );
}

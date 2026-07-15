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
          알림톡 내용을 편집하고 상황별 자동 발송 여부를 설정합니다. 현재는
          시뮬레이션 모드로, 발송 이력만 기록되고 실제 발송은 되지 않습니다.
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

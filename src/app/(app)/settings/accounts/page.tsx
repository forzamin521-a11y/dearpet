import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext } from "@/lib/auth";
import type { Profile } from "@/lib/types";
import { AccountsManager } from "./accounts-manager";

export const metadata: Metadata = { title: "계정 관리" };

export default async function AccountsSettingsPage() {
  const { shop } = await getAuthContext();
  if (!shop) redirect("/pending");

  const supabase = await createClient();
  const { data: profiles } = await supabase
    .from("profiles")
    .select("*")
    .eq("shop_id", shop.id)
    .order("role")
    .order("created_at");

  // 이메일은 auth.users에 있으므로 admin API로 조회
  const admin = createAdminClient();
  const emails: Record<string, string> = {};
  await Promise.all(
    (profiles ?? []).map(async (p) => {
      const { data } = await admin.auth.admin.getUserById(p.id);
      if (data.user?.email) emails[p.id] = data.user.email;
    })
  );

  return (
    <div className="max-w-3xl space-y-4">
      <div>
        <h2 className="text-lg font-bold">계정별 권한 관리</h2>
        <p className="text-sm text-muted-foreground">
          실장님 계정을 추가하고 등록·변경·취소·삭제·통계 권한을 부여할 수
          있습니다.
        </p>
      </div>
      <AccountsManager
        profiles={(profiles ?? []) as Profile[]}
        emails={emails}
      />
    </div>
  );
}

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import { logout } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "승인 대기" };

export default async function PendingPage() {
  const { userId, profile, shop } = await getAuthContext();

  if (!userId) redirect("/login");
  if (profile?.role === "super_admin") redirect("/admin");
  if (shop?.status === "approved") redirect("/reservations");

  const suspended = shop?.status === "suspended";

  return (
    <main className="flex flex-1 flex-col items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center gap-4 pt-6 text-center">
          <span className="text-4xl">{suspended ? "⏸️" : "⏳"}</span>
          <h1 className="text-xl font-bold">
            {suspended ? "이용이 정지된 매장입니다" : "승인 대기 중입니다"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {suspended
              ? "자세한 내용은 관리자에게 문의해 주세요."
              : `${shop?.name ?? "매장"}의 가입 신청이 접수되었습니다.\n관리자 승인이 완료되면 이용할 수 있습니다.`}
          </p>
          <form action={logout}>
            <Button variant="outline">로그아웃</Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}

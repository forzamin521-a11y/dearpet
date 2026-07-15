import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import { logout } from "@/lib/actions/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PasswordChangeForm } from "@/components/password-change-form";
import type { Shop } from "@/lib/types";
import { ShopRow } from "./shop-row";

export const metadata: Metadata = { title: "슈퍼관리자" };

export default async function AdminPage() {
  const { userId, profile } = await getAuthContext();
  if (!userId) redirect("/login");
  if (profile?.role !== "super_admin") redirect("/reservations");

  const admin = createAdminClient();
  const { data: shops } = await admin
    .from("shops")
    .select("*")
    .order("created_at", { ascending: false });

  const list = (shops ?? []) as Shop[];
  const pending = list.filter((s) => s.status === "pending");
  const others = list.filter((s) => s.status !== "pending");

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">🐩 DearPet 슈퍼관리자</h1>
          <p className="text-sm text-muted-foreground">
            매장 가입 신청을 승인하거나 정지할 수 있습니다.
          </p>
        </div>
        <form action={logout}>
          <Button variant="outline" size="sm">
            로그아웃
          </Button>
        </form>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>승인 대기 ({pending.length})</CardTitle>
          <CardDescription>새로 신청한 매장 목록입니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {pending.length === 0 && (
            <p className="text-sm text-muted-foreground">
              대기 중인 신청이 없습니다.
            </p>
          )}
          {pending.map((shop) => (
            <ShopRow key={shop.id} shop={shop} />
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>전체 매장 ({others.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {others.length === 0 && (
            <p className="text-sm text-muted-foreground">매장이 없습니다.</p>
          )}
          {others.map((shop) => (
            <ShopRow key={shop.id} shop={shop} />
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>비밀번호 변경</CardTitle>
          <CardDescription>슈퍼관리자 계정의 비밀번호를 변경합니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <PasswordChangeForm />
        </CardContent>
      </Card>
    </main>
  );
}

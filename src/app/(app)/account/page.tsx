import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PasswordChangeForm } from "@/components/password-change-form";

export const metadata: Metadata = { title: "내 계정" };

export default async function AccountPage() {
  const { profile } = await getAuthContext();
  if (!profile) redirect("/login");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 p-6">
      <div>
        <h2 className="text-lg font-bold">내 계정</h2>
        <p className="text-sm text-muted-foreground">
          로그인 계정의 비밀번호를 변경합니다.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">비밀번호 변경</CardTitle>
          <CardDescription>
            {user?.email} · {profile.name}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PasswordChangeForm />
        </CardContent>
      </Card>
    </div>
  );
}

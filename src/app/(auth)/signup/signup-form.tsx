"use client";

import { useActionState } from "react";
import { signupShop } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export function SignupForm() {
  const [state, formAction, pending] = useActionState(signupShop, null);

  return (
    <Card>
      <CardContent className="pt-6">
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">이메일 (로그인 아이디)</Label>
            <Input id="email" name="email" type="email" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">비밀번호 (6자 이상)</Label>
            <Input
              id="password"
              name="password"
              type="password"
              minLength={6}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ownerName">대표자(원장) 이름</Label>
            <Input id="ownerName" name="ownerName" required />
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="shopName">매장명</Label>
            <Input id="shopName" name="shopName" placeholder="예: 디어펫살롱" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="shopPhone">매장 전화번호</Label>
            <Input id="shopPhone" name="shopPhone" placeholder="010-0000-0000" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="shopAddress">매장 주소</Label>
            <Input id="shopAddress" name="shopAddress" />
          </div>

          {state?.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "신청 중..." : "가입 신청"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

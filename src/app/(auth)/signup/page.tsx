import type { Metadata } from "next";
import Link from "next/link";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = { title: "매장 가입 신청" };

export default function SignupPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-1 text-center">
          <span className="text-4xl">🐩</span>
          <h1 className="text-2xl font-bold text-primary">매장 가입 신청</h1>
          <p className="text-sm text-muted-foreground">
            가입 신청 후 관리자 승인이 완료되면 서비스를 이용할 수 있습니다.
          </p>
        </div>
        <SignupForm />
        <p className="text-center text-sm text-muted-foreground">
          이미 계정이 있으신가요?{" "}
          <Link href="/login" className="font-medium text-primary underline">
            로그인
          </Link>
        </p>
      </div>
    </main>
  );
}

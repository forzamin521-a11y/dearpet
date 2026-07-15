import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "로그인" };

export default function LoginPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-1 text-center">
          <span className="text-4xl">🐩</span>
          <h1 className="text-2xl font-bold text-primary">DearPet</h1>
          <p className="text-sm text-muted-foreground">
            애견미용 예약관리 시스템
          </p>
        </div>
        <LoginForm />
        <p className="text-center text-sm text-muted-foreground">
          아직 매장이 없으신가요?{" "}
          <Link href="/signup" className="font-medium text-primary underline">
            매장 가입 신청
          </Link>
        </p>
      </div>
    </main>
  );
}

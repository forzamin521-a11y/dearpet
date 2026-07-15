import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="text-5xl">🐩</span>
        <h1 className="text-4xl font-bold tracking-tight text-primary">
          DearPet
        </h1>
        <p className="text-muted-foreground">
          애견미용 매장을 위한 예약 · 고객 · 매출 관리
        </p>
      </div>
      <div className="flex gap-3">
        <Button asChild size="lg">
          <Link href="/login">로그인</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/signup">매장 가입 신청</Link>
        </Button>
      </div>
    </main>
  );
}

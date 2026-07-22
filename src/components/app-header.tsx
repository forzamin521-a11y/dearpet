"use client";

import { usePathname } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

const TITLES: Array<[string, string]> = [
  ["/reservations", "예약"],
  ["/customers", "고객 관리"],
  ["/sales", "매출 통계"],
  ["/settings", "설정"],
];

export function AppHeader() {
  const pathname = usePathname();
  const title = TITLES.find(([prefix]) => pathname.startsWith(prefix))?.[1] ?? "";

  return (
    <header className="glass-toolbar sticky top-0 z-20 flex h-12 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger />
      <Separator orientation="vertical" className="h-4" />
      <h1 className="text-sm font-semibold">{title}</h1>
    </header>
  );
}

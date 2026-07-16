"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const GROUPS: Array<{
  label: string;
  items: Array<{ title: string; href: string }>;
}> = [
  {
    label: "운영",
    items: [
      { title: "매장 정보 설정", href: "/settings/shop" },
      { title: "미용 상품", href: "/settings/products" },
      { title: "예약 박스 설정", href: "/settings/box" },
    ],
  },
  {
    label: "계정",
    items: [{ title: "계정 관리", href: "/settings/accounts" }],
  },
  {
    label: "메시지",
    items: [
      { title: "알림톡 설정", href: "/settings/alimtalk" },
      { title: "동의서 설정", href: "/settings/consent" },
    ],
  },
];

export function SettingsNav() {
  const pathname = usePathname();

  return (
    <nav className="space-y-6">
      {GROUPS.map((group) => (
        <div key={group.label}>
          <p className="mb-2 px-3 text-xs font-semibold text-muted-foreground">
            {group.label}
          </p>
          <ul className="space-y-1">
            {group.items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "block rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent",
                    pathname.startsWith(item.href) &&
                      "bg-accent font-medium text-accent-foreground"
                  )}
                >
                  {item.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

/** 모바일 전용: 가로 스크롤 칩 탭 (좌측 세로 메뉴 대체) */
export function SettingsMobileNav() {
  const pathname = usePathname();
  const items = GROUPS.flatMap((g) => g.items);

  return (
    <nav className="-mx-4 overflow-x-auto px-4">
      <div className="flex w-max gap-2 pb-1">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "whitespace-nowrap rounded-full border px-3.5 py-2 text-sm transition-colors",
              pathname.startsWith(item.href)
                ? "border-primary bg-primary font-medium text-primary-foreground"
                : "hover:bg-accent"
            )}
          >
            {item.title}
          </Link>
        ))}
      </div>
    </nav>
  );
}

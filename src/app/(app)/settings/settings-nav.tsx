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

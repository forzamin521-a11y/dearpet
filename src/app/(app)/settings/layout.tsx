import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import { SettingsMobileNav, SettingsNav } from "./settings-nav";

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await getAuthContext();
  if (profile?.role !== "owner") redirect("/reservations");

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4 lg:flex-row lg:gap-6 lg:p-6">
      {/* 데스크톱: 좌측 세로 메뉴 */}
      <aside className="hidden w-48 shrink-0 lg:block">
        <SettingsNav />
      </aside>
      {/* 모바일: 상단 가로 칩 탭 */}
      <div className="lg:hidden">
        <SettingsMobileNav />
      </div>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  DollarSign,
  KeyRound,
  LogOut,
  Settings,
  Users,
} from "lucide-react";
import { logout } from "@/lib/actions/auth";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

interface AppSidebarProps {
  shopName: string;
  userName: string;
  userEmoji: string;
  canStats: boolean;
  isOwner: boolean;
}

export function AppSidebar({
  shopName,
  userName,
  userEmoji,
  canStats,
  isOwner,
}: AppSidebarProps) {
  const pathname = usePathname();

  const items = [
    { title: "예약", href: "/reservations", icon: CalendarDays, show: true },
    { title: "고객", href: "/customers", icon: Users, show: true },
    { title: "매출", href: "/sales", icon: DollarSign, show: canStats },
    { title: "설정", href: "/settings", icon: Settings, show: isOwner },
  ].filter((item) => item.show);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5 group-data-[collapsible=icon]:justify-center">
          <span className="text-xl">🐩</span>
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <p className="truncate text-sm font-bold text-primary">DearPet</p>
            <p className="truncate text-xs text-muted-foreground">{shopName}</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-2">
              {items.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname.startsWith(item.href)}
                    tooltip={item.title}
                    className="h-10"
                  >
                    <Link href={item.href}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu className="gap-1.5">
          <SidebarMenuItem>
            <div className="flex items-center gap-2 px-2 py-1 text-sm group-data-[collapsible=icon]:hidden">
              <span>{userEmoji}</span>
              <span className="truncate font-medium">{userName}</span>
            </div>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={pathname.startsWith("/account")}
              tooltip="비밀번호 변경"
            >
              <Link href="/account">
                <KeyRound />
                <span>비밀번호 변경</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => logout()} tooltip="로그아웃">
              <LogOut />
              <span>로그아웃</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

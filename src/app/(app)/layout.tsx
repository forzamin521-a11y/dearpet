import { redirect } from "next/navigation";
import { getAuthContext, hasPermission } from "@/lib/auth";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppSidebar } from "@/components/app-sidebar";
import { AppHeader } from "@/components/app-header";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId, profile, shop } = await getAuthContext();

  if (!userId) redirect("/login");
  if (profile?.role === "super_admin") redirect("/admin");
  if (!profile || !shop) redirect("/pending");
  if (shop.status !== "approved") redirect("/pending");

  const canStats = hasPermission(profile, "stats");
  const isOwner = profile.role === "owner";

  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar
          shopName={shop.name}
          userName={profile.name}
          userEmoji={profile.emoji}
          canStats={canStats}
          isOwner={isOwner}
        />
        <SidebarInset className="flex min-h-svh flex-col">
          <AppHeader />
          <div className="flex flex-1 flex-col overflow-hidden">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}

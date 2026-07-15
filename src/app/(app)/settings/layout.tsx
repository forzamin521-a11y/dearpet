import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import { SettingsNav } from "./settings-nav";

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await getAuthContext();
  if (profile?.role !== "owner") redirect("/reservations");

  return (
    <div className="flex flex-1 gap-6 overflow-y-auto p-6">
      <aside className="w-48 shrink-0">
        <SettingsNav />
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

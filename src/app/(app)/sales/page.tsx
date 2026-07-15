import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthContext, hasPermission } from "@/lib/auth";
import { todayString } from "@/lib/time";
import type { Customer, Profile, Sale } from "@/lib/types";
import { SalesView } from "./sales-view";

export const metadata: Metadata = { title: "매출 통계" };

export type SaleWithRelations = Sale & {
  staff: Pick<Profile, "id" | "name" | "emoji"> | null;
  customer: Pick<Customer, "id" | "name"> | null;
};

export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; staff?: string }>;
}) {
  const { profile, shop } = await getAuthContext();
  if (!profile || !shop) redirect("/pending");
  if (!hasPermission(profile, "stats")) redirect("/reservations");

  const params = await searchParams;
  const isDate = (s?: string) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);
  const from = isDate(params.from) ? params.from! : todayString();
  const to = isDate(params.to) ? params.to! : todayString();
  const staffFilter = params.staff ?? "all";

  const supabase = await createClient();
  let query = supabase
    .from("sales")
    .select(
      "*, staff:profiles(id, name, emoji), customer:customers(id, name)"
    )
    .eq("shop_id", shop.id)
    .gte("sale_date", from)
    .lte("sale_date", to)
    .order("sale_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (staffFilter !== "all") {
    query = query.eq("staff_id", staffFilter);
  }

  const [{ data: sales }, { data: staff }] = await Promise.all([
    query,
    supabase
      .from("profiles")
      .select("*")
      .eq("shop_id", shop.id)
      .eq("is_active", true)
      .order("role"),
  ]);

  return (
    <SalesView
      sales={(sales ?? []) as unknown as SaleWithRelations[]}
      staff={(staff ?? []) as Profile[]}
      from={from}
      to={to}
      staffFilter={staffFilter}
    />
  );
}

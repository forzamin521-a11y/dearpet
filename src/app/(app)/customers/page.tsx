import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/auth";
import type { Customer, Pet } from "@/lib/types";
import { CustomersView } from "./customers-view";

export const metadata: Metadata = { title: "고객 관리" };

export type CustomerWithPets = Customer & { pets: Pet[] };
export type VisitCounts = Record<
  string,
  { completed: number; canceled: number; no_show: number }
>;

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { shop } = await getAuthContext();
  if (!shop) redirect("/pending");

  const { q } = await searchParams;
  const supabase = await createClient();

  let customers: CustomerWithPets[] = [];

  if (q?.trim()) {
    const query = q.trim();
    const [{ data: byName }, { data: petRows }] = await Promise.all([
      supabase
        .from("customers")
        .select("*, pets(*)")
        .eq("shop_id", shop.id)
        .or(`name.ilike.%${query}%`)
        .order("name")
        .limit(100),
      supabase
        .from("pets")
        .select("customer_id")
        .eq("shop_id", shop.id)
        .ilike("name", `%${query}%`)
        .limit(100),
    ]);
    const nameMatches = (byName ?? []) as CustomerWithPets[];
    const extraIds = [
      ...new Set(
        (petRows ?? [])
          .map((p) => p.customer_id)
          .filter((id) => !nameMatches.some((c) => c.id === id))
      ),
    ];
    let petMatches: CustomerWithPets[] = [];
    if (extraIds.length > 0) {
      const { data } = await supabase
        .from("customers")
        .select("*, pets(*)")
        .eq("shop_id", shop.id)
        .in("id", extraIds);
      petMatches = (data ?? []) as CustomerWithPets[];
    }
    customers = [...nameMatches, ...petMatches];
  } else {
    const { data } = await supabase
      .from("customers")
      .select("*, pets(*)")
      .eq("shop_id", shop.id)
      .order("name")
      .limit(300);
    customers = (data ?? []) as CustomerWithPets[];
  }

  // 방문 통계 (완료/취소/노쇼 횟수)
  const { data: statusRows } = await supabase
    .from("reservations")
    .select("customer_id, status")
    .eq("shop_id", shop.id)
    .in("status", ["completed", "canceled", "no_show"]);

  const visitCounts: VisitCounts = {};
  for (const row of statusRows ?? []) {
    const entry = (visitCounts[row.customer_id] ??= {
      completed: 0,
      canceled: 0,
      no_show: 0,
    });
    entry[row.status as "completed" | "canceled" | "no_show"] += 1;
  }

  return (
    <CustomersView
      customers={customers}
      visitCounts={visitCounts}
      initialQuery={q ?? ""}
    />
  );
}

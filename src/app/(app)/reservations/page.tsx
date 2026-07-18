import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthContext, hasPermission } from "@/lib/auth";
import { getReservations } from "@/lib/data/reservations";
import { todayString, toDateString } from "@/lib/time";
import type { ConsentForm, Profile, Service } from "@/lib/types";
import { ReservationsView } from "./reservations-view";

export const metadata: Metadata = { title: "예약" };

export default async function ReservationsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; view?: string }>;
}) {
  const { profile, shop } = await getAuthContext();
  if (!profile || !shop) redirect("/pending");

  const params = await searchParams;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(params.date ?? "")
    ? params.date!
    : todayString();
  const view = params.view === "week" ? "week" : "day";

  // 조회 범위: 일간이면 해당일, 주간이면 일~토
  let fromDate = date;
  let toDate = date;
  if (view === "week") {
    const base = new Date(`${date}T00:00:00`);
    const start = new Date(base);
    start.setDate(base.getDate() - base.getDay());
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    fromDate = toDateString(start);
    toDate = toDateString(end);
  }

  const supabase = await createClient();
  const [reservations, staffRes, servicesRes, formsRes, memoRes] =
    await Promise.all([
      getReservations(shop.id, fromDate, toDate),
      supabase
        .from("profiles")
        .select("*")
        .eq("shop_id", shop.id)
        .eq("is_active", true)
        .order("role")
        .order("created_at"),
      supabase
        .from("services")
        .select("*")
        .eq("shop_id", shop.id)
        .order("sort_order")
        .order("created_at"),
      supabase
        .from("consent_forms")
        .select("*")
        .eq("shop_id", shop.id)
        .order("sort_order"),
      supabase
        .from("daily_memos")
        .select("memo")
        .eq("shop_id", shop.id)
        .eq("date", date)
        .maybeSingle(),
    ]);

  return (
    <ReservationsView
      shopName={shop.name}
      openTime={String(shop.open_time).slice(0, 5)}
      closeTime={String(shop.close_time).slice(0, 5)}
      boxSettings={shop.box_settings}
      date={date}
      view={view}
      reservations={reservations}
      staff={(staffRes.data ?? []) as Profile[]}
      services={(servicesRes.data ?? []) as Service[]}
      consentForms={(formsRes.data ?? []) as ConsentForm[]}
      dailyMemo={memoRes.data?.memo ?? ""}
      permissions={{
        create: hasPermission(profile, "create"),
        update: hasPermission(profile, "update"),
        cancel: hasPermission(profile, "cancel"),
        delete: hasPermission(profile, "delete"),
      }}
    />
  );
}

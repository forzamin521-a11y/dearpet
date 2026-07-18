import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendAlimtalk } from "@/lib/messaging/send";
import { kstDateString } from "@/lib/time";

/**
 * 예약 사전 안내(pre_visit) 크론.
 * vercel.json의 crons가 매일 09:00 UTC(= 한국시간 오후 6시)에 호출하며,
 * 한국시간 기준 "내일" 예약(상태: reserved)에 대해
 * 사전 안내를 켜둔 매장만 알림톡을 발송한다. 이미 보낸 예약은 건너뛴다.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface ReservationRow {
  id: string;
  date: string;
  start_time: string;
  shop: { id: string; name: string; phone: string } | null;
  customer: {
    id: string;
    name: string;
    phones: string[];
    alimtalk_opt_in: boolean;
  } | null;
  reservation_pets: Array<{ pet: { name: string } | null }>;
}

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const tomorrow = kstDateString(1);
  const admin = createAdminClient();

  // 사전 안내를 켜둔 매장
  const { data: enabledRows } = await admin
    .from("alimtalk_templates")
    .select("shop_id")
    .eq("kind", "pre_visit")
    .eq("enabled", true);
  const enabledShops = new Set((enabledRows ?? []).map((r) => r.shop_id));
  if (enabledShops.size === 0) {
    return NextResponse.json({ ok: true, date: tomorrow, sent: 0, skipped: 0 });
  }

  const { data } = await admin
    .from("reservations")
    .select(
      `id, date, start_time,
       shop:shops(id, name, phone),
       customer:customers(id, name, phones, alimtalk_opt_in),
       reservation_pets(pet:pets(name))`
    )
    .eq("date", tomorrow)
    .eq("status", "reserved");
  const reservations = (data ?? []) as unknown as ReservationRow[];

  // 이미 사전 안내를 보낸 예약 (크론 중복 실행 대비)
  const ids = reservations.map((r) => r.id);
  let alreadySent = new Set<string>();
  if (ids.length > 0) {
    const { data: logs } = await admin
      .from("alimtalk_logs")
      .select("reservation_id")
      .eq("kind", "pre_visit")
      .in("reservation_id", ids);
    alreadySent = new Set(
      (logs ?? []).map((l) => l.reservation_id as string)
    );
  }

  let sent = 0;
  let skipped = 0;
  for (const r of reservations) {
    if (
      !r.shop ||
      !r.customer ||
      !enabledShops.has(r.shop.id) ||
      alreadySent.has(r.id) ||
      !r.customer.alimtalk_opt_in
    ) {
      skipped++;
      continue;
    }
    await sendAlimtalk(
      "pre_visit",
      {
        shop: r.shop,
        reservationId: r.id,
        customerId: r.customer.id,
        customerName: r.customer.name,
        phone: r.customer.phones[0] ?? null,
        petNames: r.reservation_pets
          .map((p) => p.pet?.name)
          .filter(Boolean) as string[],
        date: r.date,
        startTime: String(r.start_time).slice(0, 5),
      },
      { onlyIfEnabled: true }
    );
    sent++;
  }

  console.log(`[cron/pre-visit] date=${tomorrow} sent=${sent} skipped=${skipped}`);
  return NextResponse.json({ ok: true, date: tomorrow, sent, skipped });
}

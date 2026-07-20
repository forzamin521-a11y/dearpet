"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext, hasPermission } from "@/lib/auth";
import { sendAlimtalk, type AlimtalkContext } from "@/lib/messaging/send";
import { STATUS_ALIMTALK } from "@/lib/constants";
import type { ActionResult } from "./auth";
import type { AlimtalkKind, ReservationStatus, SaleItem } from "@/lib/types";

export interface ReservationPetInput {
  petId: string;
  serviceId: string | null;
}

export interface ReservationInput {
  customerId: string;
  staffId: string | null;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  memo: string;
  pets: ReservationPetInput[];
  alimtalkKinds: AlimtalkKind[]; // 선택 발송 (basic/senior/consent/deposit)
  consentFormId: string | null; // consent 발송 시 사용할 동의서
}

export interface PaymentInput {
  cash: number;
  card: number;
  transfer: number;
}

async function requireShop() {
  const ctx = await getAuthContext();
  if (!ctx.profile || !ctx.shop) return null;
  return ctx;
}

/** 알림톡 컨텍스트 구성용 예약 조회 */
async function loadAlimtalkContext(
  reservationId: string
): Promise<AlimtalkContext | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("reservations")
    .select(
      `id, shop_id, date, start_time,
       shop:shops(id, name, phone),
       customer:customers(id, name, phones, alimtalk_opt_in),
       reservation_pets(pet:pets(name))`
    )
    .eq("id", reservationId)
    .single();

  if (!data?.customer || !data.shop) return null;
  const customer = data.customer as unknown as {
    id: string;
    name: string;
    phones: string[];
    alimtalk_opt_in: boolean;
  };
  if (!customer.alimtalk_opt_in) return null;

  const shop = data.shop as unknown as { id: string; name: string; phone: string };
  const pets = (data.reservation_pets ?? []) as unknown as Array<{
    pet: { name: string } | null;
  }>;

  return {
    shop,
    reservationId: data.id,
    customerId: customer.id,
    customerName: customer.name,
    phone: customer.phones[0] ?? null,
    petNames: pets.map((p) => p.pet?.name).filter(Boolean) as string[],
    date: data.date,
    startTime: String(data.start_time).slice(0, 5),
  };
}

export async function createReservation(
  input: ReservationInput
): Promise<ActionResult & { reservationId?: string }> {
  const ctx = await requireShop();
  if (!ctx) return { ok: false, error: "로그인이 필요합니다." };
  if (!hasPermission(ctx.profile!, "create")) {
    return { ok: false, error: "예약 등록 권한이 없습니다." };
  }
  if (input.pets.length === 0) {
    return { ok: false, error: "미용견을 1마리 이상 선택해 주세요." };
  }

  const supabase = await createClient();
  const { data: reservation, error } = await supabase
    .from("reservations")
    .insert({
      shop_id: ctx.shop!.id,
      customer_id: input.customerId,
      staff_id: input.staffId,
      date: input.date,
      start_time: input.startTime,
      end_time: input.endTime,
      memo: input.memo,
      status: "reserved",
      created_by: ctx.profile!.id,
    })
    .select("id")
    .single();

  if (error || !reservation) {
    return { ok: false, error: "예약 등록에 실패했습니다." };
  }

  const { error: petsError } = await supabase.from("reservation_pets").insert(
    input.pets.map((p) => ({
      reservation_id: reservation.id,
      pet_id: p.petId,
      service_id: p.serviceId,
    }))
  );
  if (petsError) {
    await supabase.from("reservations").delete().eq("id", reservation.id);
    return { ok: false, error: "예약 상세 저장에 실패했습니다." };
  }

  // 선택 발송 알림톡
  const alimtalkCtx = await loadAlimtalkContext(reservation.id);
  if (alimtalkCtx) {
    for (const kind of input.alimtalkKinds) {
      if (kind === "consent") {
        if (!input.consentFormId) continue;
        const link = await createConsentSubmission(
          ctx.shop!.id,
          input.consentFormId,
          input.customerId,
          input.pets[0]?.petId ?? null,
          reservation.id
        );
        await sendAlimtalk(kind, { ...alimtalkCtx, consentLink: link ?? "" });
      } else {
        await sendAlimtalk(kind, alimtalkCtx);
      }
    }

    // 예약금 안내 자동 발송 (설정에서 사용 시, 신규/기존 고객 대상 필터 적용)
    // 모달에서 직접 선택해 이미 보낸 경우에는 중복 발송하지 않는다.
    if (!input.alimtalkKinds.includes("deposit")) {
      const { count: priorCount } = await supabase
        .from("reservations")
        .select("id", { count: "exact", head: true })
        .eq("shop_id", ctx.shop!.id)
        .eq("customer_id", input.customerId)
        .neq("id", reservation.id)
        .neq("status", "deleted");
      await sendAlimtalk("deposit", alimtalkCtx, {
        onlyIfEnabled: true,
        customerIsNew: (priorCount ?? 0) === 0,
      });
    }
  }

  revalidatePath("/reservations");
  return { ok: true, reservationId: reservation.id };
}

/** 신규 고객 + 반려동물을 만들면서 바로 예약까지 생성 */
export async function createReservationWithNewCustomer(
  customer: { name: string; phone: string; memo: string },
  pets: Array<{
    name: string;
    breed: string;
    weight_kg: number | null;
    age_years: number | null;
  }>,
  base: Omit<ReservationInput, "customerId" | "pets">,
  petServices: Array<{ serviceId: string | null }>
): Promise<ActionResult & { reservationId?: string }> {
  const ctx = await requireShop();
  if (!ctx) return { ok: false, error: "로그인이 필요합니다." };
  if (!hasPermission(ctx.profile!, "create")) {
    return { ok: false, error: "예약 등록 권한이 없습니다." };
  }
  const validPets = pets.filter((p) => p.name.trim());
  if (validPets.length === 0) {
    return { ok: false, error: "반려동물을 1마리 이상 입력해 주세요." };
  }

  const supabase = await createClient();
  const { data: newCustomer, error: customerError } = await supabase
    .from("customers")
    .insert({
      shop_id: ctx.shop!.id,
      name: customer.name.trim(),
      phones: customer.phone.trim() ? [customer.phone.trim()] : [],
      memo: customer.memo,
    })
    .select("id")
    .single();
  if (customerError || !newCustomer) {
    return { ok: false, error: "고객 등록에 실패했습니다." };
  }

  const { data: newPets, error: petsError } = await supabase
    .from("pets")
    .insert(
      validPets.map((p) => ({
        shop_id: ctx.shop!.id,
        customer_id: newCustomer.id,
        name: p.name.trim(),
        breed: p.breed,
        weight_kg: p.weight_kg,
        age_years: p.age_years,
      }))
    )
    .select("id");
  if (petsError || !newPets) {
    return { ok: false, error: "반려동물 등록에 실패했습니다." };
  }

  return createReservation({
    ...base,
    customerId: newCustomer.id,
    pets: newPets.map((pet, i) => ({
      petId: pet.id,
      serviceId: petServices[i]?.serviceId ?? null,
    })),
  });
}

// ---------------- 고객 미용 이력 ----------------

export interface HistoryServiceItem {
  petId: string | null;
  petName: string;
  serviceId: string | null;
  /** 예: "🐶전체미용" (구 데이터는 "전체미용 · 소형견" 형태) */
  serviceLabel: string | null;
  price: number | null;
}

export interface CustomerHistoryEntry {
  reservationId: string;
  date: string;
  status: string;
  memo: string;
  items: HistoryServiceItem[];
}

/** 예약 모달 "최근 기록 보기" — 고객의 지난 예약(서비스/메모) 최근 10건 */
export async function getCustomerGroomingHistory(
  customerId: string
): Promise<CustomerHistoryEntry[]> {
  const ctx = await requireShop();
  if (!ctx) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("reservations")
    .select(
      `id, date, status, memo,
       reservation_pets(pet_id, service_id, price,
         pet:pets(name),
         service:services(name, emoji),
         option:product_options(name, product:grooming_products(name, emoji)))`
    )
    .eq("shop_id", ctx.shop!.id)
    .eq("customer_id", customerId)
    .neq("status", "deleted")
    .order("date", { ascending: false })
    .order("start_time", { ascending: false })
    .limit(10);

  type Row = {
    id: string;
    date: string;
    status: string;
    memo: string;
    reservation_pets: Array<{
      pet_id: string | null;
      service_id: string | null;
      price: number | null;
      pet: { name: string } | null;
      service: { name: string; emoji: string } | null;
      option: {
        name: string;
        product: { name: string; emoji: string } | null;
      } | null;
    }>;
  };

  return ((data ?? []) as unknown as Row[]).map((r) => ({
    reservationId: r.id,
    date: r.date,
    status: r.status,
    memo: r.memo,
    items: (r.reservation_pets ?? []).map((rp) => ({
      petId: rp.pet_id,
      petName: rp.pet?.name ?? "(삭제된 반려동물)",
      serviceId: rp.service_id,
      serviceLabel: rp.service
        ? `${rp.service.emoji}${rp.service.name}`
        : rp.option
          ? `${rp.option.product?.emoji ?? ""}${rp.option.product?.name ?? ""} · ${rp.option.name}`
          : null,
      price: rp.price,
    })),
  }));
}

/** 동의서 제출 건 생성 후 서명 링크 반환 */
async function createConsentSubmission(
  shopId: string,
  consentFormId: string,
  customerId: string,
  petId: string | null,
  reservationId: string
): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("consent_submissions")
    .insert({
      shop_id: shopId,
      consent_form_id: consentFormId,
      customer_id: customerId,
      pet_id: petId,
      reservation_id: reservationId,
    })
    .select("token")
    .single();

  if (!data) return null;
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${base}/consent/${data.token}`;
}

export async function updateReservation(
  reservationId: string,
  input: ReservationInput,
  options: { notifyChange?: boolean } = {}
): Promise<ActionResult> {
  const ctx = await requireShop();
  if (!ctx) return { ok: false, error: "로그인이 필요합니다." };
  if (!hasPermission(ctx.profile!, "update")) {
    return { ok: false, error: "예약 변경 권한이 없습니다." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("reservations")
    .update({
      customer_id: input.customerId,
      staff_id: input.staffId,
      date: input.date,
      start_time: input.startTime,
      end_time: input.endTime,
      memo: input.memo,
    })
    .eq("id", reservationId)
    .eq("shop_id", ctx.shop!.id);
  if (error) return { ok: false, error: "예약 변경에 실패했습니다." };

  // 미용견/상품 재구성
  await supabase
    .from("reservation_pets")
    .delete()
    .eq("reservation_id", reservationId);
  const { error: petsError } = await supabase.from("reservation_pets").insert(
    input.pets.map((p) => ({
      reservation_id: reservationId,
      pet_id: p.petId,
      service_id: p.serviceId,
    }))
  );
  if (petsError) return { ok: false, error: "예약 상세 저장에 실패했습니다." };

  if (options.notifyChange) {
    const alimtalkCtx = await loadAlimtalkContext(reservationId);
    if (alimtalkCtx) {
      await sendAlimtalk("change", alimtalkCtx, { onlyIfEnabled: true });
    }
  }

  revalidatePath("/reservations");
  return { ok: true };
}

/** 매출 등록 상세 (판매 상품 선택 내역 + 매출 담당자) */
export interface SaleDetailInput {
  items: SaleItem[];
  staffId: string | null;
}

export async function updateReservationStatus(
  reservationId: string,
  status: ReservationStatus,
  payment?: PaymentInput,
  saleDetail?: SaleDetailInput
): Promise<ActionResult> {
  const ctx = await requireShop();
  if (!ctx) return { ok: false, error: "로그인이 필요합니다." };

  const needed =
    status === "canceled" ? "cancel" : status === "deleted" ? "delete" : "update";
  if (!hasPermission(ctx.profile!, needed)) {
    return { ok: false, error: "해당 상태로 변경할 권한이 없습니다." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("reservations")
    .update({ status })
    .eq("id", reservationId)
    .eq("shop_id", ctx.shop!.id);
  if (error) return { ok: false, error: "상태 변경에 실패했습니다." };

  // 완료 → 매출 자동 등록
  if (status === "completed" && payment) {
    const saleResult = await createSaleFromReservation(
      reservationId,
      payment,
      saleDetail
    );
    if (!saleResult.ok) return saleResult;
  }

  // 상황별 자동 알림톡 (설정에서 사용으로 켜둔 것만)
  const autoKind = STATUS_ALIMTALK[status];
  if (autoKind) {
    const alimtalkCtx = await loadAlimtalkContext(reservationId);
    if (alimtalkCtx) {
      await sendAlimtalk(autoKind, alimtalkCtx, { onlyIfEnabled: true });
    }
  }

  revalidatePath("/reservations");
  revalidatePath("/sales");
  return { ok: true };
}

/**
 * 예약에서 매출 생성 (이미 있으면 건너뜀).
 * 금액은 완료 시 입력받은 결제 금액(현금+카드+이체 합)을 사용한다.
 * saleDetail(판매 상품 선택 내역 + 담당자)이 있으면 그대로 기록하고,
 * 없으면 예약의 서비스/담당자 정보로 구성한다(구 방식).
 */
async function createSaleFromReservation(
  reservationId: string,
  payment: PaymentInput,
  saleDetail?: SaleDetailInput
): Promise<ActionResult> {
  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("sales")
    .select("id")
    .eq("reservation_id", reservationId)
    .maybeSingle();
  if (existing) return { ok: false, error: "이미 매출이 등록된 예약입니다." };

  const { data: reservation } = await admin
    .from("reservations")
    .select(
      `id, shop_id, customer_id, staff_id, date,
       reservation_pets(
         pet:pets(name),
         service:services(name, emoji),
         option:product_options(name, product:grooming_products(name))
       )`
    )
    .eq("id", reservationId)
    .single();
  if (!reservation) return { ok: false, error: "예약을 찾을 수 없습니다." };

  const pets = (reservation.reservation_pets ?? []) as unknown as Array<{
    pet: { name: string } | null;
    service: { name: string; emoji: string } | null;
    option: { name: string; product: { name: string } | null } | null;
  }>;

  const total = payment.cash + payment.card + payment.transfer;
  if (total <= 0) return { ok: false, error: "결제 금액을 입력해 주세요." };

  // 판매 상품 선택 내역이 있으면 그대로, 없으면 예약 서비스로 구성(총액을 첫 항목에 기재)
  const items: SaleItem[] =
    saleDetail && saleDetail.items.length > 0
      ? saleDetail.items
      : pets.map((p, i) => ({
          petName: p.pet?.name ?? "",
          description:
            (p.service
              ? `${p.service.emoji}${p.service.name}`
              : p.option
                ? `${p.option.product?.name ?? ""}> ${p.option.name}`
                : "서비스 미지정"),
          amount: i === 0 ? total : 0,
        }));

  const { error } = await admin.from("sales").insert({
    shop_id: reservation.shop_id,
    reservation_id: reservation.id,
    customer_id: reservation.customer_id,
    staff_id: saleDetail ? saleDetail.staffId : reservation.staff_id,
    sale_date: reservation.date,
    items,
    total_amount: total,
    cash_amount: payment.cash,
    card_amount: payment.card,
    transfer_amount: payment.transfer,
  });
  if (error) return { ok: false, error: "매출 등록에 실패했습니다." };
  return { ok: true };
}

/** 완료된 예약에 나중에 매출을 등록할 때 사용 */
export async function registerSaleForReservation(
  reservationId: string,
  payment: PaymentInput,
  saleDetail?: SaleDetailInput
): Promise<ActionResult> {
  const ctx = await requireShop();
  if (!ctx) return { ok: false, error: "로그인이 필요합니다." };

  // 내 매장 예약인지 확인
  const supabase = await createClient();
  const { data: reservation } = await supabase
    .from("reservations")
    .select("id")
    .eq("id", reservationId)
    .eq("shop_id", ctx.shop!.id)
    .single();
  if (!reservation) return { ok: false, error: "예약을 찾을 수 없습니다." };

  const result = await createSaleFromReservation(
    reservationId,
    payment,
    saleDetail
  );
  if (!result.ok) return result;

  revalidatePath("/reservations");
  revalidatePath("/sales");
  return { ok: true };
}

// ---------------- 날짜별 메모 ----------------

export async function saveDailyMemo(
  date: string,
  memo: string
): Promise<ActionResult> {
  const ctx = await requireShop();
  if (!ctx) return { ok: false, error: "로그인이 필요합니다." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("daily_memos")
    .upsert(
      { shop_id: ctx.shop!.id, date, memo },
      { onConflict: "shop_id,date" }
    );
  if (error) return { ok: false, error: "메모 저장에 실패했습니다." };
  return { ok: true };
}

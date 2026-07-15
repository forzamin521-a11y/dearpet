import "server-only";
import { createClient } from "@/lib/supabase/server";
import type {
  AddonItem,
  Customer,
  Pet,
  Reservation,
  ReservationStatus,
} from "@/lib/types";

/** 캘린더/상세에서 쓰는 예약 + 연관 데이터 */
export interface ReservationFull extends Reservation {
  customer: Pick<
    Customer,
    "id" | "name" | "phones" | "memo" | "alimtalk_opt_in"
  > | null;
  reservation_pets: Array<{
    id: string;
    pet_id: string;
    product_option_id: string | null;
    price: number | null;
    addons: AddonItem[];
    pet: Pet | null;
    option: {
      id: string;
      name: string;
      duration_minutes: number;
      price: number | null;
      product: { name: string; emoji: string } | null;
    } | null;
  }>;
}

const RESERVATION_SELECT = `
  *,
  customer:customers(id, name, phones, memo, alimtalk_opt_in),
  reservation_pets(
    id, pet_id, product_option_id, price, addons,
    pet:pets(*),
    option:product_options(id, name, duration_minutes, price,
      product:grooming_products(name, emoji))
  )
`;

/** 기간 내 예약 조회 (삭제 제외 여부 선택) */
export async function getReservations(
  shopId: string,
  fromDate: string,
  toDate: string,
  options: { includeDeleted?: boolean } = {}
): Promise<ReservationFull[]> {
  const supabase = await createClient();
  let query = supabase
    .from("reservations")
    .select(RESERVATION_SELECT)
    .eq("shop_id", shopId)
    .gte("date", fromDate)
    .lte("date", toDate)
    .order("date")
    .order("start_time");

  if (!options.includeDeleted) {
    query = query.neq("status", "deleted" satisfies ReservationStatus);
  }

  const { data } = await query;
  return (data ?? []) as unknown as ReservationFull[];
}

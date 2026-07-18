"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/auth";
import type { ActionResult } from "./auth";
import type { PetSpecies } from "@/lib/types";

export interface PetInput {
  id?: string; // 있으면 수정, 없으면 신규
  name: string;
  species: PetSpecies;
  breed: string;
  weight_kg: number | null;
  birth_date: string | null;
  neutered: boolean | null;
  memo: string;
}

export interface CustomerInput {
  name: string;
  phones: string[];
  alimtalk_opt_in: boolean;
  memo: string;
}

async function requireShop() {
  const ctx = await getAuthContext();
  if (!ctx.profile || !ctx.shop) return null;
  return ctx;
}

export async function createCustomer(
  input: CustomerInput,
  pets: PetInput[]
): Promise<ActionResult & { customerId?: string }> {
  const ctx = await requireShop();
  if (!ctx) return { ok: false, error: "로그인이 필요합니다." };
  if (!input.name.trim()) return { ok: false, error: "보호자 호칭을 입력해 주세요." };

  const supabase = await createClient();
  const { data: customer, error } = await supabase
    .from("customers")
    .insert({
      shop_id: ctx.shop!.id,
      name: input.name.trim(),
      phones: input.phones.filter((p) => p.trim()),
      alimtalk_opt_in: input.alimtalk_opt_in,
      memo: input.memo,
    })
    .select("id")
    .single();

  if (error || !customer) return { ok: false, error: "고객 등록에 실패했습니다." };

  if (pets.length > 0) {
    const { error: petError } = await supabase.from("pets").insert(
      pets
        .filter((p) => p.name.trim())
        .map((p) => ({
          shop_id: ctx.shop!.id,
          customer_id: customer.id,
          name: p.name.trim(),
          species: p.species,
          breed: p.breed,
          weight_kg: p.weight_kg,
          birth_date: p.birth_date,
          neutered: p.neutered,
          memo: p.memo,
        }))
    );
    if (petError) return { ok: false, error: "반려동물 등록에 실패했습니다." };
  }

  revalidatePath("/customers");
  return { ok: true, customerId: customer.id };
}

export async function updateCustomer(
  customerId: string,
  input: CustomerInput,
  pets: PetInput[]
): Promise<ActionResult> {
  const ctx = await requireShop();
  if (!ctx) return { ok: false, error: "로그인이 필요합니다." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("customers")
    .update({
      name: input.name.trim(),
      phones: input.phones.filter((p) => p.trim()),
      alimtalk_opt_in: input.alimtalk_opt_in,
      memo: input.memo,
    })
    .eq("id", customerId)
    .eq("shop_id", ctx.shop!.id);
  if (error) return { ok: false, error: "고객 수정에 실패했습니다." };

  // 펫 upsert: id 있는 것은 수정, 없는 것은 추가
  for (const pet of pets) {
    if (!pet.name.trim()) continue;
    const row = {
      name: pet.name.trim(),
      species: pet.species,
      breed: pet.breed,
      weight_kg: pet.weight_kg,
      birth_date: pet.birth_date,
      neutered: pet.neutered,
      memo: pet.memo,
    };
    if (pet.id) {
      const { error: e } = await supabase
        .from("pets")
        .update(row)
        .eq("id", pet.id)
        .eq("shop_id", ctx.shop!.id);
      if (e) return { ok: false, error: "반려동물 수정에 실패했습니다." };
    } else {
      const { error: e } = await supabase.from("pets").insert({
        ...row,
        shop_id: ctx.shop!.id,
        customer_id: customerId,
      });
      if (e) return { ok: false, error: "반려동물 추가에 실패했습니다." };
    }
  }

  revalidatePath("/customers");
  return { ok: true };
}

export async function deleteCustomer(customerId: string): Promise<ActionResult> {
  const ctx = await requireShop();
  if (!ctx) return { ok: false, error: "로그인이 필요합니다." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("customers")
    .delete()
    .eq("id", customerId)
    .eq("shop_id", ctx.shop!.id);
  if (error) return { ok: false, error: "삭제에 실패했습니다." };

  revalidatePath("/customers");
  return { ok: true };
}

export async function deletePet(petId: string): Promise<ActionResult> {
  const ctx = await requireShop();
  if (!ctx) return { ok: false, error: "로그인이 필요합니다." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("pets")
    .delete()
    .eq("id", petId)
    .eq("shop_id", ctx.shop!.id);
  if (error) return { ok: false, error: "삭제에 실패했습니다." };

  revalidatePath("/customers");
  return { ok: true };
}

// ---------------- 일괄 업로드 ----------------

export interface BulkCustomerRow {
  name: string;
  phone: string;
  memo: string;
  petName: string;
  species: string; // "강아지" | "고양이" | "dog" | "cat" (그 외는 dog 처리)
  breed: string;
  weightKg: number | null;
  birthDate: string | null; // YYYY-MM-DD
  petMemo: string;
}

/**
 * 엑셀/CSV에서 파싱된 행을 일괄 등록한다.
 * 같은 (보호자 호칭 + 전화번호) 행은 한 고객의 여러 반려동물로 묶고,
 * 이미 등록된 전화번호와 겹치는 고객은 중복으로 건너뛴다.
 */
export async function bulkCreateCustomers(
  rows: BulkCustomerRow[]
): Promise<ActionResult & { inserted?: number; skipped?: number }> {
  const ctx = await requireShop();
  if (!ctx) return { ok: false, error: "로그인이 필요합니다." };
  if (rows.length === 0) return { ok: false, error: "등록할 데이터가 없습니다." };
  if (rows.length > 2000) {
    return { ok: false, error: "한 번에 2,000행까지 등록할 수 있습니다." };
  }

  const supabase = await createClient();

  // 기존 고객 전화번호 (중복 건너뛰기용)
  const { data: existing } = await supabase
    .from("customers")
    .select("phones")
    .eq("shop_id", ctx.shop!.id);
  const existingPhones = new Set(
    (existing ?? []).flatMap((c: { phones: string[] }) =>
      c.phones.map((p) => p.replace(/\D/g, ""))
    )
  );

  // (호칭+전화번호) 기준으로 고객 그룹핑
  interface Group {
    name: string;
    phone: string;
    memo: string;
    pets: Array<Omit<BulkCustomerRow, "name" | "phone" | "memo">>;
  }
  const groups = new Map<string, Group>();
  for (const row of rows) {
    const name = row.name.trim();
    if (!name) continue;
    const phone = row.phone.trim();
    const key = `${name}|${phone.replace(/\D/g, "")}`;
    let group = groups.get(key);
    if (!group) {
      group = { name, phone, memo: row.memo.trim(), pets: [] };
      groups.set(key, group);
    }
    if (!group.memo && row.memo.trim()) group.memo = row.memo.trim();
    if (row.petName.trim()) {
      group.pets.push({
        petName: row.petName,
        species: row.species,
        breed: row.breed,
        weightKg: row.weightKg,
        birthDate: row.birthDate,
        petMemo: row.petMemo,
      });
    }
  }

  const toInsert = [...groups.values()].filter(
    (g) => !g.phone || !existingPhones.has(g.phone.replace(/\D/g, ""))
  );
  const skipped = groups.size - toInsert.length;
  if (toInsert.length === 0) {
    return { ok: true, inserted: 0, skipped };
  }

  // 고객 일괄 insert (반환 순서는 입력 순서와 동일)
  const { data: created, error } = await supabase
    .from("customers")
    .insert(
      toInsert.map((g) => ({
        shop_id: ctx.shop!.id,
        name: g.name,
        phones: g.phone ? [g.phone] : [],
        memo: g.memo,
      }))
    )
    .select("id");
  if (error || !created || created.length !== toInsert.length) {
    return { ok: false, error: "고객 등록에 실패했습니다." };
  }

  const petRows = toInsert.flatMap((g, i) =>
    g.pets.map((p) => ({
      shop_id: ctx.shop!.id,
      customer_id: created[i].id,
      name: p.petName.trim(),
      species: (p.species.includes("고양이") || p.species.toLowerCase() === "cat"
        ? "cat"
        : "dog") as PetSpecies,
      breed: p.breed.trim(),
      weight_kg: p.weightKg,
      birth_date: p.birthDate,
      memo: p.petMemo.trim(),
    }))
  );
  if (petRows.length > 0) {
    const { error: petError } = await supabase.from("pets").insert(petRows);
    if (petError) {
      return {
        ok: false,
        error: "고객은 등록됐지만 일부 반려동물 등록에 실패했습니다.",
      };
    }
  }

  revalidatePath("/customers");
  return { ok: true, inserted: toInsert.length, skipped };
}

/**
 * 예약 모달 자동완성용 고객+펫 검색.
 * 숫자 입력 → 휴대폰 번호(주로 뒷자리 4자리) 매칭, 문자 입력 → 보호자 호칭/반려동물명 매칭.
 */
export async function searchCustomers(query: string) {
  const ctx = await requireShop();
  if (!ctx || !query.trim()) return [];

  const supabase = await createClient();
  const q = query.trim();
  const digits = q.replace(/\D/g, "");

  // 숫자 위주 입력이면 전화번호 검색 (phones가 배열이라 DB ilike 불가 → 서버에서 매칭)
  if (digits.length >= 2 && digits.length === q.replace(/[\s-]/g, "").length) {
    const { data: all } = await supabase
      .from("customers")
      .select("id, phones")
      .eq("shop_id", ctx.shop!.id);

    const matchedIds = (all ?? [])
      .filter((c: { phones: string[] }) =>
        c.phones.some((p) => p.replace(/\D/g, "").includes(digits))
      )
      .slice(0, 10)
      .map((c: { id: string }) => c.id);

    if (matchedIds.length === 0) return [];
    const { data } = await supabase
      .from("customers")
      .select("*, pets(*)")
      .eq("shop_id", ctx.shop!.id)
      .in("id", matchedIds);
    return data ?? [];
  }

  // 보호자 호칭 / 반려동물명 검색
  const { data: byName } = await supabase
    .from("customers")
    .select("*, pets(*)")
    .eq("shop_id", ctx.shop!.id)
    .ilike("name", `%${q}%`)
    .limit(10);

  const { data: byPet } = await supabase
    .from("pets")
    .select("customer_id")
    .eq("shop_id", ctx.shop!.id)
    .ilike("name", `%${q}%`)
    .limit(10);

  const extraIds = (byPet ?? [])
    .map((p) => p.customer_id)
    .filter((id) => !(byName ?? []).some((c) => c.id === id));

  let byPetCustomers: typeof byName = [];
  if (extraIds.length > 0) {
    const { data } = await supabase
      .from("customers")
      .select("*, pets(*)")
      .eq("shop_id", ctx.shop!.id)
      .in("id", extraIds);
    byPetCustomers = data;
  }

  return [...(byName ?? []), ...(byPetCustomers ?? [])].slice(0, 10);
}

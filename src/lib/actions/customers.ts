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

/** 예약 모달 자동완성용 고객+펫 검색 */
export async function searchCustomers(query: string) {
  const ctx = await requireShop();
  if (!ctx || !query.trim()) return [];

  const supabase = await createClient();
  const q = query.trim();

  // 보호자 호칭 / 펫 이름 / 전화번호로 검색
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

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext } from "@/lib/auth";
import type { ActionResult } from "./auth";
import type { StaffPermissions } from "@/lib/types";

/** owner 권한 + 매장 컨텍스트 확인 */
async function requireOwner() {
  const ctx = await getAuthContext();
  if (!ctx.profile || !ctx.shop || ctx.profile.role !== "owner") return null;
  return ctx;
}

// ---------------- 매장 정보 ----------------

export async function updateShopInfo(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const ctx = await requireOwner();
  if (!ctx) return { ok: false, error: "매장관리자만 수정할 수 있습니다." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("shops")
    .update({
      name: String(formData.get("name") ?? "").trim(),
      address: String(formData.get("address") ?? "").trim(),
      phone: String(formData.get("phone") ?? "").trim(),
      business_hours: String(formData.get("business_hours") ?? "").trim(),
      open_time: String(formData.get("open_time") ?? "10:00"),
      close_time: String(formData.get("close_time") ?? "20:00"),
      closed_days: String(formData.get("closed_days") ?? "").trim(),
      intro: String(formData.get("intro") ?? ""),
    })
    .eq("id", ctx.shop!.id);

  if (error) return { ok: false, error: "저장에 실패했습니다." };
  revalidatePath("/settings/shop");
  return { ok: true };
}

export async function updateBoxSettings(
  boxSettings: import("@/lib/types").BoxSettings
): Promise<ActionResult> {
  const ctx = await requireOwner();
  if (!ctx) return { ok: false, error: "매장관리자만 수정할 수 있습니다." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("shops")
    .update({ box_settings: boxSettings })
    .eq("id", ctx.shop!.id);
  if (error) return { ok: false, error: "저장에 실패했습니다." };

  revalidatePath("/settings/box");
  revalidatePath("/reservations");
  return { ok: true };
}

// ---------------- 미용 서비스 ----------------

export interface ServiceInput {
  name: string;
  emoji: string;
  duration_minutes: number;
}

export async function createService(input: ServiceInput): Promise<ActionResult> {
  const ctx = await requireOwner();
  if (!ctx) return { ok: false, error: "권한이 없습니다." };
  if (!input.name.trim()) return { ok: false, error: "서비스명을 입력해 주세요." };
  if (input.duration_minutes <= 0) {
    return { ok: false, error: "소요시간을 입력해 주세요." };
  }

  const supabase = await createClient();
  // 마지막 순서 뒤에 추가
  const { data: last } = await supabase
    .from("services")
    .select("sort_order")
    .eq("shop_id", ctx.shop!.id)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("services").insert({
    shop_id: ctx.shop!.id,
    name: input.name.trim(),
    emoji: input.emoji,
    duration_minutes: input.duration_minutes,
    sort_order: (last?.sort_order ?? -1) + 1,
  });
  if (error) return { ok: false, error: "등록에 실패했습니다." };
  revalidatePath("/settings/products");
  revalidatePath("/reservations");
  return { ok: true };
}

export async function updateService(
  id: string,
  input: ServiceInput
): Promise<ActionResult> {
  const ctx = await requireOwner();
  if (!ctx) return { ok: false, error: "권한이 없습니다." };
  if (!input.name.trim()) return { ok: false, error: "서비스명을 입력해 주세요." };
  if (input.duration_minutes <= 0) {
    return { ok: false, error: "소요시간을 입력해 주세요." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("services")
    .update({
      name: input.name.trim(),
      emoji: input.emoji,
      duration_minutes: input.duration_minutes,
    })
    .eq("id", id)
    .eq("shop_id", ctx.shop!.id);
  if (error) return { ok: false, error: "수정에 실패했습니다." };
  revalidatePath("/settings/products");
  revalidatePath("/reservations");
  return { ok: true };
}

export async function deleteService(id: string): Promise<ActionResult> {
  const ctx = await requireOwner();
  if (!ctx) return { ok: false, error: "권한이 없습니다." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("services")
    .delete()
    .eq("id", id)
    .eq("shop_id", ctx.shop!.id);
  if (error) return { ok: false, error: "삭제에 실패했습니다." };
  revalidatePath("/settings/products");
  revalidatePath("/reservations");
  return { ok: true };
}

// ---------------- 계정 관리 (실장) ----------------

export interface StaffInput {
  email: string;
  password: string;
  name: string;
  phone: string;
  emoji: string;
  memo: string;
  permissions: StaffPermissions;
}

export async function createStaff(input: StaffInput): Promise<ActionResult> {
  const ctx = await requireOwner();
  if (!ctx) return { ok: false, error: "매장관리자만 계정을 추가할 수 있습니다." };

  if (!input.email.trim() || !input.name.trim()) {
    return { ok: false, error: "이메일과 이름을 입력해 주세요." };
  }
  if (input.password.length < 6) {
    return { ok: false, error: "비밀번호는 6자 이상이어야 합니다." };
  }

  const admin = createAdminClient();
  const { data: created, error: userError } = await admin.auth.admin.createUser({
    email: input.email.trim(),
    password: input.password,
    email_confirm: true,
  });
  if (userError || !created.user) {
    return {
      ok: false,
      error: userError?.message.includes("already")
        ? "이미 가입된 이메일입니다."
        : "계정 생성에 실패했습니다.",
    };
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: created.user.id,
    shop_id: ctx.shop!.id,
    role: "staff",
    name: input.name.trim(),
    phone: input.phone.trim(),
    emoji: input.emoji || "💛",
    memo: input.memo,
    permissions: input.permissions,
  });
  if (profileError) {
    await admin.auth.admin.deleteUser(created.user.id);
    return { ok: false, error: "프로필 생성에 실패했습니다." };
  }

  revalidatePath("/settings/accounts");
  return { ok: true };
}

export async function updateStaff(
  staffId: string,
  data: {
    name: string;
    phone: string;
    emoji: string;
    memo: string;
    permissions: StaffPermissions;
    is_active: boolean;
  }
): Promise<ActionResult> {
  const ctx = await requireOwner();
  if (!ctx) return { ok: false, error: "권한이 없습니다." };

  const admin = createAdminClient();
  // 같은 매장 소속 staff인지 확인
  const { data: target } = await admin
    .from("profiles")
    .select("shop_id, role")
    .eq("id", staffId)
    .single();
  if (!target || target.shop_id !== ctx.shop!.id || target.role !== "staff") {
    return { ok: false, error: "대상 계정을 찾을 수 없습니다." };
  }

  const { error } = await admin.from("profiles").update(data).eq("id", staffId);
  if (error) return { ok: false, error: "수정에 실패했습니다." };
  revalidatePath("/settings/accounts");
  return { ok: true };
}

export async function resetStaffPassword(
  staffId: string,
  newPassword: string
): Promise<ActionResult> {
  const ctx = await requireOwner();
  if (!ctx) return { ok: false, error: "권한이 없습니다." };
  if (newPassword.length < 6) {
    return { ok: false, error: "비밀번호는 6자 이상이어야 합니다." };
  }

  const admin = createAdminClient();
  const { data: target } = await admin
    .from("profiles")
    .select("shop_id, role")
    .eq("id", staffId)
    .single();
  if (!target || target.shop_id !== ctx.shop!.id || target.role !== "staff") {
    return { ok: false, error: "대상 계정을 찾을 수 없습니다." };
  }

  const { error } = await admin.auth.admin.updateUserById(staffId, {
    password: newPassword,
  });
  if (error) return { ok: false, error: "비밀번호 변경에 실패했습니다." };
  return { ok: true };
}

export async function deleteStaff(staffId: string): Promise<ActionResult> {
  const ctx = await requireOwner();
  if (!ctx) return { ok: false, error: "권한이 없습니다." };

  const admin = createAdminClient();
  const { data: target } = await admin
    .from("profiles")
    .select("shop_id, role")
    .eq("id", staffId)
    .single();
  if (!target || target.shop_id !== ctx.shop!.id || target.role !== "staff") {
    return { ok: false, error: "대상 계정을 찾을 수 없습니다." };
  }

  const { error } = await admin.auth.admin.deleteUser(staffId);
  if (error) return { ok: false, error: "삭제에 실패했습니다." };
  revalidatePath("/settings/accounts");
  return { ok: true };
}

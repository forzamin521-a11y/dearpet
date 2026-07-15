"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

/** 로그인 후 역할/매장 상태에 따라 이동할 경로 계산 */
async function postLoginPath(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "/login";

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, shop_id")
    .eq("id", user.id)
    .single();

  if (!profile) return "/pending";
  if (profile.role === "super_admin") return "/admin";
  if (!profile.shop_id) return "/pending";

  const { data: shop } = await supabase
    .from("shops")
    .select("status")
    .eq("id", profile.shop_id)
    .single();

  return shop?.status === "approved" ? "/reservations" : "/pending";
}

export async function login(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { ok: false, error: "이메일과 비밀번호를 입력해 주세요." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { ok: false, error: "이메일 또는 비밀번호가 올바르지 않습니다." };
  }

  redirect(await postLoginPath());
}

export async function signupShop(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const ownerName = String(formData.get("ownerName") ?? "").trim();
  const shopName = String(formData.get("shopName") ?? "").trim();
  const shopPhone = String(formData.get("shopPhone") ?? "").trim();
  const shopAddress = String(formData.get("shopAddress") ?? "").trim();

  if (!email || !password || !ownerName) {
    return { ok: false, error: "필수 항목을 모두 입력해 주세요." };
  }
  if (password.length < 6) {
    return { ok: false, error: "비밀번호는 6자 이상이어야 합니다." };
  }

  const admin = createAdminClient();
  const isSuperAdmin =
    !!process.env.SUPER_ADMIN_EMAIL &&
    email.toLowerCase() === process.env.SUPER_ADMIN_EMAIL.toLowerCase();

  if (!isSuperAdmin && !shopName) {
    return { ok: false, error: "매장명을 입력해 주세요." };
  }

  // 1) 인증 계정 생성 (이메일 인증 생략)
  const { data: created, error: userError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (userError || !created.user) {
    return {
      ok: false,
      error: userError?.message.includes("already")
        ? "이미 가입된 이메일입니다."
        : "계정 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.",
    };
  }
  const userId = created.user.id;

  try {
    if (isSuperAdmin) {
      // 슈퍼관리자 계정 (매장 없음)
      const { error } = await admin.from("profiles").insert({
        id: userId,
        role: "super_admin",
        name: ownerName,
      });
      if (error) throw error;
    } else {
      // 2) 매장 생성 (승인 대기)
      const { data: shop, error: shopError } = await admin
        .from("shops")
        .insert({
          name: shopName,
          phone: shopPhone,
          address: shopAddress,
          status: "pending",
        })
        .select("id")
        .single();
      if (shopError || !shop) throw shopError;

      // 3) 매장관리자 프로필
      const { error: profileError } = await admin.from("profiles").insert({
        id: userId,
        shop_id: shop.id,
        role: "owner",
        name: ownerName,
        emoji: "💜",
      });
      if (profileError) throw profileError;

      // 4) 기본 알림톡 템플릿/동의서 시드
      await admin.rpc("seed_shop_defaults", { p_shop_id: shop.id });
    }
  } catch {
    // 롤백: 생성된 인증 계정 제거
    await admin.auth.admin.deleteUser(userId);
    return { ok: false, error: "가입 처리 중 오류가 발생했습니다." };
  }

  // 자동 로그인
  const supabase = await createClient();
  await supabase.auth.signInWithPassword({ email, password });

  redirect(isSuperAdmin ? "/admin" : "/pending");
}

/** 본인 비밀번호 변경 — 현재 비밀번호 확인 후 새 비밀번호로 교체 (모든 역할 공통) */
export async function changeMyPassword(
  currentPassword: string,
  newPassword: string
): Promise<ActionResult> {
  if (newPassword.length < 6) {
    return { ok: false, error: "새 비밀번호는 6자 이상이어야 합니다." };
  }
  if (currentPassword === newPassword) {
    return { ok: false, error: "현재 비밀번호와 다른 비밀번호를 입력해 주세요." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { ok: false, error: "로그인이 필요합니다." };

  // 현재 비밀번호 검증 (재로그인 방식)
  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });
  if (verifyError) {
    return { ok: false, error: "현재 비밀번호가 올바르지 않습니다." };
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return { ok: false, error: "비밀번호 변경에 실패했습니다." };
  return { ok: true };
}

export async function logout(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

/** 슈퍼관리자: 매장 승인/정지 */
export async function setShopStatus(
  shopId: string,
  status: "approved" | "suspended" | "pending"
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (me?.role !== "super_admin") {
    return { ok: false, error: "슈퍼관리자만 가능합니다." };
  }

  const admin = createAdminClient();
  const { error } = await admin.from("shops").update({ status }).eq("id", shopId);
  if (error) return { ok: false, error: "상태 변경에 실패했습니다." };

  revalidatePath("/admin");
  return { ok: true };
}

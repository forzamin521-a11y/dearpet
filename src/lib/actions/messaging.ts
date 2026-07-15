"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext } from "@/lib/auth";
import type { ActionResult } from "./auth";
import type { AlimtalkKind } from "@/lib/types";

async function requireOwner() {
  const ctx = await getAuthContext();
  if (!ctx.profile || !ctx.shop || ctx.profile.role !== "owner") return null;
  return ctx;
}

// ---------------- 알림톡 템플릿 ----------------

export async function saveAlimtalkTemplate(
  kind: AlimtalkKind,
  content: string,
  enabled: boolean
): Promise<ActionResult> {
  const ctx = await requireOwner();
  if (!ctx) return { ok: false, error: "매장관리자만 수정할 수 있습니다." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("alimtalk_templates")
    .upsert(
      { shop_id: ctx.shop!.id, kind, content, enabled },
      { onConflict: "shop_id,kind" }
    );
  if (error) return { ok: false, error: "저장에 실패했습니다." };

  revalidatePath("/settings/alimtalk");
  return { ok: true };
}

// ---------------- 동의서 ----------------

export async function createConsentForm(title: string): Promise<ActionResult> {
  const ctx = await requireOwner();
  if (!ctx) return { ok: false, error: "권한이 없습니다." };
  if (!title.trim()) return { ok: false, error: "동의서 제목을 입력해 주세요." };

  const supabase = await createClient();
  const { error } = await supabase.from("consent_forms").insert({
    shop_id: ctx.shop!.id,
    title: title.trim(),
  });
  if (error) return { ok: false, error: "등록에 실패했습니다." };

  revalidatePath("/settings/consent");
  return { ok: true };
}

export async function updateConsentForm(
  id: string,
  data: { title: string; content: string }
): Promise<ActionResult> {
  const ctx = await requireOwner();
  if (!ctx) return { ok: false, error: "권한이 없습니다." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("consent_forms")
    .update(data)
    .eq("id", id)
    .eq("shop_id", ctx.shop!.id);
  if (error) return { ok: false, error: "저장에 실패했습니다." };

  revalidatePath("/settings/consent");
  return { ok: true };
}

export async function deleteConsentForm(id: string): Promise<ActionResult> {
  const ctx = await requireOwner();
  if (!ctx) return { ok: false, error: "권한이 없습니다." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("consent_forms")
    .delete()
    .eq("id", id)
    .eq("shop_id", ctx.shop!.id);
  if (error) return { ok: false, error: "삭제에 실패했습니다." };

  revalidatePath("/settings/consent");
  return { ok: true };
}

// ---------------- 고객 서명 (공개 페이지에서 호출) ----------------

export async function signConsent(
  token: string,
  signerName: string,
  signatureDataUrl: string
): Promise<ActionResult> {
  if (!token || !signerName.trim() || !signatureDataUrl.startsWith("data:image")) {
    return { ok: false, error: "서명 정보가 올바르지 않습니다." };
  }

  const admin = createAdminClient();
  const { data: submission } = await admin
    .from("consent_submissions")
    .select("id, status")
    .eq("token", token)
    .single();

  if (!submission) return { ok: false, error: "유효하지 않은 링크입니다." };
  if (submission.status === "signed") {
    return { ok: false, error: "이미 서명이 완료된 동의서입니다." };
  }

  const { error } = await admin
    .from("consent_submissions")
    .update({
      status: "signed",
      signer_name: signerName.trim(),
      signature_url: signatureDataUrl,
      signed_at: new Date().toISOString(),
    })
    .eq("id", submission.id);

  if (error) return { ok: false, error: "서명 저장에 실패했습니다." };
  return { ok: true };
}

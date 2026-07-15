import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMessageProvider, renderTemplate } from "./provider";
import type { AlimtalkKind, Shop } from "@/lib/types";
import { formatKoreanDate, formatKoreanTime } from "@/lib/time";

export interface AlimtalkContext {
  shop: Pick<Shop, "id" | "name" | "phone">;
  reservationId?: string;
  customerId: string;
  customerName: string;
  phone: string | null;
  petNames: string[];
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  consentLink?: string;
}

/**
 * 매장 템플릿을 렌더링해 알림톡을 발송(시뮬레이션)하고 이력을 남긴다.
 * 템플릿이 없거나 수신 전화번호가 없으면 조용히 건너뛴다.
 */
export async function sendAlimtalk(
  kind: AlimtalkKind,
  ctx: AlimtalkContext,
  options: { onlyIfEnabled?: boolean } = {}
): Promise<void> {
  if (!ctx.phone) return;

  const admin = createAdminClient();
  const { data: template } = await admin
    .from("alimtalk_templates")
    .select("content, enabled")
    .eq("shop_id", ctx.shop.id)
    .eq("kind", kind)
    .single();

  if (!template) return;
  if (options.onlyIfEnabled && !template.enabled) return;

  const content = renderTemplate(template.content, {
    shopName: ctx.shop.name,
    shopPhone: ctx.shop.phone,
    customerName: ctx.customerName,
    petNames: ctx.petNames.join(", "),
    visitDateTime: `${formatKoreanDate(ctx.date)} ${formatKoreanTime(ctx.startTime)}`,
    consentLink: ctx.consentLink ?? "",
  });

  const provider = getMessageProvider();
  const status = await provider.send(ctx.phone, content);

  await admin.from("alimtalk_logs").insert({
    shop_id: ctx.shop.id,
    reservation_id: ctx.reservationId ?? null,
    customer_id: ctx.customerId,
    phone: ctx.phone,
    kind,
    content,
    status,
  });
}

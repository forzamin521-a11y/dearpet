import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMessageProvider } from "./provider";
import {
  ALIGO_TEMPLATE_CODES,
  ALIMTALK_TEMPLATES,
  renderTemplate,
  resolveShopVars,
} from "./templates";
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
 * 고정 템플릿(코드 정의) + 매장 변수값으로 알림톡을 발송하고 이력을 남긴다.
 * 본문은 카카오 승인 템플릿과 일치해야 하므로 DB가 아닌 ALIMTALK_TEMPLATES에서 가져오고,
 * 매장별 설정(alimtalk_templates)은 enabled 여부와 변수값(variables)만 제공한다.
 * 수신 전화번호가 없으면 조용히 건너뛴다.
 */
export async function sendAlimtalk(
  kind: AlimtalkKind,
  ctx: AlimtalkContext,
  options: { onlyIfEnabled?: boolean; customerIsNew?: boolean } = {}
): Promise<void> {
  if (!ctx.phone) return;

  const admin = createAdminClient();
  const { data: setting } = await admin
    .from("alimtalk_templates")
    .select("enabled, variables")
    .eq("shop_id", ctx.shop.id)
    .eq("kind", kind)
    .single();

  if (options.onlyIfEnabled && !setting?.enabled) return;

  // 발송 대상 필터 (variables.sendTarget: all | new | existing)
  const savedVars = setting?.variables as Record<string, string> | null;
  const target = savedVars?.sendTarget;
  if (options.customerIsNew !== undefined) {
    if (target === "new" && !options.customerIsNew) return;
    if (target === "existing" && options.customerIsNew) return;
  }

  const def = ALIMTALK_TEMPLATES[kind];
  const content = renderTemplate(def.body, {
    shopName: ctx.shop.name,
    shopPhone: ctx.shop.phone,
    customerName: ctx.customerName,
    petNames: ctx.petNames.join(", "),
    visitDateTime: `${formatKoreanDate(ctx.date)} ${formatKoreanTime(ctx.startTime)}`,
    consentLink: ctx.consentLink ?? "",
    ...resolveShopVars(def, savedVars),
  });

  const provider = getMessageProvider();
  const status = await provider.send({
    phone: ctx.phone,
    content,
    kind,
    templateCode: ALIGO_TEMPLATE_CODES[kind],
  });

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

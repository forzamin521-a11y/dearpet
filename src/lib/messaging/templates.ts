import type { AlimtalkKind } from "@/lib/types";

/**
 * 알림톡 템플릿 정의.
 *
 * 알림톡 본문은 카카오 검수를 통과한 템플릿과 글자 단위로 일치해야 발송되므로
 * 매장이 본문을 자유 편집할 수 없다. 본문은 여기서 서비스 공용으로 고정하고,
 * 매장은 shopVars 로 선언된 변수의 "값"만 수정할 수 있다.
 *
 * 검수 등록 시에는 body의 {{변수}}를 카카오 표기인 #{변수}로 바꿔 제출한다.
 * (변환 목록은 docs/alimtalk-relay.md 참고)
 */

export interface ShopVarDef {
  /** body 안의 {{key}} 와 일치 */
  key: string;
  label: string;
  placeholder: string;
  /** 매장이 값을 저장하지 않았을 때 사용되는 기본값 */
  defaultValue: string;
  /** 여러 줄 입력 (Textarea) */
  multiline?: boolean;
}

export interface AlimtalkTemplateDef {
  kind: AlimtalkKind;
  /** 카카오 검수 템플릿과 동일해야 하는 고정 본문 */
  body: string;
  /** 매장이 값을 수정할 수 있는 변수 */
  shopVars: ShopVarDef[];
  /** 시스템이 자동으로 채우는 변수 (설명용) */
  autoVars: string[];
  /** 발송 대상(전체/신규 고객만/기존 고객만) 선택 가능 여부 — variables.sendTarget에 저장 */
  targetSelectable?: boolean;
}

/** targetSelectable 템플릿의 발송 대상 값 (variables.sendTarget) */
export const SEND_TARGET_LABEL: Record<string, string> = {
  all: "모든 고객",
  new: "신규 고객만 (첫 예약)",
  existing: "기존 고객만",
};

const EXTRA_INFO = (defaultValue: string): ShopVarDef => ({
  key: "extraInfo",
  label: "매장 안내문구",
  placeholder: "예) 주차는 매장 앞 공영주차장을 이용해 주세요.",
  defaultValue,
});

export const ALIMTALK_TEMPLATES: Record<AlimtalkKind, AlimtalkTemplateDef> = {
  basic: {
    kind: "basic",
    body: "고객님,\n{{shopName}} 입니다.\n\n[예약] 안내드립니다.\n\n▷일시: {{visitDateTime}}\n▷반려동물명: {{petNames}}\n▷매장번호: {{shopPhone}}\n\n{{extraInfo}}",
    shopVars: [
      EXTRA_INFO("예약 변경·문의는 매장으로 연락 부탁드립니다."),
    ],
    autoVars: ["shopName", "shopPhone", "visitDateTime", "petNames"],
  },
  senior: {
    kind: "senior",
    body: "고객님,\n{{shopName}} 입니다.\n\n노령견 미용 안내드립니다.\n7세 이상 반려동물은 미용 전 건강 상태를 꼭 알려주세요.\n\n▷일시: {{visitDateTime}}\n▷반려동물명: {{petNames}}\n\n{{extraInfo}}",
    shopVars: [
      EXTRA_INFO("질병·수술 이력이 있다면 방문 전 꼭 알려주세요."),
    ],
    autoVars: ["shopName", "visitDateTime", "petNames"],
  },
  consent: {
    kind: "consent",
    body: "■동의서 작성 안내■\n\n고객님,\n{{shopName}}입니다.\n\n원활한 서비스 제공을 위해 아래 링크를 눌러 매장 방문 전 동의서를 꼭 작성해 주세요.\n\n▷예약 일시: {{visitDateTime}}\n▷반려동물명: {{petNames}}\n▷매장번호: {{shopPhone}}\n\n{{consentLink}}\n\n{{extraInfo}}",
    shopVars: [EXTRA_INFO("")],
    autoVars: [
      "shopName",
      "shopPhone",
      "visitDateTime",
      "petNames",
      "consentLink",
    ],
  },
  confirm: {
    kind: "confirm",
    body: "고객님,\n{{shopName}} 입니다.\n\n예약이 접수되었습니다.\n\n▷일시: {{visitDateTime}}\n▷반려동물명: {{petNames}}\n\n{{extraInfo}}",
    shopVars: [EXTRA_INFO("")],
    autoVars: ["shopName", "visitDateTime", "petNames"],
  },
  deposit: {
    kind: "deposit",
    body: "고객님,\n∘{{shopName}}∘ 입니다.\n\n[예약금] 안내드립니다.\n\n▷일시: {{visitDateTime}}\n▷반려동물명: {{petNames}}\n▷매장번호: {{shopPhone}}\n\n[예약금 안내]\n계좌번호: {{bankAccount}}\n예약금: {{depositAmount}}\n\n{{depositPolicy}}\n\n{{extraInfo}}",
    shopVars: [
      {
        key: "bankAccount",
        label: "계좌번호",
        placeholder: "예: 농협 000-0000-0000-00 홍길동",
        defaultValue: "",
      },
      {
        key: "depositAmount",
        label: "예약금",
        placeholder: "예: 20,000원",
        defaultValue: "20,000원",
      },
      {
        key: "depositPolicy",
        label: "예약금 정책 안내",
        placeholder: "환불·입금 정책을 줄바꿈으로 입력하세요.",
        defaultValue:
          "* 상담 후 30분 이내 입금주셔야 예약이 확정됩니다.\n* 당일 예약 변경, 취소시 예약금 환불이 불가합니다.\n* 예약시간 20분 경과시 자동 취소되며, 예약금 환불이 불가합니다.\n* 미용비 결제는 예약금 차감 후 결제됩니다.",
        multiline: true,
      },
      EXTRA_INFO(
        "반려견의 건강상태 또는 미용 트라우마가 있으면 미용 전 미리 말씀 부탁드립니다."
      ),
    ],
    autoVars: ["shopName", "shopPhone", "visitDateTime", "petNames"],
    targetSelectable: true,
  },
  pre_visit: {
    kind: "pre_visit",
    body: "고객님,\n{{shopName}} 입니다.\n\n내일 예약 안내드립니다.\n\n▷일시: {{visitDateTime}}\n▷반려동물명: {{petNames}}\n\n{{extraInfo}}",
    shopVars: [EXTRA_INFO("")],
    autoVars: ["shopName", "visitDateTime", "petNames"],
  },
  change: {
    kind: "change",
    body: "고객님,\n{{shopName}} 입니다.\n\n예약이 변경되었습니다.\n\n▷변경된 일시: {{visitDateTime}}\n▷반려동물명: {{petNames}}\n\n{{extraInfo}}",
    shopVars: [EXTRA_INFO("")],
    autoVars: ["shopName", "visitDateTime", "petNames"],
  },
  cancel: {
    kind: "cancel",
    body: "고객님,\n{{shopName}} 입니다.\n\n예약이 취소되었습니다.\n\n▷일시: {{visitDateTime}}\n▷반려동물명: {{petNames}}\n\n{{extraInfo}}",
    shopVars: [EXTRA_INFO("")],
    autoVars: ["shopName", "visitDateTime", "petNames"],
  },
  finishing: {
    kind: "finishing",
    body: "고객님,\n{{shopName}} 입니다.\n\n미용이 곧 마무리됩니다. 픽업 부탁드립니다.\n\n▷반려동물명: {{petNames}}\n\n{{extraInfo}}",
    shopVars: [EXTRA_INFO("")],
    autoVars: ["shopName", "petNames"],
  },
  no_show: {
    kind: "no_show",
    body: "고객님,\n{{shopName}} 입니다.\n\n예약 시간에 방문하지 않으셔서 안내드립니다.\n\n▷일시: {{visitDateTime}}\n\n{{extraInfo}}",
    shopVars: [EXTRA_INFO("")],
    autoVars: ["shopName", "visitDateTime"],
  },
};

/**
 * 알리고 템플릿 코드 (tpl_code).
 * 알리고 관리자에서 카카오 검수 승인 후 발급되는 코드를 기입한다.
 * 코드가 비어 있는 kind는 실제 발송 시 실패 처리된다. (FakeProvider는 무관)
 */
export const ALIGO_TEMPLATE_CODES: Record<AlimtalkKind, string> = {
  basic: "",
  senior: "",
  consent: "",
  confirm: "",
  deposit: "",
  pre_visit: "",
  change: "",
  cancel: "",
  finishing: "",
  no_show: "",
};

/** {{변수}} 치환. 빈 변수로 남는 말미 공백은 제거한다. */
export function renderTemplate(
  content: string,
  vars: Record<string, string>
): string {
  return content
    .replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? "")
    .trimEnd();
}

/** 매장 저장값에 템플릿 기본값을 채워 shopVar 값 맵을 만든다 */
export function resolveShopVars(
  def: AlimtalkTemplateDef,
  saved: Record<string, string> | null | undefined
): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const v of def.shopVars) {
    vars[v.key] = saved?.[v.key] ?? v.defaultValue;
  }
  return vars;
}

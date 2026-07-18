import type { AlimtalkKind, ReservationStatus } from "./types";

export const RESERVATION_STATUS: Record<
  ReservationStatus,
  { label: string; dot: string; bg: string; text: string; border: string }
> = {
  reserved: {
    label: "예약",
    dot: "bg-violet-500",
    bg: "bg-violet-100",
    text: "text-violet-800",
    border: "border-violet-300",
  },
  arrived: {
    label: "도착",
    dot: "bg-teal-500",
    bg: "bg-teal-100",
    text: "text-teal-800",
    border: "border-teal-300",
  },
  finishing: {
    label: "마무리",
    dot: "bg-yellow-400",
    bg: "bg-yellow-100",
    text: "text-yellow-800",
    border: "border-yellow-300",
  },
  completed: {
    label: "완료",
    dot: "bg-green-500",
    bg: "bg-green-100",
    text: "text-green-800",
    border: "border-green-300",
  },
  canceled: {
    label: "취소",
    dot: "bg-pink-400",
    bg: "bg-pink-100",
    text: "text-pink-800",
    border: "border-pink-300",
  },
  no_show: {
    label: "노쇼",
    dot: "bg-orange-500",
    bg: "bg-orange-100",
    text: "text-orange-800",
    border: "border-orange-300",
  },
  deleted: {
    label: "삭제",
    dot: "bg-zinc-800",
    bg: "bg-zinc-100",
    text: "text-zinc-600",
    border: "border-zinc-300",
  },
};

export const ALIMTALK_KIND_LABEL: Record<AlimtalkKind, string> = {
  basic: "기본 예약 안내",
  senior: "노령견 안내",
  consent: "동의서 작성 안내",
  confirm: "예약 접수 안내",
  deposit: "예약금 안내",
  pre_visit: "예약 사전 안내",
  change: "예약 변경 안내",
  cancel: "예약 취소 안내",
  finishing: "예약 마무리 안내",
  no_show: "노쇼 안내",
};

/**
 * 예약 모달 ④에서 선택 발송할 수 있는 안내 알림톡.
 * 동의서(노령견 포함)는 ⑤에서 선택하고, 기본/예약금 안내는 둘 중 하나만 발송한다.
 */
export const SELECTABLE_ALIMTALK: AlimtalkKind[] = ["basic", "deposit"];

/** 상태 변경 시 자동 발송되는 알림톡 매핑 (confirm은 basic으로 통합되어 제외) */
export const STATUS_ALIMTALK: Partial<Record<ReservationStatus, AlimtalkKind>> = {
  finishing: "finishing",
  canceled: "cancel",
  no_show: "no_show",
};

export const PERMISSION_LABEL: Record<string, string> = {
  create: "예약 등록",
  update: "예약 변경",
  cancel: "예약 취소",
  delete: "예약 삭제",
  stats: "매출 통계",
};

/** 노령견 기준 나이 (년) */
export const SENIOR_PET_AGE = 7;

/** 캘린더 슬롯 간격 (분) */
export const SLOT_MINUTES = 30;

export const STAFF_EMOJIS = ["💜", "💛", "💙", "💚", "🧡", "❤️", "🤍", "🩷"];

/** 미용 서비스 등록 시 선택할 수 있는 이모지 목록 */
export const SERVICE_EMOJIS = [
  "🛁",
  "🫧",
  "🚿",
  "🧼",
  "✂️",
  "💈",
  "🐶",
  "🐩",
  "🐱",
  "🐾",
  "😊",
  "🎀",
  "💅",
  "✨",
  "🌸",
  "🦴",
];

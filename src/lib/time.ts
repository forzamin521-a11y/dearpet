/** "HH:MM" 또는 "HH:MM:SS" → 분 */
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/** 분 → "HH:MM" */
export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** "HH:MM" → "오전 10:00" / "오후 02:30" */
export function formatKoreanTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const period = h < 12 ? "오전" : "오후";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${period} ${String(hour12).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** "YYYY-MM-DD" → "07월 15일 수요일" */
export function formatKoreanDate(dateStr: string): string {
  const date = new Date(`${dateStr}T00:00:00`);
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  return `${String(date.getMonth() + 1).padStart(2, "0")}월 ${String(
    date.getDate()
  ).padStart(2, "0")}일 ${days[date.getDay()]}요일`;
}

/** Date → "YYYY-MM-DD" (로컬 기준) */
export function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** 오늘 날짜 "YYYY-MM-DD" */
export function todayString(): string {
  return toDateString(new Date());
}

/**
 * 한국시간(KST) 기준 날짜 "YYYY-MM-DD".
 * Vercel 등 UTC 서버에서 크론이 돌 때 시간대가 밀리지 않도록 사용한다.
 * @param offsetDays 0 = 오늘, 1 = 내일
 */
export function kstDateString(offsetDays = 0): string {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  kst.setUTCDate(kst.getUTCDate() + offsetDays);
  return kst.toISOString().slice(0, 10);
}

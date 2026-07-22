"use client";

import { Fragment, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { RESERVATION_STATUS, SLOT_MINUTES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { formatKoreanTime, minutesToTime, timeToMinutes } from "@/lib/time";
import type { ReservationFull } from "@/lib/data/reservations";
import type { BoxSettings, Profile } from "@/lib/types";

const PX_PER_MIN = 1.6;

interface DayGridProps {
  date: string;
  openTime: string;
  closeTime: string;
  boxSettings: BoxSettings;
  staff: Profile[];
  /** 뷰에서 숨긴 담당자 (일정 자체는 유지) */
  hiddenStaffIds: Set<string>;
  onChangeHiddenStaff: (ids: Set<string>) => void;
  reservations: ReservationFull[];
  canCreate: boolean;
  onSlotClick: (startTime: string, staffId: string | null) => void;
  onReservationClick: (reservation: ReservationFull) => void;
}

/** 우클릭 컨텍스트 메뉴 상태 */
interface ColumnMenu {
  x: number;
  y: number;
  staffId: string | null;
}

export function DayGrid({
  date,
  openTime,
  closeTime,
  boxSettings,
  staff,
  hiddenStaffIds,
  onChangeHiddenStaff,
  reservations,
  canCreate,
  onSlotClick,
  onReservationClick,
}: DayGridProps) {
  const [menu, setMenu] = useState<ColumnMenu | null>(null);

  const startMin = timeToMinutes(openTime);
  const endMin = Math.max(timeToMinutes(closeTime), startMin + 60);
  const totalMin = endMin - startMin;

  const dayReservations = reservations.filter((r) => r.date === date);
  const hasUnassigned = dayReservations.some((r) => !r.staff_id);

  const visibleStaff = staff.filter((s) => !hiddenStaffIds.has(s.id));
  const hiddenStaff = staff.filter((s) => hiddenStaffIds.has(s.id));

  const columns: Array<{ id: string | null; label: string }> = [
    ...visibleStaff.map((s) => ({ id: s.id, label: `${s.name}${s.emoji}` })),
    ...(hasUnassigned ? [{ id: null, label: "담당자 미지정" }] : []),
  ];
  if (columns.length === 0) columns.push({ id: null, label: "담당자 미지정" });

  const openMenu = (e: React.MouseEvent, staffId: string | null) => {
    e.preventDefault();
    setMenu({ x: e.clientX, y: e.clientY, staffId });
  };

  const hideStaff = (staffId: string) => {
    onChangeHiddenStaff(new Set([...hiddenStaffIds, staffId]));
    setMenu(null);
  };

  const showStaff = (staffId: string) => {
    const next = new Set(hiddenStaffIds);
    next.delete(staffId);
    onChangeHiddenStaff(next);
    setMenu(null);
  };

  const menuStaff = menu?.staffId
    ? staff.find((s) => s.id === menu.staffId)
    : null;

  const hourMarks: number[] = [];
  for (let m = startMin; m < endMin; m += 60) hourMarks.push(m);

  return (
    <div className="flex min-w-0 sm:min-w-fit">
      {/* 시간축 */}
      <div className="sticky left-0 z-10 w-16 shrink-0 border-r bg-background">
        <div className="h-10 border-b" />
        <div className="relative" style={{ height: totalMin * PX_PER_MIN }}>
          {hourMarks.map((m) => (
            <span
              key={m}
              className="absolute right-2 -translate-y-1/2 text-xs text-muted-foreground"
              style={{ top: (m - startMin) * PX_PER_MIN }}
            >
              {formatKoreanTime(minutesToTime(m)).replace(":00", "")}
            </span>
          ))}
        </div>
      </div>

      {/* 담당자별 열 */}
      {columns.map((column) => {
        const items = dayReservations.filter((r) =>
          column.id === null ? !r.staff_id : r.staff_id === column.id
        );
        return (
          <Fragment key={column.id ?? "none"}>
            <div
              className="min-w-0 flex-1 border-r last:border-r-0 sm:min-w-56"
              onContextMenu={(e) => openMenu(e, column.id)}
            >
              <div className="glass-toolbar sticky top-0 z-10 flex h-10 items-center justify-center truncate border-b px-1 text-sm font-semibold">
                {column.label}
              </div>
              <div
                className="relative"
                style={{ height: totalMin * PX_PER_MIN }}
              >
                {/* 30분 슬롯 (빈 시간 클릭) */}
                {Array.from(
                  { length: Math.ceil(totalMin / SLOT_MINUTES) },
                  (_, i) => {
                    const slotStart = startMin + i * SLOT_MINUTES;
                    return (
                      <div
                        key={i}
                        className={cn(
                          "absolute inset-x-0 border-b border-dashed border-border/60",
                          i % 2 === 1 && "border-solid",
                          canCreate && "cursor-pointer hover:bg-accent/40"
                        )}
                        style={{
                          top: i * SLOT_MINUTES * PX_PER_MIN,
                          height: SLOT_MINUTES * PX_PER_MIN,
                        }}
                        onClick={() =>
                          canCreate &&
                          onSlotClick(minutesToTime(slotStart), column.id)
                        }
                      />
                    );
                  }
                )}

                {/* 예약 박스 */}
                {items.map((reservation) => {
                  const top =
                    (timeToMinutes(String(reservation.start_time).slice(0, 5)) -
                      startMin) *
                    PX_PER_MIN;
                  const height = Math.max(
                    (timeToMinutes(String(reservation.end_time).slice(0, 5)) -
                      timeToMinutes(
                        String(reservation.start_time).slice(0, 5)
                      )) *
                      PX_PER_MIN,
                    30
                  );
                  return (
                    <ReservationBox
                      key={reservation.id}
                      reservation={reservation}
                      boxSettings={boxSettings}
                      style={{ top, height }}
                      onClick={() => onReservationClick(reservation)}
                    />
                  );
                })}
              </div>
            </div>
          </Fragment>
        );
      })}

      {/* 우클릭 컨텍스트 메뉴: 담당자 달력 추가/숨기기 (뷰 전용) */}
      {menu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setMenu(null)}
            onContextMenu={(e) => {
              e.preventDefault();
              setMenu(null);
            }}
          />
          <div
            className="fixed z-50 min-w-48 rounded-lg border bg-popover p-1 text-sm shadow-md"
            style={{
              left: Math.min(menu.x, window.innerWidth - 220),
              top: Math.min(menu.y, window.innerHeight - 200),
            }}
          >
            {menuStaff && visibleStaff.length > 1 && (
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left hover:bg-accent"
                onClick={() => hideStaff(menuStaff.id)}
              >
                <EyeOff className="size-4 text-muted-foreground" />
                &lsquo;{menuStaff.name}
                {menuStaff.emoji}&rsquo; 달력 숨기기
              </button>
            )}
            {menuStaff && visibleStaff.length <= 1 && (
              <p className="px-2.5 py-2 text-xs text-muted-foreground">
                마지막 담당자 달력은 숨길 수 없습니다.
              </p>
            )}
            {hiddenStaff.length > 0 && (
              <>
                {menuStaff && <div className="my-1 border-t" />}
                {hiddenStaff.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left hover:bg-accent"
                    onClick={() => showStaff(s.id)}
                  >
                    <Eye className="size-4 text-muted-foreground" />
                    &lsquo;{s.name}
                    {s.emoji}&rsquo; 달력 추가
                  </button>
                ))}
                <div className="my-1 border-t" />
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left hover:bg-accent"
                  onClick={() => {
                    onChangeHiddenStaff(new Set());
                    setMenu(null);
                  }}
                >
                  <Eye className="size-4 text-muted-foreground" />
                  모든 담당자 표시
                </button>
              </>
            )}
            {!menuStaff && hiddenStaff.length === 0 && (
              <p className="px-2.5 py-2 text-xs text-muted-foreground">
                담당자 열에서 우클릭하면 달력을 숨길 수 있습니다.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function ReservationBox({
  reservation,
  boxSettings,
  style,
  onClick,
}: {
  reservation: ReservationFull;
  boxSettings: BoxSettings;
  style: React.CSSProperties;
  onClick: () => void;
}) {
  const status = RESERVATION_STATUS[reservation.status];
  const fields = boxSettings?.fields ?? {
    customerName: true,
    time: true,
    petName: true,
    breed: true,
    product: true,
    memo: true,
  };
  const align = boxSettings?.align ?? "left";

  const start = formatKoreanTime(String(reservation.start_time).slice(0, 5));
  const end = formatKoreanTime(String(reservation.end_time).slice(0, 5));

  /** 반려동물이 받는 서비스 (신규 services 우선, 구 상품>옵션 구조는 폴백) */
  const serviceLabel = (rp: ReservationFull["reservation_pets"][number]) =>
    rp.service
      ? `${rp.service.emoji}${rp.service.name}`
      : rp.option
        ? `${rp.option.product?.emoji ?? ""}${rp.option.product?.name ?? ""}`
        : null;

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        "absolute inset-x-1 z-[5] overflow-hidden rounded-lg border p-1.5 text-left text-xs shadow-sm transition-shadow hover:shadow-md",
        status.bg,
        status.border,
        status.text,
        align === "center" && "text-center",
        align === "right" && "text-right"
      )}
      style={style}
    >
      <span
        className={cn(
          "mb-0.5 inline-block rounded px-1 py-px text-[10px] font-bold text-white",
          status.dot
        )}
      >
        {status.label}
      </span>
      {reservation.status === "completed" && reservation.sales.length === 0 && (
        <span className="mb-0.5 ml-1 inline-block rounded bg-red-500 px-1 py-px text-[10px] font-bold text-white">
          매출 미등록
        </span>
      )}
      {fields.customerName && (
        <p className="truncate font-semibold">
          {reservation.customer?.name || "고객"}
        </p>
      )}
      {fields.time && (
        <p className="truncate opacity-80">
          {start} ~ {end}
        </p>
      )}
      {fields.petName &&
        reservation.reservation_pets.map((rp) => {
          const service = serviceLabel(rp);
          return (
            <div key={rp.id}>
              <p className="truncate">
                🐾 {rp.pet?.name}
                {fields.breed && rp.pet?.breed ? ` (${rp.pet.breed})` : ""}
              </p>
              {fields.product && service && (
                <p className="truncate pl-3 opacity-80">{service}</p>
              )}
            </div>
          );
        })}
      {fields.memo && reservation.memo && (
        <p className="truncate opacity-70">📝 {reservation.memo}</p>
      )}
    </button>
  );
}

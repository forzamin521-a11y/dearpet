"use client";

import { Fragment } from "react";
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
  reservations: ReservationFull[];
  canCreate: boolean;
  onSlotClick: (startTime: string, staffId: string | null) => void;
  onReservationClick: (reservation: ReservationFull) => void;
}

export function DayGrid({
  date,
  openTime,
  closeTime,
  boxSettings,
  staff,
  reservations,
  canCreate,
  onSlotClick,
  onReservationClick,
}: DayGridProps) {
  const startMin = timeToMinutes(openTime);
  const endMin = Math.max(timeToMinutes(closeTime), startMin + 60);
  const totalMin = endMin - startMin;

  const dayReservations = reservations.filter((r) => r.date === date);
  const hasUnassigned = dayReservations.some((r) => !r.staff_id);

  const columns: Array<{ id: string | null; label: string }> = [
    ...staff.map((s) => ({ id: s.id, label: `${s.name}${s.emoji}` })),
    ...(hasUnassigned ? [{ id: null, label: "담당자 미지정" }] : []),
  ];
  if (columns.length === 0) columns.push({ id: null, label: "담당자 미지정" });

  const hourMarks: number[] = [];
  for (let m = startMin; m < endMin; m += 60) hourMarks.push(m);

  return (
    <div className="flex min-w-fit">
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
            <div className="min-w-56 flex-1 border-r last:border-r-0">
              <div className="sticky top-0 z-10 flex h-10 items-center justify-center border-b bg-background text-sm font-semibold">
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

  const productNames = [
    ...new Set(
      reservation.reservation_pets
        .map((rp) =>
          rp.option ? `${rp.option.product?.emoji ?? ""}${rp.option.product?.name ?? ""}` : null
        )
        .filter(Boolean)
    ),
  ];

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
          {reservation.customer?.name ?? "고객"}
        </p>
      )}
      {fields.time && (
        <p className="truncate opacity-80">
          {start} ~ {end}
        </p>
      )}
      {fields.petName &&
        reservation.reservation_pets.map((rp) => (
          <p key={rp.id} className="truncate">
            🐾 {rp.pet?.name}
            {fields.breed && rp.pet?.breed ? ` (${rp.pet.breed})` : ""}
          </p>
        ))}
      {fields.product && productNames.length > 0 && (
        <p className="truncate">{productNames.join(", ")}</p>
      )}
      {fields.memo && reservation.memo && (
        <p className="truncate opacity-70">📝 {reservation.memo}</p>
      )}
    </button>
  );
}

"use client";

import { RESERVATION_STATUS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { formatKoreanTime, toDateString, todayString } from "@/lib/time";
import type { ReservationFull } from "@/lib/data/reservations";
import type { Profile } from "@/lib/types";

const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

interface WeekGridProps {
  date: string;
  reservations: ReservationFull[];
  staff: Profile[];
  onDayClick: (date: string) => void;
  onReservationClick: (reservation: ReservationFull) => void;
}

export function WeekGrid({
  date,
  reservations,
  staff,
  onDayClick,
  onReservationClick,
}: WeekGridProps) {
  const base = new Date(`${date}T00:00:00`);
  const weekStart = new Date(base);
  weekStart.setDate(base.getDate() - base.getDay());

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return toDateString(d);
  });

  const today = todayString();
  const staffEmoji = new Map(staff.map((s) => [s.id, s.emoji]));

  return (
    <div className="grid min-w-[900px] grid-cols-7">
      {days.map((day, i) => {
        const items = reservations
          .filter((r) => r.date === day)
          .sort((a, b) =>
            String(a.start_time).localeCompare(String(b.start_time))
          );
        return (
          <div key={day} className="min-h-[70vh] border-r last:border-r-0">
            <button
              type="button"
              onClick={() => onDayClick(day)}
              className={cn(
                "sticky top-0 z-10 flex h-12 w-full flex-col items-center justify-center border-b bg-background text-sm hover:bg-accent",
                i === 0 && "text-red-500",
                i === 6 && "text-blue-500"
              )}
            >
              <span className="text-xs text-muted-foreground">
                {DAY_LABELS[i]}
              </span>
              <span
                className={cn(
                  "font-semibold",
                  day === today &&
                    "flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground"
                )}
              >
                {Number(day.slice(8))}
              </span>
            </button>
            <div className="space-y-1 p-1">
              {items.map((reservation) => {
                const status = RESERVATION_STATUS[reservation.status];
                return (
                  <button
                    key={reservation.id}
                    type="button"
                    onClick={() => onReservationClick(reservation)}
                    className={cn(
                      "w-full overflow-hidden rounded-md border p-1 text-left text-xs hover:shadow",
                      status.bg,
                      status.border,
                      status.text
                    )}
                  >
                    <p className="truncate font-medium">
                      {formatKoreanTime(
                        String(reservation.start_time).slice(0, 5)
                      )}{" "}
                      {reservation.customer?.name}
                      {reservation.staff_id
                        ? ` ${staffEmoji.get(reservation.staff_id) ?? ""}`
                        : ""}
                    </p>
                    <p className="truncate opacity-80">
                      {reservation.reservation_pets
                        .map((rp) => rp.pet?.name)
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

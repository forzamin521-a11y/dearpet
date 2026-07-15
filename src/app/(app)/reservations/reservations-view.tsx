"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarPlus, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { saveDailyMemo } from "@/lib/actions/reservations";
import { formatKoreanDate, toDateString, todayString } from "@/lib/time";
import type { ReservationFull } from "@/lib/data/reservations";
import type {
  BoxSettings,
  ConsentForm,
  GroomingProduct,
  ProductOption,
  Profile,
} from "@/lib/types";
import { DayGrid } from "./day-grid";
import { WeekGrid } from "./week-grid";
import { ReservationModal, type ModalPrefill } from "./reservation-modal";
import { ReservationDetail } from "./reservation-detail";

export interface CalendarPermissions {
  create: boolean;
  update: boolean;
  cancel: boolean;
  delete: boolean;
}

interface ReservationsViewProps {
  shopName: string;
  openTime: string;
  closeTime: string;
  boxSettings: BoxSettings;
  date: string;
  view: "day" | "week";
  reservations: ReservationFull[];
  staff: Profile[];
  products: GroomingProduct[];
  options: ProductOption[];
  consentForms: ConsentForm[];
  dailyMemo: string;
  permissions: CalendarPermissions;
}

export function ReservationsView(props: ReservationsViewProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [memo, setMemo] = useState(props.dailyMemo);
  const [modalPrefill, setModalPrefill] = useState<ModalPrefill | null>(null);
  const [editTarget, setEditTarget] = useState<ReservationFull | null>(null);
  const [detailTarget, setDetailTarget] = useState<ReservationFull | null>(
    null
  );

  const selectedDate = useMemo(
    () => new Date(`${props.date}T00:00:00`),
    [props.date]
  );

  const navigate = (date: string, view?: string) => {
    router.push(`/reservations?date=${date}&view=${view ?? props.view}`);
  };

  const shiftDate = (delta: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + delta * (props.view === "week" ? 7 : 1));
    navigate(toDateString(d));
  };

  // detailTarget을 최신 데이터와 동기화 (상태 변경 후 revalidate 반영)
  const detail = detailTarget
    ? props.reservations.find((r) => r.id === detailTarget.id) ?? detailTarget
    : null;

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* 좌측 패널 */}
      <aside className="hidden w-64 shrink-0 flex-col gap-4 overflow-y-auto border-r p-4 lg:flex">
        <Button
          className="w-full"
          disabled={!props.permissions.create}
          onClick={() =>
            setModalPrefill({ date: props.date, startTime: null, staffId: null })
          }
        >
          <CalendarPlus /> 신규 예약
        </Button>
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(d) => d && navigate(toDateString(d))}
          className="rounded-xl border"
        />
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">
            {props.date.slice(5).replace("-", "/")} 메모
          </Label>
          <Textarea
            rows={6}
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            onBlur={() => {
              if (memo !== props.dailyMemo) {
                startTransition(async () => {
                  const result = await saveDailyMemo(props.date, memo);
                  if (!result.ok) toast.error(result.error);
                });
              }
            }}
            placeholder="이 날짜의 메모를 남겨보세요"
          />
        </div>
        <p className="mt-auto text-sm font-medium text-muted-foreground">
          {props.shopName}
        </p>
      </aside>

      {/* 메인 캘린더 */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between gap-2 border-b p-3">
          <div className="flex items-center gap-1">
            <Button size="icon-sm" variant="ghost" onClick={() => shiftDate(-1)}>
              <ChevronLeft />
            </Button>
            <p className="min-w-36 text-center font-semibold">
              {formatKoreanDate(props.date)}
            </p>
            <Button size="icon-sm" variant="ghost" onClick={() => shiftDate(1)}>
              <ChevronRight />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate(todayString())}
            >
              오늘
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="lg:hidden"
              disabled={!props.permissions.create}
              onClick={() =>
                setModalPrefill({
                  date: props.date,
                  startTime: null,
                  staffId: null,
                })
              }
            >
              <CalendarPlus /> 신규 예약
            </Button>
            <Select
              value={props.view}
              onValueChange={(v) => navigate(props.date, v)}
            >
              <SelectTrigger size="sm" className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">일간</SelectItem>
                <SelectItem value="week">주간</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {props.view === "day" ? (
            <DayGrid
              date={props.date}
              openTime={props.openTime}
              closeTime={props.closeTime}
              boxSettings={props.boxSettings}
              staff={props.staff}
              reservations={props.reservations}
              canCreate={props.permissions.create}
              onSlotClick={(startTime, staffId) =>
                setModalPrefill({ date: props.date, startTime, staffId })
              }
              onReservationClick={setDetailTarget}
            />
          ) : (
            <WeekGrid
              date={props.date}
              reservations={props.reservations}
              staff={props.staff}
              onDayClick={(d) => navigate(d, "day")}
              onReservationClick={setDetailTarget}
            />
          )}
        </div>
      </div>

      {/* 신규/수정 모달 */}
      {(modalPrefill || editTarget) && (
        <ReservationModal
          prefill={modalPrefill}
          editing={editTarget}
          staff={props.staff}
          products={props.products}
          options={props.options}
          consentForms={props.consentForms}
          dayReservations={props.reservations}
          onClose={() => {
            setModalPrefill(null);
            setEditTarget(null);
          }}
        />
      )}

      {/* 예약 상세 */}
      {detail && (
        <ReservationDetail
          reservation={detail}
          permissions={props.permissions}
          onClose={() => setDetailTarget(null)}
          onEdit={() => {
            setEditTarget(detail);
            setDetailTarget(null);
          }}
        />
      )}
    </div>
  );
}

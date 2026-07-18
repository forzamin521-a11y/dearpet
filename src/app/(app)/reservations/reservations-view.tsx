"use client";

import { useMemo, useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  NotebookPen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
import type { BoxSettings, ConsentForm, Profile, Service } from "@/lib/types";
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
  services: Service[];
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
  const [mobileCalOpen, setMobileCalOpen] = useState(false);

  // 날짜/뷰 전환 시 서버 응답을 기다리지 않고 즉시 UI에 반영 (데이터 로딩 동안 그리드는 흐리게)
  const [navPending, startNavTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic({
    date: props.date,
    view: props.view,
  });

  const selectedDate = useMemo(
    () => new Date(`${optimistic.date}T00:00:00`),
    [optimistic.date]
  );

  const navigate = (date: string, view?: string) => {
    const nextView = (view ?? optimistic.view) as "day" | "week";
    startNavTransition(() => {
      setOptimistic({ date, view: nextView });
      router.push(`/reservations?date=${date}&view=${nextView}`);
    });
  };

  const shiftDate = (delta: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + delta * (optimistic.view === "week" ? 7 : 1));
    navigate(toDateString(d));
  };

  const saveMemoIfChanged = () => {
    if (memo !== props.dailyMemo) {
      startTransition(async () => {
        const result = await saveDailyMemo(props.date, memo);
        if (!result.ok) toast.error(result.error);
      });
    }
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
            onBlur={saveMemoIfChanged}
            placeholder="이 날짜의 메모를 남겨보세요"
          />
        </div>
        <p className="mt-auto text-sm font-medium text-muted-foreground">
          {props.shopName}
        </p>
      </aside>

      {/* 메인 캘린더 */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b p-3">
          <div className="flex items-center gap-1">
            <Button
              size="icon-sm"
              variant="ghost"
              className="max-lg:size-9"
              onClick={() => shiftDate(-1)}
            >
              <ChevronLeft />
            </Button>
            {/* 날짜를 누르면 미니 달력 (모바일에서 좌측 패널 달력 대체) */}
            <Popover open={mobileCalOpen} onOpenChange={setMobileCalOpen}>
              <PopoverTrigger asChild>
                <button className="min-w-36 rounded-md px-1 py-0.5 text-center font-semibold hover:bg-accent">
                  {formatKoreanDate(optimistic.date)}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="center">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(d) => {
                    if (d) {
                      navigate(toDateString(d));
                      setMobileCalOpen(false);
                    }
                  }}
                />
              </PopoverContent>
            </Popover>
            <Button
              size="icon-sm"
              variant="ghost"
              className="max-lg:size-9"
              onClick={() => shiftDate(1)}
            >
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
            {/* 모바일 전용: 일일 메모 (데스크톱은 좌측 패널에 있음) */}
            <Popover onOpenChange={(open) => !open && saveMemoIfChanged()}>
              <PopoverTrigger asChild>
                <Button size="icon-sm" variant="outline" className="size-9 lg:hidden">
                  <NotebookPen />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72" align="end">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">
                    {props.date.slice(5).replace("-", "/")} 메모
                  </Label>
                  <Textarea
                    rows={5}
                    value={memo}
                    onChange={(e) => setMemo(e.target.value)}
                    onBlur={saveMemoIfChanged}
                    placeholder="이 날짜의 메모를 남겨보세요"
                  />
                </div>
              </PopoverContent>
            </Popover>
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
              value={optimistic.view}
              onValueChange={(v) => navigate(optimistic.date, v)}
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

        <div
          className={
            navPending
              ? "flex-1 overflow-auto opacity-50 transition-opacity"
              : "flex-1 overflow-auto"
          }
        >
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
          services={props.services}
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

"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Link2, Pencil, Receipt } from "lucide-react";
import {
  registerSaleForReservation,
  updateReservationStatus,
} from "@/lib/actions/reservations";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { RESERVATION_STATUS, SENIOR_PET_AGE } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { formatKoreanDate, formatKoreanTime } from "@/lib/time";
import type { ReservationFull } from "@/lib/data/reservations";
import type { Profile, ReservationStatus, SaleItem } from "@/lib/types";
import type { CalendarPermissions } from "./reservations-view";
import { SaleRegisterDialog, type SalePayment } from "./sale-register-dialog";

const STATUS_ORDER: ReservationStatus[] = [
  "reserved",
  "arrived",
  "finishing",
  "completed",
  "canceled",
  "no_show",
  "deleted",
];

export function ReservationDetail({
  reservation,
  staff,
  permissions,
  onClose,
  onEdit,
}: {
  reservation: ReservationFull;
  staff: Profile[];
  permissions: CalendarPermissions;
  onClose: () => void;
  onEdit: () => void;
}) {
  const [pending, startTransition] = useTransition();
  // 완료 시: confirm(매출 등록할까요?) → payment(금액/수단 입력)
  const [saleConfirmOpen, setSaleConfirmOpen] = useState(false);
  const [paymentMode, setPaymentMode] = useState<"complete" | "later" | null>(
    null
  );
  const [confirmStatus, setConfirmStatus] = useState<ReservationStatus | null>(
    null
  );

  const hasSale = reservation.sales.length > 0;

  const canChangeTo = (status: ReservationStatus): boolean => {
    if (status === "canceled") return permissions.cancel;
    if (status === "deleted") return permissions.delete;
    return permissions.update;
  };

  const applyStatus = (
    status: ReservationStatus,
    payment?: SalePayment,
    saleDetail?: { items: SaleItem[]; staffId: string | null }
  ) => {
    startTransition(async () => {
      const result = await updateReservationStatus(
        reservation.id,
        status,
        payment,
        saleDetail
      );
      if (result.ok) {
        toast.success(
          `'${RESERVATION_STATUS[status].label}' 상태로 변경되었습니다.`
        );
        setPaymentMode(null);
        setConfirmStatus(null);
        if (status === "deleted") onClose();
      } else {
        toast.error(result.error);
      }
    });
  };

  /** 완료된 예약에 나중에 매출 등록 */
  const registerSale = (
    payment: SalePayment,
    saleDetail?: { items: SaleItem[]; staffId: string | null }
  ) => {
    startTransition(async () => {
      const result = await registerSaleForReservation(
        reservation.id,
        payment,
        saleDetail
      );
      if (result.ok) {
        toast.success("매출이 등록되었습니다.");
        setPaymentMode(null);
      } else {
        toast.error(result.error);
      }
    });
  };

  const handleStatusSelect = (value: string) => {
    const status = value as ReservationStatus;
    if (status === reservation.status) return;
    if (!canChangeTo(status)) {
      toast.error("해당 상태로 변경할 권한이 없습니다.");
      return;
    }
    if (status === "completed") {
      // 이미 선금/예약금 등을 매출로 등록해둔 경우 다시 묻지 않고 바로 완료 처리
      if (hasSale) {
        applyStatus("completed");
      } else {
        setSaleConfirmOpen(true);
      }
    } else if (status === "deleted" || status === "canceled") {
      setConfirmStatus(status);
    } else {
      applyStatus(status);
    }
  };

  const status = RESERVATION_STATUS[reservation.status];

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>예약 정보</SheetTitle>
        </SheetHeader>

        <div className="space-y-6 px-5 pb-8">
          {/* 상태 변경 */}
          <div className="flex items-center gap-2">
            <Select
              value={reservation.status}
              onValueChange={handleStatusSelect}
              disabled={pending}
            >
              <SelectTrigger className="w-36">
                <SelectValue>
                  <span className="flex items-center gap-2">
                    <span className={cn("size-2.5 rounded-full", status.dot)} />
                    {status.label}
                  </span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {STATUS_ORDER.map((s) => (
                  <SelectItem key={s} value={s} disabled={!canChangeTo(s)}>
                    <span className="flex items-center gap-2">
                      <span
                        className={cn(
                          "size-2.5 rounded-full",
                          RESERVATION_STATUS[s].dot
                        )}
                      />
                      {RESERVATION_STATUS[s].label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {permissions.update && (
              <Button size="sm" variant="outline" onClick={onEdit}>
                <Pencil /> 수정
              </Button>
            )}
          </div>

          {/* 완료됐지만 매출 미등록 → 눈에 띄게 안내 */}
          {reservation.status === "completed" && !hasSale && (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-orange-300 bg-orange-50 p-3">
              <p className="text-sm font-medium text-orange-700">
                ⚠️ 매출이 아직 등록되지 않았습니다.
              </p>
              <Button size="sm" onClick={() => setPaymentMode("later")}>
                <Receipt /> 매출 등록
              </Button>
            </div>
          )}

          {/* 완료 전에도 예약금 등 선입금을 미리 매출로 등록 가능 */}
          {reservation.status !== "completed" &&
            reservation.status !== "deleted" &&
            !hasSale && (
              <div className="flex items-center justify-between gap-2 rounded-lg border bg-secondary/50 p-3">
                <p className="text-sm text-muted-foreground">
                  예약금 등 선입금이 있다면 미리 매출로 등록할 수 있습니다.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPaymentMode("later")}
                >
                  <Receipt /> 매출 등록
                </Button>
              </div>
            )}

          {/* 완료 전 미리 등록된 매출(선입금)이 있음을 안내 */}
          {reservation.status !== "completed" && hasSale && (
            <div className="flex items-center gap-2 rounded-lg border border-green-300 bg-green-50 p-3">
              <p className="text-sm font-medium text-green-700">
                ✅ 선입금이 매출로 등록되어 있습니다. 완료 처리 시 다시 묻지
                않습니다.
              </p>
            </div>
          )}

          {/* 일정 */}
          <div className="rounded-lg bg-secondary p-3 text-sm">
            <p className="font-semibold">
              {formatKoreanDate(reservation.date)}
            </p>
            <p className="text-muted-foreground">
              {formatKoreanTime(String(reservation.start_time).slice(0, 5))} ~{" "}
              {formatKoreanTime(String(reservation.end_time).slice(0, 5))}
            </p>
          </div>

          {/* 보호자 정보 */}
          <section className="space-y-2">
            <p className="text-sm font-semibold">보호자 정보</p>
            <div className="space-y-1 text-sm">
              <p className="font-medium">
                {reservation.customer?.name || "(호칭 없음)"}
              </p>
              {(reservation.customer?.phones ?? []).map((phone) => (
                <p key={phone} className="text-muted-foreground">
                  {phone}
                </p>
              ))}
              {reservation.customer?.memo && (
                <p className="text-muted-foreground">
                  📝 {reservation.customer.memo}
                </p>
              )}
            </div>
          </section>

          <Separator />

          {/* 반려동물 + 서비스 */}
          <section className="space-y-3">
            <p className="text-sm font-semibold">반려동물 & 서비스</p>
            {reservation.reservation_pets.map((rp) => (
              <div key={rp.id} className="rounded-lg border p-3 text-sm">
                <p className="font-medium">
                  🐾 {rp.pet?.name}
                  {rp.pet?.breed && ` (${rp.pet.breed})`}
                </p>
                <p className="text-xs text-muted-foreground">
                  {rp.pet?.age_years != null &&
                    `${rp.pet.age_years}살${
                      rp.pet.age_years >= SENIOR_PET_AGE ? " · 노령견" : ""
                    }`}
                  {rp.pet?.weight_kg != null && ` · ${rp.pet.weight_kg}kg`}
                  {rp.pet?.marking != null &&
                    ` · 마킹 ${rp.pet.marking ? "O" : "X"}`}
                </p>
                <p className="mt-2">
                  {rp.service ? (
                    <span className="inline-flex items-center rounded-full border bg-secondary px-2.5 py-0.5 font-medium">
                      {rp.service.emoji}
                      {rp.service.name}
                    </span>
                  ) : rp.option ? (
                    `${rp.option.product?.emoji ?? ""} ${
                      rp.option.product?.name ?? ""
                    } > ${rp.option.name}`
                  ) : (
                    "서비스 미지정"
                  )}
                </p>
                {rp.pet?.memo && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    📝 {rp.pet.memo}
                  </p>
                )}
              </div>
            ))}
          </section>

          {/* 동의서 */}
          {reservation.consent_submissions.length > 0 && (
            <>
              <Separator />
              <section className="space-y-2">
                <p className="text-sm font-semibold">동의서</p>
                {reservation.consent_submissions.map((cs) => (
                  <ConsentSubmissionCard key={cs.id} submission={cs} />
                ))}
              </section>
            </>
          )}

          {reservation.memo && (
            <>
              <Separator />
              <section className="space-y-1">
                <p className="text-sm font-semibold">예약 메모</p>
                <p className="text-sm text-muted-foreground">
                  {reservation.memo}
                </p>
              </section>
            </>
          )}
        </div>
      </SheetContent>

      {/* 완료 → 매출 등록 여부 확인 */}
      <AlertDialog open={saleConfirmOpen} onOpenChange={setSaleConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>매출을 등록하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              지금 등록하면 결제 수단과 금액을 입력합니다. &apos;나중에&apos;를
              선택하면 완료 처리만 되고, 예약에 매출 미등록 표시가 남습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>닫기</AlertDialogCancel>
            <Button
              variant="outline"
              disabled={pending}
              onClick={() => {
                setSaleConfirmOpen(false);
                applyStatus("completed");
              }}
            >
              나중에
            </Button>
            <AlertDialogAction
              onClick={() => {
                setSaleConfirmOpen(false);
                setPaymentMode("complete");
              }}
            >
              네, 등록할게요
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 매출 등록 (담당자별 판매 상품 선택 + 결제 수단) */}
      {paymentMode && (
        <SaleRegisterDialog
          staff={staff}
          defaultStaffId={reservation.staff_id}
          pending={pending}
          onClose={() => setPaymentMode(null)}
          onSubmit={(payment, items, staffId) =>
            paymentMode === "complete"
              ? applyStatus("completed", payment, { items, staffId })
              : registerSale(payment, { items, staffId })
          }
        />
      )}

      {/* 취소/삭제 확인 */}
      <AlertDialog
        open={!!confirmStatus}
        onOpenChange={(open) => !open && setConfirmStatus(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmStatus === "deleted"
                ? "예약을 삭제할까요?"
                : "예약을 취소할까요?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmStatus === "deleted"
                ? "삭제된 예약은 캘린더에서 사라집니다."
                : "취소 알림톡 설정이 켜져 있으면 고객에게 발송됩니다."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>닫기</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmStatus && applyStatus(confirmStatus)}
            >
              확인
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sheet>
  );
}

/** 예약 상세의 동의서 1건: 상태 배지 + 서명 이미지 + 대기 중이면 링크 복사 */
function ConsentSubmissionCard({
  submission,
}: {
  submission: ReservationFull["consent_submissions"][number];
}) {
  const [showSignature, setShowSignature] = useState(false);
  const signed = submission.status === "signed";

  const copyLink = async () => {
    const link = `${window.location.origin}/consent/${submission.token}`;
    try {
      await navigator.clipboard.writeText(link);
      toast.success("서명 링크가 복사되었습니다.");
    } catch {
      toast.error("링크 복사에 실패했습니다.");
    }
  };

  return (
    <div className="space-y-2 rounded-lg border p-3 text-sm">
      <div className="flex items-center gap-2">
        <span className="min-w-0 flex-1 truncate font-medium">
          📋 {submission.form?.title ?? "동의서"}
        </span>
        <span
          className={cn(
            "shrink-0 rounded px-1.5 py-0.5 text-[11px] font-medium",
            signed
              ? "bg-green-100 text-green-800"
              : "bg-orange-100 text-orange-700"
          )}
        >
          {signed ? "작성 완료" : "작성 대기"}
        </span>
      </div>
      {signed ? (
        <>
          <p className="text-xs text-muted-foreground">
            {submission.signer_name}님 서명 ·{" "}
            {submission.signed_at &&
              new Date(submission.signed_at).toLocaleString("ko-KR", {
                dateStyle: "short",
                timeStyle: "short",
              })}
          </p>
          {submission.signature_url && (
            <>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={() => setShowSignature((v) => !v)}
              >
                {showSignature ? "서명 접기" : "서명 보기"}
              </Button>
              {showSignature && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={submission.signature_url}
                  alt="고객 서명"
                  className="max-h-28 rounded-md border bg-white"
                />
              )}
            </>
          )}
        </>
      ) : (
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs"
          onClick={copyLink}
        >
          <Link2 className="size-3.5" /> 서명 링크 복사
        </Button>
      )}
    </div>
  );
}


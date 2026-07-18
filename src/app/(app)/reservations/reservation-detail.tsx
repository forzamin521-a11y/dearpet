"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Pencil, Receipt } from "lucide-react";
import {
  registerSaleForReservation,
  updateReservationStatus,
} from "@/lib/actions/reservations";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { RESERVATION_STATUS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import {
  ageInYears,
  formatAge,
  formatKoreanDate,
  formatKoreanTime,
} from "@/lib/time";
import type { ReservationFull } from "@/lib/data/reservations";
import type { ReservationStatus } from "@/lib/types";
import type { CalendarPermissions } from "./reservations-view";

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
  permissions,
  onClose,
  onEdit,
}: {
  reservation: ReservationFull;
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
    payment?: { cash: number; card: number; transfer: number }
  ) => {
    startTransition(async () => {
      const result = await updateReservationStatus(
        reservation.id,
        status,
        payment
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
  const registerSale = (payment: {
    cash: number;
    card: number;
    transfer: number;
  }) => {
    startTransition(async () => {
      const result = await registerSaleForReservation(reservation.id, payment);
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
      setSaleConfirmOpen(true);
    } else if (status === "deleted" || status === "canceled") {
      setConfirmStatus(status);
    } else {
      applyStatus(status);
    }
  };

  const status = RESERVATION_STATUS[reservation.status];

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>예약 정보</SheetTitle>
        </SheetHeader>

        <div className="space-y-5 px-4 pb-8">
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
              <p className="font-medium">{reservation.customer?.name}</p>
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
                  {rp.pet?.birth_date &&
                    `${formatAge(rp.pet.birth_date)}${
                      ageInYears(rp.pet.birth_date) >= 7 ? " · 노령견" : ""
                    }`}
                  {rp.pet?.weight_kg != null && ` · ${rp.pet.weight_kg}kg`}
                  {rp.pet?.neutered != null &&
                    ` · 중성화 ${rp.pet.neutered ? "O" : "X"}`}
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

      {/* 결제 수단/금액 입력 */}
      {paymentMode && (
        <PaymentDialog
          pending={pending}
          onClose={() => setPaymentMode(null)}
          onSubmit={(payment) =>
            paymentMode === "complete"
              ? applyStatus("completed", payment)
              : registerSale(payment)
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

type PayMethod = "card" | "cash" | "transfer";

const PAY_METHOD_LABEL: Record<PayMethod, string> = {
  card: "카드결제",
  cash: "현금",
  transfer: "계좌이체",
};

/** 매출 등록: 결제 수단 선택 + 금액 입력 */
function PaymentDialog({
  pending,
  onClose,
  onSubmit,
}: {
  pending: boolean;
  onClose: () => void;
  onSubmit: (payment: { cash: number; card: number; transfer: number }) => void;
}) {
  const [method, setMethod] = useState<PayMethod>("card");
  const [amount, setAmount] = useState("");

  const total = Number(amount || 0);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>매출 등록</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">결제 수단</Label>
            <div className="flex gap-2">
              {(Object.keys(PAY_METHOD_LABEL) as PayMethod[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMethod(m)}
                  className={cn(
                    "flex-1 rounded-lg border px-3 py-2 text-sm transition-colors",
                    method === m
                      ? "border-primary bg-primary text-primary-foreground"
                      : "hover:bg-accent"
                  )}
                >
                  {PAY_METHOD_LABEL[m]}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">금액</Label>
            <Input
              type="number"
              step="1000"
              min="0"
              autoFocus
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="예: 50000"
            />
            {total > 0 && (
              <p className="text-right text-sm font-bold text-primary">
                {total.toLocaleString()}원 ({PAY_METHOD_LABEL[method]})
              </p>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            카드+현금처럼 나눠 결제한 경우, 등록 후 매출 페이지에서 상세 수정할
            수 있습니다.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button
            disabled={pending || total <= 0}
            onClick={() =>
              onSubmit({
                cash: method === "cash" ? total : 0,
                card: method === "card" ? total : 0,
                transfer: method === "transfer" ? total : 0,
              })
            }
          >
            등록
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

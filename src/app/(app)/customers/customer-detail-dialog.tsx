"use client";

import { useEffect, useState } from "react";
import {
  getCustomerDetail,
  type CustomerDetail,
  type CustomerDetailReservation,
} from "@/lib/actions/customers";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ALIMTALK_KIND_LABEL, RESERVATION_STATUS } from "@/lib/constants";
import { formatKoreanTime } from "@/lib/time";
import type { AlimtalkKind } from "@/lib/types";
import { CustomerForm, type CustomerFormValues } from "./customer-form";
import type { CustomerWithPets, VisitCounts } from "./page";

const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

/** "2026-07-16" + "10:30" → "26. 07. 16 (목) 오전 10:30" */
function formatDateTime(date: string, time?: string) {
  const d = new Date(`${date}T00:00:00`);
  const base = `${date.slice(2).replaceAll("-", ". ")} (${DAY_LABELS[d.getDay()]})`;
  return time ? `${base} ${formatKoreanTime(time)}` : base;
}

function StatusBadge({ status }: { status: string }) {
  const s = RESERVATION_STATUS[status as keyof typeof RESERVATION_STATUS];
  if (!s) return <span>{status}</span>;
  return (
    <span
      className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${s.bg} ${s.text}`}
    >
      {s.label}
    </span>
  );
}

function ReservationTable({
  rows,
  emptyText,
}: {
  rows: CustomerDetailReservation[];
  emptyText: string;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>일시</TableHead>
          <TableHead>반려동물명</TableHead>
          <TableHead>상품</TableHead>
          <TableHead>담당자</TableHead>
          <TableHead>상태</TableHead>
          <TableHead>메모</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 && (
          <TableRow>
            <TableCell colSpan={6} className="py-6 text-center text-muted-foreground">
              {emptyText}
            </TableCell>
          </TableRow>
        )}
        {rows.map((r) => (
          <TableRow key={r.id}>
            <TableCell className="whitespace-nowrap">
              {formatDateTime(r.date, r.startTime)}
            </TableCell>
            <TableCell>{r.petNames.join(", ") || "-"}</TableCell>
            <TableCell>{r.serviceLabels.join(", ") || "-"}</TableCell>
            <TableCell>{r.staffLabel ?? "-"}</TableCell>
            <TableCell>
              <StatusBadge status={r.status} />
            </TableCell>
            <TableCell className="max-w-40 truncate text-muted-foreground">
              {r.memo || "-"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function CustomerDetailDialog({
  customer,
  counts,
  pending,
  onUpdate,
  onDelete,
  onClose,
}: {
  customer: CustomerWithPets;
  counts: VisitCounts[string] | undefined;
  pending: boolean;
  onUpdate: (values: CustomerFormValues) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<CustomerDetail | null>(null);
  const [viewSignature, setViewSignature] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    getCustomerDetail(customer.id).then((d) => {
      if (alive) setDetail(d);
    });
    return () => {
      alive = false;
    };
  }, [customer.id]);

  const salesTotal = (detail?.sales ?? []).reduce((sum, s) => sum + s.totalAmount, 0);
  const salesCount = detail?.sales.length ?? 0;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[90vh] w-[96vw] flex-col overflow-hidden p-0 sm:max-w-5xl">
        <DialogTitle className="sr-only">{customer.name} 고객 상세</DialogTitle>
        <Tabs defaultValue="summary" className="flex min-h-0 flex-1 flex-col">
          <div className="border-b px-4 pt-3">
            <TabsList>
              <TabsTrigger value="summary">요약</TabsTrigger>
              <TabsTrigger value="info">고객 정보</TabsTrigger>
              <TabsTrigger value="alimtalk">알림톡</TabsTrigger>
              <TabsTrigger value="consent">동의서</TabsTrigger>
            </TabsList>
          </div>

          {/* ---------------- 요약 ---------------- */}
          <TabsContent
            value="summary"
            className="min-h-0 flex-1 overflow-y-auto p-4"
          >
            <div className="flex flex-col gap-6 lg:flex-row">
              {/* 좌측: 보호자/반려동물 */}
              <div className="w-full shrink-0 space-y-5 lg:w-64">
                <div>
                  <p className="mb-2 font-semibold">보호자 정보</p>
                  <dl className="space-y-1.5 text-sm">
                    <div className="flex gap-3">
                      <dt className="w-16 shrink-0 text-muted-foreground">호칭</dt>
                      <dd className="font-medium">
                        {customer.name || "(호칭 없음)"}
                      </dd>
                    </div>
                    <div className="flex gap-3">
                      <dt className="w-16 shrink-0 text-muted-foreground">연락처</dt>
                      <dd>{customer.phones.join(", ") || "-"}</dd>
                    </div>
                    <div className="flex gap-3">
                      <dt className="w-16 shrink-0 text-muted-foreground">방문</dt>
                      <dd>
                        완료 {counts?.completed ?? 0}회 · 취소 {counts?.canceled ?? 0}
                        회 · 노쇼 {counts?.no_show ?? 0}회
                      </dd>
                    </div>
                    <div className="flex gap-3">
                      <dt className="w-16 shrink-0 text-muted-foreground">매출</dt>
                      <dd>
                        {salesCount > 0 ? (
                          <>
                            평균 {Math.round(salesTotal / salesCount).toLocaleString()}
                            원 | {salesCount}회
                            <br />총 {salesTotal.toLocaleString()}원
                          </>
                        ) : (
                          "없음"
                        )}
                      </dd>
                    </div>
                    <div className="flex gap-3">
                      <dt className="w-16 shrink-0 text-muted-foreground">알림톡</dt>
                      <dd>{customer.alimtalk_opt_in ? "수신" : "수신 거부"}</dd>
                    </div>
                    <div className="flex gap-3">
                      <dt className="w-16 shrink-0 text-muted-foreground">메모</dt>
                      <dd className="whitespace-pre-wrap">
                        {customer.memo || "메모 없음"}
                      </dd>
                    </div>
                  </dl>
                </div>

                <div className="border-t pt-4">
                  <p className="mb-2 font-semibold">반려동물 정보</p>
                  <ul className="space-y-2">
                    {customer.pets.length === 0 && (
                      <li className="text-sm text-muted-foreground">없음</li>
                    )}
                    {customer.pets.map((pet) => (
                      <li key={pet.id} className="flex items-start gap-2 text-sm">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs">
                          {pet.species === "cat" ? "🐱" : "🐶"}
                        </span>
                        <div className="min-w-0">
                          <p className="font-medium">
                            {pet.name}
                            {pet.breed && ` (${pet.breed})`}
                          </p>
                          {pet.memo && (
                            <p className="truncate text-xs text-muted-foreground">
                              {pet.memo}
                            </p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* 우측: 예약/매출 */}
              <div className="min-w-0 flex-1 space-y-6">
                <section>
                  <p className="mb-2 font-semibold">보유 예약</p>
                  <div className="rounded-lg border">
                    <ReservationTable
                      rows={detail?.upcoming ?? []}
                      emptyText={detail ? "보유 예약이 없습니다." : "불러오는 중..."}
                    />
                  </div>
                </section>
                <section>
                  <p className="mb-2 font-semibold">과거 예약</p>
                  <div className="rounded-lg border">
                    <ReservationTable
                      rows={detail?.past ?? []}
                      emptyText={detail ? "과거 예약이 없습니다." : "불러오는 중..."}
                    />
                  </div>
                </section>
                <section>
                  <p className="mb-2 font-semibold">매출 내역</p>
                  <div className="rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>일자</TableHead>
                          <TableHead>내역</TableHead>
                          <TableHead>담당자</TableHead>
                          <TableHead className="text-right">매출액</TableHead>
                          <TableHead>메모</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(detail?.sales ?? []).length === 0 && (
                          <TableRow>
                            <TableCell
                              colSpan={5}
                              className="py-6 text-center text-muted-foreground"
                            >
                              {detail ? "매출 내역이 없습니다." : "불러오는 중..."}
                            </TableCell>
                          </TableRow>
                        )}
                        {(detail?.sales ?? []).map((s) => (
                          <TableRow key={s.id}>
                            <TableCell className="whitespace-nowrap">
                              {formatDateTime(s.saleDate)}
                            </TableCell>
                            <TableCell className="max-w-56">
                              <span className="line-clamp-2">
                                {s.items
                                  .map((it) =>
                                    [it.petName, it.description]
                                      .filter(Boolean)
                                      .join(": ")
                                  )
                                  .join(", ") || "-"}
                              </span>
                            </TableCell>
                            <TableCell>{s.staffLabel ?? "-"}</TableCell>
                            <TableCell className="whitespace-nowrap text-right">
                              {s.totalAmount.toLocaleString()}원
                            </TableCell>
                            <TableCell className="max-w-32 truncate text-muted-foreground">
                              {s.memo || "-"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </section>
              </div>
            </div>
          </TabsContent>

          {/* ---------------- 고객 정보 (수정) ---------------- */}
          <TabsContent
            value="info"
            className="min-h-0 flex-1 overflow-y-auto p-4"
          >
            <div className="mx-auto max-w-md space-y-4">
              <CustomerForm
                key={customer.id}
                initial={customer}
                onSubmit={onUpdate}
                pending={pending}
                submitLabel="수정 저장"
              />
              <Button
                variant="outline"
                className="w-full text-destructive"
                onClick={onDelete}
              >
                고객 삭제
              </Button>
            </div>
          </TabsContent>

          {/* ---------------- 알림톡 ---------------- */}
          <TabsContent
            value="alimtalk"
            className="min-h-0 flex-1 overflow-y-auto p-4"
          >
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>발신 일시</TableHead>
                    <TableHead>종류</TableHead>
                    <TableHead className="min-w-64">내용</TableHead>
                    <TableHead>수신 번호</TableHead>
                    <TableHead>발송 결과</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(detail?.alimtalkLogs ?? []).length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="py-8 text-center text-muted-foreground"
                      >
                        {detail ? "알림톡 발송 이력이 없습니다." : "불러오는 중..."}
                      </TableCell>
                    </TableRow>
                  )}
                  {(detail?.alimtalkLogs ?? []).map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap align-top">
                        {new Date(log.createdAt).toLocaleString("ko-KR", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </TableCell>
                      <TableCell className="whitespace-nowrap align-top">
                        {ALIMTALK_KIND_LABEL[log.kind as AlimtalkKind] ?? log.kind}
                      </TableCell>
                      <TableCell className="align-top">
                        <span className="line-clamp-2 text-muted-foreground">
                          {log.content}
                        </span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap align-top">
                        {log.phone}
                      </TableCell>
                      <TableCell className="whitespace-nowrap align-top">
                        {log.status === "sent"
                          ? "성공"
                          : log.status === "failed"
                            ? "실패"
                            : "시뮬레이션"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* ---------------- 동의서 ---------------- */}
          <TabsContent
            value="consent"
            className="min-h-0 flex-1 overflow-y-auto p-4"
          >
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>발송 일시</TableHead>
                    <TableHead>동의서</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead>서명자</TableHead>
                    <TableHead>서명 일시</TableHead>
                    <TableHead>서명</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(detail?.consents ?? []).length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="py-8 text-center text-muted-foreground"
                      >
                        {detail
                          ? "동의서 발송 이력이 없습니다."
                          : "불러오는 중..."}
                      </TableCell>
                    </TableRow>
                  )}
                  {(detail?.consents ?? []).map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="whitespace-nowrap align-top">
                        {new Date(c.createdAt).toLocaleString("ko-KR", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </TableCell>
                      <TableCell className="align-top">{c.formTitle}</TableCell>
                      <TableCell className="whitespace-nowrap align-top">
                        <span
                          className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${
                            c.status === "signed"
                              ? "bg-green-100 text-green-800"
                              : "bg-orange-100 text-orange-700"
                          }`}
                        >
                          {c.status === "signed" ? "작성 완료" : "작성 대기"}
                        </span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap align-top">
                        {c.signerName ?? "-"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap align-top">
                        {c.signedAt
                          ? new Date(c.signedAt).toLocaleString("ko-KR", {
                              dateStyle: "short",
                              timeStyle: "short",
                            })
                          : "-"}
                      </TableCell>
                      <TableCell className="align-top">
                        {c.signatureUrl ? (
                          <button
                            type="button"
                            onClick={() => setViewSignature(c.signatureUrl)}
                            title="크게 보기"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={c.signatureUrl}
                              alt="서명"
                              className="h-10 rounded border bg-white"
                            />
                          </button>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>

        {/* 서명 이미지 크게 보기 */}
        <Dialog
          open={!!viewSignature}
          onOpenChange={(open) => !open && setViewSignature(null)}
        >
          <DialogContent className="sm:max-w-md">
            <DialogTitle>서명</DialogTitle>
            {viewSignature && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={viewSignature}
                alt="고객 서명"
                className="w-full rounded-lg border bg-white"
              />
            )}
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}

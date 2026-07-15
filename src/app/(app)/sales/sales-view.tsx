"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Cell, Pie, PieChart } from "recharts";
import { Download, Plus } from "lucide-react";
import { deleteSale } from "@/lib/actions/sales";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { toDateString, todayString } from "@/lib/time";
import type { Profile } from "@/lib/types";
import type { SaleWithRelations } from "./page";
import { SaleFormDialog } from "./sale-form-dialog";

const chartConfig = {
  card: { label: "카드", color: "var(--chart-1)" },
  cash: { label: "현금", color: "var(--chart-5)" },
  transfer: { label: "계좌이체", color: "var(--chart-3)" },
} satisfies ChartConfig;

export function SalesView({
  sales,
  staff,
  from,
  to,
  staffFilter,
}: {
  sales: SaleWithRelations[];
  staff: Profile[];
  from: string;
  to: string;
  staffFilter: string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [formTarget, setFormTarget] = useState<
    { mode: "create" } | { mode: "edit"; sale: SaleWithRelations } | null
  >(null);
  const [deleteTarget, setDeleteTarget] = useState<SaleWithRelations | null>(
    null
  );

  const totals = useMemo(() => {
    const cash = sales.reduce((s, x) => s + x.cash_amount, 0);
    const card = sales.reduce((s, x) => s + x.card_amount, 0);
    const transfer = sales.reduce((s, x) => s + x.transfer_amount, 0);
    return { cash, card, transfer, all: cash + card + transfer };
  }, [sales]);

  const chartData = useMemo(
    () =>
      [
        { key: "card", name: "카드", value: totals.card, fill: "var(--chart-1)" },
        { key: "cash", name: "현금", value: totals.cash, fill: "var(--chart-5)" },
        {
          key: "transfer",
          name: "계좌이체",
          value: totals.transfer,
          fill: "var(--chart-3)",
        },
      ].filter((d) => d.value > 0),
    [totals]
  );

  const navigate = (nextFrom: string, nextTo: string, nextStaff: string) => {
    router.push(`/sales?from=${nextFrom}&to=${nextTo}&staff=${nextStaff}`);
  };

  const applyPreset = (preset: string) => {
    const now = new Date();
    const today = todayString();
    if (preset === "today") navigate(today, today, staffFilter);
    else if (preset === "week") {
      const start = new Date(now);
      start.setDate(now.getDate() - now.getDay());
      navigate(toDateString(start), today, staffFilter);
    } else if (preset === "month") {
      navigate(
        toDateString(new Date(now.getFullYear(), now.getMonth(), 1)),
        today,
        staffFilter
      );
    }
  };

  const downloadCsv = () => {
    const header = [
      "일자",
      "담당자",
      "보호자 호칭",
      "판매내역",
      "총 금액",
      "현금",
      "카드",
      "계좌이체",
      "메모",
    ];
    const rows = sales.map((sale) => [
      sale.sale_date,
      sale.staff?.name ?? "",
      sale.customer?.name ?? "",
      sale.items
        .map((item) =>
          [item.petName, item.description].filter(Boolean).join(": ")
        )
        .join(" / "),
      sale.total_amount,
      sale.cash_amount,
      sale.card_amount,
      sale.transfer_amount,
      sale.memo,
    ]);
    const csv = [header, ...rows]
      .map((row) =>
        row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")
      )
      .join("\n");
    const blob = new Blob([`﻿${csv}`], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `매출_${from}_${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const percent = (value: number) =>
    totals.all > 0 ? Math.round((value / totals.all) * 100) : 0;

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-6">
      {/* 필터 */}
      <div className="flex flex-wrap items-center gap-2">
        <Select onValueChange={applyPreset}>
          <SelectTrigger size="sm" className="w-28">
            <SelectValue placeholder="조회기간" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">오늘</SelectItem>
            <SelectItem value="week">이번 주</SelectItem>
            <SelectItem value="month">이번 달</SelectItem>
          </SelectContent>
        </Select>
        <Input
          type="date"
          className="h-8 w-36"
          value={from}
          onChange={(e) => navigate(e.target.value, to, staffFilter)}
        />
        <span className="text-muted-foreground">~</span>
        <Input
          type="date"
          className="h-8 w-36"
          value={to}
          onChange={(e) => navigate(from, e.target.value, staffFilter)}
        />
        <Select
          value={staffFilter}
          onValueChange={(v) => navigate(from, to, v)}
        >
          <SelectTrigger size="sm" className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">담당자 전체</SelectItem>
            {staff.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
                {s.emoji}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="ml-auto flex gap-2">
          <Button size="sm" variant="outline" onClick={downloadCsv}>
            <Download /> 엑셀 저장
          </Button>
          <Button size="sm" onClick={() => setFormTarget({ mode: "create" })}>
            <Plus /> 매출 수동 등록
          </Button>
        </div>
      </div>

      {/* 요약 */}
      <Card>
        <CardContent className="flex flex-col items-center gap-6 py-6 md:flex-row">
          {totals.all > 0 ? (
            <ChartContainer config={chartConfig} className="h-44 w-44 shrink-0">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={45}
                  outerRadius={70}
                  strokeWidth={2}
                >
                  {chartData.map((entry) => (
                    <Cell key={entry.key} fill={entry.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
          ) : (
            <div className="flex h-44 w-44 shrink-0 items-center justify-center rounded-full border-8 border-muted text-sm text-muted-foreground">
              매출 없음
            </div>
          )}
          <div className="grid flex-1 grid-cols-1 gap-x-10 gap-y-1 text-sm sm:grid-cols-2">
            <div className="space-y-1">
              <p className="font-semibold text-primary">결제</p>
              <p className="flex justify-between">
                <span className="text-muted-foreground">
                  ● 카드 {percent(totals.card)}%
                </span>
                <span>{totals.card.toLocaleString()}원</span>
              </p>
              <p className="flex justify-between">
                <span className="text-muted-foreground">
                  ● 현금 {percent(totals.cash)}%
                </span>
                <span>{totals.cash.toLocaleString()}원</span>
              </p>
              <p className="flex justify-between">
                <span className="text-muted-foreground">
                  ● 계좌이체 {percent(totals.transfer)}%
                </span>
                <span>{totals.transfer.toLocaleString()}원</span>
              </p>
              <p className="flex justify-between border-t pt-1 font-bold">
                <span>합계</span>
                <span className="text-primary">
                  {totals.all.toLocaleString()}원
                </span>
              </p>
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-primary">건수</p>
              <p className="flex justify-between">
                <span className="text-muted-foreground">총 매출 건수</span>
                <span>{sales.length}건</span>
              </p>
              <p className="flex justify-between">
                <span className="text-muted-foreground">건당 평균</span>
                <span>
                  {sales.length > 0
                    ? Math.round(totals.all / sales.length).toLocaleString()
                    : 0}
                  원
                </span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 목록 */}
      <p className="text-sm text-muted-foreground">총 {sales.length}건</p>
      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>일자</TableHead>
              <TableHead>담당자</TableHead>
              <TableHead>보호자 호칭</TableHead>
              <TableHead className="min-w-56">판매내역</TableHead>
              <TableHead className="text-right">총 금액</TableHead>
              <TableHead className="text-right">현금</TableHead>
              <TableHead className="text-right">카드</TableHead>
              <TableHead className="text-right">계좌이체</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sales.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="py-10 text-center text-muted-foreground"
                >
                  조회 기간에 매출이 없습니다.
                </TableCell>
              </TableRow>
            )}
            {sales.map((sale) => (
              <TableRow
                key={sale.id}
                className="cursor-pointer"
                onClick={() => setFormTarget({ mode: "edit", sale })}
              >
                <TableCell>{sale.sale_date}</TableCell>
                <TableCell>
                  {sale.staff ? `${sale.staff.name}${sale.staff.emoji}` : "-"}
                </TableCell>
                <TableCell>{sale.customer?.name ?? "-"}</TableCell>
                <TableCell className="whitespace-normal text-xs text-muted-foreground">
                  {sale.items
                    .map((item) =>
                      [item.petName, item.description]
                        .filter(Boolean)
                        .join(": ")
                    )
                    .join(" / ") || sale.memo}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {sale.total_amount.toLocaleString()}
                </TableCell>
                <TableCell className="text-right">
                  {sale.cash_amount.toLocaleString()}
                </TableCell>
                <TableCell className="text-right">
                  {sale.card_amount.toLocaleString()}
                </TableCell>
                <TableCell className="text-right">
                  {sale.transfer_amount.toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {formTarget && (
        <SaleFormDialog
          staff={staff}
          sale={formTarget.mode === "edit" ? formTarget.sale : undefined}
          onClose={() => setFormTarget(null)}
          onDelete={
            formTarget.mode === "edit"
              ? () => {
                  setDeleteTarget(formTarget.sale);
                  setFormTarget(null);
                }
              : undefined
          }
        />
      )}

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>매출을 삭제할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.sale_date} ·{" "}
              {deleteTarget?.total_amount.toLocaleString()}원 매출이 삭제됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!deleteTarget) return;
                startTransition(async () => {
                  const result = await deleteSale(deleteTarget.id);
                  if (result.ok) toast.success("삭제되었습니다.");
                  else toast.error(result.error);
                  setDeleteTarget(null);
                });
              }}
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

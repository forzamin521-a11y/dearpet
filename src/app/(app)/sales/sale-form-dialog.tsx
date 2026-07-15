"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
import { createSale, updateSale } from "@/lib/actions/sales";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { todayString } from "@/lib/time";
import type { Profile, SaleItem } from "@/lib/types";
import type { SaleWithRelations } from "./page";

export function SaleFormDialog({
  staff,
  sale,
  onClose,
  onDelete,
}: {
  staff: Profile[];
  sale?: SaleWithRelations;
  onClose: () => void;
  onDelete?: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [saleDate, setSaleDate] = useState(sale?.sale_date ?? todayString());
  const [staffId, setStaffId] = useState<string | null>(sale?.staff_id ?? null);
  const [items, setItems] = useState<SaleItem[]>(
    sale?.items?.length
      ? sale.items
      : [{ petName: "", description: "", amount: 0 }]
  );
  const [cash, setCash] = useState(String(sale?.cash_amount ?? 0));
  const [card, setCard] = useState(String(sale?.card_amount ?? 0));
  const [transfer, setTransfer] = useState(String(sale?.transfer_amount ?? 0));
  const [memo, setMemo] = useState(sale?.memo ?? "");

  const itemTotal = items.reduce((sum, item) => sum + (item.amount || 0), 0);

  const updateItem = (index: number, patch: Partial<SaleItem>) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...patch } : item))
    );
  };

  const submit = () => {
    const input = {
      sale_date: saleDate,
      staff_id: staffId,
      items: items.filter((item) => item.description.trim() || item.amount > 0),
      cash_amount: Number(cash || 0),
      card_amount: Number(card || 0),
      transfer_amount: Number(transfer || 0),
      memo,
    };
    startTransition(async () => {
      const result = sale
        ? await updateSale(sale.id, input)
        : await createSale(input);
      if (result.ok) {
        toast.success(sale ? "수정되었습니다." : "등록되었습니다.");
        onClose();
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{sale ? "매출 수정" : "매출 수동 등록"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">일자</Label>
              <Input
                type="date"
                value={saleDate}
                onChange={(e) => setSaleDate(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">담당자</Label>
              <Select
                value={staffId ?? "none"}
                onValueChange={(v) => setStaffId(v === "none" ? null : v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">미지정</SelectItem>
                  {staff.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                      {s.emoji}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">판매 내역</Label>
            {items.map((item, i) => (
              <div key={i} className="flex gap-1.5">
                <Input
                  className="w-24"
                  value={item.petName}
                  onChange={(e) => updateItem(i, { petName: e.target.value })}
                  placeholder="반려동물"
                />
                <Input
                  className="flex-1"
                  value={item.description}
                  onChange={(e) =>
                    updateItem(i, { description: e.target.value })
                  }
                  placeholder="내역 (예: 전체미용> 소형견 4kg)"
                />
                <Input
                  className="w-28"
                  type="number"
                  step="1000"
                  value={item.amount || ""}
                  onChange={(e) =>
                    updateItem(i, { amount: Number(e.target.value || 0) })
                  }
                  placeholder="금액"
                />
                <Button
                  size="icon-sm"
                  variant="ghost"
                  disabled={items.length <= 1}
                  onClick={() =>
                    setItems((prev) => prev.filter((_, j) => j !== i))
                  }
                >
                  <X />
                </Button>
              </div>
            ))}
            <Button
              size="sm"
              variant="ghost"
              className="text-primary"
              onClick={() =>
                setItems((prev) => [
                  ...prev,
                  { petName: "", description: "", amount: 0 },
                ])
              }
            >
              <Plus /> 내역 추가
            </Button>
            <p className="text-right text-sm font-medium">
              상품 합계: {itemTotal.toLocaleString()}원
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">결제 수단</Label>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">현금</Label>
                <Input
                  type="number"
                  value={cash}
                  onChange={(e) => setCash(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">카드</Label>
                <Input
                  type="number"
                  value={card}
                  onChange={(e) => setCard(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">계좌이체</Label>
                <Input
                  type="number"
                  value={transfer}
                  onChange={(e) => setTransfer(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">메모</Label>
            <Textarea
              rows={2}
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter className="flex-row justify-between sm:justify-between">
          {onDelete ? (
            <Button variant="ghost" className="text-destructive" onClick={onDelete}>
              삭제
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              취소
            </Button>
            <Button disabled={pending} onClick={submit}>
              {sale ? "수정 저장" : "등록"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

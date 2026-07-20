"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Search, X } from "lucide-react";
import {
  listSaleProducts,
  type SaleProductGroup,
} from "@/lib/actions/sale-products";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { Profile, SaleItem } from "@/lib/types";

export interface SalePayment {
  cash: number;
  card: number;
  transfer: number;
}

type PayMethod = "card" | "cash" | "transfer";

const PAY_METHOD_LABEL: Record<PayMethod, string> = {
  card: "카드결제",
  cash: "현금",
  transfer: "계좌이체",
};

interface SelectedItem {
  key: number;
  name: string;
  price: number;
}

/**
 * 매출 등록: 담당자를 선택하면 해당 담당자의 판매 상품 세트(개별 세트가 없으면
 * 기본 세트)가 표시되고, 상품을 선택해 판매내역을 구성한 뒤 할인·결제수단을
 * 입력한다. 상품 금액은 선택 후에도 수정할 수 있다.
 */
export function SaleRegisterDialog({
  staff,
  defaultStaffId,
  pending,
  onClose,
  onSubmit,
}: {
  staff: Profile[];
  defaultStaffId: string | null;
  pending: boolean;
  onClose: () => void;
  onSubmit: (
    payment: SalePayment,
    items: SaleItem[],
    staffId: string | null
  ) => void;
}) {
  const [staffId, setStaffId] = useState<string | null>(defaultStaffId);
  const [groups, setGroups] = useState<SaleProductGroup[] | null>(null);
  const [activeCategoryId, setActiveCategoryId] = useState<string | "all">(
    "all"
  );
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<SelectedItem[]>([]);
  const [discount, setDiscount] = useState("");
  const [method, setMethod] = useState<PayMethod>("card");
  const [customName, setCustomName] = useState("");
  const [customPrice, setCustomPrice] = useState("");
  const keyRef = useState(() => ({ next: 1 }))[0];

  // 담당자가 바뀌면 그 담당자의 상품 세트를 다시 불러온다
  useEffect(() => {
    let alive = true;
    listSaleProducts(staffId).then((data) => {
      if (alive) setGroups(data);
    });
    return () => {
      alive = false;
    };
  }, [staffId]);

  const filteredGroups = useMemo(() => {
    if (!groups) return [];
    const q = query.trim().toLowerCase();
    // 검색 중에는 카테고리 필터를 무시하고 전체에서 찾는다
    const base = q
      ? groups
      : activeCategoryId === "all"
        ? groups
        : groups.filter((g) => g.category.id === activeCategoryId);
    if (!q) return base;
    return base
      .map((g) => ({
        category: g.category,
        products: g.products.filter((p) => p.name.toLowerCase().includes(q)),
      }))
      .filter((g) => g.products.length > 0);
  }, [groups, query, activeCategoryId]);

  const addItem = (name: string, price: number) => {
    setSelected((prev) => [...prev, { key: keyRef.next++, name, price }]);
  };

  const subtotal = selected.reduce((sum, s) => sum + s.price, 0);
  const discountAmount = Math.max(0, Number(discount || 0));
  const total = Math.max(0, subtotal - discountAmount);

  const submit = () => {
    const items: SaleItem[] = selected.map((s) => ({
      petName: "",
      description: s.name,
      amount: s.price,
    }));
    if (discountAmount > 0) {
      items.push({ petName: "", description: "할인", amount: -discountAmount });
    }
    onSubmit(
      {
        cash: method === "cash" ? total : 0,
        card: method === "card" ? total : 0,
        transfer: method === "transfer" ? total : 0,
      },
      items,
      staffId
    );
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[92vh] w-[96vw] flex-col overflow-hidden sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>매출 등록</DialogTitle>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto sm:flex-row sm:overflow-hidden">
          {/* 좌: 담당자 + 카테고리 */}
          <div className="flex w-full shrink-0 flex-col gap-3 sm:w-48">
            <div className="space-y-1">
              <Label className="text-xs">담당자</Label>
              <Select
                value={staffId ?? "none"}
                onValueChange={(v) => setStaffId(v === "none" ? null : v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">미지정 (기본 세트)</SelectItem>
                  {staff.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                      {s.emoji}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* 카테고리: 모바일은 가로 칩, 데스크톱은 세로 목록 */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 sm:flex-col sm:overflow-x-visible sm:overflow-y-auto">
              {[
                { id: "all" as const, name: "전체" },
                ...(groups ?? []).map((g) => ({
                  id: g.category.id,
                  name: g.category.name,
                })),
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategoryId(cat.id)}
                  className={cn(
                    "shrink-0 whitespace-nowrap rounded-lg border px-3.5 py-2 text-left text-sm transition-colors sm:w-full",
                    activeCategoryId === cat.id && !query.trim()
                      ? "border-primary bg-primary text-primary-foreground"
                      : "hover:bg-accent"
                  )}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* 중: 상품 목록 */}
          <div className="flex flex-col gap-2 sm:min-h-0 sm:flex-1 sm:overflow-hidden">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-8"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="상품명으로 검색 (전체에서 찾기)"
              />
            </div>
            <div className="space-y-4 rounded-lg border p-3 sm:min-h-0 sm:flex-1 sm:overflow-y-auto">
              {groups === null && (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  상품을 불러오는 중...
                </p>
              )}
              {groups !== null && filteredGroups.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  {groups.length === 0
                    ? "설정 → 판매 상품에서 상품을 먼저 등록해 주세요."
                    : "검색 결과가 없습니다."}
                </p>
              )}
              {filteredGroups.map((group) => (
                <div key={group.category.id}>
                  <p className="px-1 pb-1 text-xs font-semibold text-muted-foreground">
                    {group.category.name}
                  </p>
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    {group.products.map((product) => (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => addItem(product.name, product.price)}
                        className="rounded-lg border px-3.5 py-2.5 text-left text-sm transition-colors hover:border-primary hover:bg-accent"
                      >
                        <span className="block truncate">{product.name}</span>
                        <span className="font-semibold">
                          {product.price.toLocaleString()}원
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 우: 선택 상품 + 결제 */}
          <div className="flex w-full shrink-0 flex-col gap-3 sm:w-80 sm:overflow-y-auto">
            <div className="space-y-2.5 rounded-lg border p-4">
              <p className="text-sm font-semibold">선택 상품</p>
              {selected.length === 0 && (
                <p className="py-4 text-center text-xs text-muted-foreground">
                  선택된 상품이 없습니다.
                </p>
              )}
              {selected.map((item, i) => (
                <div key={item.key} className="flex items-center gap-1.5">
                  <span className="min-w-0 flex-1 truncate text-xs">
                    {item.name}
                  </span>
                  <Input
                    type="number"
                    step="1000"
                    className="h-7 w-24 text-right text-xs"
                    value={item.price}
                    onChange={(e) =>
                      setSelected((prev) =>
                        prev.map((s, j) =>
                          j === i
                            ? { ...s, price: Number(e.target.value || 0) }
                            : s
                        )
                      )
                    }
                  />
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    className="size-6 shrink-0"
                    onClick={() =>
                      setSelected((prev) => prev.filter((_, j) => j !== i))
                    }
                  >
                    <X />
                  </Button>
                </div>
              ))}
              {/* 목록에 없는 항목 직접 추가 */}
              <div className="flex items-center gap-1.5 border-t pt-2">
                <Input
                  className="h-7 flex-1 text-xs"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="직접 입력"
                />
                <Input
                  type="number"
                  step="1000"
                  className="h-7 w-20 text-right text-xs"
                  value={customPrice}
                  onChange={(e) => setCustomPrice(e.target.value)}
                  placeholder="금액"
                />
                <Button
                  size="icon-sm"
                  variant="outline"
                  className="size-6 shrink-0"
                  disabled={!customName.trim() || customPrice === ""}
                  onClick={() => {
                    addItem(customName.trim(), Number(customPrice || 0));
                    setCustomName("");
                    setCustomPrice("");
                  }}
                >
                  <Plus />
                </Button>
              </div>
            </div>

            <div className="space-y-2.5 rounded-lg border p-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">합계</span>
                <span>{subtotal.toLocaleString()}원</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">할인</span>
                <Input
                  type="number"
                  step="1000"
                  min="0"
                  className="h-7 w-28 text-right text-xs"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="flex items-center justify-between border-t pt-2 font-bold">
                <span>총계</span>
                <span className="text-primary">{total.toLocaleString()}원</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">결제 수단</Label>
              <div className="flex gap-2">
                {(Object.keys(PAY_METHOD_LABEL) as PayMethod[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMethod(m)}
                    className={cn(
                      "flex-1 rounded-lg border px-2 py-2 text-xs transition-colors",
                      method === m
                        ? "border-primary bg-primary text-primary-foreground"
                        : "hover:bg-accent"
                    )}
                  >
                    {PAY_METHOD_LABEL[m]}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                나눠서 결제한 경우 등록 후 매출 페이지에서 상세 수정할 수
                있습니다.
              </p>
            </div>

            <Button
              className="w-full"
              disabled={pending || total <= 0}
              onClick={submit}
            >
              {total.toLocaleString()}원 등록
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

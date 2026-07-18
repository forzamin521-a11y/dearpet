"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { ChevronDown, Copy, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import {
  copySaleProductSet,
  createSaleCategory,
  createSaleProduct,
  deleteSaleCategory,
  deleteSaleProduct,
  resetSaleProductSet,
  updateSaleCategory,
  updateSaleProduct,
  type SaleProductInput,
} from "@/lib/actions/sale-products";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import type { SaleProduct, SaleProductCategory } from "@/lib/types";

export interface StaffOption {
  id: string;
  name: string;
  emoji: string;
}

type ProductDialogState =
  | { mode: "create"; categoryId: string }
  | { mode: "edit"; product: SaleProduct };

type DeleteTarget =
  | { type: "category"; category: SaleProductCategory }
  | { type: "product"; product: SaleProduct };

export function SaleProductsManager({
  categories,
  products,
  staff,
}: {
  categories: SaleProductCategory[];
  products: SaleProduct[];
  staff: StaffOption[];
}) {
  const [pending, startTransition] = useTransition();
  // null = 기본 세트 (모든 담당자 공통)
  const [targetStaffId, setTargetStaffId] = useState<string | null>(null);
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  const [newCategoryName, setNewCategoryName] = useState("");
  const [renameTarget, setRenameTarget] = useState<SaleProductCategory | null>(
    null
  );
  const [productDialog, setProductDialog] = useState<ProductDialogState | null>(
    null
  );
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [copyOpen, setCopyOpen] = useState(false);
  const [resetConfirm, setResetConfirm] = useState(false);

  /** 개별 세트를 가진 담당자 id 집합 */
  const staffWithSet = useMemo(
    () =>
      new Set(
        products.map((p) => p.staff_id).filter((id): id is string => !!id)
      ),
    [products]
  );
  const hasOwnSet = targetStaffId !== null && staffWithSet.has(targetStaffId);
  const targetStaff = staff.find((s) => s.id === targetStaffId);

  /** 현재 보기의 상품 (기본 세트 또는 담당자 개별 세트) */
  const visibleProducts = useMemo(
    () => products.filter((p) => p.staff_id === targetStaffId),
    [products, targetStaffId]
  );

  const toggleOpen = (id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const addCategory = () => {
    startTransition(async () => {
      const result = await createSaleCategory(newCategoryName);
      if (result.ok) {
        toast.success("카테고리가 추가되었습니다.");
        setNewCategoryName("");
      } else {
        toast.error(result.error);
      }
    });
  };

  const saveProduct = (input: SaleProductInput) => {
    if (!productDialog) return;
    startTransition(async () => {
      const result =
        productDialog.mode === "create"
          ? await createSaleProduct(
              productDialog.categoryId,
              input,
              targetStaffId
            )
          : await updateSaleProduct(productDialog.product.id, input);
      if (result.ok) {
        toast.success("저장되었습니다.");
        setProductDialog(null);
      } else {
        toast.error(result.error);
      }
    });
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    startTransition(async () => {
      const result =
        deleteTarget.type === "category"
          ? await deleteSaleCategory(deleteTarget.category.id)
          : await deleteSaleProduct(deleteTarget.product.id);
      if (result.ok) {
        toast.success("삭제되었습니다.");
        setDeleteTarget(null);
      } else {
        toast.error(result.error);
      }
    });
  };

  const runCopy = (sourceStaffId: string | null) => {
    startTransition(async () => {
      const result = await copySaleProductSet(sourceStaffId, targetStaffId);
      if (result.ok) {
        toast.success("세트가 복사되었습니다.");
        setCopyOpen(false);
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <div className="space-y-3">
      {/* 적용 대상 선택 */}
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={targetStaffId ?? "default"}
          onValueChange={(v) => setTargetStaffId(v === "default" ? null : v)}
        >
          <SelectTrigger className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default">기본 (모든 담당자 공통)</SelectItem>
            {staff.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
                {s.emoji}
                {staffWithSet.has(s.id) ? " · 개별 세트" : " · 기본 적용"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hasOwnSet && (
          <>
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => setCopyOpen(true)}
            >
              <Copy /> 다른 세트 복사
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-destructive"
              disabled={pending}
              onClick={() => setResetConfirm(true)}
            >
              <RotateCcw /> 기본 세트로 되돌리기
            </Button>
          </>
        )}
      </div>

      {/* 담당자를 선택했는데 개별 세트가 없는 경우 */}
      {targetStaffId !== null && !hasOwnSet ? (
        <Card>
          <CardContent className="space-y-3 py-6 text-center">
            <p className="text-sm">
              <b>
                {targetStaff?.name}
                {targetStaff?.emoji}
              </b>{" "}
              담당자는 현재 <b>기본 세트</b>를 그대로 사용합니다.
            </p>
            <p className="text-xs text-muted-foreground">
              담당자별로 다른 금액을 쓰려면 세트를 복사해 개별 세트를 만든 뒤
              수정하세요.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <Button disabled={pending} onClick={() => runCopy(null)}>
                <Copy /> 기본 세트를 복사해 개별 세트 만들기
              </Button>
              {[...staffWithSet].filter((id) => id !== targetStaffId).length >
                0 && (
                <Button
                  variant="outline"
                  disabled={pending}
                  onClick={() => setCopyOpen(true)}
                >
                  다른 담당자 세트 복사
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* 카테고리 추가 (카테고리는 모든 세트가 공유) */}
          <div className="flex gap-2">
            <Input
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="새 카테고리명 (예: 호텔)"
              onKeyDown={(e) => {
                if (e.key === "Enter" && newCategoryName.trim()) addCategory();
              }}
            />
            <Button
              disabled={pending || !newCategoryName.trim()}
              onClick={addCategory}
            >
              <Plus /> 카테고리 추가
            </Button>
          </div>

          {categories.length === 0 && (
            <Card>
              <CardContent className="py-6 text-center text-sm text-muted-foreground">
                등록된 카테고리가 없습니다. 카테고리를 먼저 추가해 주세요.
              </CardContent>
            </Card>
          )}

          {categories.map((category) => {
            const items = visibleProducts.filter(
              (p) => p.category_id === category.id
            );
            const open = openIds.has(category.id);
            return (
              <Card key={category.id}>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="flex min-w-0 flex-1 items-center gap-2 text-left"
                      onClick={() => toggleOpen(category.id)}
                    >
                      <ChevronDown
                        className={cn(
                          "size-4 shrink-0 text-muted-foreground transition-transform",
                          !open && "-rotate-90"
                        )}
                      />
                      <span className="truncate font-semibold">
                        {category.name}
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {items.length}개
                      </span>
                    </button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setProductDialog({
                          mode: "create",
                          categoryId: category.id,
                        })
                      }
                    >
                      <Plus /> 상품
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => setRenameTarget(category)}
                    >
                      <Pencil />
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() =>
                        setDeleteTarget({ type: "category", category })
                      }
                    >
                      <Trash2 />
                    </Button>
                  </div>

                  {open && (
                    <ul className="mt-2 divide-y border-t">
                      {items.length === 0 && (
                        <li className="py-3 text-center text-xs text-muted-foreground">
                          상품이 없습니다.
                        </li>
                      )}
                      {items.map((product) => (
                        <li
                          key={product.id}
                          className="flex items-center gap-2 py-2.5 text-sm"
                        >
                          <span className="min-w-0 flex-1 truncate">
                            {product.name}
                          </span>
                          <span className="shrink-0 font-medium">
                            {product.price.toLocaleString()}원
                          </span>
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            onClick={() =>
                              setProductDialog({ mode: "edit", product })
                            }
                          >
                            <Pencil />
                          </Button>
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            className="text-destructive"
                            onClick={() =>
                              setDeleteTarget({ type: "product", product })
                            }
                          >
                            <Trash2 />
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </>
      )}

      {/* 카테고리 이름 변경 */}
      {renameTarget && (
        <CategoryRenameDialog
          category={renameTarget}
          pending={pending}
          onClose={() => setRenameTarget(null)}
          onSave={(name) => {
            startTransition(async () => {
              const result = await updateSaleCategory(renameTarget.id, name);
              if (result.ok) {
                toast.success("저장되었습니다.");
                setRenameTarget(null);
              } else {
                toast.error(result.error);
              }
            });
          }}
        />
      )}

      {/* 상품 추가/수정 */}
      {productDialog && (
        <ProductDialog
          editing={productDialog.mode === "edit" ? productDialog.product : null}
          pending={pending}
          onClose={() => setProductDialog(null)}
          onSave={saveProduct}
        />
      )}

      {/* 세트 복사 */}
      {copyOpen && (
        <CopySetDialog
          staff={staff}
          staffWithSet={staffWithSet}
          targetStaffId={targetStaffId}
          targetLabel={
            targetStaff
              ? `${targetStaff.name}${targetStaff.emoji}`
              : "기본 (모든 담당자 공통)"
          }
          pending={pending}
          onClose={() => setCopyOpen(false)}
          onCopy={runCopy}
        />
      )}

      {/* 기본 세트로 되돌리기 확인 */}
      <AlertDialog open={resetConfirm} onOpenChange={setResetConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {targetStaff?.name} 담당자의 개별 세트를 삭제할까요?
            </AlertDialogTitle>
            <AlertDialogDescription>
              개별 세트가 삭제되고 기본 세트(모든 담당자 공통)가 다시
              적용됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!targetStaffId) return;
                startTransition(async () => {
                  const result = await resetSaleProductSet(targetStaffId);
                  if (result.ok) {
                    toast.success("기본 세트가 적용됩니다.");
                    setResetConfirm(false);
                  } else {
                    toast.error(result.error);
                  }
                });
              }}
            >
              되돌리기
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 삭제 확인 */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteTarget?.type === "category"
                ? `'${deleteTarget.category.name}' 카테고리를 삭제할까요?`
                : `'${deleteTarget?.type === "product" ? deleteTarget.product.name : ""}' 상품을 삭제할까요?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.type === "category"
                ? "카테고리는 모든 세트가 공유하므로, 이 카테고리에 속한 모든 담당자의 상품이 함께 삭제됩니다. 이미 등록된 매출 내역은 그대로 유지됩니다."
                : "이미 등록된 매출 내역은 그대로 유지됩니다."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>삭제</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/** 세트 복사 원본 선택 */
function CopySetDialog({
  staff,
  staffWithSet,
  targetStaffId,
  targetLabel,
  pending,
  onClose,
  onCopy,
}: {
  staff: StaffOption[];
  staffWithSet: Set<string>;
  targetStaffId: string | null;
  targetLabel: string;
  pending: boolean;
  onClose: () => void;
  onCopy: (sourceStaffId: string | null) => void;
}) {
  const [source, setSource] = useState<string>("default");
  const sources = staff.filter(
    (s) => staffWithSet.has(s.id) && s.id !== targetStaffId
  );

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>세트 복사</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label className="text-xs">복사할 원본</Label>
          <Select value={source} onValueChange={setSource}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {targetStaffId !== null && (
                <SelectItem value="default">기본 (모든 담당자 공통)</SelectItem>
              )}
              {sources.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                  {s.emoji}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            <b>{targetLabel}</b> 세트가 원본 내용으로 덮어써집니다.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button
            disabled={pending}
            onClick={() => onCopy(source === "default" ? null : source)}
          >
            복사
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CategoryRenameDialog({
  category,
  pending,
  onClose,
  onSave,
}: {
  category: SaleProductCategory;
  pending: boolean;
  onClose: () => void;
  onSave: (name: string) => void;
}) {
  const [name, setName] = useState(category.name);
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>카테고리 이름 변경</DialogTitle>
        </DialogHeader>
        <div className="space-y-1">
          <Label className="text-xs">카테고리명</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button disabled={pending || !name.trim()} onClick={() => onSave(name)}>
            저장
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ProductDialog({
  editing,
  pending,
  onClose,
  onSave,
}: {
  editing: SaleProduct | null;
  pending: boolean;
  onClose: () => void;
  onSave: (input: SaleProductInput) => void;
}) {
  const [name, setName] = useState(editing?.name ?? "");
  const [price, setPrice] = useState(editing ? String(editing.price) : "");

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{editing ? "상품 수정" : "상품 추가"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">상품명 *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 목욕> 🟧소형견 4kg"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">금액 (원) *</Label>
            <Input
              type="number"
              step="1000"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="예: 20000"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button
            disabled={pending || !name.trim() || price === ""}
            onClick={() => onSave({ name, price: Number(price) })}
          >
            저장
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

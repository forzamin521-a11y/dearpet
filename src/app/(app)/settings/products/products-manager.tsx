"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import {
  createOption,
  createProduct,
  deleteOption,
  deleteProduct,
  updateOption,
  updateProduct,
  type OptionInput,
} from "@/lib/actions/settings";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { GroomingProduct, ProductOption } from "@/lib/types";

const HOUR_CHOICES = [0, 1, 2, 3, 4, 5, 6];
const MINUTE_CHOICES = [0, 10, 20, 30, 40, 50];

interface OptionDialogState {
  open: boolean;
  productId: string;
  editing: ProductOption | null;
}

export function ProductsManager({
  products,
  options,
}: {
  products: GroomingProduct[];
  options: ProductOption[];
}) {
  const [pending, startTransition] = useTransition();
  const [newName, setNewName] = useState("");
  const [optionDialog, setOptionDialog] = useState<OptionDialogState>({
    open: false,
    productId: "",
    editing: null,
  });
  const [deleteTarget, setDeleteTarget] = useState<
    { type: "product" | "option"; id: string; name: string } | null
  >(null);

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) => {
    startTransition(async () => {
      const result = await fn();
      if (result.ok) toast.success("처리되었습니다.");
      else toast.error(result.error);
    });
  };

  return (
    <div className="space-y-4">
      {/* 서비스(상품) 추가 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">상품 추가</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Input
            placeholder="상품명 (예: 전체미용)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newName.trim()) {
                run(() => createProduct(newName, "🐶"));
                setNewName("");
              }
            }}
          />
          <Button
            disabled={pending || !newName.trim()}
            onClick={() => {
              run(() => createProduct(newName, "🐶"));
              setNewName("");
            }}
          >
            <Plus /> 추가
          </Button>
        </CardContent>
      </Card>

      {/* 상품 목록 */}
      {products.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          등록된 상품이 없습니다. 먼저 상품을 추가해 주세요.
        </p>
      )}
      {products.map((product) => {
        const productOptions = options.filter(
          (o) => o.product_id === product.id
        );
        return (
          <Card key={product.id}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">
                {product.emoji} {product.name}
              </CardTitle>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setOptionDialog({
                      open: true,
                      productId: product.id,
                      editing: null,
                    })
                  }
                >
                  <Plus /> 옵션 추가
                </Button>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  onClick={() => {
                    const name = prompt("상품명 수정", product.name);
                    if (name?.trim()) {
                      run(() =>
                        updateProduct(product.id, {
                          name: name.trim(),
                          description: product.description,
                          emoji: product.emoji,
                        })
                      );
                    }
                  }}
                >
                  <Pencil />
                </Button>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  className="text-destructive"
                  onClick={() =>
                    setDeleteTarget({
                      type: "product",
                      id: product.id,
                      name: product.name,
                    })
                  }
                >
                  <Trash2 />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {productOptions.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  옵션이 없습니다. 옵션을 추가해야 예약에서 선택할 수 있습니다.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>옵션명</TableHead>
                      <TableHead>소요시간</TableHead>
                      <TableHead>가격</TableHead>
                      <TableHead className="w-20" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productOptions.map((option) => (
                      <TableRow key={option.id}>
                        <TableCell>{option.name}</TableCell>
                        <TableCell>
                          {Math.floor(option.duration_minutes / 60) > 0 &&
                            `${Math.floor(option.duration_minutes / 60)}시간 `}
                          {option.duration_minutes % 60 > 0 &&
                            `${option.duration_minutes % 60}분`}
                        </TableCell>
                        <TableCell>
                          {option.price != null
                            ? `${option.price.toLocaleString()}원`
                            : "미설정"}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              onClick={() =>
                                setOptionDialog({
                                  open: true,
                                  productId: product.id,
                                  editing: option,
                                })
                              }
                            >
                              <Pencil />
                            </Button>
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              className="text-destructive"
                              onClick={() =>
                                setDeleteTarget({
                                  type: "option",
                                  id: option.id,
                                  name: option.name,
                                })
                              }
                            >
                              <Trash2 />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        );
      })}

      {/* 옵션 추가/수정 다이얼로그 */}
      {optionDialog.open && (
        <OptionDialog
          state={optionDialog}
          onClose={() =>
            setOptionDialog({ open: false, productId: "", editing: null })
          }
          onSubmit={(input) => {
            if (optionDialog.editing) {
              run(() => updateOption(optionDialog.editing!.id, input));
            } else {
              run(() => createOption(optionDialog.productId, input));
            }
            setOptionDialog({ open: false, productId: "", editing: null });
          }}
        />
      )}

      {/* 삭제 확인 */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>삭제할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{deleteTarget?.name}&quot;
              {deleteTarget?.type === "product"
                ? " 상품과 하위 옵션이 모두 삭제됩니다."
                : " 옵션이 삭제됩니다."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!deleteTarget) return;
                if (deleteTarget.type === "product") {
                  run(() => deleteProduct(deleteTarget.id));
                } else {
                  run(() => deleteOption(deleteTarget.id));
                }
                setDeleteTarget(null);
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

function OptionDialog({
  state,
  onClose,
  onSubmit,
}: {
  state: OptionDialogState;
  onClose: () => void;
  onSubmit: (input: OptionInput) => void;
}) {
  const editing = state.editing;
  const [name, setName] = useState(editing?.name ?? "");
  const [hours, setHours] = useState(
    String(Math.floor((editing?.duration_minutes ?? 90) / 60))
  );
  const [minutes, setMinutes] = useState(
    String((editing?.duration_minutes ?? 90) % 60)
  );
  const [priceSet, setPriceSet] = useState(editing?.price != null);
  const [price, setPrice] = useState(editing?.price?.toString() ?? "");

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "옵션 수정" : "옵션 추가"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>세부 옵션명</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 소형견 4kg"
            />
          </div>
          <div className="space-y-2">
            <Label>소요 시간</Label>
            <div className="flex gap-2">
              <Select value={hours} onValueChange={setHours}>
                <SelectTrigger className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HOUR_CHOICES.map((h) => (
                    <SelectItem key={h} value={String(h)}>
                      {h}시간
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={minutes} onValueChange={setMinutes}>
                <SelectTrigger className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MINUTE_CHOICES.map((m) => (
                    <SelectItem key={m} value={String(m)}>
                      {m}분
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>가격</Label>
            <div className="flex items-center gap-2">
              <Select
                value={priceSet ? "set" : "unset"}
                onValueChange={(v) => setPriceSet(v === "set")}
              >
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unset">미설정</SelectItem>
                  <SelectItem value="set">설정</SelectItem>
                </SelectContent>
              </Select>
              {priceSet && (
                <Input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="50000"
                  min={0}
                  step={1000}
                />
              )}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button
            disabled={!name.trim()}
            onClick={() =>
              onSubmit({
                name,
                duration_minutes: Number(hours) * 60 + Number(minutes),
                price: priceSet && price !== "" ? Number(price) : null,
                min_weight_kg: null,
                max_weight_kg: null,
              })
            }
          >
            {editing ? "수정" : "추가"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

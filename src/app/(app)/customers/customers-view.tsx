"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Search, UserPlus } from "lucide-react";
import {
  createCustomer,
  deleteCustomer,
  updateCustomer,
} from "@/lib/actions/customers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CustomerForm, type CustomerFormValues } from "./customer-form";
import type { CustomerWithPets, VisitCounts } from "./page";

export function CustomersView({
  customers,
  visitCounts,
  initialQuery,
}: {
  customers: CustomerWithPets[];
  visitCounts: VisitCounts;
  initialQuery: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState(initialQuery);
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<CustomerWithPets | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CustomerWithPets | null>(
    null
  );

  const search = () => {
    router.push(query.trim() ? `/customers?q=${encodeURIComponent(query)}` : "/customers");
  };

  const handleCreate = (values: CustomerFormValues) => {
    startTransition(async () => {
      const result = await createCustomer(values.customer, values.pets);
      if (result.ok) {
        toast.success("고객이 등록되었습니다.");
        setCreateOpen(false);
      } else {
        toast.error(result.error);
      }
    });
  };

  const handleUpdate = (values: CustomerFormValues) => {
    if (!editTarget) return;
    startTransition(async () => {
      const result = await updateCustomer(
        editTarget.id,
        values.customer,
        values.pets
      );
      if (result.ok) {
        toast.success("수정되었습니다.");
        setEditTarget(null);
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="보호자 호칭 / 반려동물명 검색"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && search()}
            />
          </div>
          <Button variant="secondary" onClick={search}>
            검색
          </Button>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <UserPlus /> 고객 등록
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">총 {customers.length}명</p>

      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>반려동물명</TableHead>
              <TableHead>보호자 호칭</TableHead>
              <TableHead>연락처</TableHead>
              <TableHead className="text-center">완료</TableHead>
              <TableHead className="text-center">취소</TableHead>
              <TableHead className="text-center">노쇼</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-10 text-center text-muted-foreground"
                >
                  {initialQuery
                    ? "검색 결과가 없습니다."
                    : "등록된 고객이 없습니다."}
                </TableCell>
              </TableRow>
            )}
            {customers.map((customer) => {
              const counts = visitCounts[customer.id];
              const firstPet = customer.pets[0];
              return (
                <TableRow
                  key={customer.id}
                  className="cursor-pointer"
                  onClick={() => setEditTarget(customer)}
                >
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <span>🐾</span>
                      <span className="font-medium">
                        {firstPet
                          ? `${firstPet.name}${firstPet.breed ? ` (${firstPet.breed})` : ""}`
                          : "-"}
                      </span>
                      {customer.pets.length > 1 && (
                        <Badge variant="secondary">
                          +{customer.pets.length - 1}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{customer.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {customer.phones[0] ?? "-"}
                  </TableCell>
                  <TableCell className="text-center">
                    {counts?.completed ?? 0}회
                  </TableCell>
                  <TableCell className="text-center">
                    {counts?.canceled ?? 0}회
                  </TableCell>
                  <TableCell className="text-center">
                    {counts?.no_show ?? 0}회
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* 신규 고객 등록 */}
      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>신규 고객 등록</SheetTitle>
          </SheetHeader>
          <div className="px-4 pb-8">
            {createOpen && (
              <CustomerForm
                onSubmit={handleCreate}
                pending={pending}
                submitLabel="고객 등록"
              />
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* 고객 수정 */}
      <Sheet
        open={!!editTarget}
        onOpenChange={(open) => !open && setEditTarget(null)}
      >
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>고객 정보</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 px-4 pb-8">
            {editTarget && (
              <>
                <CustomerForm
                  key={editTarget.id}
                  initial={editTarget}
                  onSubmit={handleUpdate}
                  pending={pending}
                  submitLabel="수정 저장"
                />
                <Button
                  variant="outline"
                  className="w-full text-destructive"
                  onClick={() => setDeleteTarget(editTarget)}
                >
                  고객 삭제
                </Button>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* 삭제 확인 */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>고객을 삭제할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.name} 고객과 반려동물, 예약 이력이 모두 삭제됩니다.
              되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!deleteTarget) return;
                startTransition(async () => {
                  const result = await deleteCustomer(deleteTarget.id);
                  if (result.ok) {
                    toast.success("삭제되었습니다.");
                    setDeleteTarget(null);
                    setEditTarget(null);
                  } else {
                    toast.error(result.error);
                  }
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

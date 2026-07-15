"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import {
  createConsentForm,
  deleteConsentForm,
  updateConsentForm,
} from "@/lib/actions/messaging";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { cn } from "@/lib/utils";
import { formatKoreanDate, formatKoreanTime, todayString } from "@/lib/time";
import type { ConsentForm } from "@/lib/types";

export function ConsentManager({
  forms,
  shopName,
}: {
  forms: ConsentForm[];
  shopName: string;
}) {
  const [pending, startTransition] = useTransition();
  const [newTitle, setNewTitle] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(
    forms[0]?.id ?? null
  );
  const [deleteTarget, setDeleteTarget] = useState<ConsentForm | null>(null);

  const selected = forms.find((f) => f.id === selectedId) ?? null;

  const add = () => {
    if (!newTitle.trim()) return;
    startTransition(async () => {
      const result = await createConsentForm(newTitle);
      if (result.ok) {
        toast.success("동의서가 추가되었습니다.");
        setNewTitle("");
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
      {/* 좌측: 목록 */}
      <div className="space-y-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">동의서 추가</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-1.5">
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && add()}
              placeholder="동의서 제목"
            />
            <Button size="icon" variant="outline" disabled={pending} onClick={add}>
              <Plus />
            </Button>
          </CardContent>
        </Card>
        <div className="space-y-1.5">
          {forms.map((form) => (
            <div
              key={form.id}
              className={cn(
                "flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2 text-sm hover:bg-accent",
                selectedId === form.id && "border-primary bg-accent font-medium"
              )}
              onClick={() => setSelectedId(form.id)}
            >
              <span className="truncate">{form.title}</span>
              <Button
                size="icon-sm"
                variant="ghost"
                className="shrink-0 text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteTarget(form);
                }}
              >
                <Trash2 />
              </Button>
            </div>
          ))}
          {forms.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              등록된 동의서가 없습니다.
            </p>
          )}
        </div>
      </div>

      {/* 우측: 편집 + 미리보기 */}
      {selected ? (
        <ConsentEditor key={selected.id} form={selected} shopName={shopName} />
      ) : (
        <Card>
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            좌측에서 동의서를 선택해 주세요.
          </CardContent>
        </Card>
      )}

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>동의서를 삭제할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{deleteTarget?.title}&quot; 동의서가 삭제됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!deleteTarget) return;
                startTransition(async () => {
                  const result = await deleteConsentForm(deleteTarget.id);
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

function ConsentEditor({
  form,
  shopName,
}: {
  form: ConsentForm;
  shopName: string;
}) {
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState(form.title);
  const [content, setContent] = useState(form.content);

  const preview = content
    .replaceAll("{{shopName}}", shopName)
    .replaceAll("{{dispPet}}", "솜이 (푸들)")
    .replaceAll("{{dispCustomer}}", "솜이맘 (010-1234-5678)")
    .replaceAll(
      "{{visitDateTime}}",
      `${formatKoreanDate(todayString())} ${formatKoreanTime("14:00")}`
    );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">동의서 편집</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">제목</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">내용</Label>
            <Textarea
              rows={14}
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              사용 가능한 변수: {"{{shopName}}"} 매장명 · {"{{dispPet}}"} 반려동물
              정보 · {"{{dispCustomer}}"} 보호자 정보 · {"{{visitDateTime}}"}{" "}
              서비스 이용일
            </p>
          </div>
          <Button
            disabled={pending || !title.trim()}
            onClick={() =>
              startTransition(async () => {
                const result = await updateConsentForm(form.id, {
                  title,
                  content,
                });
                if (result.ok) toast.success("저장되었습니다.");
                else toast.error(result.error);
              })
            }
          >
            저장
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">미리보기</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border bg-white p-4">
            <h3 className="mb-3 text-center font-bold text-zinc-900">{title}</h3>
            <p className="whitespace-pre-wrap text-sm text-zinc-700">{preview}</p>
            <p className="mt-6 text-center text-sm text-zinc-500">
              {formatKoreanDate(todayString())} 홍길동 (인)
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

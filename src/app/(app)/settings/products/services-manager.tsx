"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import {
  createService,
  deleteService,
  updateService,
  type ServiceInput,
} from "@/lib/actions/settings";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SERVICE_EMOJIS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Service } from "@/lib/types";

function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return [h > 0 ? `${h}시간` : "", m > 0 ? `${m}분` : ""].join(" ").trim() || "0분";
}

export function ServicesManager({ services }: { services: Service[] }) {
  const [pending, startTransition] = useTransition();
  const [dialog, setDialog] = useState<{ open: boolean; editing: Service | null }>({
    open: false,
    editing: null,
  });
  const [deleteTarget, setDeleteTarget] = useState<Service | null>(null);

  const save = (input: ServiceInput) => {
    startTransition(async () => {
      const result = dialog.editing
        ? await updateService(dialog.editing.id, input)
        : await createService(input);
      if (result.ok) {
        toast.success("저장되었습니다.");
        setDialog({ open: false, editing: null });
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button onClick={() => setDialog({ open: true, editing: null })}>
          <Plus /> 서비스 추가
        </Button>
      </div>

      <Card>
        <CardContent className="pt-4">
          {services.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              등록된 서비스가 없습니다. 서비스를 추가해야 예약에서 선택할 수
              있습니다.
            </p>
          ) : (
            <ul className="divide-y">
              {services.map((service) => (
                <li
                  key={service.id}
                  className="flex items-center gap-3 py-2.5 text-sm"
                >
                  <span className="inline-flex items-center gap-1 rounded-full border bg-secondary px-3 py-1 font-medium">
                    {service.emoji}
                    {service.name}
                  </span>
                  <span className="text-muted-foreground">
                    {formatDuration(service.duration_minutes)}
                  </span>
                  <span className="ml-auto flex gap-1">
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => setDialog({ open: true, editing: service })}
                    >
                      <Pencil />
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => setDeleteTarget(service)}
                    >
                      <Trash2 />
                    </Button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {dialog.open && (
        <ServiceDialog
          editing={dialog.editing}
          pending={pending}
          onClose={() => setDialog({ open: false, editing: null })}
          onSave={save}
        />
      )}

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              &apos;{deleteTarget?.name}&apos; 서비스를 삭제할까요?
            </AlertDialogTitle>
            <AlertDialogDescription>
              기존 예약의 서비스 표시는 유지되지만, 새 예약에서는 선택할 수
              없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!deleteTarget) return;
                startTransition(async () => {
                  const result = await deleteService(deleteTarget.id);
                  if (result.ok) {
                    toast.success("삭제되었습니다.");
                    setDeleteTarget(null);
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

function ServiceDialog({
  editing,
  pending,
  onClose,
  onSave,
}: {
  editing: Service | null;
  pending: boolean;
  onClose: () => void;
  onSave: (input: ServiceInput) => void;
}) {
  const [name, setName] = useState(editing?.name ?? "");
  const [emoji, setEmoji] = useState(editing?.emoji ?? "");
  const [hours, setHours] = useState(
    String(Math.floor((editing?.duration_minutes ?? 60) / 60))
  );
  const [minutes, setMinutes] = useState(
    String((editing?.duration_minutes ?? 60) % 60)
  );

  const duration = Number(hours || 0) * 60 + Number(minutes || 0);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{editing ? "서비스 수정" : "서비스 추가"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">서비스명 *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 전체미용"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">이모지 (한 번 더 누르면 해제)</Label>
            <div className="grid grid-cols-8 gap-1">
              {SERVICE_EMOJIS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEmoji((prev) => (prev === e ? "" : e))}
                  className={cn(
                    "rounded-md border py-1.5 text-lg transition-colors hover:bg-accent",
                    emoji === e
                      ? "border-primary bg-primary/10"
                      : "border-transparent bg-secondary"
                  )}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">소요시간 *</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="0"
                className="w-20"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
              />
              <span className="text-sm">시간</span>
              <Input
                type="number"
                min="0"
                max="59"
                step="10"
                className="w-20"
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
              />
              <span className="text-sm">분</span>
            </div>
            <p className="text-xs text-muted-foreground">
              예약 시 이 시간만큼 종료시간이 자동 설정됩니다.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button
            disabled={pending || !name.trim() || duration <= 0}
            onClick={() => onSave({ name, emoji, duration_minutes: duration })}
          >
            저장
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

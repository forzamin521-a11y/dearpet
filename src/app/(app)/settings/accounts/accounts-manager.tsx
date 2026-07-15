"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { KeyRound, Plus, Trash2, UserCog } from "lucide-react";
import {
  createStaff,
  deleteStaff,
  resetStaffPassword,
  updateStaff,
} from "@/lib/actions/settings";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Textarea } from "@/components/ui/textarea";
import { PERMISSION_LABEL, STAFF_EMOJIS } from "@/lib/constants";
import type { Profile, StaffPermissions } from "@/lib/types";

const DEFAULT_PERMISSIONS: StaffPermissions = {
  create: true,
  update: true,
  cancel: true,
  delete: false,
  stats: false,
};

export function AccountsManager({
  profiles,
  emails,
}: {
  profiles: Profile[];
  emails: Record<string, string>;
}) {
  const [pending, startTransition] = useTransition();
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Profile | null>(null);
  const [passwordTarget, setPasswordTarget] = useState<Profile | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Profile | null>(null);

  const run = (
    fn: () => Promise<{ ok: boolean; error?: string }>,
    onSuccess?: () => void
  ) => {
    startTransition(async () => {
      const result = await fn();
      if (result.ok) {
        toast.success("처리되었습니다.");
        onSuccess?.();
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button onClick={() => setAddOpen(true)}>
          <Plus /> 계정 추가
        </Button>
      </div>

      {profiles.map((profile) => (
        <Card key={profile.id}>
          <CardContent className="flex items-center justify-between py-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span>{profile.emoji}</span>
                <p className="font-medium">{profile.name}</p>
                <Badge variant={profile.role === "owner" ? "default" : "secondary"}>
                  {profile.role === "owner" ? "관리자" : "실장"}
                </Badge>
                {!profile.is_active && (
                  <Badge variant="outline" className="text-muted-foreground">
                    비활성
                  </Badge>
                )}
              </div>
              <p className="truncate text-sm text-muted-foreground">
                {emails[profile.id] ?? "이메일 확인 불가"}
                {profile.phone && ` · ${profile.phone}`}
              </p>
              {profile.role === "staff" && (
                <p className="mt-1 text-xs text-muted-foreground">
                  권한:{" "}
                  {Object.entries(profile.permissions ?? {})
                    .filter(([, v]) => v)
                    .map(([k]) => PERMISSION_LABEL[k])
                    .join(", ") || "없음"}
                </p>
              )}
            </div>
            {profile.role === "staff" && (
              <div className="flex shrink-0 gap-1">
                <Button
                  size="icon-sm"
                  variant="ghost"
                  title="정보/권한 수정"
                  onClick={() => setEditTarget(profile)}
                >
                  <UserCog />
                </Button>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  title="비밀번호 변경"
                  onClick={() => setPasswordTarget(profile)}
                >
                  <KeyRound />
                </Button>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  className="text-destructive"
                  title="계정 삭제"
                  onClick={() => setDeleteTarget(profile)}
                >
                  <Trash2 />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {addOpen && (
        <StaffFormDialog
          title="계정 추가"
          onClose={() => setAddOpen(false)}
          onSubmit={(form) =>
            run(
              () =>
                createStaff({
                  email: form.email,
                  password: form.password,
                  name: form.name,
                  phone: form.phone,
                  emoji: form.emoji,
                  memo: form.memo,
                  permissions: form.permissions,
                }),
              () => setAddOpen(false)
            )
          }
          pending={pending}
        />
      )}

      {editTarget && (
        <StaffFormDialog
          title="정보/권한 수정"
          editing={editTarget}
          onClose={() => setEditTarget(null)}
          onSubmit={(form) =>
            run(
              () =>
                updateStaff(editTarget.id, {
                  name: form.name,
                  phone: form.phone,
                  emoji: form.emoji,
                  memo: form.memo,
                  permissions: form.permissions,
                  is_active: form.isActive,
                }),
              () => setEditTarget(null)
            )
          }
          pending={pending}
        />
      )}

      {passwordTarget && (
        <PasswordDialog
          profile={passwordTarget}
          pending={pending}
          onClose={() => setPasswordTarget(null)}
          onSubmit={(password) =>
            run(
              () => resetStaffPassword(passwordTarget.id, password),
              () => setPasswordTarget(null)
            )
          }
        />
      )}

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>계정을 삭제할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.name} 계정이 완전히 삭제되어 더 이상 로그인할 수
              없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteTarget) {
                  run(() => deleteStaff(deleteTarget.id), () =>
                    setDeleteTarget(null)
                  );
                }
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

interface StaffFormValues {
  email: string;
  password: string;
  name: string;
  phone: string;
  emoji: string;
  memo: string;
  permissions: StaffPermissions;
  isActive: boolean;
}

function StaffFormDialog({
  title,
  editing,
  pending,
  onClose,
  onSubmit,
}: {
  title: string;
  editing?: Profile;
  pending: boolean;
  onClose: () => void;
  onSubmit: (values: StaffFormValues) => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState(editing?.name ?? "");
  const [phone, setPhone] = useState(editing?.phone ?? "");
  const [emoji, setEmoji] = useState(editing?.emoji ?? "💛");
  const [memo, setMemo] = useState(editing?.memo ?? "");
  const [isActive, setIsActive] = useState(editing?.is_active ?? true);
  const [permissions, setPermissions] = useState<StaffPermissions>(
    editing?.permissions ?? DEFAULT_PERMISSIONS
  );

  const valid = editing
    ? name.trim().length > 0
    : email.trim().length > 0 && password.length >= 6 && name.trim().length > 0;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {!editing && (
            <>
              <div className="space-y-2">
                <Label>이메일 주소 (로그인 아이디)</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>비밀번호 (6자 이상)</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </>
          )}
          <div className="space-y-2">
            <Label>이름</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>전화번호</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>표시 이모지 (캘린더 담당자 열)</Label>
            <Select value={emoji} onValueChange={setEmoji}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STAFF_EMOJIS.map((e) => (
                  <SelectItem key={e} value={e}>
                    {e}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>계정 메모</Label>
            <Textarea
              rows={2}
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>권한</Label>
            <div className="grid grid-cols-2 gap-2 rounded-lg border p-3">
              {(
                Object.keys(PERMISSION_LABEL) as Array<keyof StaffPermissions>
              ).map((key) => (
                <label
                  key={key}
                  className="flex cursor-pointer items-center gap-2 text-sm"
                >
                  <Checkbox
                    checked={permissions[key]}
                    onCheckedChange={(checked) =>
                      setPermissions((prev) => ({
                        ...prev,
                        [key]: checked === true,
                      }))
                    }
                  />
                  {PERMISSION_LABEL[key]}
                </label>
              ))}
            </div>
          </div>
          {editing && (
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox
                checked={isActive}
                onCheckedChange={(checked) => setIsActive(checked === true)}
              />
              계정 활성화 (해제 시 담당자 목록에서 숨김)
            </label>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button
            disabled={!valid || pending}
            onClick={() =>
              onSubmit({
                email,
                password,
                name,
                phone,
                emoji,
                memo,
                permissions,
                isActive,
              })
            }
          >
            저장
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PasswordDialog({
  profile,
  pending,
  onClose,
  onSubmit,
}: {
  profile: Profile;
  pending: boolean;
  onClose: () => void;
  onSubmit: (password: string) => void;
}) {
  const [password, setPassword] = useState("");

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{profile.name} 비밀번호 변경</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label>새 비밀번호 (6자 이상)</Label>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button
            disabled={password.length < 6 || pending}
            onClick={() => onSubmit(password)}
          >
            변경
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

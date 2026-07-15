"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { changeMyPassword } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function PasswordChangeForm() {
  const [pending, startTransition] = useTransition();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");

  const submit = () => {
    if (!current || !next) {
      toast.error("현재 비밀번호와 새 비밀번호를 입력해 주세요.");
      return;
    }
    if (next !== confirm) {
      toast.error("새 비밀번호가 서로 일치하지 않습니다.");
      return;
    }
    startTransition(async () => {
      const result = await changeMyPassword(current, next);
      if (result.ok) {
        toast.success("비밀번호가 변경되었습니다.");
        setCurrent("");
        setNext("");
        setConfirm("");
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <form
      className="max-w-sm space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div className="space-y-1">
        <Label htmlFor="current-password">현재 비밀번호</Label>
        <Input
          id="current-password"
          type="password"
          autoComplete="current-password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="new-password">새 비밀번호</Label>
        <Input
          id="new-password"
          type="password"
          autoComplete="new-password"
          minLength={6}
          value={next}
          onChange={(e) => setNext(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">6자 이상</p>
      </div>
      <div className="space-y-1">
        <Label htmlFor="confirm-password">새 비밀번호 확인</Label>
        <Input
          id="confirm-password"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "변경 중..." : "비밀번호 변경"}
      </Button>
    </form>
  );
}

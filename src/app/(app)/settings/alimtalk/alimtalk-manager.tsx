"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { saveAlimtalkTemplate } from "@/lib/actions/messaging";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ALIMTALK_KIND_LABEL } from "@/lib/constants";
import {
  ALIMTALK_TEMPLATES,
  renderTemplate,
  resolveShopVars,
} from "@/lib/messaging/templates";
import { formatKoreanDate, formatKoreanTime, todayString } from "@/lib/time";
import type { AlimtalkKind, AlimtalkLog, AlimtalkTemplate } from "@/lib/types";

const SELECT_KINDS: AlimtalkKind[] = ["basic", "senior", "consent"];
const AUTO_KINDS: AlimtalkKind[] = [
  "confirm",
  "pre_visit",
  "change",
  "cancel",
  "finishing",
  "no_show",
];

const AUTO_KIND_DESC: Partial<Record<AlimtalkKind, string>> = {
  confirm: "예약 접수(등록) 시 자동 발송됩니다.",
  pre_visit: "예약 전날 자동 발송됩니다. (추후 지원)",
  change: "예약이 변경되었을 때 자동 발송됩니다.",
  cancel: "예약이 취소되었을 때 자동 발송됩니다.",
  finishing: "예약 상태를 '마무리'로 변경했을 때 발송됩니다.",
  no_show: "예약 상태를 '노쇼'로 변경했을 때 발송됩니다.",
};

export function AlimtalkManager({
  templates,
  logs,
  shopName,
  shopPhone,
}: {
  templates: AlimtalkTemplate[];
  logs: AlimtalkLog[];
  shopName: string;
  shopPhone: string;
}) {
  const [pending, startTransition] = useTransition();
  const [editTarget, setEditTarget] = useState<AlimtalkKind | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const settingByKind = useMemo(
    () => new Map(templates.map((t) => [t.kind, t])),
    [templates]
  );

  const sampleAutoVars = useMemo(
    () => ({
      shopName,
      shopPhone: shopPhone || "010-0000-0000",
      customerName: "솜이맘",
      petNames: "솜이",
      visitDateTime: `${formatKoreanDate(todayString())} ${formatKoreanTime("14:00")}`,
      consentLink: `${process.env.NEXT_PUBLIC_APP_URL ?? "https://dearpet.vercel.app"}/consent/미리보기`,
    }),
    [shopName, shopPhone]
  );

  const renderPreview = (kind: AlimtalkKind, shopVars?: Record<string, string>) => {
    const def = ALIMTALK_TEMPLATES[kind];
    return renderTemplate(def.body, {
      ...sampleAutoVars,
      ...(shopVars ?? resolveShopVars(def, settingByKind.get(kind)?.variables)),
    });
  };

  const toggleEnabled = (kind: AlimtalkKind, enabled: boolean) => {
    const def = ALIMTALK_TEMPLATES[kind];
    const vars = resolveShopVars(def, settingByKind.get(kind)?.variables);
    startTransition(async () => {
      const result = await saveAlimtalkTemplate(kind, vars, enabled);
      if (result.ok) toast.success(enabled ? "사용으로 변경" : "미사용으로 변경");
      else toast.error(result.error);
    });
  };

  const TemplateRow = ({
    kind,
    showSwitch,
  }: {
    kind: AlimtalkKind;
    showSwitch: boolean;
  }) => {
    const setting = settingByKind.get(kind);
    const hasShopVars = ALIMTALK_TEMPLATES[kind].shopVars.length > 0;
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm">
            {ALIMTALK_KIND_LABEL[kind]}
            {showSwitch && (
              <Badge
                variant="secondary"
                className={
                  setting?.enabled
                    ? "ml-2 bg-green-100 text-green-800"
                    : "ml-2 bg-zinc-100 text-zinc-500"
                }
              >
                {setting?.enabled ? "사용" : "미사용"}
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPreview(renderPreview(kind))}
            >
              미리보기
            </Button>
            {hasShopVars && (
              <Button size="sm" variant="outline" onClick={() => setEditTarget(kind)}>
                문구 편집
              </Button>
            )}
            {showSwitch && (
              <Switch
                checked={setting?.enabled ?? false}
                disabled={pending}
                onCheckedChange={(checked) => toggleEnabled(kind, checked)}
              />
            )}
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            {AUTO_KIND_DESC[kind] ?? "예약 등록 시 선택하여 발송할 수 있습니다."}
          </p>
        </CardContent>
      </Card>
    );
  };

  return (
    <>
      <Tabs defaultValue="select">
        <TabsList>
          <TabsTrigger value="select">선택 발송</TabsTrigger>
          <TabsTrigger value="auto">상황별 자동 발송</TabsTrigger>
          <TabsTrigger value="logs">발송 이력</TabsTrigger>
        </TabsList>

        <TabsContent value="select" className="space-y-3">
          {SELECT_KINDS.map((kind) => (
            <TemplateRow key={kind} kind={kind} showSwitch={false} />
          ))}
        </TabsContent>

        <TabsContent value="auto" className="space-y-3">
          {AUTO_KINDS.map((kind) => (
            <TemplateRow key={kind} kind={kind} showSwitch />
          ))}
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <CardContent className="pt-4">
              {logs.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  발송 이력이 없습니다.
                </p>
              ) : (
                <ul className="divide-y">
                  {logs.map((log) => (
                    <li key={log.id} className="space-y-1 py-3 text-sm">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">
                          {ALIMTALK_KIND_LABEL[log.kind]}
                        </Badge>
                        <span className="text-muted-foreground">
                          {log.phone}
                        </span>
                        <span className="ml-auto text-xs text-muted-foreground">
                          {new Date(log.created_at).toLocaleString("ko-KR")} ·{" "}
                          {log.status === "simulated" ? "시뮬레이션" : log.status}
                        </span>
                      </div>
                      <p className="whitespace-pre-wrap rounded-md bg-muted p-2 text-xs">
                        {log.content}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {editTarget && (
        <VariableEditDialog
          kind={editTarget}
          initialVars={resolveShopVars(
            ALIMTALK_TEMPLATES[editTarget],
            settingByKind.get(editTarget)?.variables
          )}
          pending={pending}
          renderPreview={(vars) => renderPreview(editTarget, vars)}
          onClose={() => setEditTarget(null)}
          onSave={(vars) => {
            const setting = settingByKind.get(editTarget);
            startTransition(async () => {
              const result = await saveAlimtalkTemplate(
                editTarget,
                vars,
                setting?.enabled ?? true
              );
              if (result.ok) {
                toast.success("저장되었습니다.");
                setEditTarget(null);
              } else {
                toast.error(result.error);
              }
            });
          }}
        />
      )}

      {/* 미리보기 (카카오톡 스타일) */}
      <Dialog open={!!preview} onOpenChange={(open) => !open && setPreview(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>알림톡 미리보기</DialogTitle>
          </DialogHeader>
          <div className="overflow-hidden rounded-xl border">
            <div className="bg-yellow-300 px-3 py-2 text-sm font-bold">
              알림톡 도착
            </div>
            <p className="whitespace-pre-wrap bg-white p-3 text-sm text-zinc-800">
              {preview}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * 알림톡 본문은 카카오 검수 승인 템플릿이라 수정할 수 없고,
 * 템플릿에 선언된 매장 변수({{extraInfo}} 등)의 값만 편집한다.
 */
function VariableEditDialog({
  kind,
  initialVars,
  pending,
  renderPreview,
  onClose,
  onSave,
}: {
  kind: AlimtalkKind;
  initialVars: Record<string, string>;
  pending: boolean;
  renderPreview: (vars: Record<string, string>) => string;
  onClose: () => void;
  onSave: (vars: Record<string, string>) => void;
}) {
  const [vars, setVars] = useState(initialVars);
  const def = ALIMTALK_TEMPLATES[kind];

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{ALIMTALK_KIND_LABEL[kind]} 문구 편집</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            {def.shopVars.map((v) => (
              <div key={v.key} className="space-y-1">
                <Label htmlFor={`var-${v.key}`}>{v.label}</Label>
                <Input
                  id={`var-${v.key}`}
                  value={vars[v.key] ?? ""}
                  placeholder={v.placeholder}
                  maxLength={200}
                  onChange={(e) =>
                    setVars((prev) => ({ ...prev, [v.key]: e.target.value }))
                  }
                />
              </div>
            ))}
          </div>
          <div className="space-y-1">
            <Label>발송 내용</Label>
            <p className="max-h-56 overflow-y-auto whitespace-pre-wrap rounded-md bg-muted p-3 text-xs">
              {renderPreview(vars)}
            </p>
            <p className="text-xs text-muted-foreground">
              본문은 카카오 승인 템플릿이라 수정할 수 없으며, 위 문구만 변경할 수
              있습니다. 예약자·일시 등은 발송 시 자동으로 채워집니다.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button disabled={pending} onClick={() => onSave(vars)}>
            저장
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

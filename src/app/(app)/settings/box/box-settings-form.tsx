"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updateBoxSettings } from "@/lib/actions/settings";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import type { BoxSettings } from "@/lib/types";

const FIELD_LABELS: Array<[keyof BoxSettings["fields"], string]> = [
  ["customerName", "보호자 호칭"],
  ["time", "예약시간"],
  ["petName", "반려동물명"],
  ["breed", "품종"],
  ["product", "상품"],
  ["memo", "메모"],
];

const DEFAULT_SETTINGS: BoxSettings = {
  align: "left",
  fields: {
    customerName: true,
    time: true,
    petName: true,
    breed: true,
    product: true,
    memo: true,
  },
};

export function BoxSettingsForm({ initial }: { initial: BoxSettings | null }) {
  const [pending, startTransition] = useTransition();
  const [settings, setSettings] = useState<BoxSettings>(
    initial ?? DEFAULT_SETTINGS
  );

  return (
    <Card>
      <CardContent className="space-y-5 pt-6">
        <div className="space-y-2">
          <Label>텍스트 정렬</Label>
          <RadioGroup
            value={settings.align}
            onValueChange={(v) =>
              setSettings((prev) => ({
                ...prev,
                align: v as BoxSettings["align"],
              }))
            }
            className="flex gap-6"
          >
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <RadioGroupItem value="left" /> 왼쪽 (기본)
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <RadioGroupItem value="center" /> 가운데
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <RadioGroupItem value="right" /> 오른쪽
            </label>
          </RadioGroup>
        </div>

        <Separator />

        <div className="space-y-1">
          <Label>노출 정보</Label>
          {FIELD_LABELS.map(([key, label]) => (
            <div
              key={key}
              className="flex items-center justify-between border-b py-2.5 text-sm last:border-b-0"
            >
              {label}
              <Switch
                checked={settings.fields[key]}
                onCheckedChange={(checked) =>
                  setSettings((prev) => ({
                    ...prev,
                    fields: { ...prev.fields, [key]: checked },
                  }))
                }
              />
            </div>
          ))}
        </div>

        <Button
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await updateBoxSettings(settings);
              if (result.ok) toast.success("저장되었습니다.");
              else toast.error(result.error);
            })
          }
        >
          {pending ? "저장 중..." : "저장"}
        </Button>
      </CardContent>
    </Card>
  );
}

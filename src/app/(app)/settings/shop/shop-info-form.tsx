"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { updateShopInfo } from "@/lib/actions/settings";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Shop } from "@/lib/types";

export function ShopInfoForm({ shop }: { shop: Shop }) {
  const [state, formAction, pending] = useActionState(updateShopInfo, null);

  useEffect(() => {
    if (state?.ok) toast.success("저장되었습니다.");
    else if (state?.error) toast.error(state.error);
  }, [state]);

  return (
    <Card>
      <CardContent className="pt-6">
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">매장명</Label>
            <Input id="name" name="name" defaultValue={shop.name} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">도로명 주소</Label>
            <Input id="address" name="address" defaultValue={shop.address} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">매장 번호</Label>
            <Input id="phone" name="phone" defaultValue={shop.phone} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="open_time">영업 시작</Label>
              <Input
                id="open_time"
                name="open_time"
                type="time"
                defaultValue={shop.open_time.slice(0, 5)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="close_time">영업 종료</Label>
              <Input
                id="close_time"
                name="close_time"
                type="time"
                defaultValue={shop.close_time.slice(0, 5)}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            영업 시간은 예약 캘린더의 시간축 범위로 사용됩니다.
          </p>
          <div className="space-y-2">
            <Label htmlFor="business_hours">영업 시간 안내 문구</Label>
            <Input
              id="business_hours"
              name="business_hours"
              defaultValue={shop.business_hours}
              placeholder="예: 월~토 / 10:00~20:00"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="closed_days">정기 휴무</Label>
            <Input
              id="closed_days"
              name="closed_days"
              defaultValue={shop.closed_days}
              placeholder="예: 일요일휴무"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="intro">매장 소개</Label>
            <Textarea id="intro" name="intro" rows={5} defaultValue={shop.intro} />
          </div>
          <Button type="submit" disabled={pending}>
            {pending ? "저장 중..." : "저장"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

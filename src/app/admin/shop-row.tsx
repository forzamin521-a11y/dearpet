"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { setShopStatus } from "@/lib/actions/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Shop } from "@/lib/types";

const STATUS_BADGE: Record<Shop["status"], { label: string; className: string }> =
  {
    pending: { label: "승인 대기", className: "bg-yellow-100 text-yellow-800" },
    approved: { label: "운영 중", className: "bg-green-100 text-green-800" },
    suspended: { label: "정지", className: "bg-red-100 text-red-800" },
  };

export function ShopRow({ shop }: { shop: Shop }) {
  const [pending, startTransition] = useTransition();

  const update = (status: "approved" | "suspended" | "pending") => {
    startTransition(async () => {
      const result = await setShopStatus(shop.id, status);
      if (result.ok) toast.success("변경되었습니다.");
      else toast.error(result.error);
    });
  };

  const badge = STATUS_BADGE[shop.status];

  return (
    <div className="flex items-center justify-between rounded-lg border p-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium">{shop.name}</p>
          <Badge variant="secondary" className={badge.className}>
            {badge.label}
          </Badge>
        </div>
        <p className="truncate text-sm text-muted-foreground">
          {shop.phone || "전화번호 없음"} · {shop.address || "주소 없음"}
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        {shop.status !== "approved" && (
          <Button size="sm" disabled={pending} onClick={() => update("approved")}>
            승인
          </Button>
        )}
        {shop.status === "approved" && (
          <Button
            size="sm"
            variant="destructive"
            disabled={pending}
            onClick={() => update("suspended")}
          >
            정지
          </Button>
        )}
        {shop.status === "suspended" && (
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => update("pending")}
          >
            대기로 되돌리기
          </Button>
        )}
      </div>
    </div>
  );
}

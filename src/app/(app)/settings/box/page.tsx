import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import { BoxSettingsForm } from "./box-settings-form";

export const metadata: Metadata = { title: "예약 박스 설정" };

export default async function BoxSettingsPage() {
  const { shop } = await getAuthContext();
  if (!shop) redirect("/pending");

  return (
    <div className="max-w-xl space-y-4">
      <div>
        <h2 className="text-lg font-bold">예약 박스 내 상세 노출 설정</h2>
        <p className="text-sm text-muted-foreground">
          캘린더 예약 박스 안에 노출되는 내용을 설정할 수 있습니다.
        </p>
      </div>
      <BoxSettingsForm initial={shop.box_settings} />
    </div>
  );
}

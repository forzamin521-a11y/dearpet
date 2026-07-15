import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import { ShopInfoForm } from "./shop-info-form";

export const metadata: Metadata = { title: "매장 정보 설정" };

export default async function ShopSettingsPage() {
  const { shop } = await getAuthContext();
  if (!shop) redirect("/pending");

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h2 className="text-lg font-bold">매장 정보 설정</h2>
        <p className="text-sm text-muted-foreground">
          매장 기본 정보를 관리합니다. 알림톡 내용에도 사용됩니다.
        </p>
      </div>
      <ShopInfoForm shop={shop} />
    </div>
  );
}

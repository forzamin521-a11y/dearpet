import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { renderTemplate } from "@/lib/messaging/templates";
import { formatKoreanDate, formatKoreanTime } from "@/lib/time";
import { ConsentSignForm } from "./sign-form";

export const metadata: Metadata = { title: "동의서 작성" };

export default async function ConsentSignPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const admin = createAdminClient();
  const { data: submission } = await admin
    .from("consent_submissions")
    .select(
      `id, token, status, signer_name, signed_at,
       form:consent_forms(title, content),
       shop:shops(name, address, phone),
       customer:customers(name, phones),
       pet:pets(name, breed),
       reservation:reservations(date, start_time)`
    )
    .eq("token", token)
    .maybeSingle();

  if (!submission || !submission.form) {
    return (
      <CenteredMessage emoji="🔗" title="유효하지 않은 링크입니다">
        링크가 만료되었거나 잘못된 주소입니다. 매장에 문의해 주세요.
      </CenteredMessage>
    );
  }

  const form = submission.form as unknown as { title: string; content: string };
  const shop = submission.shop as unknown as {
    name: string;
    address: string;
    phone: string;
  } | null;
  const customer = submission.customer as unknown as {
    name: string;
    phones: string[];
  } | null;
  const pet = submission.pet as unknown as {
    name: string;
    breed: string;
  } | null;
  const reservation = submission.reservation as unknown as {
    date: string;
    start_time: string;
  } | null;

  const visitDateTime = reservation
    ? `${formatKoreanDate(reservation.date)} ${formatKoreanTime(
        String(reservation.start_time).slice(0, 5)
      )}`
    : "";

  const content = renderTemplate(form.content, {
    shopName: shop?.name ?? "",
    dispPet: pet ? `${pet.name}${pet.breed ? ` (${pet.breed})` : ""}` : "",
    dispCustomer: customer
      ? `${customer.name}${customer.phones?.[0] ? ` (${customer.phones[0]})` : ""}`
      : "",
    visitDateTime,
  });

  if (submission.status === "signed") {
    return (
      <CenteredMessage emoji="✅" title="서명이 완료되었습니다">
        {submission.signer_name}님, 동의서 작성이 이미 완료되었습니다.
        <br />
        예약일에 뵙겠습니다. 감사합니다!
      </CenteredMessage>
    );
  }

  return (
    <main className="mx-auto w-full max-w-lg flex-1 space-y-4 p-4">
      <div className="rounded-xl border bg-card p-4">
        <p className="text-sm font-semibold text-primary">{shop?.name}</p>
        <h1 className="mt-1 text-xl font-bold">{form.title}</h1>
        {shop && (
          <p className="mt-1 text-xs text-muted-foreground">
            {shop.address} · {shop.phone}
          </p>
        )}
      </div>

      <div className="rounded-xl border bg-card p-4">
        <p className="whitespace-pre-wrap text-sm leading-relaxed">{content}</p>
      </div>

      <ConsentSignForm token={token} defaultName={customer?.name ?? ""} />
    </main>
  );
}

function CenteredMessage({
  emoji,
  title,
  children,
}: {
  emoji: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      <span className="text-5xl">{emoji}</span>
      <h1 className="text-xl font-bold">{title}</h1>
      <p className="text-sm text-muted-foreground">{children}</p>
    </main>
  );
}

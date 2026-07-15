import "server-only";

import type { AlimtalkKind } from "@/lib/types";

/**
 * 알림톡 발송 모듈.
 *
 * - FakeProvider: 실제 발송 없이 성공 처리 (발송 이력만 alimtalk_logs에 기록)
 * - AligoRelayProvider: 고정 IP 릴레이 서버(Fly.io)를 거쳐 알리고 알림톡 API 호출.
 *   알리고는 발신 서버 IP 등록이 필수인데 Vercel egress IP는 유동이므로,
 *   알리고 계정/IP를 아는 쪽은 릴레이뿐이고 이 앱은 릴레이 토큰만 가진다.
 *   릴레이 계약은 docs/alimtalk-relay.md 참고.
 *
 * MESSAGING_PROVIDER=aligo + 릴레이 env가 모두 있어야 실발송, 아니면 시뮬레이션.
 */

export type SendStatus = "simulated" | "sent" | "failed";

export interface SendParams {
  phone: string;
  /** 변수 치환이 끝난 최종 본문 (승인 템플릿과 일치해야 함) */
  content: string;
  kind: AlimtalkKind;
  /** 알리고 tpl_code. 미검수 상태면 빈 문자열 */
  templateCode: string;
}

export interface MessageProvider {
  send(params: SendParams): Promise<SendStatus>;
}

class FakeProvider implements MessageProvider {
  async send(): Promise<SendStatus> {
    return "simulated";
  }
}

class AligoRelayProvider implements MessageProvider {
  constructor(
    private relayUrl: string,
    private relayToken: string,
    private senderKey: string
  ) {}

  async send({ phone, content, kind, templateCode }: SendParams): Promise<SendStatus> {
    if (!templateCode) {
      console.error(`[alimtalk] 템플릿 코드 미설정: ${kind} (ALIGO_TEMPLATE_CODES)`);
      return "failed";
    }
    try {
      const res = await fetch(this.relayUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.relayToken}`,
        },
        body: JSON.stringify({
          senderKey: this.senderKey,
          templateCode,
          phone,
          message: content,
        }),
        signal: AbortSignal.timeout(10_000),
        cache: "no-store",
      });
      if (!res.ok) {
        console.error(`[alimtalk] 릴레이 응답 오류: ${res.status} ${await res.text()}`);
        return "failed";
      }
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!data.ok) {
        console.error(`[alimtalk] 알리고 발송 실패: ${data.error ?? "unknown"}`);
        return "failed";
      }
      return "sent";
    } catch (e) {
      console.error("[alimtalk] 릴레이 호출 실패:", e);
      return "failed";
    }
  }
}

export function getMessageProvider(): MessageProvider {
  const { MESSAGING_PROVIDER, ALIMTALK_RELAY_URL, ALIMTALK_RELAY_TOKEN, ALIGO_SENDER_KEY } =
    process.env;

  if (
    MESSAGING_PROVIDER === "aligo" &&
    ALIMTALK_RELAY_URL &&
    ALIMTALK_RELAY_TOKEN &&
    ALIGO_SENDER_KEY
  ) {
    return new AligoRelayProvider(
      ALIMTALK_RELAY_URL,
      ALIMTALK_RELAY_TOKEN,
      ALIGO_SENDER_KEY
    );
  }
  if (MESSAGING_PROVIDER === "aligo") {
    console.warn(
      "[alimtalk] MESSAGING_PROVIDER=aligo 이지만 릴레이 env가 없어 시뮬레이션으로 동작합니다."
    );
  }
  return new FakeProvider();
}

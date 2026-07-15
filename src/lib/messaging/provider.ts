import "server-only";

/**
 * 알림톡 발송 모듈.
 * v1은 FakeProvider(발송 이력만 기록)를 사용하고,
 * 추후 솔라피 등 실제 대행사 연동 시 이 인터페이스만 구현하면 된다.
 */

export type SendStatus = "simulated" | "sent" | "failed";

export interface MessageProvider {
  send(phone: string, content: string): Promise<SendStatus>;
}

/** 실제 발송 없이 성공으로 처리 (발송 이력은 alimtalk_logs에 기록됨) */
class FakeProvider implements MessageProvider {
  async send(): Promise<SendStatus> {
    return "simulated";
  }
}

// TODO: 솔라피 연동 시 SolapiProvider 구현 후 환경변수로 전환
export function getMessageProvider(): MessageProvider {
  return new FakeProvider();
}

/** {{변수}} 치환 */
export function renderTemplate(
  content: string,
  vars: Record<string, string>
): string {
  return content.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? "");
}

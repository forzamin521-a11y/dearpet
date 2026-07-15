# 알림톡 실발송 전환 — 향후 계획

작성일: 2026-07-16
관련 문서: [alimtalk-relay.md](./alimtalk-relay.md) (릴레이 계약·검수 등록 상세)

## 구조 요약

```
DearPet (Vercel) ──Bearer 토큰──▶ sportsbox-aligo-proxy (Fly.io, 고정 IP) ──▶ 알리고 ──▶ 카카오 알림톡
```

- 알리고 계정·Fly 릴레이는 기존 프로젝트(A)와 공용. DearPet용 카카오채널(발신프로필)만 별도.
- 검수 승인 전까지는 `MESSAGING_PROVIDER=fake` (시뮬레이션 — 이력만 기록, 실발송 없음).

## 완료된 것

- [x] 코드: `AligoRelayProvider` 구현 (`src/lib/messaging/provider.ts`)
- [x] 코드: 템플릿 본문 코드 고정 + 매장은 안내문구 변수만 편집 (`src/lib/messaging/templates.ts`, 설정 UI)
- [x] DB: `alimtalk_templates.variables` 마이그레이션(00002) 적용
- [x] 릴레이: sportsbox-aligo-proxy에 `POST /alimtalk` 라우트 추가
- [x] RELAY_TOKEN 생성 → `.env.local`에 URL·토큰 기입
- [x] 릴레이 배포 완료 (2026-07-16): RELAY_TOKEN secret 설정, `/health` 정상,
      토큰 없으면 401, payload 부족 시 400 확인. 기존 `/proxy/aligo`는 그대로 유지
- [x] 카카오 채널 개설 + 비즈니스 인증 **신청 완료 (2026-07-16, 승인 대기 중 — 2~7영업일)**

## 남은 일 (순서대로)

### 1. 비즈니스 인증 승인 대기 중 ⏳

- [ ] 승인 결과 확인 ([채널 관리자센터](https://center-pf.kakao.com)에서 확인, 반려 시 사유 보고 재신청)

### 2. 알리고 발신프로필 등록 (채널 인증 승인 후, 5분)

- [ ] [알리고](https://smartsms.aligo.in) → 카카오 알림톡 → 발신프로필 등록 (@채널ID + 관리자 휴대폰 인증)
- [ ] 발급된 **senderkey**를 `.env.local`과 Vercel의 `ALIGO_SENDER_KEY`에 기입

### 3. 템플릿 9종 검수 등록 (심사 1~3영업일)

- [ ] 알리고 → 템플릿 관리 → 등록. 본문은 `templates.ts`의 body와 글자 단위 일치,
      `{{변수}}`는 `#{변수}`로 변환해 제출 (완성본은 alimtalk-relay.md 참고)
- [ ] `consent` 템플릿의 `#{consentLink}` 변수 링크가 반려되면 → 웹링크 버튼 방식으로 코드 수정 필요 (Claude에게 요청)
- [ ] 승인된 **tpl_code 9개**를 `src/lib/messaging/templates.ts`의 `ALIGO_TEMPLATE_CODES`에 기입 (Claude에게 요청)

### 4. Vercel 환경변수 + 실발송 오픈

- [ ] Vercel → dearpet → Settings → Environment Variables:
      `ALIMTALK_RELAY_URL`, `ALIMTALK_RELAY_TOKEN`, `ALIGO_SENDER_KEY` 입력
- [ ] 마지막에 `MESSAGING_PROVIDER=aligo` 추가 → **Redeploy** (환경변수는 재배포해야 반영)
- [ ] 본인 번호로 예약 생성 → 알림톡 실수신 + `alimtalk_logs` status=sent 확인

## 이후 개선 후보 (오픈 후)

- [ ] 릴레이에 senderkey 화이트리스트 추가 (`ALLOWED_SENDER_KEYS`) — 공용 발송기 오남용 방지
- [ ] 알리고 잔액 부족 알림 설정 (A·B가 충전금액 공유 — B 오발송 시 A까지 잔액 부족 위험)
- [ ] `pre_visit`(예약 전날 안내) 자동 발송 스케줄러 구현 — 현재 "추후 지원" 상태
- [ ] 알림톡 실패 시 문자 대체발송(failover) 도입 검토 — 건당 8.4원 추가, 초기엔 불필요
- [ ] 월 발송량 5천 건 이상으로 성장 시 단가·구조 재검토 (현재 알리고 6.5원/건)

## 운영 리스크 메모

- 알리고 **충전 잔액·발송 이력·과금이 A 프로젝트와 공유**됨. DearPet 발송량은 `alimtalk_logs`로 추적 가능.
- Fly 릴레이 재배포 시 A 프로젝트 발송도 같은 앱을 타므로, 배포 후 A 정상 동작 확인 필수.
- static egress IP($3.60/월)는 이미 할당·알리고 등록 완료 — 추가 조치 불필요.
- 템플릿 본문 변경 시: `templates.ts` 수정 → 알리고 재검수 → 승인 후 배포 순서. 승인 전에 코드만 바꾸면 발송 전부 실패.

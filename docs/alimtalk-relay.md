# 알림톡 발송 — 알리고 릴레이 연동 가이드

알리고는 발신 서버 IP 등록이 필수인데 Vercel의 egress IP는 유동이다.
그래서 이 앱은 알리고를 직접 호출하지 않고, **고정 IP를 가진 릴레이 서버(Fly.io)** 를 거친다.

```
DearPet (Vercel) ──Bearer 토큰──▶ 릴레이 (Fly.io, static egress IP) ──▶ 알리고 알림톡 API
```

- 알리고 계정 정보(userid/apikey)는 **릴레이에만** 둔다. Vercel 쪽에는 릴레이 토큰과 senderkey만 둔다.
- 릴레이의 static egress IP를 알리고 관리자 → 발송 서버 IP에 등록한다.

## 1. DearPet(Vercel) 환경변수

| 변수 | 값 |
|---|---|
| `MESSAGING_PROVIDER` | `aligo` (그 외 값이면 시뮬레이션 모드) |
| `ALIMTALK_RELAY_URL` | 릴레이 발송 엔드포인트 (예: `https://my-relay.fly.dev/alimtalk`) |
| `ALIMTALK_RELAY_TOKEN` | 릴레이와 공유하는 임의의 긴 시크릿 |
| `ALIGO_SENDER_KEY` | DearPet 카카오채널 발신프로필 키 (알리고 관리자에서 확인) |

## 2. 릴레이 요청/응답 계약

앱 → 릴레이:

```http
POST {ALIMTALK_RELAY_URL}
Authorization: Bearer {ALIMTALK_RELAY_TOKEN}
Content-Type: application/json

{
  "senderKey": "발신프로필 키",
  "templateCode": "TX_1234",     // 알리고 tpl_code
  "phone": "01012345678",
  "message": "변수 치환이 끝난 최종 본문"
}
```

릴레이 → 앱:

```json
{ "ok": true }
{ "ok": false, "error": "알리고 오류 메시지" }
```

## 3. 릴레이 라우트 (기존 sportsbox-aligo-proxy Express 앱에 추가)

릴레이는 Fly.io의 `sportsbox-aligo-proxy` 앱(Express, `aligo-proxy/server.js`)을 공용으로 쓴다.
아래 라우트를 `server.js`에 추가한다. (Node 18 미만이면 `fetch` 대신 기존에 쓰는 axios/node-fetch로 교체)

```js
// 필요 env: RELAY_TOKEN, ALIGO_USER_ID, ALIGO_API_KEY, ALIGO_SENDER(알리고 등록 발신번호)
// ALIGO_USER_ID / ALIGO_API_KEY 는 기존 문자 발송에 쓰던 env가 있으면 그 이름을 그대로 사용
app.post("/alimtalk", express.json(), async (req, res) => {
  if (req.headers.authorization !== `Bearer ${process.env.RELAY_TOKEN}`) {
    return res.status(401).json({ ok: false, error: "unauthorized" });
  }

  const { senderKey, templateCode, phone, message } = req.body ?? {};
  if (!senderKey || !templateCode || !phone || !message) {
    return res.status(400).json({ ok: false, error: "invalid payload" });
  }

  const form = new URLSearchParams({
    apikey: process.env.ALIGO_API_KEY,
    userid: process.env.ALIGO_USER_ID,
    senderkey: senderKey,
    tpl_code: templateCode,
    sender: process.env.ALIGO_SENDER,
    receiver_1: phone,
    subject_1: "알림",
    message_1: message,
    // 알림톡 실패 시 문자 대체발송을 원하면 주석 해제 (건당 8.4원 추가)
    // failover: "Y",
    // fsubject_1: "알림",
    // fmessage_1: message,
  });

  try {
    const r = await fetch("https://kakaoapi.aligo.in/akv10/alimtalk/send/", {
      method: "POST",
      body: form,
    });
    const data = await r.json();
    // 알리고는 성공 시 code: 0 을 반환한다
    if (Number(data.code) === 0) return res.json({ ok: true });
    return res.json({ ok: false, error: `${data.code} ${data.message}` });
  } catch (e) {
    return res.status(502).json({ ok: false, error: String(e) });
  }
});
```

배포:

```sh
fly secrets set RELAY_TOKEN=<긴 임의 문자열> ALIGO_SENDER=<발신번호> -a sportsbox-aligo-proxy
fly deploy -a sportsbox-aligo-proxy
```

static egress IP는 이미 할당·등록되어 있음. 확인만:

```sh
fly machine egress-ip list -a sportsbox-aligo-proxy   # 이 IP가 알리고에 등록된 IP인지 확인
```

주의: static egress IP는 런타임 트래픽에만 적용된다. deploy/release 단계에서 알리고를 호출하지 말 것.

동작 확인 (템플릿 승인 후, 본인 번호로):

```sh
curl -X POST https://sportsbox-aligo-proxy.fly.dev/alimtalk \
  -H "Authorization: Bearer <RELAY_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"senderKey":"<senderkey>","templateCode":"<tpl_code>","phone":"010XXXXXXXX","message":"<승인 템플릿과 일치하는 본문>"}'
```

## 4. 카카오 템플릿 검수 등록

본문은 `src/lib/messaging/templates.ts` 의 `ALIMTALK_TEMPLATES` 와 **글자 단위로 일치**해야 한다.
알리고 관리자 → 알림톡 → 템플릿 등록에서 각 kind의 `body`를 제출하되,
변수 표기를 `{{변수}}` → `#{변수}` 로 바꿔 등록한다.

제출용 10종 전문은 `docs/alimtalk-templates-submission.md` 참고.

예) `basic`:

```
고객님,
#{shopName} 입니다.

[예약] 안내드립니다.

▷일시: #{visitDateTime}
▷반려동물명: #{petNames}
▷매장번호: #{shopPhone}

예약 변경·문의는 매장으로 연락 부탁드립니다.
```

예) `deposit` (예약금 안내 — 계좌번호/예약금/정책은 매장별 변수):

```
고객님,
∘#{shopName}∘ 입니다.

[예약금] 안내드립니다.

▷일시: #{visitDateTime}
▷반려동물명: #{petNames}
▷매장번호: #{shopPhone}

[예약금 안내]
계좌번호: #{bankAccount}
예약금: #{depositAmount}

#{depositPolicy}

반려견의 건강상태 또는 미용 트라우마가 있으면 미용 전 미리 말씀 부탁드립니다.
```

승인이 나면 발급된 tpl_code 를 `ALIGO_TEMPLATE_CODES` (templates.ts)에 kind별로 기입한다.
코드가 비어 있는 kind는 실발송 시 failed 처리된다.

앞으로 템플릿 본문을 바꿀 때는: templates.ts 수정 → 알리고에 새 템플릿(또는 수정) 검수 → 승인 후 코드 반영 순서로 진행해야 한다. 승인 전에 본문만 바꾸면 발송이 전부 실패한다.

## 5. 준비 체크리스트

- [ ] 알리고 관리자에서 DearPet용 카카오채널(발신프로필) 추가 → senderkey 확보
- [ ] 8종 템플릿 검수 등록 (senior/confirm 제외, `docs/alimtalk-templates-submission.md`) → 승인 후 tpl_code를 `ALIGO_TEMPLATE_CODES`에 기입
- [ ] 릴레이에 `/alimtalk` 엔드포인트 추가 (RELAY_TOKEN, ALIGO_USER_ID, ALIGO_API_KEY, ALIGO_SENDER)
- [ ] `fly machine egress-ip list` 로 static egress IP 확인 → 알리고 발송 서버 IP에 등록
- [ ] Vercel에 `MESSAGING_PROVIDER=aligo`, `ALIMTALK_RELAY_URL`, `ALIMTALK_RELAY_TOKEN`, `ALIGO_SENDER_KEY` 설정
- [ ] 알리고 testMode(`testmode_yn=Y`)로 1건 발송 확인 후 오픈

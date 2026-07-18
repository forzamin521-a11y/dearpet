# 알리고 템플릿 검수 제출용 8종

`src/lib/messaging/templates.ts`의 `ALIMTALK_TEMPLATES` 본문을 카카오 표기(`#{변수}`)로 변환한 것.
**아래 본문 그대로(공백·줄바꿈 포함 글자 단위 일치) 등록해야 한다.**
승인 후 발급된 tpl_code를 `ALIGO_TEMPLATE_CODES`(templates.ts)에 kind별로 기입할 것.

- senior(노령견 안내)는 노령견 동의서 발송(consent)으로, confirm(예약 접수)은 basic(기본 예약 안내)으로
  통합되어 **검수 제출 대상이 아니다.**
- 매장 자유 입력 변수(extraInfo)는 광고성 문구 유입 방지를 위해 전부 제거했다.
  매장이 값을 넣는 변수는 deposit의 계좌번호/예약금/정책 3개뿐이다.

| # | kind | 템플릿명(제안) | 용도 |
|---|------|---------------|------|
| 1 | basic | 디어펫_예약안내 | 예약 등록 시 발송 (디폴트 체크) |
| 2 | consent | 디어펫_동의서작성안내 | 동의서 서명 링크 발송 (노령견 포함) |
| 3 | deposit | 디어펫_예약금안내 | 예약금 계좌/정책 안내 |
| 4 | pre_visit | 디어펫_방문전날안내 | 전날 리마인드 (크론) |
| 5 | change | 디어펫_예약변경 | 예약 변경 자동 발송 |
| 6 | cancel | 디어펫_예약취소 | 예약 취소 자동 발송 |
| 7 | finishing | 디어펫_미용마무리 | 픽업 요청 |
| 8 | no_show | 디어펫_노쇼안내 | 노쇼 안내 |

---

## 1. basic — 기본 예약 안내

```
고객님,
#{shopName} 입니다.

[예약] 안내드립니다.

▷일시: #{visitDateTime}
▷반려동물명: #{petNames}
▷매장번호: #{shopPhone}

예약 변경·문의는 매장으로 연락 부탁드립니다.
```

## 2. consent — 동의서 작성 안내

```
■동의서 작성 안내■

고객님,
#{shopName}입니다.

원활한 서비스 제공을 위해 아래 링크를 눌러 매장 방문 전 동의서를 꼭 작성해 주세요.

▷예약 일시: #{visitDateTime}
▷반려동물명: #{petNames}
▷매장번호: #{shopPhone}

#{consentLink}
```

> 본문 내 URL 변수는 검수에서 반려될 수 있음. 반려되면 본문에서 `#{consentLink}` 줄을 빼고
> **버튼(웹링크형, WL)** 에 변수 URL을 넣는 방식으로 재제출 — 이 경우 templates.ts 본문도 동일하게 수정 필요.

## 3. deposit — 예약금 안내

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

## 4. pre_visit — 예약 사전(전날) 안내

```
고객님,
#{shopName} 입니다.

내일 예약 안내드립니다.

▷일시: #{visitDateTime}
▷반려동물명: #{petNames}
```

## 5. change — 예약 변경 안내

```
고객님,
#{shopName} 입니다.

예약이 변경되었습니다.

▷변경된 일시: #{visitDateTime}
▷반려동물명: #{petNames}
```

## 6. cancel — 예약 취소 안내

```
고객님,
#{shopName} 입니다.

예약이 취소되었습니다.

▷일시: #{visitDateTime}
▷반려동물명: #{petNames}
```

## 7. finishing — 미용 마무리 안내

```
고객님,
#{shopName} 입니다.

미용이 곧 마무리됩니다. 픽업 부탁드립니다.

▷반려동물명: #{petNames}
```

## 8. no_show — 노쇼 안내

```
고객님,
#{shopName} 입니다.

예약 시간에 방문하지 않으셔서 안내드립니다.

▷일시: #{visitDateTime}
```

---

## 등록 시 참고

- 카테고리: 정보성 메시지 (예약/주문 관련 안내). 광고성 문구가 없어야 승인이 빠르다.
- 승인 후: `ALIGO_TEMPLATE_CODES` 기입 → 릴레이/환경변수 세팅(`docs/alimtalk-relay.md` 체크리스트) → testMode 1건 확인 후 오픈.
- 본문을 바꾸고 싶으면 반드시 **재검수 승인 후** templates.ts를 수정할 것 (순서 틀리면 발송 전부 실패).

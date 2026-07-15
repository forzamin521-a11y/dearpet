# 🐩 DearPet — 애견미용 예약관리

애견미용 매장을 위한 예약 · 고객 · 매출 관리 웹앱.

- **스택**: Next.js 16 (App Router, TypeScript) · Supabase (Postgres/Auth/RLS) · Tailwind CSS v4 + shadcn/ui · Vercel
- **역할 구조**: 슈퍼관리자(매장 가입 승인) → 매장관리자(원장) → 실장(권한 플래그: 등록/변경/취소/삭제/통계)
- 전체 기획은 [PLAN.md](./PLAN.md), 레퍼런스 스크린샷은 `reference/` 참고

## 주요 기능

- **예약 캘린더**: 담당자별 세로 열 일간 뷰 + 주간 뷰, 빈 시간 클릭 → 예약 등록
- **예약 모달**: 고객 자동완성(호칭/펫이름), 미용견 추가, 상품 선택 시 종료시간 자동 계산, 노령견(7세↑) 자동 감지, 담당자 시간 겹침 경고
- **상태 관리**: 예약→도착→마무리→완료/취소/노쇼/삭제, 상태별 색상 표시
- **완료 시 매출 자동 등록**: 결제수단(현금/카드/이체)만 선택하면 상품 금액으로 매출 생성
- **매출 통계**: 기간/담당자 필터, 결제수단 도넛 차트, 수동 등록/수정, CSV 다운로드
- **알림톡**: 기본/노령견/동의서 선택 발송 + 상황별(접수/변경/취소/마무리/노쇼) 자동 발송 — 현재는 시뮬레이션 모드(발송 이력만 기록), `src/lib/messaging/provider.ts`에 실제 대행사(솔라피 등) Provider만 구현하면 실발송 전환
- **동의서**: 템플릿 편집 + 고객용 모바일 서명 페이지(`/consent/[토큰]`)

## 로컬 실행

### 1. Supabase 프로젝트 준비

1. [supabase.com](https://supabase.com/dashboard)에서 새 프로젝트 생성
2. **SQL Editor**에서 `supabase/migrations/00001_initial_schema.sql` 내용 전체를 붙여넣고 실행

### 2. 환경변수

`.env.example`을 `.env.local`로 복사 후 값 입력:

| 변수 | 값 |
|------|-----|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 같은 화면의 `anon` `public` 키 |
| `SUPABASE_SERVICE_ROLE_KEY` | 같은 화면의 `service_role` 키 (절대 노출 금지) |
| `SUPER_ADMIN_EMAIL` | 이 이메일로 가입하면 슈퍼관리자가 됨 |
| `NEXT_PUBLIC_APP_URL` | 로컬은 `http://localhost:3000`, 배포 후엔 배포 주소 |

### 3. 실행

```bash
npm install
npm run dev
```

### 4. 첫 계정 만들기

1. `/signup`에서 **`SUPER_ADMIN_EMAIL`과 같은 이메일**로 가입 → 슈퍼관리자 계정 생성, `/admin` 이동
2. 다른 이메일로 매장 가입 신청 → 슈퍼관리자가 `/admin`에서 **승인**
3. 매장관리자로 로그인 → 설정에서 미용 상품/계정(실장)/알림톡/동의서 구성 → 예약 시작

## Vercel 배포

1. GitHub 리포지토리를 Vercel에 Import
2. Environment Variables에 위 5개 환경변수 등록 (`NEXT_PUBLIC_APP_URL`은 배포 도메인으로)
3. Deploy

## 프로젝트 구조

```
supabase/migrations/   DB 스키마 + RLS (Supabase SQL Editor에서 실행)
src/app/(auth)/        로그인 / 매장 가입 / 승인 대기
src/app/admin/         슈퍼관리자 매장 승인
src/app/(app)/         예약 캘린더 · 고객 · 매출 · 설정
src/app/consent/       고객용 동의서 서명 페이지 (공개)
src/lib/actions/       서버 액션 (auth/settings/customers/reservations/sales/messaging)
src/lib/messaging/     알림톡 Provider (Fake → 추후 솔라피 교체)
```

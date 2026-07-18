-- 예약금 안내 알림톡 (1/2): alimtalk_kind enum에 'deposit' 값 추가.
-- 주의: enum 값 추가와 사용은 같은 트랜잭션에서 불가능하므로
-- 기본 행 생성/시드 함수 갱신은 00004에서 진행한다.

alter type alimtalk_kind add value if not exists 'deposit' before 'pre_visit';

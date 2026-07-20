-- 반려동물 정보 단순화:
-- 생년월일(정확한 날짜를 모르는 경우가 많음) 대신 나이(년)를 직접 입력받는다.
-- 중성화 여부 대신, 미용 시 실무적으로 더 중요한 마킹(영역표시) 여부를 받는다.
-- (기존 값은 자동 환산하지 않는다 — 생년월일→나이 환산은 매장에서 다시 확인해야 정확하다)

alter table pets add column age_years int;
alter table pets add column marking boolean;

alter table pets drop column birth_date;
alter table pets drop column neutered;

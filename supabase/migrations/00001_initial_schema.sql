-- =====================================================================
-- DearPet 초기 스키마
-- 실행 방법: Supabase 대시보드 → SQL Editor에 붙여넣기 실행
--           또는 `npx supabase db push`
-- =====================================================================

-- ---------- ENUM ----------
create type user_role as enum ('super_admin', 'owner', 'staff');
create type shop_status as enum ('pending', 'approved', 'suspended');
create type reservation_status as enum
  ('reserved', 'arrived', 'finishing', 'completed', 'canceled', 'no_show', 'deleted');
create type pet_species as enum ('dog', 'cat');
create type alimtalk_kind as enum
  ('basic',      -- 기본 예약 안내
   'senior',     -- 노령견 안내
   'consent',    -- 동의서 작성 안내
   'confirm',    -- 예약 접수 안내
   'pre_visit',  -- 예약 사전 안내
   'change',     -- 예약 변경 안내
   'cancel',     -- 예약 취소 안내
   'finishing',  -- 예약 마무리 안내
   'no_show');   -- 노쇼 안내

-- ---------- 매장 ----------
create table shops (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  address     text not null default '',
  phone       text not null default '',
  business_hours text not null default '월~토 / 10:00~20:00',
  open_time   time not null default '10:00',
  close_time  time not null default '20:00',
  closed_days text not null default '일요일',
  intro       text not null default '',
  logo_url    text,
  status      shop_status not null default 'pending',
  -- 예약 박스 내 노출 정보 설정
  box_settings jsonb not null default '{"align":"left","fields":{"customerName":true,"time":true,"petName":true,"breed":true,"product":true,"memo":true}}',
  created_at  timestamptz not null default now()
);

-- ---------- 사용자 프로필 (auth.users 1:1) ----------
create table profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  shop_id    uuid references shops (id) on delete cascade,
  role       user_role not null default 'staff',
  name       text not null,
  phone      text not null default '',
  emoji      text not null default '💜',   -- 캘린더 담당자 열 표시용
  color      text not null default '#7C3AED',
  memo       text not null default '',
  -- 실장 권한 플래그 (owner/super_admin은 무시하고 전부 허용)
  permissions jsonb not null default '{"create":true,"update":true,"cancel":true,"delete":false,"stats":false}',
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- 고객 / 반려동물 ----------
create table customers (
  id         uuid primary key default gen_random_uuid(),
  shop_id    uuid not null references shops (id) on delete cascade,
  name       text not null,                       -- 보호자 호칭
  phones     text[] not null default '{}',
  alimtalk_opt_in boolean not null default true,
  memo       text not null default '',
  created_at timestamptz not null default now()
);

create table pets (
  id          uuid primary key default gen_random_uuid(),
  shop_id     uuid not null references shops (id) on delete cascade,
  customer_id uuid not null references customers (id) on delete cascade,
  name        text not null,
  species     pet_species not null default 'dog',
  breed       text not null default '',
  weight_kg   numeric(5,2),
  birth_date  date,
  neutered    boolean,
  memo        text not null default '',
  created_at  timestamptz not null default now()
);

-- ---------- 미용 상품 ----------
create table grooming_products (
  id          uuid primary key default gen_random_uuid(),
  shop_id     uuid not null references shops (id) on delete cascade,
  name        text not null,           -- 예: 전체미용, 목욕, 스포팅
  description text not null default '',
  emoji       text not null default '🐶',
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);

create table product_options (
  id               uuid primary key default gen_random_uuid(),
  product_id       uuid not null references grooming_products (id) on delete cascade,
  shop_id          uuid not null references shops (id) on delete cascade,
  name             text not null,      -- 예: 소형견 4kg
  duration_minutes int not null default 90,
  price            int,                -- null = 가격 미설정
  min_weight_kg    numeric(5,2),
  max_weight_kg    numeric(5,2),
  sort_order       int not null default 0,
  created_at       timestamptz not null default now()
);

-- ---------- 예약 ----------
create table reservations (
  id          uuid primary key default gen_random_uuid(),
  shop_id     uuid not null references shops (id) on delete cascade,
  customer_id uuid not null references customers (id) on delete cascade,
  staff_id    uuid references profiles (id) on delete set null,  -- 담당자
  date        date not null,
  start_time  time not null,
  end_time    time not null,
  status      reservation_status not null default 'reserved',
  memo        text not null default '',
  created_by  uuid references profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 예약에 포함된 미용견 + 선택 상품
create table reservation_pets (
  id                uuid primary key default gen_random_uuid(),
  reservation_id    uuid not null references reservations (id) on delete cascade,
  pet_id            uuid not null references pets (id) on delete cascade,
  product_option_id uuid references product_options (id) on delete set null,
  price             int,                      -- 예약 시점 가격 스냅샷
  addons            jsonb not null default '[]',  -- [{"name":"얼컷","price":5000}]
  created_at        timestamptz not null default now()
);

-- ---------- 매출 ----------
create table sales (
  id              uuid primary key default gen_random_uuid(),
  shop_id         uuid not null references shops (id) on delete cascade,
  reservation_id  uuid references reservations (id) on delete set null,
  customer_id     uuid references customers (id) on delete set null,
  staff_id        uuid references profiles (id) on delete set null,
  sale_date       date not null default current_date,
  items           jsonb not null default '[]',  -- [{"petName":"솜이","description":"전체미용> 소형견 4kg, 추가> 얼컷","amount":50000}]
  total_amount    int not null default 0,
  cash_amount     int not null default 0,
  card_amount     int not null default 0,
  transfer_amount int not null default 0,
  memo            text not null default '',
  created_at      timestamptz not null default now()
);

-- ---------- 알림톡 ----------
create table alimtalk_templates (
  id         uuid primary key default gen_random_uuid(),
  shop_id    uuid not null references shops (id) on delete cascade,
  kind       alimtalk_kind not null,
  content    text not null default '',
  enabled    boolean not null default true,   -- 상황별 자동발송 사용 여부
  created_at timestamptz not null default now(),
  unique (shop_id, kind)
);

create table alimtalk_logs (
  id             uuid primary key default gen_random_uuid(),
  shop_id        uuid not null references shops (id) on delete cascade,
  reservation_id uuid references reservations (id) on delete set null,
  customer_id    uuid references customers (id) on delete set null,
  phone          text not null,
  kind           alimtalk_kind not null,
  content        text not null,
  status         text not null default 'simulated',  -- simulated | sent | failed
  created_at     timestamptz not null default now()
);

-- ---------- 동의서 ----------
create table consent_forms (
  id         uuid primary key default gen_random_uuid(),
  shop_id    uuid not null references shops (id) on delete cascade,
  title      text not null,             -- 예: 미용 동의서, 노령견 미용 동의서
  content    text not null default '',  -- {{shopName}} {{dispPet}} {{dispCustomer}} {{visitDateTime}} 치환
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table consent_submissions (
  id              uuid primary key default gen_random_uuid(),
  shop_id         uuid not null references shops (id) on delete cascade,
  consent_form_id uuid not null references consent_forms (id) on delete cascade,
  reservation_id  uuid references reservations (id) on delete set null,
  customer_id     uuid not null references customers (id) on delete cascade,
  pet_id          uuid references pets (id) on delete set null,
  token           uuid not null unique default gen_random_uuid(),  -- 공개 서명 링크용
  status          text not null default 'pending',  -- pending | signed
  signer_name     text,
  signature_url   text,
  signed_at       timestamptz,
  created_at      timestamptz not null default now()
);

-- ---------- 날짜별 메모 ----------
create table daily_memos (
  id         uuid primary key default gen_random_uuid(),
  shop_id    uuid not null references shops (id) on delete cascade,
  date       date not null,
  memo       text not null default '',
  unique (shop_id, date)
);

-- ---------- 인덱스 ----------
create index idx_profiles_shop on profiles (shop_id);
create index idx_customers_shop on customers (shop_id);
create index idx_customers_name on customers (shop_id, name);
create index idx_pets_customer on pets (customer_id);
create index idx_pets_shop_name on pets (shop_id, name);
create index idx_reservations_shop_date on reservations (shop_id, date);
create index idx_reservation_pets_reservation on reservation_pets (reservation_id);
create index idx_sales_shop_date on sales (shop_id, sale_date);
create index idx_alimtalk_logs_shop on alimtalk_logs (shop_id, created_at);
create index idx_consent_submissions_token on consent_submissions (token);

-- ---------- updated_at 트리거 ----------
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger trg_reservations_updated
  before update on reservations
  for each row execute function set_updated_at();

-- =====================================================================
-- RLS (Row Level Security)
-- =====================================================================

-- 현재 사용자의 shop_id
create or replace function current_shop_id()
returns uuid language sql stable security definer set search_path = public as $$
  select shop_id from profiles where id = auth.uid();
$$;

-- 현재 사용자의 역할
create or replace function current_role_of()
returns user_role language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid();
$$;

create or replace function is_super_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select role from profiles where id = auth.uid()) = 'super_admin', false);
$$;

-- 같은 매장 소속 여부
create or replace function is_shop_member(target_shop uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select is_super_admin() or current_shop_id() = target_shop;
$$;

-- 실장 권한 체크 (owner는 항상 true)
create or replace function has_permission(perm text)
returns boolean language sql stable security definer set search_path = public as $$
  select case
    when (select role from profiles where id = auth.uid()) in ('owner', 'super_admin') then true
    else coalesce(((select permissions from profiles where id = auth.uid()) ->> perm)::boolean, false)
  end;
$$;

alter table shops enable row level security;
alter table profiles enable row level security;
alter table customers enable row level security;
alter table pets enable row level security;
alter table grooming_products enable row level security;
alter table product_options enable row level security;
alter table reservations enable row level security;
alter table reservation_pets enable row level security;
alter table sales enable row level security;
alter table alimtalk_templates enable row level security;
alter table alimtalk_logs enable row level security;
alter table consent_forms enable row level security;
alter table consent_submissions enable row level security;
alter table daily_memos enable row level security;

-- shops
create policy shops_select on shops for select
  using (is_shop_member(id));
create policy shops_update on shops for update
  using (is_super_admin() or (current_shop_id() = id and current_role_of() = 'owner'));

-- profiles: 본인 + 같은 매장 조회, 본인 수정, owner가 매장 직원 관리
create policy profiles_select on profiles for select
  using (id = auth.uid() or is_shop_member(shop_id));
create policy profiles_update_self on profiles for update
  using (id = auth.uid());
create policy profiles_update_by_owner on profiles for update
  using (is_super_admin() or (shop_id = current_shop_id() and current_role_of() = 'owner'));
create policy profiles_delete_by_owner on profiles for delete
  using (is_super_admin() or (shop_id = current_shop_id() and current_role_of() = 'owner'));

-- 매장 데이터 공통 정책 (고객/펫/상품/옵션/템플릿/동의서/메모)
create policy customers_all on customers for all
  using (is_shop_member(shop_id)) with check (is_shop_member(shop_id));
create policy pets_all on pets for all
  using (is_shop_member(shop_id)) with check (is_shop_member(shop_id));
create policy grooming_products_all on grooming_products for all
  using (is_shop_member(shop_id)) with check (is_shop_member(shop_id));
create policy product_options_all on product_options for all
  using (is_shop_member(shop_id)) with check (is_shop_member(shop_id));
create policy alimtalk_templates_all on alimtalk_templates for all
  using (is_shop_member(shop_id)) with check (is_shop_member(shop_id));
create policy alimtalk_logs_all on alimtalk_logs for all
  using (is_shop_member(shop_id)) with check (is_shop_member(shop_id));
create policy consent_forms_all on consent_forms for all
  using (is_shop_member(shop_id)) with check (is_shop_member(shop_id));
create policy consent_submissions_all on consent_submissions for all
  using (is_shop_member(shop_id)) with check (is_shop_member(shop_id));
create policy daily_memos_all on daily_memos for all
  using (is_shop_member(shop_id)) with check (is_shop_member(shop_id));

-- 예약: 조회는 매장 전체, 쓰기는 권한 플래그별
create policy reservations_select on reservations for select
  using (is_shop_member(shop_id));
create policy reservations_insert on reservations for insert
  with check (is_shop_member(shop_id) and has_permission('create'));
create policy reservations_update on reservations for update
  using (is_shop_member(shop_id) and (has_permission('update') or has_permission('cancel')));
create policy reservations_delete on reservations for delete
  using (is_shop_member(shop_id) and has_permission('delete'));

create policy reservation_pets_all on reservation_pets for all
  using (exists (select 1 from reservations r where r.id = reservation_id and is_shop_member(r.shop_id)))
  with check (exists (select 1 from reservations r where r.id = reservation_id and is_shop_member(r.shop_id)));

-- 매출: 조회는 통계 권한, 쓰기는 매장 구성원 (완료 처리 시 자동 등록을 위해)
create policy sales_select on sales for select
  using (is_shop_member(shop_id) and has_permission('stats'));
create policy sales_insert on sales for insert
  with check (is_shop_member(shop_id));
create policy sales_update on sales for update
  using (is_shop_member(shop_id) and has_permission('stats'));
create policy sales_delete on sales for delete
  using (is_shop_member(shop_id) and has_permission('stats'));

-- =====================================================================
-- 신규 매장 기본 데이터 (템플릿/동의서) 생성 함수 — 가입 시 서버에서 호출
-- =====================================================================
create or replace function seed_shop_defaults(p_shop_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into alimtalk_templates (shop_id, kind, content, enabled) values
    (p_shop_id, 'basic',    E'고객님,\n{{shopName}} 입니다.\n\n[예약] 안내드립니다.\n\n▷일시: {{visitDateTime}}\n▷반려동물명: {{petNames}}\n▷매장번호: {{shopPhone}}', true),
    (p_shop_id, 'senior',   E'고객님,\n{{shopName}} 입니다.\n\n노령견 미용 안내드립니다.\n7세 이상 반려동물은 미용 전 건강 상태를 꼭 알려주세요.\n\n▷일시: {{visitDateTime}}\n▷반려동물명: {{petNames}}', true),
    (p_shop_id, 'consent',  E'■동의서 작성 안내■\n\n고객님,\n{{shopName}}입니다.\n\n원활한 서비스 제공을 위해 아래 \'동의서 작성\' 버튼을 눌러 매장 방문 전 꼭 작성해 주세요.\n\n▷예약 일시: {{visitDateTime}}\n▷반려동물명: {{petNames}}\n▷매장번호: {{shopPhone}}\n\n{{consentLink}}', true),
    (p_shop_id, 'confirm',  E'고객님,\n{{shopName}} 입니다.\n\n예약이 접수되었습니다.\n\n▷일시: {{visitDateTime}}\n▷반려동물명: {{petNames}}', true),
    (p_shop_id, 'pre_visit',E'고객님,\n{{shopName}} 입니다.\n\n내일 예약 안내드립니다.\n\n▷일시: {{visitDateTime}}\n▷반려동물명: {{petNames}}', false),
    (p_shop_id, 'change',   E'고객님,\n{{shopName}} 입니다.\n\n예약이 변경되었습니다.\n\n▷변경된 일시: {{visitDateTime}}\n▷반려동물명: {{petNames}}', false),
    (p_shop_id, 'cancel',   E'고객님,\n{{shopName}} 입니다.\n\n예약이 취소되었습니다.\n\n▷일시: {{visitDateTime}}\n▷반려동물명: {{petNames}}', true),
    (p_shop_id, 'finishing',E'고객님,\n{{shopName}} 입니다.\n\n미용이 곧 마무리됩니다. 픽업 부탁드립니다.\n\n▷반려동물명: {{petNames}}', true),
    (p_shop_id, 'no_show',  E'고객님,\n{{shopName}} 입니다.\n\n예약 시간에 방문하지 않으셔서 안내드립니다.\n\n▷일시: {{visitDateTime}}', false)
  on conflict (shop_id, kind) do nothing;

  insert into consent_forms (shop_id, title, content, sort_order) values
    (p_shop_id, '미용 동의서',
E'매장명 : {{shopName}}\n반려동물 정보 : {{dispPet}}\n보호자 정보 : {{dispCustomer}}\n서비스 이용일 : {{visitDateTime}}\n\n본 매장은 애견미용을 의뢰하신 반려동물을 미용함에 있어 소홀함 없이 최대한 배려하여 미용할 것을 약속드립니다.\n털이 길거나 엉킴이 심한 경우, 겁이 많아서 공격성이 있거나, 사나운 반려동물들은 추가금이 있습니다.\n짧은 기계 미용과, 많은 털 엉킴이 있었을 경우 미용 후 자극이 와서 긁거나 핥을 수 있습니다.\n반려견의 피부는 사람에 비해 약하기 때문에, 미용 후 긁거나 핥으면 상처가 나거나 진물이 나는 경우가 있습니다.\n일시적으로 미용 스트레스가 올 수 있으나 대부분 2~5일 후 점차 사라지게 됩니다.\n\n위 내용을 숙지하고 매장 이용에 동의합니다.', 0),
    (p_shop_id, '노령견 미용 동의서',
E'매장명 : {{shopName}}\n반려동물 정보 : {{dispPet}}\n보호자 정보 : {{dispCustomer}}\n서비스 이용일 : {{visitDateTime}}\n\n본 매장은 미용 반려동물의 나이가 7세 이상이거나, 질병 또는 수술 경험이 있는 반려동물의 건강상태를 고려하여 안내사항을 말씀드리며, 이용 동의서를 받고자 합니다.\n보호자는 반려동물의 미용을 매장에 위탁함에 있어 이용 중 반려동물이 보유하고 있는 각종 질병이나 노환으로 인한 돌발사태가 발생할 경우 매장에 일체의 민형사상의 법적책임을 묻지 않을 것을 동의하고 동의서를 서명하여 제출합니다.\n단, 본 매장은 위 사항을 제외하고는 의뢰 받은 반려동물의 미용 행위를 수행함에 있어 최선을 다해 서비스를 제공할 것을 약속합니다.\n\n위 내용을 숙지하고 매장 이용에 동의합니다.', 1);
end $$;

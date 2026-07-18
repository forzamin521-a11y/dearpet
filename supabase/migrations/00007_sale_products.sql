-- 판매 상품 (매출 등록용):
-- 예약용 미용 서비스(services, 소요시간)와 별개로,
-- 매출 등록 화면에서 선택하는 카테고리>상품(가격) 목록.

create table sale_product_categories (
  id         uuid primary key default gen_random_uuid(),
  shop_id    uuid not null references shops (id) on delete cascade,
  name       text not null,
  sort_order int  not null default 0,
  created_at timestamptz not null default now()
);

create table sale_products (
  id          uuid primary key default gen_random_uuid(),
  shop_id     uuid not null references shops (id) on delete cascade,
  category_id uuid not null references sale_product_categories (id) on delete cascade,
  name        text not null,
  price       int  not null default 0,
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now()
);

create index idx_sale_products_shop on sale_products (shop_id, category_id);

alter table sale_product_categories enable row level security;
alter table sale_products enable row level security;
create policy sale_product_categories_all on sale_product_categories for all
  using (is_shop_member(shop_id)) with check (is_shop_member(shop_id));
create policy sale_products_all on sale_products for all
  using (is_shop_member(shop_id)) with check (is_shop_member(shop_id));

-- ---------- 기본 판매 상품 시드 ----------
create or replace function seed_sale_products(p_shop_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  cat_id uuid;
begin
  if exists (select 1 from sale_product_categories where shop_id = p_shop_id) then
    return;
  end if;

  insert into sale_product_categories (shop_id, name, sort_order)
    values (p_shop_id, '목욕', 0) returning id into cat_id;
  insert into sale_products (shop_id, category_id, name, price, sort_order) values
    (p_shop_id, cat_id, '목욕> 🟧소형견 4kg',  20000, 0),
    (p_shop_id, cat_id, '목욕> 🟧소형견 6kg',  25000, 1),
    (p_shop_id, cat_id, '목욕> 🟧소형견 8kg',  30000, 2),
    (p_shop_id, cat_id, '목욕> 🟩중형견 4kg',  25000, 3),
    (p_shop_id, cat_id, '목욕> 🟩중형견 6kg',  30000, 4),
    (p_shop_id, cat_id, '목욕> 🟩중형견 8kg',  35000, 5),
    (p_shop_id, cat_id, '목욕> 🟩중형견 10kg', 40000, 6),
    (p_shop_id, cat_id, '목욕> 🟥특수견 4kg',  30000, 7),
    (p_shop_id, cat_id, '목욕> 🟥특수견 6kg',  35000, 8),
    (p_shop_id, cat_id, '목욕> 🟥특수견 8kg',  40000, 9),
    (p_shop_id, cat_id, '목욕> 🟥특수견 10kg', 45000, 10);

  insert into sale_product_categories (shop_id, name, sort_order)
    values (p_shop_id, '부분+목욕', 1) returning id into cat_id;
  insert into sale_products (shop_id, category_id, name, price, sort_order) values
    (p_shop_id, cat_id, '위생미용>발등',            5000,  0),
    (p_shop_id, cat_id, '위생미용> 🟧소형견',       15000, 1),
    (p_shop_id, cat_id, '위생미용> 🟩중형견',       20000, 2),
    (p_shop_id, cat_id, '위생미용> 🟥특수견',       25000, 3),
    (p_shop_id, cat_id, '부분+목욕> 🟧소형견 4kg',  25000, 4),
    (p_shop_id, cat_id, '부분+목욕> 🟧소형견 6kg',  30000, 5),
    (p_shop_id, cat_id, '부분+목욕> 🟧소형견 8kg',  35000, 6),
    (p_shop_id, cat_id, '부분+목욕> 🟩중형견 4kg',  30000, 7),
    (p_shop_id, cat_id, '부분+목욕> 🟩중형견 6kg',  35000, 8),
    (p_shop_id, cat_id, '부분+목욕> 🟩중형견 8kg',  40000, 9),
    (p_shop_id, cat_id, '부분+목욕> 🟩중형견 10kg', 45000, 10),
    (p_shop_id, cat_id, '부분+목욕> 🟥특수견 4kg',  35000, 11),
    (p_shop_id, cat_id, '부분+목욕> 🟥특수견 6kg',  40000, 12),
    (p_shop_id, cat_id, '부분+목욕> 🟥특수견 8kg',  45000, 13),
    (p_shop_id, cat_id, '부분+목욕> 🟥특수견 10kg', 50000, 14);

  insert into sale_product_categories (shop_id, name, sort_order)
    values (p_shop_id, '전체미용', 2) returning id into cat_id;
  insert into sale_products (shop_id, category_id, name, price, sort_order) values
    (p_shop_id, cat_id, '전체미용> 🟧소형견 4kg',  40000, 0),
    (p_shop_id, cat_id, '전체미용> 🟧소형견 6kg',  45000, 1),
    (p_shop_id, cat_id, '전체미용> 🟧소형견 8kg',  50000, 2),
    (p_shop_id, cat_id, '전체미용> 🟩중형견 4kg',  45000, 3),
    (p_shop_id, cat_id, '전체미용> 🟩중형견 6kg',  50000, 4),
    (p_shop_id, cat_id, '전체미용> 🟩중형견 8kg',  55000, 5),
    (p_shop_id, cat_id, '전체미용> 🟩중형견 10kg', 60000, 6),
    (p_shop_id, cat_id, '전체미용> 🟥특수견 4kg',  50000, 7),
    (p_shop_id, cat_id, '전체미용> 🟥특수견 6kg',  55000, 8),
    (p_shop_id, cat_id, '전체미용> 🟥특수견 8kg',  60000, 9),
    (p_shop_id, cat_id, '전체미용> 🟥특수견 10kg', 65000, 10);

  insert into sale_product_categories (shop_id, name, sort_order)
    values (p_shop_id, '스포팅', 3) returning id into cat_id;
  insert into sale_products (shop_id, category_id, name, price, sort_order) values
    (p_shop_id, cat_id, '스포팅> 🟧소형견 4kg',  60000, 0),
    (p_shop_id, cat_id, '스포팅> 🟧소형견 6kg',  65000, 1),
    (p_shop_id, cat_id, '스포팅> 🟧소형견 8kg',  70000, 2),
    (p_shop_id, cat_id, '스포팅> 🟩중형견 4kg',  65000, 3),
    (p_shop_id, cat_id, '스포팅> 🟩중형견 6kg',  70000, 4),
    (p_shop_id, cat_id, '스포팅> 🟩중형견 8kg',  75000, 5),
    (p_shop_id, cat_id, '스포팅> 🟩중형견 10kg', 80000, 6),
    (p_shop_id, cat_id, '스포팅> 🟥특수견 4kg',  75000, 7),
    (p_shop_id, cat_id, '스포팅> 🟥특수견 6kg',  80000, 8),
    (p_shop_id, cat_id, '스포팅> 🟥특수견 8kg',  85000, 9),
    (p_shop_id, cat_id, '스포팅> 🟥특수견 10kg', 90000, 10);

  insert into sale_product_categories (shop_id, name, sort_order)
    values (p_shop_id, '전체가위컷', 4) returning id into cat_id;
  insert into sale_products (shop_id, category_id, name, price, sort_order) values
    (p_shop_id, cat_id, '전체가위컷> 🟧소형견 4kg',  70000,  0),
    (p_shop_id, cat_id, '전체가위컷> 🟧소형견 6kg',  75000,  1),
    (p_shop_id, cat_id, '전체가위컷> 🟧소형견 8kg',  80000,  2),
    (p_shop_id, cat_id, '전체가위컷> 🟩중형견 4kg',  75000,  3),
    (p_shop_id, cat_id, '전체가위컷> 🟩중형견 6kg',  80000,  4),
    (p_shop_id, cat_id, '전체가위컷> 🟩중형견 8kg',  85000,  5),
    (p_shop_id, cat_id, '전체가위컷> 🟩중형견 10kg', 90000,  6),
    (p_shop_id, cat_id, '전체가위컷> 🟥특수견 4kg',  85000,  7),
    (p_shop_id, cat_id, '전체가위컷> 🟥특수견 6kg',  90000,  8),
    (p_shop_id, cat_id, '전체가위컷> 🟥특수견 8kg',  95000,  9),
    (p_shop_id, cat_id, '전체가위컷> 🟥특수견 10kg', 100000, 10);

  insert into sale_product_categories (shop_id, name, sort_order)
    values (p_shop_id, '추가비용', 5) returning id into cat_id;
  insert into sale_products (shop_id, category_id, name, price, sort_order) values
    (p_shop_id, cat_id, '추가> 얼컷',          5000,  0),
    (p_shop_id, cat_id, '추가> 클리핑6mm',     5000,  1),
    (p_shop_id, cat_id, '추가> 클리핑1cm',     10000, 2),
    (p_shop_id, cat_id, '추가> 이중모(모량)',  5000,  3),
    (p_shop_id, cat_id, '추가> 엉킴',          5000,  4),
    (p_shop_id, cat_id, '추가> 기장(3cm미만)', 5000,  5),
    (p_shop_id, cat_id, '추가> 슬리퍼',        5000,  6),
    (p_shop_id, cat_id, '추가> 장화,방울',     10000, 7),
    (p_shop_id, cat_id, '추가> 몸무게',        5000,  8),
    (p_shop_id, cat_id, '추가> 양치',          3000,  9),
    (p_shop_id, cat_id, '추가> 라이언컷',      20000, 10),
    (p_shop_id, cat_id, '추가> 예약금',        20000, 11),
    (p_shop_id, cat_id, '추가> 엉덩이정리',    10000, 12),
    (p_shop_id, cat_id, '추가> 미용매너',      5000,  13);

  insert into sale_product_categories (shop_id, name, sort_order)
    values (p_shop_id, '위생추가비용', 6) returning id into cat_id;
  insert into sale_products (shop_id, category_id, name, price, sort_order) values
    (p_shop_id, cat_id, '위생추가> 발톱 🟩소형,중형',           5000,  0),
    (p_shop_id, cat_id, '위생추가> 발톱 🟥대형',                10000, 1),
    (p_shop_id, cat_id, '위생추가> 발바닥 🟧소형,중형',         8000,  2),
    (p_shop_id, cat_id, '위생추가> 발바닥 🟥대형',              15000, 3),
    (p_shop_id, cat_id, '위생추가> 발톱,발바닥,발등 소형,중형', 15000, 4),
    (p_shop_id, cat_id, '위생추가> 발톱,발바닥,발등 대형',      30000, 5),
    (p_shop_id, cat_id, '위생추가> 눈가,입가',                  3000,  6),
    (p_shop_id, cat_id, '귀청소',                               5000,  7);

  insert into sale_product_categories (shop_id, name, sort_order)
    values (p_shop_id, '특별관리', 7) returning id into cat_id;
  insert into sale_products (shop_id, category_id, name, price, sort_order) values
    (p_shop_id, cat_id, '약용샴푸',   5000,  0),
    (p_shop_id, cat_id, '아로마스파', 10000, 1),
    (p_shop_id, cat_id, '머드팩',     20000, 2);

  insert into sale_product_categories (shop_id, name, sort_order)
    values (p_shop_id, '호텔', 8) returning id into cat_id;
  insert into sale_products (shop_id, category_id, name, price, sort_order) values
    (p_shop_id, cat_id, '호텔> 🟧소형',                40000, 0),
    (p_shop_id, cat_id, '호텔> 🟩중형',                45000, 1),
    (p_shop_id, cat_id, '호텔> 12h 초과시 시간당 🟧',  2000,  2),
    (p_shop_id, cat_id, '호텔> 12h 초과시 시간당 🟩',  3000,  3),
    (p_shop_id, cat_id, '돌봄비',                      3000,  4);

  insert into sale_product_categories (shop_id, name, sort_order)
    values (p_shop_id, '기타', 9) returning id into cat_id;
  insert into sale_products (shop_id, category_id, name, price, sort_order) values
    (p_shop_id, cat_id, '예약금', 20000, 0);
end $$;

-- 기존 매장에 시드
select seed_sale_products(id) from shops;

-- 신규 매장 시드 함수에 판매 상품 포함
create or replace function seed_shop_defaults(p_shop_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into alimtalk_templates (shop_id, kind, enabled) values
    (p_shop_id, 'basic',     true),
    (p_shop_id, 'senior',    true),
    (p_shop_id, 'consent',   true),
    (p_shop_id, 'confirm',   true),
    (p_shop_id, 'deposit',   false),
    (p_shop_id, 'pre_visit', false),
    (p_shop_id, 'change',    false),
    (p_shop_id, 'cancel',    true),
    (p_shop_id, 'finishing', true),
    (p_shop_id, 'no_show',   false)
  on conflict (shop_id, kind) do nothing;

  insert into services (shop_id, name, emoji, duration_minutes, sort_order)
  select p_shop_id, v.name, v.emoji, v.dur, v.ord
  from (values
    ('목욕',            '🛁', 30,  0),
    ('목욕+얼컷',       '🫧', 60,  1),
    ('부분+목욕',       '🐾', 60,  2),
    ('부분+목욕+얼컷',  '😊', 60,  3),
    ('전체미용',        '🐶', 120, 4),
    ('스포팅',          '🐩', 180, 5),
    ('전체가위컷',      '✂️', 180, 6)
  ) as v(name, emoji, dur, ord)
  where not exists (select 1 from services e where e.shop_id = p_shop_id);

  perform seed_sale_products(p_shop_id);

  insert into consent_forms (shop_id, title, content, sort_order) values
    (p_shop_id, '미용 동의서',
E'매장명 : {{shopName}}\n반려동물 정보 : {{dispPet}}\n보호자 정보 : {{dispCustomer}}\n서비스 이용일 : {{visitDateTime}}\n\n본 매장은 애견미용을 의뢰하신 반려동물을 미용함에 있어 소홀함 없이 최대한 배려하여 미용할 것을 약속드립니다.\n털이 길거나 엉킴이 심한 경우, 겁이 많아서 공격성이 있거나, 사나운 반려동물들은 추가금이 있습니다.\n짧은 기계 미용과, 많은 털 엉킴이 있었을 경우 미용 후 자극이 와서 긁거나 핥을 수 있습니다.\n반려견의 피부는 사람에 비해 약하기 때문에, 미용 후 긁거나 핥으면 상처가 나거나 진물이 나는 경우가 있습니다.\n일시적으로 미용 스트레스가 올 수 있으나 대부분 2~5일 후 점차 사라지게 됩니다.\n\n위 내용을 숙지하고 매장 이용에 동의합니다.', 0),
    (p_shop_id, '노령견 미용 동의서',
E'매장명 : {{shopName}}\n반려동물 정보 : {{dispPet}}\n보호자 정보 : {{dispCustomer}}\n서비스 이용일 : {{visitDateTime}}\n\n본 매장은 미용 반려동물의 나이가 7세 이상이거나, 질병 또는 수술 경험이 있는 반려동물의 건강상태를 고려하여 안내사항을 말씀드리며, 이용 동의서를 받고자 합니다.\n보호자는 반려동물의 미용을 매장에 위탁함에 있어 이용 중 반려동물이 보유하고 있는 각종 질병이나 노환으로 인한 돌발사태가 발생할 경우 매장에 일체의 민형사상의 법적책임을 묻지 않을 것을 동의하고 동의서를 서명하여 제출합니다.\n단, 본 매장은 위 사항을 제외하고는 의뢰 받은 반려동물의 미용 행위를 수행함에 있어 최선을 다해 서비스를 제공할 것을 약속합니다.\n\n위 내용을 숙지하고 매장 이용에 동의합니다.', 1);
end $$;

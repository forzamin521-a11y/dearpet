-- 판매 상품 담당자별 가격 세트:
-- staff_id가 null인 상품은 "기본 세트"(모든 담당자 공통).
-- 특정 담당자의 상품이 1개라도 있으면 그 담당자에게는 개별 세트가 적용된다.
-- (개별 세트는 기본 세트나 다른 담당자 세트를 복사해서 만든다)

alter table sale_products
  add column staff_id uuid references profiles (id) on delete cascade;

create index idx_sale_products_staff on sale_products (shop_id, staff_id);

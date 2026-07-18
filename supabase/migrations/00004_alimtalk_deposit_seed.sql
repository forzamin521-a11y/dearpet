-- 예약금 안내 알림톡 (2/2): 기존 매장 기본 행 생성 + 신규 매장 시드 함수 갱신.
-- 발송 대상(모든 고객/신규만/기존만)은 alimtalk_templates.variables.sendTarget에 저장된다.

-- 기존 매장에도 기본 행 생성 (미사용 상태)
insert into alimtalk_templates (shop_id, kind, enabled)
select id, 'deposit', false from shops
on conflict (shop_id, kind) do nothing;

-- 신규 매장 시드 함수에 deposit 포함
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

  insert into consent_forms (shop_id, title, content, sort_order) values
    (p_shop_id, '미용 동의서',
E'매장명 : {{shopName}}\n반려동물 정보 : {{dispPet}}\n보호자 정보 : {{dispCustomer}}\n서비스 이용일 : {{visitDateTime}}\n\n본 매장은 애견미용을 의뢰하신 반려동물을 미용함에 있어 소홀함 없이 최대한 배려하여 미용할 것을 약속드립니다.\n털이 길거나 엉킴이 심한 경우, 겁이 많아서 공격성이 있거나, 사나운 반려동물들은 추가금이 있습니다.\n짧은 기계 미용과, 많은 털 엉킴이 있었을 경우 미용 후 자극이 와서 긁거나 핥을 수 있습니다.\n반려견의 피부는 사람에 비해 약하기 때문에, 미용 후 긁거나 핥으면 상처가 나거나 진물이 나는 경우가 있습니다.\n일시적으로 미용 스트레스가 올 수 있으나 대부분 2~5일 후 점차 사라지게 됩니다.\n\n위 내용을 숙지하고 매장 이용에 동의합니다.', 0),
    (p_shop_id, '노령견 미용 동의서',
E'매장명 : {{shopName}}\n반려동물 정보 : {{dispPet}}\n보호자 정보 : {{dispCustomer}}\n서비스 이용일 : {{visitDateTime}}\n\n본 매장은 미용 반려동물의 나이가 7세 이상이거나, 질병 또는 수술 경험이 있는 반려동물의 건강상태를 고려하여 안내사항을 말씀드리며, 이용 동의서를 받고자 합니다.\n보호자는 반려동물의 미용을 매장에 위탁함에 있어 이용 중 반려동물이 보유하고 있는 각종 질병이나 노환으로 인한 돌발사태가 발생할 경우 매장에 일체의 민형사상의 법적책임을 묻지 않을 것을 동의하고 동의서를 서명하여 제출합니다.\n단, 본 매장은 위 사항을 제외하고는 의뢰 받은 반려동물의 미용 행위를 수행함에 있어 최선을 다해 서비스를 제공할 것을 약속합니다.\n\n위 내용을 숙지하고 매장 이용에 동의합니다.', 1);
end $$;

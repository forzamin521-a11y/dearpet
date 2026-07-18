export type UserRole = "super_admin" | "owner" | "staff";
export type ShopStatus = "pending" | "approved" | "suspended";
export type ReservationStatus =
  | "reserved"
  | "arrived"
  | "finishing"
  | "completed"
  | "canceled"
  | "no_show"
  | "deleted";
export type PetSpecies = "dog" | "cat";
export type AlimtalkKind =
  | "basic"
  | "senior"
  | "consent"
  | "confirm"
  | "deposit"
  | "pre_visit"
  | "change"
  | "cancel"
  | "finishing"
  | "no_show";

export interface StaffPermissions {
  create: boolean;
  update: boolean;
  cancel: boolean;
  delete: boolean;
  stats: boolean;
}

export interface BoxSettings {
  align: "left" | "center" | "right";
  fields: {
    customerName: boolean;
    time: boolean;
    petName: boolean;
    breed: boolean;
    product: boolean;
    memo: boolean;
  };
}

export interface Shop {
  id: string;
  name: string;
  address: string;
  phone: string;
  business_hours: string;
  open_time: string;
  close_time: string;
  closed_days: string;
  intro: string;
  logo_url: string | null;
  status: ShopStatus;
  box_settings: BoxSettings;
  created_at: string;
}

export interface Profile {
  id: string;
  shop_id: string | null;
  role: UserRole;
  name: string;
  phone: string;
  emoji: string;
  color: string;
  memo: string;
  permissions: StaffPermissions;
  is_active: boolean;
  created_at: string;
}

export interface Customer {
  id: string;
  shop_id: string;
  name: string;
  phones: string[];
  alimtalk_opt_in: boolean;
  memo: string;
  created_at: string;
}

export interface Pet {
  id: string;
  shop_id: string;
  customer_id: string;
  name: string;
  species: PetSpecies;
  breed: string;
  weight_kg: number | null;
  birth_date: string | null;
  neutered: boolean | null;
  memo: string;
  created_at: string;
}

/** 미용 서비스 (예: 목욕 30분, 전체미용 2시간) — 가격은 완료 시 매출 등록에서 입력 */
export interface Service {
  id: string;
  shop_id: string;
  name: string;
  emoji: string;
  duration_minutes: number;
  sort_order: number;
  created_at: string;
}

export interface GroomingProduct {
  id: string;
  shop_id: string;
  name: string;
  description: string;
  emoji: string;
  sort_order: number;
  created_at: string;
}

export interface ProductOption {
  id: string;
  product_id: string;
  shop_id: string;
  name: string;
  duration_minutes: number;
  price: number | null;
  min_weight_kg: number | null;
  max_weight_kg: number | null;
  sort_order: number;
  created_at: string;
}

export interface AddonItem {
  name: string;
  price: number;
}

export interface Reservation {
  id: string;
  shop_id: string;
  customer_id: string;
  staff_id: string | null;
  date: string;
  start_time: string;
  end_time: string;
  status: ReservationStatus;
  memo: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReservationPet {
  id: string;
  reservation_id: string;
  pet_id: string;
  product_option_id: string | null;
  price: number | null;
  addons: AddonItem[];
  created_at: string;
}

export interface SaleItem {
  petName: string;
  description: string;
  amount: number;
}

export interface Sale {
  id: string;
  shop_id: string;
  reservation_id: string | null;
  customer_id: string | null;
  staff_id: string | null;
  sale_date: string;
  items: SaleItem[];
  total_amount: number;
  cash_amount: number;
  card_amount: number;
  transfer_amount: number;
  memo: string;
  created_at: string;
}

export interface AlimtalkTemplate {
  id: string;
  shop_id: string;
  kind: AlimtalkKind;
  /** 매장이 수정할 수 있는 템플릿 변수값 (본문은 코드에 고정 정의) */
  variables: Record<string, string>;
  enabled: boolean;
  created_at: string;
}

export interface AlimtalkLog {
  id: string;
  shop_id: string;
  reservation_id: string | null;
  customer_id: string | null;
  phone: string;
  kind: AlimtalkKind;
  content: string;
  status: "simulated" | "sent" | "failed";
  created_at: string;
}

export interface ConsentForm {
  id: string;
  shop_id: string;
  title: string;
  content: string;
  sort_order: number;
  created_at: string;
}

export interface ConsentSubmission {
  id: string;
  shop_id: string;
  consent_form_id: string;
  reservation_id: string | null;
  customer_id: string;
  pet_id: string | null;
  token: string;
  status: "pending" | "signed";
  signer_name: string | null;
  signature_url: string | null;
  signed_at: string | null;
  created_at: string;
}

export interface DailyMemo {
  id: string;
  shop_id: string;
  date: string;
  memo: string;
}

import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Profile, Shop } from "@/lib/types";

export interface AuthContext {
  userId: string | null;
  profile: Profile | null;
  shop: Shop | null;
}

/** 현재 로그인 사용자의 프로필과 매장을 가져온다. */
export async function getAuthContext(): Promise<AuthContext> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { userId: null, profile: null, shop: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) return { userId: user.id, profile: null, shop: null };

  let shop: Shop | null = null;
  if (profile.shop_id) {
    const { data } = await supabase
      .from("shops")
      .select("*")
      .eq("id", profile.shop_id)
      .single();
    shop = data;
  }

  return { userId: user.id, profile, shop };
}

/** 실장 권한 체크 (owner/super_admin은 항상 허용) */
export function hasPermission(
  profile: Profile,
  perm: keyof Profile["permissions"]
): boolean {
  if (profile.role === "owner" || profile.role === "super_admin") return true;
  return Boolean(profile.permissions?.[perm]);
}

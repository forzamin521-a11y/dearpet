import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * 서비스 롤 클라이언트 — RLS를 우회한다.
 * 실장 계정 생성 등 관리자 전용 서버 라우트에서만 사용할 것.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

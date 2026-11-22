import "server-only";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "./env";

/**
 * 管理用クライアント（RLS を通らない）。招待メールの送信・招待の取り消しだけに使う。
 * SUPABASE_SECRET_KEY は Supabase の Secret key（旧 service_role key）。ブラウザに出さないこと。
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key) throw new Error("SUPABASE_SECRET_KEY が設定されていません");
  return createClient(SUPABASE_URL, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

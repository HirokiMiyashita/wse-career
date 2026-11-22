import { createClient } from "@/lib/supabase/server";

/** 全プロシージャで共有するコンテキスト（リクエストごとに生成） */
export async function createContext() {
  const supabase = await createClient();
  return { supabase };
}

export type Context = Awaited<ReturnType<typeof createContext>>;

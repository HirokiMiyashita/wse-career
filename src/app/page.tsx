import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** トップページは持たない。ログイン済みならダッシュボード、未ログインならログイン画面へ */
export default async function RootPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  redirect(user ? "/dashboard" : "/login");
}

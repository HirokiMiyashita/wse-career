"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function completeOnboarding(displayName: string): Promise<{ message: string } | void> {
  const name = displayName.trim();
  if (!name) return { message: "表示名を入力してください" };
  const supabase = await createClient();
  const { error } = await supabase.rpc("complete_onboarding", { p_display_name: name });
  if (error) return { message: `保存できませんでした：${error.message}` };
  redirect("/dashboard");
}

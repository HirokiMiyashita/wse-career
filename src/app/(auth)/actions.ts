"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** オープンリダイレクト対策: 自サイト内の相対パスのみ許可 */
function safeNext(value: FormDataEntryValue | null, fallback = "/dashboard") {
  const next = typeof value === "string" ? value : "";
  return next.startsWith("/") && !next.startsWith("//") ? next : fallback;
}

export async function login(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = safeNext(formData.get("next"));

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    const message =
      error.code === "email_not_confirmed"
        ? "メールアドレスの確認が完了していません。届いたメールのリンクを開いてください。"
        : "メールアドレスまたはパスワードが正しくありません。";
    redirect(
      `/login?error=${encodeURIComponent(message)}&next=${encodeURIComponent(next)}`,
    );
  }

  redirect(next);
}

export async function signup(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const origin =
    (await headers()).get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=/dashboard`,
    },
  });

  if (error) {
    // 管理者がいる状態での登録は DB 側（handle_new_user）で拒否される
    const message = /database error saving new user/i.test(error.message)
      ? "新規登録は招待制です。管理者からの招待メールのリンクから登録してください。"
      : error.message;
    redirect(`/signup?error=${encodeURIComponent(message)}`);
  }

  redirect(`/signup/verify?email=${encodeURIComponent(email)}`);
}

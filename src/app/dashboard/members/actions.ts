"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { api } from "@/lib/orpc/server";
import { createClient as createPlainClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMember } from "@/server/members";

export type InviteState = { ok: boolean; message: string } | null;

const InviteInput = z
  .object({
    email: z.email("メールアドレスの形式が正しくありません"),
    kind: z.enum(["employee", "artist"]),
    artistId: z.string().optional(),
  })
  .refine((v) => v.kind !== "artist" || !!v.artistId, { message: "紐づけるアーティストを選んでください", path: ["artistId"] });

async function requireAdmin() {
  const me = await getCurrentMember();
  if (!me?.is_admin || me.status === "disabled") throw new Error("管理者だけが操作できます");
  return me;
}

async function siteOrigin() {
  return (await headers()).get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

/** 招待メールを送る。送信に失敗したら招待レコードを消す */
export async function inviteMember(_prev: InviteState, formData: FormData): Promise<InviteState> {
  let me;
  try {
    me = await requireAdmin();
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
  const parsed = InviteInput.safeParse({
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    kind: formData.get("kind"),
    artistId: formData.get("artistId") || undefined,
  });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "入力内容を確認してください" };
  const { email, kind } = parsed.data;
  const artistId = kind === "artist" ? parsed.data.artistId! : null;

  if (artistId) {
    const artists = await api.artists.list();
    if (!artists.some((a) => a.id === artistId)) return { ok: false, message: "アーティストが見つかりません" };
  }

  const supabase = await createClient();
  const { data: existing } = await supabase.from("members").select("id, status").ilike("email", email).maybeSingle();
  if (existing) return { ok: false, message: existing.status === "invited" ? "招待済みです。一覧から再送してください" : "すでにメンバーです" };

  const { data: inv, error: insErr } = await supabase
    .from("invitations")
    .insert({ email, kind, artist_id: artistId, invited_by: me.id })
    .select("id")
    .single();
  if (insErr) return { ok: false, message: insErr.code === "23505" ? "このメールアドレスは招待中です" : `招待を作成できませんでした：${insErr.message}` };

  const { error: sendErr } = await createAdminClient().auth.admin.inviteUserByEmail(email, {
    redirectTo: `${await siteOrigin()}/welcome`,
  });
  if (sendErr) {
    await supabase.from("invitations").delete().eq("id", inv.id);
    return { ok: false, message: `招待メールを送れませんでした：${sendErr.message}` };
  }

  revalidatePath("/dashboard/members");
  return { ok: true, message: `${email} に招待メールを送りました` };
}

/** 招待メールの再送（まだ初回設定をしていない人） */
export async function resendInvite(invitationId: string): Promise<InviteState> {
  try {
    await requireAdmin();
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
  const supabase = await createClient();
  const { data: inv } = await supabase.from("invitations").select("email, status").eq("id", invitationId).maybeSingle();
  if (!inv || inv.status !== "pending") return { ok: false, message: "再送できる招待が見つかりません" };
  const redirectTo = `${await siteOrigin()}/welcome`;
  const { error } = await createAdminClient().auth.admin.inviteUserByEmail(inv.email, { redirectTo });
  if (!error) return { ok: true, message: `${inv.email} に再送しました` };

  // 一度リンクを開いた（メール確認済み）が初回設定を終えていない人には招待を再送できないので、
  // ログイン用リンク（Magic Link テンプレート）を送って同じ初回設定画面に案内する
  if (error.code === "email_exists") {
    const anon = createPlainClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
    const { error: otpErr } = await anon.auth.signInWithOtp({ email: inv.email, options: { shouldCreateUser: false, emailRedirectTo: redirectTo } });
    if (!otpErr) return { ok: true, message: `${inv.email} にログイン用リンクを送りました（初回設定の画面が開きます）` };
    return { ok: false, message: `再送できませんでした：${otpErr.message}` };
  }
  return { ok: false, message: `再送できませんでした：${error.message}` };
}

/** 招待の取り消し。作られたユーザーも削除する（初回設定前の人だけ） */
export async function revokeInvite(invitationId: string): Promise<InviteState> {
  try {
    await requireAdmin();
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
  const supabase = await createClient();
  const { data: inv } = await supabase.from("invitations").select("email, status, member_id").eq("id", invitationId).maybeSingle();
  if (!inv || inv.status !== "pending") return { ok: false, message: "取り消せる招待が見つかりません" };

  if (inv.member_id) {
    const { data: m } = await supabase.from("members").select("status").eq("id", inv.member_id).maybeSingle();
    if (m && m.status !== "invited") return { ok: false, message: "すでに登録を済ませているため取り消せません" };
    const { error } = await createAdminClient().auth.admin.deleteUser(inv.member_id);
    if (error) return { ok: false, message: `取り消せませんでした：${error.message}` };
  }
  await supabase.from("invitations").update({ status: "revoked" }).eq("id", invitationId);
  revalidatePath("/dashboard/members");
  return { ok: true, message: `${inv.email} への招待を取り消しました` };
}

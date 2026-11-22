import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type MemberKind = "employee" | "artist";
export type MemberStatus = "invited" | "active" | "disabled";
export interface Member {
  id: string;
  email: string;
  display_name: string;
  kind: MemberKind;
  is_admin: boolean;
  artist_id: string | null;
  status: MemberStatus;
  created_at: string;
}
export interface Invitation {
  id: string;
  email: string;
  kind: MemberKind;
  artist_id: string | null;
  member_id: string | null;
  status: "pending" | "accepted" | "revoked";
  created_at: string;
}

const MEMBER_COLUMNS = "id, email, display_name, kind, is_admin, artist_id, status, created_at";

/** ログイン中のユーザーのメンバー情報（なければ null） */
export const getCurrentMember = cache(async (): Promise<Member | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("members").select(MEMBER_COLUMNS).eq("id", user.id).maybeSingle();
  return (data as Member | null) ?? null;
});

/** メンバー一覧（RLS によりメンバーだけが読める） */
export const listMembers = cache(async (): Promise<Member[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase.from("members").select(MEMBER_COLUMNS).order("created_at");
  if (error) throw new Error(`メンバーを取得できませんでした：${error.message}`);
  return (data as Member[]) ?? [];
});

/** タスクの担当に割り当てられる人（従業員のみ。無効化された人は除く） */
export async function listAssignees(): Promise<{ id: string; name: string }[]> {
  const members = await listMembers();
  return members
    .filter((m) => m.kind === "employee" && m.status !== "disabled")
    .map((m) => ({ id: m.id, name: memberName(m) }));
}

export const memberName = (m: Pick<Member, "display_name" | "email">) => m.display_name || m.email;

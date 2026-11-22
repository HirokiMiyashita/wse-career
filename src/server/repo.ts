import "server-only";
import { ORPCError } from "@orpc/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Approval, Artist, Deal, Knowledge, Project, Song } from "@/lib/domain/types";

/**
 * 業務データの読み書き（Supabase）。テーブルは supabase/migrations/20261123100000_business_data.sql。
 * アーティスト・企画は中身を jsonb で持ち、mutate* で「読む → 変更 → version を確認して保存」を行う。
 */
type Sb = SupabaseClient;

function fail(what: string, error: { message: string }): never {
  throw new ORPCError("INTERNAL_SERVER_ERROR", { message: `${what}に失敗しました：${error.message}` });
}

/** 短い ID（例: P-k3x9q2ab） */
export function newId(prefix: string) {
  return `${prefix}-${crypto.randomUUID().replace(/-/g, "").slice(0, 8)}`;
}

/* ---------- アーティスト ---------- */

interface ArtistRow {
  id: string;
  name: string;
  role: string;
  color: string;
  plan: Artist["plan"];
  version: number;
}
const toArtist = (r: ArtistRow): Artist => ({ id: r.id, name: r.name, role: r.role, color: r.color, plan: r.plan });

export async function listArtists(sb: Sb): Promise<Artist[]> {
  const { data, error } = await sb.from("artists").select("id, name, role, color, plan, version").order("created_at");
  if (error) fail("アーティストの取得", error);
  return (data as ArtistRow[]).map(toArtist);
}

export async function getArtist(sb: Sb, id: string): Promise<Artist> {
  const { data, error } = await sb.from("artists").select("id, name, role, color, plan, version").eq("id", id).maybeSingle();
  if (error) fail("アーティストの取得", error);
  if (!data) throw new ORPCError("NOT_FOUND", { message: "アーティストが見つかりません" });
  return toArtist(data as ArtistRow);
}

export async function insertArtist(sb: Sb, a: Artist) {
  const { error } = await sb.from("artists").insert({ id: a.id, name: a.name, role: a.role, color: a.color, plan: a.plan });
  if (error) fail("アーティストの作成", error);
}

/** 同時編集に備え、version が変わっていたら読み直してやり直す */
export async function mutateArtist<T>(sb: Sb, id: string, fn: (a: Artist) => T): Promise<T> {
  for (let i = 0; i < 4; i++) {
    const { data, error } = await sb.from("artists").select("id, name, role, color, plan, version").eq("id", id).maybeSingle();
    if (error) fail("アーティストの取得", error);
    if (!data) throw new ORPCError("NOT_FOUND", { message: "アーティストが見つかりません" });
    const row = data as ArtistRow;
    const a = toArtist(row);
    const result = fn(a);
    const { data: updated, error: upErr } = await sb
      .from("artists")
      .update({ name: a.name, role: a.role, color: a.color, plan: a.plan, version: row.version + 1, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("version", row.version)
      .select("id");
    if (upErr) fail("アーティストの保存", upErr);
    if (updated?.length) return result;
  }
  throw new ORPCError("CONFLICT", { message: "ほかの人が同時に更新しました。もう一度お試しください" });
}

/* ---------- 企画 ---------- */

interface ProjectRow {
  id: string;
  artist_id: string;
  data: Omit<Project, "id" | "artistId">;
  version: number;
}
const toProject = (r: ProjectRow): Project => ({ ...r.data, id: r.id, artistId: r.artist_id });
const projectData = (p: Project): Omit<Project, "id" | "artistId"> => {
  const rest: Partial<Project> = { ...p };
  delete rest.id;
  delete rest.artistId;
  return rest as Omit<Project, "id" | "artistId">;
};

export async function listProjects(sb: Sb): Promise<Project[]> {
  const { data, error } = await sb.from("projects").select("id, artist_id, data, version").order("created_at");
  if (error) fail("企画の取得", error);
  return (data as ProjectRow[]).map(toProject);
}

export async function getProject(sb: Sb, id: string): Promise<Project> {
  const { data, error } = await sb.from("projects").select("id, artist_id, data, version").eq("id", id).maybeSingle();
  if (error) fail("企画の取得", error);
  if (!data) throw new ORPCError("NOT_FOUND", { message: "企画が見つかりません" });
  return toProject(data as ProjectRow);
}

export async function insertProject(sb: Sb, p: Project) {
  const { error } = await sb.from("projects").insert({ id: p.id, artist_id: p.artistId, data: projectData(p) });
  if (error) fail("企画の作成", error);
}

export async function mutateProject<T>(sb: Sb, id: string, fn: (p: Project) => T): Promise<T> {
  for (let i = 0; i < 4; i++) {
    const { data, error } = await sb.from("projects").select("id, artist_id, data, version").eq("id", id).maybeSingle();
    if (error) fail("企画の取得", error);
    if (!data) throw new ORPCError("NOT_FOUND", { message: "企画が見つかりません" });
    const row = data as ProjectRow;
    const p = toProject(row);
    const result = fn(p);
    const { data: updated, error: upErr } = await sb
      .from("projects")
      .update({ data: projectData(p), version: row.version + 1, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("version", row.version)
      .select("id");
    if (upErr) fail("企画の保存", upErr);
    if (updated?.length) return result;
  }
  throw new ORPCError("CONFLICT", { message: "ほかの人が同時に更新しました。もう一度お試しください" });
}

/* ---------- 判断待ち ---------- */

interface ApprovalRow {
  id: string;
  kind: Approval["kind"];
  project_id: string | null;
  artist_id: string;
  ref: string;
  title: string;
  reason: string;
  due: string;
  ws: boolean;
  artist: boolean;
}
const toApproval = (r: ApprovalRow): Approval => ({
  id: r.id,
  kind: r.kind,
  projectId: r.project_id,
  artistId: r.artist_id,
  ref: r.ref,
  title: r.title,
  reason: r.reason,
  due: r.due,
  ws: r.ws,
  artist: r.artist,
});
const APPROVAL_COLUMNS = "id, kind, project_id, artist_id, ref, title, reason, due, ws, artist";

export async function listApprovals(sb: Sb): Promise<Approval[]> {
  const { data, error } = await sb.from("approvals").select(APPROVAL_COLUMNS).order("created_at", { ascending: false });
  if (error) fail("判断待ちの取得", error);
  return (data as ApprovalRow[]).map(toApproval);
}

export async function getApproval(sb: Sb, id: string): Promise<Approval> {
  const { data, error } = await sb.from("approvals").select(APPROVAL_COLUMNS).eq("id", id).maybeSingle();
  if (error) fail("判断待ちの取得", error);
  if (!data) throw new ORPCError("NOT_FOUND", { message: "判断待ちが見つかりません" });
  return toApproval(data as ApprovalRow);
}

export async function insertApproval(sb: Sb, a: Approval) {
  const { error } = await sb.from("approvals").insert({
    id: a.id,
    kind: a.kind,
    project_id: a.projectId,
    artist_id: a.artistId,
    ref: a.ref,
    title: a.title,
    reason: a.reason,
    due: a.due,
    ws: a.ws,
    artist: a.artist,
  });
  if (error) fail("判断待ちの作成", error);
}

export async function updateApproval(sb: Sb, id: string, patch: Partial<Pick<Approval, "ws" | "artist">>) {
  const { error } = await sb.from("approvals").update(patch).eq("id", id);
  if (error) fail("判断待ちの更新", error);
}

/* ---------- 楽曲・案件・ナレッジ ---------- */

export async function listSongs(sb: Sb, artistId: string): Promise<Song[]> {
  const { data, error } = await sb.from("songs").select("no, title, beat, stage, rights, memo").eq("artist_id", artistId).order("sort");
  if (error) fail("楽曲の取得", error);
  return data as Song[];
}

export async function listDeals(sb: Sb, artistId?: string): Promise<Deal[]> {
  let q = sb.from("deals").select("id, artist_id, title, stage, date, fee, next, sensitive").order("date", { ascending: false });
  if (artistId) q = q.eq("artist_id", artistId);
  const { data, error } = await q;
  if (error) fail("案件の取得", error);
  return (data as (Omit<Deal, "artistId"> & { artist_id: string })[]).map(({ artist_id, ...d }) => ({ ...d, artistId: artist_id }));
}

export async function listKnowledge(sb: Sb): Promise<Knowledge[]> {
  const { data, error } = await sb.from("knowledge").select("project_id, artist_id, title, date, metrics, learning").order("created_at", { ascending: false });
  if (error) fail("ナレッジの取得", error);
  return (data as { project_id: string | null; artist_id: string; title: string; date: string; metrics: [string, string][]; learning: string }[]).map((k) => ({
    projectId: k.project_id,
    artistId: k.artist_id,
    title: k.title,
    date: k.date,
    metrics: k.metrics,
    learning: k.learning,
  }));
}

export async function insertKnowledge(sb: Sb, k: Knowledge) {
  const { error } = await sb.from("knowledge").insert({ project_id: k.projectId, artist_id: k.artistId, title: k.title, date: k.date, metrics: k.metrics, learning: k.learning });
  if (error) fail("ナレッジの登録", error);
}

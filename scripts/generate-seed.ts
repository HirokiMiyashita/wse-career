/**
 * ローカル開発用のサンプルデータ（src/server/store/seed.ts）から supabase/seed.sql を作る。
 *   npx tsx scripts/generate-seed.ts
 * seed.sql は `supabase db reset` のときにローカルの DB にだけ入る（本番には入らない）。
 */
import { writeFileSync } from "node:fs";
import { createSeed } from "../src/server/store/seed";

const q = (v: unknown) => (v === null || v === undefined ? "null" : `'${String(v).replace(/'/g, "''")}'`);
const j = (v: unknown) => `${q(JSON.stringify(v))}::jsonb`;

const d = createSeed();
const out: string[] = ["-- `supabase db reset` 実行時に投入される初期データ（ローカル開発用のサンプル）", "-- scripts/generate-seed.ts で生成。直接編集しないでください", ""];

for (const a of d.artists) out.push(`insert into public.artists (id, name, role, color, plan) values (${q(a.id)}, ${q(a.name)}, ${q(a.role)}, ${q(a.color)}, ${j(a.plan)});`);
for (const p of d.projects) {
  const { id, artistId, ...data } = p;
  out.push(`insert into public.projects (id, artist_id, data) values (${q(id)}, ${q(artistId)}, ${j(data)});`);
}
for (const a of d.approvals)
  out.push(
    `insert into public.approvals (id, kind, project_id, artist_id, ref, title, reason, due, ws, artist) values (${q(a.id)}, ${q(a.kind)}, ${q(a.projectId)}, ${q(a.artistId)}, ${q(a.ref)}, ${q(a.title)}, ${q(a.reason)}, ${q(a.due)}, ${a.ws}, ${a.artist});`,
  );
for (const [artistId, songs] of Object.entries(d.songs))
  songs.forEach((s, i) => out.push(`insert into public.songs (artist_id, no, title, beat, stage, rights, memo, sort) values (${q(artistId)}, ${q(s.no)}, ${q(s.title)}, ${q(s.beat)}, ${s.stage}, ${j(s.rights)}, ${q(s.memo)}, ${i});`));
for (const x of d.deals)
  out.push(`insert into public.deals (id, artist_id, title, stage, date, fee, next, sensitive) values (${q(x.id)}, ${q(x.artistId)}, ${q(x.title)}, ${x.stage}, ${q(x.date)}, ${q(x.fee)}, ${q(x.next)}, ${!!x.sensitive});`);
d.knowledge.forEach((k, i) =>
  out.push(
    `insert into public.knowledge (project_id, artist_id, title, date, metrics, learning, created_at) values (${q(k.projectId)}, ${q(k.artistId)}, ${q(k.title)}, ${q(k.date)}, ${j(k.metrics)}, ${q(k.learning)}, now() - interval '${i} minutes');`,
  ),
);

writeFileSync(new URL("../supabase/seed.sql", import.meta.url), out.join("\n") + "\n");
console.log(`supabase/seed.sql を作成しました（${out.length - 3}行）`);

import { formatKpi, isLate, pillarProgress, progress } from "./calc";
import { PHASES } from "./constants";
import type { Approval, Artist, Project } from "./types";

/** キャリアレビューの議題を、柱・企画・判断待ちから自動で作る */
export function buildAgenda(artist: Artist, projects: Project[], approvals: Approval[], now: string): string[] {
  const items: string[] = [];
  artist.plan.pillars.forEach((p) =>
    items.push(`柱「${p.name}」の進み具合：${Math.round(pillarProgress(p) * 100)}%（${p.kpis.map((k) => `${k.label} ${formatKpi(k.now, k.unit)}`).join("、")}）`),
  );
  projects
    .filter((p) => p.artistId === artist.id && p.phase < 5)
    .forEach((p) => {
      const late = p.tasks.filter((t) => isLate(t, now)).length;
      items.push(`企画「${p.title}」：${PHASES[p.phase]}・進捗${progress(p)}%${late ? `・遅れ${late}件` : ""}`);
    });
  approvals.filter((a) => !(a.ws && a.artist) && a.artistId === artist.id).forEach((a) => items.push(`本人と決めること：${a.title}`));
  if (artist.plan.ideas.length) items.push(`構想中の企画（${artist.plan.ideas.map((i) => i.title).join("／")}）の扱い`);
  return items;
}

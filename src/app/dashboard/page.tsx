import Link from "next/link";
import { api } from "@/lib/orpc/server";
import { diffDays, isLate, md, pillarProgress, today, weekday, ymd } from "@/lib/domain/calc";
import { ArtistAvatar, Bar, PageHeader, Panel, Pill, Tag } from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import { NewProjectButton } from "@/components/project/new-project-dialog";
import { WeeklyTasks } from "@/components/home/weekly-tasks";

export default async function DashboardPage() {
  const [artists, projects, approvals] = await Promise.all([api.artists.list(), api.projects.list(), api.approvals.list()]);
  const now = today();
  const pending = approvals.filter((a) => !(a.ws && a.artist));
  const artistName = (id: string) => artists.find((a) => a.id === id)?.name ?? id;

  const upcoming = projects
    .flatMap((p) => p.milestones.map((m) => ({ ...m, project: p })))
    .filter((m) => m.date >= now && diffDays(now, m.date) <= 70)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 6);

  const weekly = projects
    .flatMap((p) => p.tasks.map((t) => ({ t, p })))
    .filter(({ t }) => ["ws", "joint"].some((k) => t.exec === k || t.approver === k) && t.status !== "完了" && (isLate(t, now) || diffDays(now, t.due) <= 30))
    .sort((a, b) => a.t.due.localeCompare(b.t.due))
    .map(({ t, p }) => ({ projectId: p.id, taskId: t.id, title: t.title, project: p.title, artistName: artistName(p.artistId), artistColor: artists.find((a) => a.id === p.artistId)?.color ?? "#333", due: t.due, late: isLate(t, now) }));

  return (
    <>
      <PageHeader
        title="ホーム"
        sub={`${ymd(now)}（${weekday(now)}） ・ アーティストの現在地と、今週やること`}
        actions={
          <>
            <Button variant="outline" asChild>
              <Link href="/dashboard/artists/new">＋ アーティストを追加</Link>
            </Button>
            <NewProjectButton artists={artists} />
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {artists.map((a) => {
          const pl = a.plan;
          const active = projects.filter((p) => p.artistId === a.id && p.phase < 5);
          const late = active.flatMap((p) => p.tasks).filter((t) => isLate(t, now)).length;
          const ap = pending.filter((x) => x.artistId === a.id).length;
          const rv = diffDays(now, pl.nextReview);
          return (
            <Link key={a.id} href={`/dashboard/artists/${a.id}`} className="relative block overflow-hidden rounded-xl border bg-card p-5 shadow-xs transition hover:border-indigo-200 hover:shadow-md">
              <span className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: a.color }} />
              <div className="mt-1 flex items-center gap-2.5">
                <ArtistAvatar name={a.name} color={a.color} />
                <div>
                  <b className="text-[15px]">{a.name}</b>
                  <div className="text-[11.5px] text-muted-foreground">{a.role}</div>
                </div>
                <Tag variant="white" className="ml-auto">
                  {pl.status === "下書き" ? "下書き・" : ""}
                  {pl.horizon}のゴール
                </Tag>
              </div>
              <div className="mb-1 mt-3 font-semibold leading-relaxed">{pl.vision}</div>
              <div className="mb-1.5 text-[11.5px] text-muted-foreground">いまのステップ：{pl.steps[0]?.text}</div>
              {pl.pillars.map((p) => {
                const v = Math.round(pillarProgress(p) * 100);
                return (
                  <div key={p.id} className="mt-1.5 grid grid-cols-[64px_1fr_34px] items-center gap-2 text-xs">
                    <span>{p.name}</span>
                    <Bar value={v} />
                    <span className="text-right text-muted-foreground">{v}%</span>
                  </div>
                );
              })}
              <div className="mt-3.5 flex flex-wrap gap-1.5 border-t border-slate-100 pt-3">
                <Tag>進行中の企画 {active.length}</Tag>
                <Tag variant={rv <= 7 ? "primary" : "default"}>
                  次のレビュー {md(pl.nextReview)}（{rv >= 0 ? `あと${rv}日` : `${-rv}日経過`}）
                </Tag>
                {ap > 0 && <Pill tone="wait">判断待ち {ap}</Pill>}
                {late > 0 && <Pill tone="late">遅れ {late}</Pill>}
              </div>
            </Link>
          );
        })}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <Panel title="今週やること" hint="WSが実行・承認に関わるタスク（30日以内と遅れ）">
          <WeeklyTasks items={weekly} />
        </Panel>
        <div className="grid content-start gap-4">
          <Panel title="判断が必要なこと" action={<Link href="/dashboard/approvals" className="text-xs text-primary">すべて</Link>}>
            {pending.slice(0, 4).map((a) => (
              <Link key={a.id} href="/dashboard/approvals" className="flex items-center gap-3 border-b border-slate-100 px-5 py-3 last:border-b-0 hover:bg-slate-50">
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-semibold leading-snug">{a.title}</div>
                  <div className="text-[11.5px] text-muted-foreground">
                    {artistName(a.artistId)} ・ {a.ws ? "WS承認済み" : "WS未承認"}／{a.artist ? "本人確認済み" : "本人未確認"}
                  </div>
                </div>
                <Pill tone={a.due < now ? "late" : "wait"}>{md(a.due)}</Pill>
              </Link>
            ))}
            {pending.length === 0 && <div className="px-5 py-8 text-center text-sm text-muted-foreground">ありません</div>}
          </Panel>
          <Panel title="これからの予定">
            {upcoming.map((m) => (
              <Link key={m.project.id + m.date + m.label} href={`/dashboard/projects/${m.project.id}/schedule`} className="flex items-center gap-3 border-b border-slate-100 px-5 py-3 last:border-b-0 hover:bg-slate-50">
                <div className="w-12 shrink-0 text-center">
                  <b className="block text-[17px] leading-tight">{md(m.date)}</b>
                  <span className="text-[11px] text-muted-foreground">{weekday(m.date)}曜</span>
                </div>
                <div className="min-w-0">
                  <div className="text-[13px] font-semibold">{m.label}</div>
                  <div className="text-[11.5px] text-muted-foreground">
                    {artistName(m.project.artistId)} ・ {m.project.title}
                  </div>
                </div>
              </Link>
            ))}
            {upcoming.length === 0 && <div className="px-5 py-8 text-center text-sm text-muted-foreground">予定はありません</div>}
          </Panel>
        </div>
      </div>
    </>
  );
}

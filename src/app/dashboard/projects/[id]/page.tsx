import Link from "next/link";
import { api } from "@/lib/orpc/server";
import { budgetSum, calcModel, diffDays, fmt, isLate, md, nextMilestone, planChecks, today, yen } from "@/lib/domain/calc";
import { WORKSTREAMS } from "@/lib/domain/constants";
import { getProjectOr404 } from "@/server/queries";
import { Bar, Panel, Pill } from "@/components/app/ui";
import { NoPlan } from "@/components/project/no-plan";
import { cn } from "@/lib/utils";

/** いま → この企画の目標 → キャリアのゴール を1本の線で表す */
function GoalTrack({ now, target, career, unit }: { now: number; target: number; career: number | null; unit: string }) {
  const max = Math.max(career ?? target, target, now) || 1;
  const X = (v: number) => Math.max(0, Math.min(100, (v / max) * 100));
  return (
    <div className="relative mb-6 mt-8 h-2 rounded-full bg-slate-100">
      <div className="absolute inset-y-0 left-0 rounded-full bg-primary" style={{ width: `${X(now)}%` }} />
      <div className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-[2.5px] border-primary bg-white" style={{ left: `${X(target)}%` }} />
      {career !== null && <div className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-800" style={{ left: `${X(career)}%` }} />}
      <div className={cn("absolute -top-5 whitespace-nowrap text-[11px] font-semibold text-accent-foreground", X(target) > 85 ? "-translate-x-full" : "-translate-x-1/2")} style={{ left: `${X(target)}%` }}>
        この企画 {fmt(target)}
        {career === null ? unit : ""}
      </div>
      <div className="absolute left-0 top-3.5 whitespace-nowrap text-[11px] text-slate-500">いま {fmt(now)}</div>
      {career !== null && (
        <div className="absolute right-0 top-3.5 whitespace-nowrap text-[11px] text-slate-500">
          ゴール {fmt(career)}
          {unit}
        </div>
      )}
    </div>
  );
}

export default async function ProjectOverviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [{ project: p, artist }, approvals] = await Promise.all([getProjectOr404(id), api.approvals.list()]);
  const now = today();
  const c = calcModel(p);
  const n = nextMilestone(p, now);
  const apv = approvals.filter((a) => a.projectId === p.id && !(a.ws && a.artist));
  const checks = planChecks(p, now);
  if (p.id === "P1") checks.push({ level: "wa", text: "収録曲のうち権利の確認が残っている曲があります（楽曲タブ）" });

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
      <div className="grid content-start gap-4">
        <Panel title="この企画の目標" hint="キャリアのゴールに対して、どこまで進めるか">
          <div className="px-5 pb-4">
            {p.goals.map((g) => {
              const pillar = g.pillar ? artist.plan.pillars.find((x) => x.id === g.pillar) : null;
              const ck = pillar?.kpis.find((k) => k.label === g.label || (/動員/.test(g.label) && /動員/.test(k.label)));
              return (
                <div key={g.id} className="border-b border-slate-100 py-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-2.5">
                    <b>{g.label}</b>
                    <span className="text-[11.5px] text-muted-foreground">
                      {pillar ? `柱：${pillar.name} ・ ` : ""}期限 {g.due.replace(/-/g, "/")}
                    </span>
                  </div>
                  {g.unit === "円以上" ? (
                    <>
                      <div className="mt-1.5 text-[13px]">
                        目標：ワンマン単体で赤字にしない（見込 <b className={c.liveNet < 0 ? "text-red-600" : "text-emerald-600"}>{yen(c.liveNet)}</b>）
                      </div>
                      <div className="text-[11.5px] text-muted-foreground">お金は目的ではなく、活動を続けられるかの確認として見ます</div>
                    </>
                  ) : (
                    <GoalTrack now={g.now ?? 0} target={g.target} career={ck ? ck.target : null} unit={g.unit} />
                  )}
                </div>
              );
            })}
            <div className="pt-3 text-[12.5px] text-slate-500">何のために：{p.purpose.join("／")}</div>
          </div>
        </Panel>
        {p.tasks.length ? (
          <Panel title="流れごとの進み具合" action={<Link href={`/dashboard/projects/${p.id}/tasks`} className="text-xs text-primary">タスクを見る</Link>}>
            <div className="px-5 py-2">
              {WORKSTREAMS.map((w) => {
                const ts = p.tasks.filter((t) => t.ws === w.key);
                if (!ts.length) return null;
                const done = ts.filter((t) => t.status === "完了").length;
                const late = ts.filter((t) => isLate(t, now)).length;
                return (
                  <div key={w.key} className="grid grid-cols-[80px_1fr_96px] items-center gap-3 py-2">
                    <b className="text-[13px]">{w.name}</b>
                    <Bar value={(done / ts.length) * 100} tone={late ? "ng" : done === ts.length ? "ok" : "primary"} />
                    <span className={cn("text-[11.5px]", late ? "text-red-600" : "text-muted-foreground")}>
                      {done}/{ts.length} 完了{late ? `・遅れ${late}` : ""}
                    </span>
                  </div>
                );
              })}
            </div>
          </Panel>
        ) : (
          <NoPlan />
        )}
      </div>
      <div className="grid content-start gap-4">
        <section className="rounded-xl border bg-card p-5 shadow-xs">
          <div className="text-xs font-semibold text-muted-foreground">次の予定</div>
          {n ? (
            <div className="mt-1.5 flex items-center gap-3">
              <div className="w-14 text-center">
                <b className="block text-2xl leading-tight">{md(n.date)}</b>
                <span className="text-[11px] text-muted-foreground">あと{diffDays(now, n.date)}日</span>
              </div>
              <b>{n.label}</b>
            </div>
          ) : (
            <div className="mt-1.5 text-sm text-muted-foreground">未設定</div>
          )}
        </section>
        {apv.length > 0 && (
          <Panel title="判断が必要なこと">
            {apv.map((a) => (
              <Link key={a.id} href="/dashboard/approvals" className="flex items-center gap-3 border-b border-slate-100 px-5 py-3 last:border-b-0 hover:bg-slate-50">
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-semibold leading-snug">{a.title}</div>
                  <div className="text-[11.5px] text-muted-foreground">{a.reason}</div>
                </div>
                <Pill tone={a.due < now ? "late" : "wait"}>{md(a.due)}</Pill>
              </Link>
            ))}
          </Panel>
        )}
        <Panel title="計画チェック">
          <div className="px-5 pb-2 pt-1">
            {checks.length === 0 && <div className="py-3 text-[13px] text-muted-foreground">計画ができると表示されます</div>}
            {checks.map((x) => (
              <div key={x.text} className="flex gap-2.5 border-b border-slate-100 py-2.5 text-[13px] last:border-b-0">
                <span className={cn("mt-px flex size-[18px] shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white", { ok: "bg-emerald-600", wa: "bg-amber-500", ng: "bg-red-600" }[x.level])}>
                  {x.level === "ok" ? "✓" : "!"}
                </span>
                {x.text}
              </div>
            ))}
          </div>
        </Panel>
        {p.budget.length > 0 && (
          <section className="rounded-xl border bg-card p-5 shadow-xs">
            <b>続けられるか（お金）</b>
            <div className="mb-2 mt-0.5 text-[11.5px] text-muted-foreground">活動を続けるための確認。目標そのものではありません</div>
            {[
              ["承認済み予算", yen(c.total), ""],
              ["発注済み・見込", yen(budgetSum(p, "committed")), ""],
              ["ワンマン単体の見込", yen(c.liveNet), c.liveNet < 0 ? "text-red-600 font-bold" : "text-emerald-600 font-bold"],
            ].map(([k, v, cls]) => (
              <div key={k} className="flex justify-between border-b border-slate-100 py-1.5 text-[13px] last:border-b-0">
                <span>{k}</span>
                <span className={cls}>{v}</span>
              </div>
            ))}
          </section>
        )}
        <div className="text-xs text-muted-foreground">作成元：{p.planSource ?? "—"}</div>
      </div>
    </div>
  );
}

import Link from "next/link";
import { addDays, diffDays, isLate, md, parseDate, toISO } from "@/lib/domain/calc";
import { WORKSTREAMS } from "@/lib/domain/constants";
import type { Project, Task } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

const BAR: Record<Task["status"], string> = {
  未着手: "bg-slate-100 border-l-slate-400",
  進行中: "bg-indigo-50 border-l-indigo-600",
  確認待ち: "bg-amber-50 border-l-amber-500",
  完了: "bg-emerald-50 border-l-emerald-600",
  保留: "bg-[repeating-linear-gradient(135deg,#f1f5f9_0_5px,#fff_5px_10px)] border-l-slate-400",
};
/** 1行に重ならないように詰める */
function pack(rows: [number, number][][], a: number, b: number) {
  let r = rows.findIndex((row) => row.every(([s, e]) => b <= s || a >= e));
  if (r < 0) {
    r = rows.length;
    rows.push([]);
  }
  rows[r].push([a, b]);
  return r;
}

/** 企画のガントチャート：上段に主な予定、下に6つの流れ。棒をクリックするとタスク詳細へ */
export function Gantt({ project: p, now }: { project: Project; now: string }) {
  const dates = [...p.tasks.flatMap((t) => [t.start, t.due]), ...p.milestones.map((m) => m.date)].map(parseDate);
  const mn = new Date(Math.min(...dates.map((d) => d.getTime())));
  const mx = new Date(Math.max(...dates.map((d) => d.getTime())));
  const start = toISO(new Date(mn.getFullYear(), mn.getMonth(), 1));
  const end = toISO(new Date(mx.getFullYear(), mx.getMonth() + 1, 1));
  const span = diffDays(start, end);
  const X = (s: string) => (diffDays(start, s) / span) * 100;
  const months: string[] = [];
  for (let d = parseDate(start); toISO(d) < end; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) months.push(toISO(d));
  // ラベルの幅を日数に換算（エリア幅およそ 1000px 想定）
  const dpc = (11.5 * span) / 1000;

  const msRows: [number, number][][] = [];
  const ms = p.milestones.map((m) => {
    const x0 = diffDays(start, m.date);
    const need = (m.label.length + 5) * dpc + 3;
    const right = X(m.date) > 78;
    return { m, right, row: pack(msRows, right ? x0 - need : x0 - 1, right ? x0 + 1 : x0 + need) };
  });
  const lanes = WORKSTREAMS.map((w) => {
    const ts = p.tasks.filter((t) => t.ws === w.key).sort((a, b) => a.start.localeCompare(b.start));
    const rows: [number, number][][] = [];
    const bars = ts.map((t) => {
      const days = diffDays(t.start, t.due) + 1;
      const need = t.title.length * dpc + 4;
      const inside = days >= need;
      const x0 = diffDays(start, t.start);
      const left = !inside && X(t.due) > 72;
      let a = x0;
      let b = x0 + days;
      if (!inside) {
        if (left) a -= need;
        else b += need;
      }
      return { t, inside, left, row: pack(rows, a - 2, b + 3) };
    });
    return { w, bars, rowCount: Math.max(1, rows.length) };
  }).filter((l) => l.bars.length);
  const tx = X(now);

  return (
    <>
      <div className="overflow-x-auto rounded-xl border bg-card">
        <div className="relative min-w-[960px]">
          <div className="grid h-9 grid-cols-[150px_1fr] border-b bg-slate-50">
            <div className="border-r border-slate-100" />
            <div className="relative">
              {months.map((d) => {
                const dt = parseDate(d);
                return (
                  <div key={d} className="absolute inset-y-0 border-l border-slate-100 px-1.5 py-2 text-[11.5px] font-semibold text-muted-foreground" style={{ left: `${X(d)}%` }}>
                    {dt.getMonth() === 0 || d === start ? `${dt.getFullYear()}年` : ""}
                    {dt.getMonth() + 1}月
                  </div>
                );
              })}
            </div>
          </div>
          <div className="grid grid-cols-[150px_1fr] border-b border-slate-100 bg-slate-50/60" style={{ minHeight: Math.max(1, msRows.length) * 28 + 14 }}>
            <div className="border-r border-slate-100 px-3.5 py-2.5 text-[13px] font-bold">
              主な予定<span className="block text-[11px] font-normal text-muted-foreground">公開・撮影・告知・公演</span>
            </div>
            <div className="relative">
              {ms.map(({ m, right, row }) => {
                const x = X(m.date);
                const top = 10 + row * 28;
                return (
                  <div key={m.date + m.label}>
                    <span className={cn("absolute size-3 -translate-x-1/2 rounded-full border-2 border-white ring-[1.5px] ring-slate-800", m.date >= now ? "bg-white" : "bg-slate-800")} style={{ left: `${x}%`, top: top + 2 }} />
                    <span className="absolute whitespace-nowrap text-[11.5px] leading-tight" style={right ? { right: `${100 - x}%`, paddingRight: 10, top } : { left: `${x}%`, paddingLeft: 10, top }}>
                      <b>{md(m.date)}</b> {m.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
          {lanes.map(({ w, bars, rowCount }) => (
            <div key={w.key} className="grid grid-cols-[150px_1fr] border-b border-slate-100 last:border-b-0" style={{ minHeight: rowCount * 28 + 16 }}>
              <div className="border-r border-slate-100 px-3.5 py-2.5 text-[13px] font-bold">
                {w.name}
                <span className="mt-0.5 block text-[11px] font-normal leading-snug text-muted-foreground">{w.role}</span>
              </div>
              <div className="relative">
                {bars.map(({ t, inside, left, row }) => {
                  const x = X(t.start);
                  const width = Math.max(X(addDays(t.due, 1)) - x, 0.8);
                  const top = 8 + row * 28;
                  const href = `/dashboard/projects/${p.id}/tasks?task=${t.id}`;
                  return (
                    <div key={t.id}>
                      <Link
                        href={href}
                        title={`${t.title}（${md(t.start)}〜${md(t.due)}）`}
                        className={cn(
                          "absolute h-[22px] overflow-hidden text-ellipsis whitespace-nowrap rounded-md border-l-[3px] px-2 text-[11.5px] leading-[22px] hover:brightness-95",
                          BAR[t.status],
                          isLate(t, now) && "shadow-[inset_0_0_0_1.5px_#dc2626]",
                          t.group && "outline-2 outline-offset-1 outline-dashed outline-indigo-500",
                        )}
                        style={{ left: `${x}%`, width: `${width}%`, top }}
                      >
                        {inside ? t.title : ""}
                      </Link>
                      {!inside && (
                        <Link href={href} className="absolute whitespace-nowrap px-1.5 text-[11.5px] leading-[22px] text-slate-500 hover:text-primary" style={left ? { right: `${100 - x}%`, top } : { left: `${x + width}%`, top }}>
                          {t.title}
                        </Link>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          <div className="pointer-events-none absolute bottom-0 left-[150px] right-0 top-9">
            {months.map((d) => (
              <div key={d} className="absolute inset-y-0 border-l border-slate-100" style={{ left: `${X(d)}%` }} />
            ))}
            {tx >= 0 && tx <= 100 && (
              <div className="absolute inset-y-0 z-[3] border-l-2 border-red-600" style={{ left: `${tx}%` }}>
                <span className="absolute bottom-1.5 left-1 whitespace-nowrap rounded bg-white px-1 text-[10.5px] font-bold text-red-600">今日</span>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="mt-2.5 flex flex-wrap gap-3.5 text-xs text-slate-500">
        {(
          [
            ["未着手", "bg-slate-100 border-l-slate-400"],
            ["進行中", "bg-indigo-50 border-l-indigo-600"],
            ["確認待ち", "bg-amber-50 border-l-amber-500"],
            ["完了", "bg-emerald-50 border-l-emerald-600"],
          ] as const
        ).map(([l, c]) => (
          <span key={l} className="inline-flex items-center gap-1.5">
            <i className={cn("inline-block h-3 w-[22px] rounded-sm border-l-[3px]", c)} />
            {l}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5">
          <i className="inline-block h-3 w-[22px] rounded-sm shadow-[inset_0_0_0_1.5px_#dc2626]" />
          遅れ
        </span>
        <span className="inline-flex items-center gap-1.5">
          <i className="inline-block h-3 w-[22px] rounded-sm outline-2 outline-offset-1 outline-dashed outline-indigo-500" />
          まとめて実施（共通撮影）
        </span>
      </div>
    </>
  );
}

"use client";

import Link from "next/link";
import { useState } from "react";
import { formatKpi, kpiProgress, md, pillarProgress } from "@/lib/domain/calc";
import type { Artist, Idea, Milestone, PillarKey } from "@/lib/domain/types";
import { Bar, PhasePill, Pill, Tag } from "@/components/app/ui";
import { NewProjectDialog } from "@/components/project/new-project-dialog";
import { cn } from "@/lib/utils";

export interface RoadmapProject {
  id: string;
  title: string;
  types: string[];
  phase: number;
  step: number;
  pillars: PillarKey[];
  progress: number;
  hasPlan: boolean;
  next: Milestone | null;
}

/** 柱（ゴールの分解）とロードマップ（ステップと企画）。柱をクリックすると関係する企画だけを強調 */
export function CareerMap({ artist, artists, projects }: { artist: Artist; artists: Artist[]; projects: RoadmapProject[] }) {
  const pl = artist.plan;
  const [pillar, setPillar] = useState<PillarKey | null>(null);
  const [dialog, setDialog] = useState<{ step: number; idea?: Idea } | null>(null);
  const pname = (k: PillarKey) => pl.pillars.find((p) => p.id === k)?.name ?? k;
  const dim = (ks: PillarKey[]) => pillar !== null && !ks.includes(pillar);

  return (
    <>
      <h2 className="mb-3 mt-7 flex flex-wrap items-baseline gap-2.5 text-base font-bold">
        {pl.pillars.length}つの柱<small className="text-[12.5px] font-normal text-muted-foreground">ゴールを分解したもの。柱をクリックすると、その柱を進める企画だけが強調されます</small>
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {pl.pillars.map((p) => {
          const v = Math.round(pillarProgress(p) * 100);
          return (
            <button
              key={p.id}
              onClick={() => setPillar(pillar === p.id ? null : p.id)}
              className={cn("flex flex-col rounded-xl border bg-card p-5 text-left shadow-xs transition", pillar === p.id ? "border-primary ring-[3px] ring-accent" : "hover:border-indigo-200")}
            >
              <div className="flex w-full items-center justify-between">
                <b className="text-[15px]">{p.name}</b>
                <span className="font-bold text-primary">{v}%</span>
              </div>
              <div className="mb-2.5 mt-1 min-h-10 text-[12.5px] text-slate-500">{p.goal}</div>
              {p.kpis.map((k) => (
                <div key={k.label} className="w-full border-t border-slate-100 py-2">
                  <div className="mb-1.5 flex justify-between gap-2 text-[12.5px]">
                    <span className="text-slate-500">{k.label}</span>
                    <span className="whitespace-nowrap">
                      <b>{formatKpi(k.now, k.unit)}</b>
                      <span className="text-muted-foreground"> / {formatKpi(k.target, k.unit)}</span>
                    </span>
                  </div>
                  <Bar value={kpiProgress(k) * 100} />
                </div>
              ))}
            </button>
          );
        })}
      </div>

      <h2 className="mb-3 mt-7 flex flex-wrap items-baseline gap-2.5 text-base font-bold">
        ロードマップ<small className="text-[12.5px] font-normal text-muted-foreground">ゴールまでのステップと、各ステップで行う企画。点線は構想中</small>
      </h2>
      <div className="grid items-start gap-3.5" style={{ gridTemplateColumns: `repeat(${Math.min(pl.steps.length, 3)}, minmax(0, 1fr))` }}>
        {pl.steps.map((s, i) => (
          <div key={i} className={cn("min-h-52 rounded-xl p-3", i === 0 ? "bg-indigo-50" : "bg-slate-100")}>
            <div className="px-1.5 pb-3 pt-1">
              <div className="flex items-center gap-2 text-[15px] font-bold">
                {s.label}
                {i === 0 && <Pill tone="prog">いまここ</Pill>}
              </div>
              <div className="mt-1 text-[13px] leading-relaxed text-slate-600">{s.text}</div>
              <div className="mt-2 flex flex-wrap gap-1">
                {s.focus.map((f) => (
                  <Tag key={f} variant="white">
                    重点：{pname(f)}
                  </Tag>
                ))}
              </div>
            </div>
            {projects
              .filter((p) => p.step === i)
              .map((p) => (
                <Link
                  key={p.id}
                  href={`/dashboard/projects/${p.id}`}
                  className={cn("mb-2.5 block rounded-[10px] border bg-card px-3.5 py-3 transition hover:border-indigo-200 hover:shadow-md", dim(p.pillars) && "opacity-30")}
                >
                  <div className="flex items-center justify-between gap-1.5">
                    <PhasePill phase={p.phase} />
                    <span className="text-[11.5px] text-muted-foreground">{p.types.join("＋")}</span>
                  </div>
                  <div className="my-2 font-bold leading-snug">{p.title}</div>
                  {p.hasPlan ? (
                    <div className="flex items-center gap-2">
                      <Bar value={p.progress} className="flex-1" />
                      <span className="text-[11.5px] text-muted-foreground">{p.progress}%</span>
                    </div>
                  ) : (
                    <Tag variant="dashed">計画はこれから</Tag>
                  )}
                  <div className="mt-2 flex flex-wrap gap-1">
                    {p.pillars.map((x) => (
                      <Tag key={x} variant={pillar === x ? "primary" : "default"}>
                        {pname(x)}
                      </Tag>
                    ))}
                  </div>
                  {p.next && (
                    <div className="mt-2 text-[11.5px] text-muted-foreground">
                      次：{md(p.next.date)} {p.next.label}
                    </div>
                  )}
                </Link>
              ))}
            {pl.ideas
              .filter((x) => x.step === i)
              .map((x) => (
                <button
                  key={x.id}
                  onClick={() => setDialog({ step: i, idea: x })}
                  className={cn("mb-2.5 block w-full rounded-[10px] border-[1.5px] border-dashed border-slate-300 px-3.5 py-3 text-left hover:border-primary", dim(x.pillars) && "opacity-30")}
                >
                  <div className="text-[11.5px] text-muted-foreground">構想中 ・ クリックで企画にする</div>
                  <div className="my-1.5 font-bold leading-snug">{x.title}</div>
                  <div className="flex flex-wrap gap-1">
                    {x.pillars.map((y) => (
                      <Tag key={y} variant={pillar === y ? "primary" : "default"}>
                        {pname(y)}
                      </Tag>
                    ))}
                  </div>
                </button>
              ))}
            <button
              onClick={() => setDialog({ step: i })}
              className="h-9 w-full rounded-[10px] border-[1.5px] border-dashed border-slate-300 text-[12.5px] font-semibold text-slate-500 hover:border-primary hover:bg-white hover:text-primary"
            >
              ＋ このステップに企画を追加
            </button>
          </div>
        ))}
      </div>
      {dialog && <NewProjectDialog artists={artists} artistId={artist.id} step={dialog.step} idea={dialog.idea} onClose={() => setDialog(null)} />}
    </>
  );
}

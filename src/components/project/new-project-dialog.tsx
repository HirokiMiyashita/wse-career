"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { client } from "@/lib/orpc/client";
import { formatKpi } from "@/lib/domain/calc";
import type { Artist, Idea, PillarKey } from "@/lib/domain/types";
import { Modal, useToast } from "@/components/app/overlay";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const TYPES = ["アルバム", "EP", "シングル", "ワンマン", "ツアー", "対バン・イベント"];

export function openAiPanel() {
  window.dispatchEvent(new CustomEvent("wse:open-ai"));
}

export function NewProjectButton({ artists, artistId, label = "＋ 新しい企画", variant = "default" }: { artists: Artist[]; artistId?: string; label?: string; variant?: "default" | "outline" }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant={variant} onClick={() => setOpen(true)}>
        {label}
      </Button>
      {open && <NewProjectDialog artists={artists} artistId={artistId} onClose={() => setOpen(false)} />}
    </>
  );
}

/** キャリアプランのステップから企画を作る（4ステップ） */
export function NewProjectDialog({ artists, artistId, step: initialStep, idea, onClose }: { artists: Artist[]; artistId?: string; step?: number; idea?: Idea; onClose: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const [page, setPage] = useState(0);
  const [aid, setAid] = useState(artistId ?? artists[0]?.id ?? "");
  const artist = artists.find((a) => a.id === aid);
  const [step, setStep] = useState(idea?.step ?? initialStep ?? 0);
  const [pillars, setPillars] = useState<PillarKey[]>(idea ? [...idea.pillars] : [...(artist?.plan.steps[initialStep ?? 0]?.focus ?? [])]);
  const [types, setTypes] = useState<string[]>(idea ? [] : ["アルバム"]);
  const [title, setTitle] = useState(idea?.title ?? "");
  const [targets, setTargets] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  if (!artist) return null;
  const pl = artist.plan;

  const toggle = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  const suggested = (now: number, target: number) => Math.round(now + (target - now) / Math.max(1, pl.steps.length - step));
  const goalRows = pillars.flatMap((pid) => {
    const p = pl.pillars.find((x) => x.id === pid);
    return p ? p.kpis.map((k, j) => ({ key: `${pid}${j}`, pillar: pid, pillarName: p.name, k })) : [];
  });

  async function finish(mode: "ai" | "template") {
    setSaving(true);
    try {
      const r = await client.projects.create({
        artistId: aid,
        step,
        pillars,
        types,
        title,
        ideaId: idea?.id,
        goals: goalRows
          .filter((g) => g.key.endsWith("0"))
          .map((g) => ({ label: g.k.label, now: g.k.now, target: targets[g.key] ?? suggested(g.k.now, g.k.target), unit: g.k.unit, pillar: g.pillar })),
      });
      toast("企画を作成しました（協議中の下書き）");
      onClose();
      router.push(`/dashboard/projects/${r.id}`);
      router.refresh();
      if (mode === "ai") setTimeout(openAiPanel, 400);
    } finally {
      setSaving(false);
    }
  }

  const titles = ["キャリアのどこを担う企画か", "企画の中身", "この企画の目標", "計画の作り方"];
  return (
    <Modal
      open
      onClose={onClose}
      title={titles[page]}
      sub={`新しい企画 ・ ステップ ${page + 1}/4`}
      footer={
        <>
          <Button variant="outline" onClick={() => (page ? setPage(page - 1) : onClose())}>
            {page ? "戻る" : "キャンセル"}
          </Button>
          {page < 3 ? (
            <Button onClick={() => setPage(page + 1)} disabled={page === 0 && !pillars.length}>
              次へ
            </Button>
          ) : (
            <span />
          )}
        </>
      }
    >
      <div className="mb-4 flex gap-1.5">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={cn("h-1 flex-1 rounded-full", i <= page ? "bg-primary" : "bg-slate-200")} />
        ))}
      </div>
      {page === 0 && (
        <div className="space-y-4">
          <Field label="アーティスト">
            <div className="flex flex-wrap gap-1.5">
              {artists.map((a) => (
                <Chip
                  key={a.id}
                  on={aid === a.id}
                  onClick={() => {
                    setAid(a.id);
                    setStep(0);
                    setPillars([...(a.plan.steps[0]?.focus ?? [])]);
                  }}
                >
                  {a.name}
                </Chip>
              ))}
            </div>
          </Field>
          <Field label={`どのステップの企画か（${pl.horizon}のゴール：${pl.vision}）`}>
            {pl.steps.map((s, i) => (
              <button
                key={i}
                onClick={() => {
                  setStep(i);
                  setPillars([...s.focus]);
                }}
                className={cn("mb-2 block w-full rounded-lg border-[1.5px] px-3.5 py-2.5 text-left text-sm", step === i ? "border-primary bg-accent" : "hover:border-indigo-200")}
              >
                <b>{s.label}</b>　<span className="text-[13px]">{s.text}</span>
              </button>
            ))}
          </Field>
          <Field label="主に進める柱（複数可）">
            <div className="flex flex-wrap gap-1.5">
              {pl.pillars.map((p) => (
                <Chip key={p.id} on={pillars.includes(p.id)} onClick={() => setPillars(toggle(pillars, p.id))}>
                  {p.name}：{p.goal}
                </Chip>
              ))}
            </div>
          </Field>
        </div>
      )}
      {page === 1 && (
        <div className="space-y-4">
          <Field label="含めるもの（複数選ぶと連動した企画になります）">
            <div className="flex flex-wrap gap-1.5">
              {TYPES.map((t) => (
                <Chip key={t} on={types.includes(t)} onClick={() => setTypes(toggle(types, t))}>
                  {t}
                </Chip>
              ))}
            </div>
          </Field>
          <Field label="企画名">
            <input className="h-9 w-full rounded-lg border px-3 text-sm outline-none focus:border-primary" value={title} placeholder="例：2ndアルバムと秋のワンマン" onChange={(e) => setTitle(e.target.value)} />
          </Field>
        </div>
      )}
      {page === 2 && (
        <div className="space-y-3">
          <p className="text-[13px] text-slate-500">選んだ柱の指標から、この企画の目標を提案しています。ゴールまでの距離を見ながら調整してください。</p>
          {goalRows.map((g) => (
            <Field key={g.key} label={`${g.pillarName}：${g.k.label}`} hint={`いま ${formatKpi(g.k.now, g.k.unit)} → ゴール ${formatKpi(g.k.target, g.k.unit)}`}>
              <div className="flex items-center gap-2 text-sm">
                この企画で
                <input
                  type="number"
                  className="h-9 w-36 rounded-lg border px-3 text-right outline-none focus:border-primary"
                  value={targets[g.key] ?? suggested(g.k.now, g.k.target)}
                  onChange={(e) => setTargets({ ...targets, [g.key]: Number(e.target.value) })}
                />
                {g.k.unit}
              </div>
            </Field>
          ))}
        </div>
      )}
      {page === 3 && (
        <div>
          <p className="mb-3 text-[13px] text-slate-500">作った企画は「協議」の段階の下書きになり、本人とWSの共同承認で確定します。</p>
          <div className="grid gap-2.5 sm:grid-cols-2">
            <div className="rounded-xl border border-indigo-200 p-4">
              <b>AIに進め方の案を出してもらう</b>
              <p className="mb-3 mt-1.5 text-[12.5px] text-slate-500">目標と過去の実績から2〜3案を比べ、選んだ案をタスクにする</p>
              <Button size="sm" disabled={saving} onClick={() => finish("ai")}>
                作成してAIに相談
              </Button>
            </div>
            <div className="rounded-xl border p-4">
              <b>テンプレートから作る</b>
              <p className="mb-3 mt-1.5 text-[12.5px] text-slate-500">「アルバム＋ワンマン」などの標準の流れから作る</p>
              <Button size="sm" variant="outline" disabled={saving} onClick={() => finish("template")}>
                作成する
              </Button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 flex justify-between gap-2 text-xs font-semibold text-slate-600">
        <span>{label}</span>
        {hint && <span className="font-normal text-muted-foreground">{hint}</span>}
      </div>
      {children}
    </div>
  );
}
export function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={cn("h-8 rounded-full border px-3 text-[13px]", on ? "border-primary bg-accent font-semibold text-accent-foreground" : "bg-card text-slate-600 hover:border-indigo-200")}>
      {children}
    </button>
  );
}

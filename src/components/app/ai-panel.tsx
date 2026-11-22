"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { client } from "@/lib/orpc/client";
import type { AiBlock } from "@/lib/domain/ai";
import type { PillarKey } from "@/lib/domain/types";
import { man, md, yen, ymd } from "@/lib/domain/calc";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useToast } from "./overlay";

export interface AiArtistInfo {
  id: string;
  name: string;
  horizon: string;
  nextStepLabel: string | null;
}
export interface AiProjectInfo {
  id: string;
  title: string;
  artistId: string;
  hasPlan: boolean;
}
type Msg = { role: "user"; text: string } | { role: "ai"; blocks: AiBlock[] };

/** どの画面からでも開ける AI 相談パネル。開いている画面（アーティスト・企画）を文脈として渡す */
export function AiPanel({ artists, projects }: { artists: AiArtistInfo[]; projects: AiProjectInfo[] }) {
  const pathname = usePathname();
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState("");
  const logRef = useRef<HTMLDivElement>(null);

  const pm = pathname.match(/^\/dashboard\/projects\/([^/]+)/);
  const am = pathname.match(/^\/dashboard\/artists\/([^/]+)/);
  const project = pm ? (projects.find((p) => p.id === pm[1]) ?? null) : null;
  const artist = project ? (artists.find((a) => a.id === project.artistId) ?? null) : am && am[1] !== "new" ? (artists.find((a) => a.id === am[1]) ?? null) : null;
  const contextLabel = project ? `企画：${project.title}` : artist ? `${artist.name} のキャリアプラン` : "全体";

  const chips: string[] = (() => {
    if (project && !project.hasPlan) return project.id === "P2" ? ["進め方の案を3つ出して", "初ワンマンの規模は250人で無理がない？"] : ["この企画の進め方の案を出して"];
    if (project) return ["この企画の目標は、キャリアのゴールに対して妥当？", "遅れているタスクの影響は？"];
    if (artist) {
      const draft = projects.find((p) => p.artistId === artist.id && !p.hasPlan && p.id === "P2");
      return [
        ...(draft ? [`「${draft.title}」の進め方の案を3つ出して`] : []),
        `${artist.nextStepLabel ?? "次"}のステップに向けて、どんな企画が考えられる？`,
        `いまのペースで${artist.horizon}のゴールに届きそう？`,
      ];
    }
    return ["今週、優先して判断すべきことは？", "キャリアの進み具合が遅れているアーティストは？"];
  })();

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, busy]);
  // 他の画面から「AIに相談」を開く（window.dispatchEvent(new CustomEvent("wse:open-ai"))）
  useEffect(() => {
    const h = () => setOpen(true);
    window.addEventListener("wse:open-ai", h);
    return () => window.removeEventListener("wse:open-ai", h);
  }, []);

  async function ask(text?: string) {
    const question = (text ?? q).trim();
    if (!question || busy) return;
    setQ("");
    setMsgs((m) => [...m, { role: "user", text: question }]);
    setBusy(true);
    try {
      const r = await client.ai.ask({ question, artistId: artist?.id, projectId: project?.id });
      setMsgs((m) => [...m, { role: "ai", blocks: r.blocks }]);
    } catch (e) {
      setMsgs((m) => [...m, { role: "ai", blocks: [{ type: "text", text: `エラー：${e instanceof Error ? e.message : "回答を取得できませんでした"}` }] }]);
    } finally {
      setBusy(false);
    }
  }
  async function preview(projectId: string, option: "A" | "B" | "C") {
    setMsgs((m) => [...m, { role: "user", text: `案${option}で計画を作って` }]);
    setBusy(true);
    try {
      const r = await client.ai.preview({ projectId, option });
      setMsgs((m) => [...m, { role: "ai", blocks: r.blocks }]);
    } finally {
      setBusy(false);
    }
  }
  async function apply(projectId: string, option: "A" | "B" | "C") {
    await client.projects.applyPlan({ projectId, option });
    setMsgs((m) => [...m, { role: "ai", blocks: [{ type: "text", text: "企画に反映しました。スケジュールを表示しています。" }] }]);
    toast(`案${option}を企画に反映しました（下書き）`);
    router.push(`/dashboard/projects/${projectId}/schedule`);
    router.refresh();
  }
  async function addIdea(artistId: string, step: number, title: string, pillars: PillarKey[]) {
    const r = await client.artists.addIdea({ artistId, title, pillars, step });
    toast(r.added ? `「${title}」をロードマップに追加しました（構想中）` : "すでにロードマップにあります");
    router.refresh();
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex h-11 items-center gap-2 rounded-full bg-slate-900 pl-3.5 pr-4 text-sm font-bold text-white shadow-xl hover:bg-black"
      >
        <span className="size-5 rounded-full bg-linear-to-br from-indigo-300 to-indigo-600" />
        <span className="hidden sm:inline">AIに相談</span>
      </button>
      <aside className={cn("fixed inset-y-0 right-0 z-[55] flex w-[460px] max-w-full flex-col bg-card shadow-2xl transition-transform duration-200", open ? "translate-x-0" : "translate-x-full")}>
        <div className="relative border-b px-5 py-4">
          <button onClick={() => setOpen(false)} className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-lg text-xl text-slate-500 hover:bg-muted" aria-label="閉じる">
            ×
          </button>
          <b className="text-[15px]">AIに相談</b>
          <div className="text-xs text-slate-500">いま見ている画面：{contextLabel}</div>
        </div>
        <div ref={logRef} className="flex flex-1 flex-col gap-3.5 overflow-auto bg-slate-50 px-5 py-4">
          {msgs.length === 0 && (
            <AiBubble>
              <p>キャリアプラン・企画・過去の振り返りをもとに相談にのります。下の質問から選ぶか、自由に入力してください。</p>
              <p className="mt-2 text-xs text-muted-foreground">AIの案はたたき台です。確定は本人とWSの共同承認で行います。</p>
            </AiBubble>
          )}
          {msgs.map((m, i) =>
            m.role === "user" ? (
              <div key={i} className="max-w-[85%] self-end rounded-2xl rounded-br-sm bg-primary px-3.5 py-2 text-[13px] text-primary-foreground">
                {m.text}
              </div>
            ) : (
              <AiBubble key={i}>
                {m.blocks.map((b, j) => (
                  <Block key={j} b={b} onPreview={preview} onApply={apply} onAddIdea={addIdea} />
                ))}
              </AiBubble>
            ),
          )}
          {busy && (
            <AiBubble>
              <span className="inline-flex gap-1">
                {[0, 1, 2].map((k) => (
                  <span key={k} className="size-1.5 animate-pulse rounded-full bg-slate-400" style={{ animationDelay: `${k * 150}ms` }} />
                ))}
              </span>
            </AiBubble>
          )}
        </div>
        {!busy && (
          <div className="flex flex-col gap-1.5 px-5 pb-1 pt-2.5">
            {chips.map((c) => (
              <button key={c} onClick={() => ask(c)} className="rounded-xl border bg-card px-3 py-2 text-left text-[12.5px] text-slate-600 hover:border-primary hover:text-primary">
                {c}
              </button>
            ))}
          </div>
        )}
        <form
          className="flex gap-2 border-t px-5 pb-4 pt-3"
          onSubmit={(e) => {
            e.preventDefault();
            ask();
          }}
        >
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="相談したいことを入力" className="h-10 flex-1 rounded-xl border px-3 text-sm outline-none focus:border-primary" />
          <Button type="submit" disabled={busy}>
            送信
          </Button>
        </form>
      </aside>
    </>
  );
}

function AiBubble({ children }: { children: React.ReactNode }) {
  return <div className="max-w-full self-start rounded-2xl rounded-bl-sm border bg-card px-3.5 py-3 text-[13px] leading-relaxed">{children}</div>;
}

function Block({
  b,
  onPreview,
  onApply,
  onAddIdea,
}: {
  b: AiBlock;
  onPreview: (projectId: string, option: "A" | "B" | "C") => void;
  onApply: (projectId: string, option: "A" | "B" | "C") => void;
  onAddIdea: (artistId: string, step: number, title: string, pillars: PillarKey[]) => void;
}) {
  switch (b.type) {
    case "text":
      return <p className="mt-1.5 first:mt-0">{b.text}</p>;
    case "note":
      return <p className="mt-2.5 text-xs text-muted-foreground">{b.text}</p>;
    case "list":
      return (
        <ul className="ml-4 mt-1.5 list-disc">
          {b.items.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      );
    case "options":
      return (
        <div>
          {b.options.map((o) => (
            <div key={o.key} className="mt-2.5 rounded-xl border bg-card p-3">
              <b className="block leading-snug">
                案{o.key}：{o.title}
              </b>
              <dl className="my-2 grid grid-cols-[84px_1fr] gap-x-2 gap-y-0.5 text-xs">
                <dt className="text-muted-foreground">先行曲</dt>
                <dd>{o.singles.map(md).join("・")}</dd>
                <dt className="text-muted-foreground">EP発売</dt>
                <dd>{ymd(o.release)}</dd>
                <dt className="text-muted-foreground">ライブ</dt>
                <dd>
                  {ymd(o.show)}・{o.showName}
                </dd>
                <dt className="text-muted-foreground">告知期間</dt>
                <dd>{o.weeks}週間</dd>
                <dt className="text-muted-foreground">予算</dt>
                <dd>{man(o.total)}</dd>
                <dt className="text-muted-foreground">ゴールへの効き方</dt>
                <dd>
                  月間リスナー {o.listenersTarget.toLocaleString("ja-JP")}人想定（ゴールの{o.goalShare}%）／必要転換率 {o.required.toFixed(2)}%
                </dd>
              </dl>
              <div className="mb-2 rounded-md bg-slate-50 px-2.5 py-1.5 text-xs text-slate-600">{o.risk}</div>
              <Button size="sm" onClick={() => onPreview(b.projectId, o.key)}>
                この案で計画を作る
              </Button>
            </div>
          ))}
        </div>
      );
    case "ideas":
      return (
        <div>
          {b.ideas.map((x) => (
            <div key={x.title} className="mt-2.5 rounded-xl border bg-card p-3">
              <b className="block">{x.title}</b>
              <div className="my-1 text-xs text-muted-foreground">柱：{x.pillarNames.join("・")}</div>
              <div className="mb-2 text-[12.5px]">{x.reason}</div>
              <Button size="sm" variant="outline" onClick={() => onAddIdea(b.artistId, b.step, x.title, x.pillars)}>
                ロードマップに追加
              </Button>
            </div>
          ))}
        </div>
      );
    case "preview":
      return (
        <div className="mt-2.5 rounded-xl border bg-card p-3">
          <dl className="grid grid-cols-[70px_1fr] gap-x-2 gap-y-1 text-xs">
            <dt className="text-muted-foreground">主な予定</dt>
            <dd>
              {b.milestones.map((m) => (
                <div key={m.date + m.label}>
                  {md(m.date)} {m.label}
                </div>
              ))}
            </dd>
            <dt className="text-muted-foreground">タスク</dt>
            <dd>
              {b.taskCount}件（{b.byWorkstream.map((w) => `${w.name}${w.count}`).join("・")}）
            </dd>
            <dt className="text-muted-foreground">担当</dt>
            <dd>{b.byPerson.map((p) => `${p.label} ${p.count}`).join("／")}</dd>
            <dt className="text-muted-foreground">予算</dt>
            <dd>{yen(b.total)}</dd>
          </dl>
          <div className="mt-2 flex flex-col gap-1">
            {b.warnings.map((w) => (
              <div key={w} className="flex gap-2 text-xs text-amber-800">
                <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-amber-500 text-[10px] font-extrabold text-white">!</span>
                {w}
              </div>
            ))}
          </div>
          <Button size="sm" className="mt-2.5" onClick={() => onApply(b.projectId, b.option)}>
            企画に反映する
          </Button>
        </div>
      );
  }
}

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { client } from "@/lib/orpc/client";
import { addDays, fmt, formatKpi, today } from "@/lib/domain/calc";
import { CONDITIONAL_SCOPE, OUT_OF_SCOPE, WS_CORE, defaultScope } from "@/lib/domain/constants";
import type { PillarKey, ScopeLevel } from "@/lib/domain/types";
import { Note, Pill } from "@/components/app/ui";
import { useToast } from "@/components/app/overlay";
import { Chip, Field } from "@/components/project/new-project-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STEPS = ["基本情報", "現在地", "目指す姿", "柱と指標", "ステップ", "最初の企画と確定"];
interface KpiDraft {
  label: string;
  base: number;
  now: number;
  target: string;
  unit: string;
  note?: string;
}
interface PillarDraft {
  id: PillarKey;
  name: string;
  goal: string;
  kpis: KpiDraft[];
}
interface StepDraft {
  label: string;
  text: string;
  focus: PillarKey[];
}
interface Form {
  name: string;
  role: string;
  base: string;
  scope: Record<string, ScopeLevel>;
  now: { listeners: string; live: string; works: string; releases: string; money: string };
  memo: { want: string; worry: string };
  years: number;
  vision: string;
  visionIdeas: string[] | null;
  pillars: PillarDraft[] | null;
  steps: StepDraft[] | null;
  first: { make: boolean; title: string; types: string[] };
  reviewDate: string;
}

const initial = (): Form => ({
  name: "",
  role: "",
  base: "",
  scope: defaultScope(),
  now: { listeners: "", live: "", works: "", releases: "", money: "" },
  memo: { want: "", worry: "" },
  years: 3,
  vision: "",
  visionIdeas: null,
  pillars: null,
  steps: null,
  first: { make: true, title: "", types: ["EP", "企画ライブ"] },
  reviewDate: addDays(today(), 14),
});

const num = (v: string) => Number(v) || 0;
const startYear = () => Number(today().slice(0, 4)) + 1;

function pillarTemplate(f: Form): PillarDraft[] {
  const n = f.now;
  return [
    { id: "work", name: "作品", goal: "名刺代わりになる作品を持つ", kpis: [{ label: "EP・アルバム", base: num(n.works), now: num(n.works), target: "", unit: "作" }] },
    { id: "live", name: "ライブ", goal: "ワンマンが成立する動員をつくる", kpis: [{ label: "ワンマン・企画ライブ最大動員", base: num(n.live), now: num(n.live), target: "", unit: "人" }] },
    { id: "fan", name: "リスナー", goal: "聴いてくれる人を広げる", kpis: [{ label: "月間リスナー", base: num(n.listeners), now: num(n.listeners), target: "", unit: "人" }] },
    {
      id: "base",
      name: "活動基盤",
      goal: "制作と活動を無理なく続けられる",
      kpis: [
        { label: "年間リリース曲数", base: num(n.releases), now: num(n.releases), target: "", unit: "曲" },
        { label: "年間の活動収支", base: num(n.money), now: num(n.money), target: "", unit: "万円" },
      ],
    },
  ];
}
function stepsTemplate(f: Form): StepDraft[] {
  const y = startYear();
  const labels = f.years === 1 ? [`${y}前半`, `${y}後半`] : Array.from({ length: f.years }, (_, i) => String(y + i));
  return labels.map((label, i) => ({ label, text: "", focus: i === 0 ? ["work", "live"] : i === labels.length - 1 ? ["live", "base"] : ["fan", "live"] }));
}

export function NewArtistWizard() {
  const router = useRouter();
  const toast = useToast();
  const [f, setF] = useState<Form>(initial);
  const [step, setStep] = useState(0);
  const [error, setError] = useState<{ field: string; msg: string } | null>(null);
  const [scopeOpen, setScopeOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const set = (patch: Partial<Form>) => setF((x) => ({ ...x, ...patch }));
  const horizonYear = Number(today().slice(0, 4)) + f.years;

  const errorOf = (i: number) =>
    i === 0 && !f.name.trim()
      ? { field: "name", msg: "アーティスト名を入力してください" }
      : i === 2 && !f.vision.trim()
        ? { field: "vision", msg: "目指す姿を入力してください（「AIに言い回しの案を出してもらう」から選ぶこともできます）" }
        : null;

  function go(target: number) {
    for (let k = 0; k < target; k++) {
      const e = errorOf(k);
      if (e) {
        setError(e);
        setStep(k);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
    }
    setError(null);
    setF((x) => {
      let next = x;
      if (target >= 3 && !next.pillars) next = { ...next, pillars: pillarTemplate(next) };
      if (target >= 4 && (!next.steps || next.steps.length !== (next.years === 1 ? 2 : next.years))) next = { ...next, steps: stepsTemplate(next) };
      if (target >= 5 && !next.first.title) next = { ...next, first: { ...next.first, title: `${next.first.types.join("と")}（${next.steps?.[0]?.label ?? "最初"}）` } };
      return next;
    });
    setStep(target);
    window.scrollTo({ top: 0 });
  }

  function sample() {
    set({
      name: "RIKU（仮）",
      role: "ラッパー／トラックメイカー",
      base: "川崎",
      now: { listeners: "6500", live: "120", works: "1", releases: "3", money: "-20" },
      memo: { want: "自分でトラックも作るスタイルを崩さない。地元の仲間と一緒に大きくなりたい", worry: "制作に時間がかかり、リリースの間隔が空きがち" },
    });
    toast("サンプルを入力しました");
  }

  function aiVision() {
    const base = f.base || "地元";
    const role = (f.role || "アーティスト").split("／")[0];
    const want = f.memo.want;
    const style = /トラック/.test(want + f.role) ? "自分でトラックも作るスタイルが認められ、" : /ライブ/.test(want) ? "ライブで評価され、" : "作品が評価され、";
    const live = Math.max(200, Math.round((num(f.now.live) || 100) * 2.5 / 50) * 50);
    set({
      visionIdeas: [
        `${base}発の${role}として、${style}${base}でワンマン（${live}人規模）が成立している`,
        `${style}${base}の外にもリスナーが広がり、${role}としての活動だけで制作を続けられている`,
        `${/仲間/.test(want) ? "地元の仲間と一緒に、" : ""}作品とライブの両方で手応えがあり、毎年のリリースとワンマンが定例になっている`,
      ],
    });
  }

  function aiTargets() {
    if (!f.pillars) return;
    const y = f.years;
    const pillars: PillarDraft[] = f.pillars.map((p) => ({ ...p, kpis: p.kpis.map((k) => ({ ...k })) }));
    const fan = pillars.find((p) => p.id === "fan")?.kpis[0];
    const listenersTarget = fan ? (fan.target ? num(fan.target) : Math.max(fan.now + 5000, Math.round((fan.now * Math.pow(1.7, y)) / 1000) * 1000)) : 0;
    pillars.forEach((p) =>
      p.kpis.forEach((k) => {
        let t: number | null = null;
        let why = "";
        if (/リスナー/.test(k.label)) {
          t = listenersTarget;
          why = "過去の企画では半年で約1.8倍（SHUN）。年1.7倍で計算";
        } else if (/動員/.test(k.label)) {
          t = Math.max(k.now + 50, Math.round((listenersTarget * 0.01) / 10) * 10);
          why = `目標の月間リスナー${fmt(listenersTarget)}人 × ライブ転換率1.0%（社内実績0.8〜1.5%）`;
        } else if (/EP|アルバム|作品/.test(k.label)) {
          t = k.now + y;
          why = "年1作のペース";
        } else if (/曲数/.test(k.label)) {
          t = Math.max(k.now + 2, 6);
          why = "連続配信の実績（年6曲以上で認知が伸びた）";
        } else if (/収支/.test(k.label)) {
          t = 0;
          why = "赤字にしない（続けられるか）";
        }
        if (t !== null) {
          if (k.target === "") k.target = String(t);
          k.note = `AI案：${why}`;
        }
      }),
    );
    set({ pillars });
    toast("空欄の目標に案を入れました");
  }

  function aiSteps() {
    if (!f.steps) return;
    const n = f.steps.length;
    const base = f.base || "地元";
    const first = `${/間隔|ペース/.test(f.memo.worry) ? "リリースの間隔を整え、" : ""}名刺代わりの作品と、${base}での企画ライブで基盤をつくる`;
    const mids = [`リスナーを${base}の外へ広げ、ワンマンの動員をつくる`, "ワンマンを定例にし、活動の幅を広げる", "制作を続けられる体制を整える"];
    const last = n >= 3 ? "目指す姿を成立させ、次の目標を決める" : `${base}でワンマンを成立させる`;
    set({ steps: f.steps.map((s, i) => (s.text ? s : { ...s, text: i === 0 ? first : i === n - 1 ? last : mids[Math.min(i - 1, mids.length - 1)] })) });
    toast("空欄のステップに下書きを入れました");
  }

  async function save() {
    for (const k of [0, 2]) {
      const e = errorOf(k);
      if (e) {
        setError(e);
        setStep(k);
        return;
      }
    }
    if (!f.pillars || !f.steps) return;
    setSaving(true);
    try {
      const r = await client.artists.create({
        name: f.name,
        role: f.role,
        base: f.base,
        scope: f.scope,
        memo: f.memo,
        years: f.years,
        vision: f.vision,
        pillars: f.pillars.map((p) => ({ id: p.id, name: p.name, goal: p.goal, kpis: p.kpis.map((k) => ({ label: k.label, base: k.base, now: k.now, target: k.target === "" ? k.now + 1 : num(k.target), unit: k.unit })) })),
        steps: f.steps,
        firstProject: f.first,
        reviewDate: f.reviewDate,
      });
      toast("キャリアプランを下書きとして保存しました");
      router.push(`/dashboard/artists/${r.id}`);
      router.refresh();
    } catch (e) {
      toast(`エラー：${e instanceof Error ? e.message : "保存できませんでした"}`);
    } finally {
      setSaving(false);
    }
  }

  const input = (bad?: boolean) => cn("h-9 w-full rounded-lg border bg-white px-3 text-sm outline-none focus:border-primary", bad && "border-red-300 bg-red-50/40");
  const ta = (bad?: boolean) => cn("w-full rounded-lg border bg-white px-3 py-2 text-sm leading-relaxed outline-none focus:border-primary", bad && "border-red-300 bg-red-50/40");
  const card = "rounded-xl border bg-card p-5 shadow-xs";

  return (
    <div className="grid items-start gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
      <aside className={cn(card, "md:sticky md:top-5")}>
        <div className="mb-2 text-xs font-semibold text-muted-foreground">キャリアプランの作成</div>
        {STEPS.map((s, i) => (
          <button
            key={s}
            onClick={() => go(i)}
            className={cn("flex w-full items-center gap-2.5 rounded-lg px-1.5 py-2 text-left text-sm", i === step ? "bg-accent font-bold text-accent-foreground" : i < step ? "text-foreground" : "text-muted-foreground")}
          >
            <span className={cn("flex size-[22px] shrink-0 items-center justify-center rounded-full text-[11px] font-bold", i < step ? "bg-emerald-600 text-white" : i === step ? "bg-primary text-white" : "border-[1.5px]")}>
              {i < step ? "✓" : i + 1}
            </span>
            {s}
          </button>
        ))}
        {step === 0 && (
          <Button variant="outline" size="sm" className="mt-3 w-full" onClick={sample}>
            サンプルを入力
          </Button>
        )}
      </aside>

      <div>
        {error && (
          <Note tone="warn" className="mb-3 font-semibold">
            {error.msg}
          </Note>
        )}

        {step === 0 && (
          <>
            <div className={cn(card, "grid gap-3 sm:grid-cols-3")}>
              <Field label="アーティスト名" hint={f.name ? undefined : "必須"}>
                <input className={input(error?.field === "name")} value={f.name} placeholder="例：RIKU" onChange={(e) => set({ name: e.target.value })} />
              </Field>
              <Field label="活動内容">
                <input className={input()} value={f.role} placeholder="例：ラッパー／トラックメイカー" onChange={(e) => set({ role: e.target.value })} />
              </Field>
              <Field label="拠点">
                <input className={input()} value={f.base} placeholder="例：川崎" onChange={(e) => set({ base: e.target.value })} />
              </Field>
            </div>
            <section className="mt-4 rounded-xl border bg-card shadow-xs">
              <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5">
                <h3 className="text-[15px] font-bold">
                  WSの業務範囲<span className="ml-2 text-xs font-normal text-muted-foreground">WSの標準の範囲をひな形として入れています</span>
                </h3>
                <Button variant="outline" size="sm" onClick={() => setScopeOpen(!scopeOpen)}>
                  {scopeOpen ? "閉じる" : "項目ごとに変更する"}
                </Button>
              </header>
              {!scopeOpen ? (
                <div className="grid gap-3 p-5 md:grid-cols-3">
                  {(
                    [
                      ["提供", "標準で提供", "done"],
                      ["個別協議", "個別に協議", "wait"],
                      ["担当外", "原則担当しない", "todo"],
                    ] as const
                  ).map(([v, label, tone]) => {
                    const items = Object.entries(f.scope).filter(([, x]) => x === v).map(([k]) => k);
                    return (
                      <div key={v}>
                        <Pill tone={tone}>
                          {label}（{items.length}）
                        </Pill>
                        <div className="mt-1.5 text-xs leading-relaxed text-slate-500">{items.join("／")}</div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div>
                  {[
                    { title: "標準で提供する業務", items: WS_CORE.flatMap((c) => c.items) },
                    { title: "状況に応じて個別に協議する業務", items: CONDITIONAL_SCOPE },
                    { title: "原則担当しない業務", items: OUT_OF_SCOPE },
                  ].map((g) => (
                    <div key={g.title}>
                      <div className="bg-slate-50 px-5 py-2 text-[12.5px] font-bold">{g.title}</div>
                      {g.items.map((item) => (
                        <div key={item} className="flex items-center gap-3 border-b border-slate-100 px-5 py-2">
                          <span className="flex-1 text-[13px]">{item}</span>
                          <div className="inline-flex rounded-lg border bg-muted p-0.5">
                            {(["提供", "個別協議", "担当外"] as ScopeLevel[]).map((v) => (
                              <button
                                key={v}
                                onClick={() => set({ scope: { ...f.scope, [item]: v } })}
                                className={cn("h-7 rounded-md px-2.5 text-xs font-semibold", f.scope[item] === v ? "bg-card text-foreground shadow-sm" : "text-slate-500")}
                              >
                                {v}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
              <div className="px-5 py-3 text-xs text-muted-foreground">契約に合わせて変更してください。ここでの設定は、タスクの担当を決めるときの注意表示に使われます。</div>
            </section>
          </>
        )}

        {step === 1 && (
          <>
            <div className={card}>
              <b>いまの数値</b>
              <div className="mb-3 text-[12.5px] text-slate-500">柱の進み具合を測る出発点になります。分からないものは空欄でかまいません。</div>
              <div className="grid gap-3 sm:grid-cols-3">
                {(
                  [
                    ["listeners", "月間リスナー", "人", "例：6500"],
                    ["live", "ライブの最大動員", "人", "例：120"],
                    ["works", "これまでのEP・アルバム", "作", "例：1"],
                    ["releases", "直近1年のリリース曲数", "曲", "例：3"],
                    ["money", "直近1年の活動収支", "万円", "例：-20"],
                  ] as const
                ).map(([k, label, unit, ph]) => (
                  <Field key={k} label={label}>
                    <div className="flex items-center gap-1.5">
                      <input type="number" className={input()} value={f.now[k]} placeholder={ph} onChange={(e) => set({ now: { ...f.now, [k]: e.target.value } })} />
                      <span className="whitespace-nowrap text-[12.5px] text-slate-500">{unit}</span>
                    </div>
                  </Field>
                ))}
              </div>
            </div>
            <div className={cn(card, "mt-4 space-y-3")}>
              <div>
                <b>ヒアリングメモ</b>
                <div className="text-[12.5px] text-slate-500">本人の言葉で残します。目指す姿やステップの下書きをAIが作るときにも使います。</div>
              </div>
              <Field label="本人が大事にしたいこと">
                <textarea className={ta()} rows={3} value={f.memo.want} placeholder="例：自分でトラックも作るスタイルを崩さない" onChange={(e) => set({ memo: { ...f.memo, want: e.target.value } })} />
              </Field>
              <Field label="不安・課題に感じていること">
                <textarea className={ta()} rows={3} value={f.memo.worry} placeholder="例：リリースの間隔が空きがち" onChange={(e) => set({ memo: { ...f.memo, worry: e.target.value } })} />
              </Field>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div className={cn(card, "space-y-4")}>
              <Field label="プランの期間">
                <div className="flex flex-wrap gap-1.5">
                  {[1, 2, 3, 5].map((y) => (
                    <Chip key={y} on={f.years === y} onClick={() => set({ years: y, steps: null })}>
                      {y}年（{Number(today().slice(0, 4)) + y}年末まで）
                    </Chip>
                  ))}
                </div>
              </Field>
              <Field label={`${horizonYear}年末に目指す姿`} hint={f.vision ? undefined : "必須"}>
                <textarea
                  className={cn(ta(error?.field === "vision"), "text-base font-semibold")}
                  rows={3}
                  value={f.vision}
                  placeholder="例：川崎発のラッパーとして、自分のトラックで勝負するスタイルが認められ、地元でワンマンが成立している"
                  onChange={(e) => set({ vision: e.target.value })}
                />
              </Field>
              <div className="flex flex-wrap items-center gap-2.5">
                <Button variant="outline" onClick={aiVision}>
                  AIに言い回しの案を出してもらう
                </Button>
                <span className="text-xs text-muted-foreground">ヒアリングメモと、いまの数値をもとに作ります</span>
              </div>
              {f.visionIdeas && (
                <div>
                  {f.visionIdeas.map((v, i) => (
                    <button key={v} onClick={() => set({ vision: v })} className={cn("mb-2 block w-full rounded-lg border-[1.5px] px-3.5 py-2.5 text-left", f.vision === v ? "border-primary bg-accent" : "hover:border-indigo-200")}>
                      <span className="text-xs text-muted-foreground">案{i + 1}</span>
                      <br />
                      <b className="text-sm">{v}</b>
                    </button>
                  ))}
                  <div className="text-xs text-muted-foreground">案を選んだあと、自由に書き換えられます。</div>
                </div>
              )}
            </div>
            <Note tone="primary" className="mt-3">
              目指す姿は「売上」ではなく、本人がどんなアーティストになっているかを書きます。数値の目標は次の「柱と指標」で決めます。
            </Note>
          </>
        )}

        {step === 3 && f.pillars && (
          <>
            <p className="mb-3 text-[13px] text-slate-500">目指す姿を4つの柱に分けます。名前・中身・指標は自由に変えられます。「いま」は前のステップで入れた数値です。</p>
            <div className="grid gap-4 lg:grid-cols-2">
              {f.pillars.map((p, i) => {
                const upd = (patch: Partial<PillarDraft>) => set({ pillars: f.pillars!.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
                const updK = (j: number, patch: Partial<KpiDraft>) => upd({ kpis: p.kpis.map((k, m) => (m === j ? { ...k, ...patch } : k)) });
                return (
                  <div key={p.id} className={card}>
                    <div className="flex gap-2">
                      <input className={cn(input(), "w-32 font-bold")} value={p.name} onChange={(e) => upd({ name: e.target.value })} />
                      <input className={input()} value={p.goal} onChange={(e) => upd({ goal: e.target.value })} />
                    </div>
                    {p.kpis.map((k, j) => (
                      <div key={j} className="mt-2.5 border-t border-slate-100 pt-2.5">
                        <div className="flex items-center gap-1.5">
                          <input className={input()} value={k.label} onChange={(e) => updK(j, { label: e.target.value })} />
                          <Button variant="ghost" size="sm" title="この指標を削除" onClick={() => upd({ kpis: p.kpis.filter((_, m) => m !== j) })}>
                            ×
                          </Button>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-[13px] text-slate-500">
                          いま <b className="text-foreground">{formatKpi(k.now, k.unit)}</b> → {horizonYear}年末の目標
                          <input type="number" className={cn(input(), "w-28 text-right")} value={k.target} placeholder="—" onChange={(e) => updK(j, { target: e.target.value })} />
                          {k.unit}
                        </div>
                        {k.note && <div className="mt-1.5 text-xs text-indigo-700">{k.note}</div>}
                      </div>
                    ))}
                    <Button variant="ghost" size="sm" className="mt-1.5 text-primary" onClick={() => upd({ kpis: [...p.kpis, { label: "新しい指標", base: 0, now: 0, target: "", unit: "" }] })}>
                      ＋ 指標を追加
                    </Button>
                  </div>
                );
              })}
            </div>
            <div className="mt-3.5 flex flex-wrap items-center gap-2.5">
              <Button variant="outline" onClick={aiTargets}>
                AIに目標値を提案してもらう
              </Button>
              <span className="text-xs text-muted-foreground">いまの数値と、社内の過去の実績（ナレッジ）をもとに提案します</span>
            </div>
          </>
        )}

        {step === 4 && f.steps && f.pillars && (
          <>
            <p className="mb-3 text-[13px] text-slate-500">期間を区切り、それぞれの時期に何をするか、どの柱に重点を置くかを決めます。各時期の企画は、あとからロードマップに追加します。</p>
            <div className="grid items-start gap-3.5 md:grid-cols-3">
              {f.steps.map((s, i) => {
                const upd = (patch: Partial<StepDraft>) => set({ steps: f.steps!.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
                return (
                  <div key={i} className={cn("rounded-xl p-3", i === 0 ? "bg-indigo-50" : "bg-slate-100")}>
                    <input className={cn(input(), "mb-2 w-36 font-bold")} value={s.label} onChange={(e) => upd({ label: e.target.value })} />
                    <textarea className={ta()} rows={3} value={s.text} placeholder="この時期にやること" onChange={(e) => upd({ text: e.target.value })} />
                    <div className="mb-1.5 mt-2.5 text-xs font-semibold text-muted-foreground">重点を置く柱</div>
                    <div className="flex flex-wrap gap-1.5">
                      {f.pillars!.map((p) => (
                        <Chip key={p.id} on={s.focus.includes(p.id)} onClick={() => upd({ focus: s.focus.includes(p.id) ? s.focus.filter((x) => x !== p.id) : [...s.focus, p.id] })}>
                          {p.name}
                        </Chip>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-3.5 flex flex-wrap items-center gap-2.5">
              <Button variant="outline" onClick={aiSteps}>
                AIにステップの下書きを出してもらう
              </Button>
              <span className="text-xs text-muted-foreground">目指す姿・柱・ヒアリングメモから作ります（空欄だけ埋めます）</span>
            </div>
          </>
        )}

        {step === 5 && f.steps && f.pillars && (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
            <div className="grid content-start gap-4">
              <div className={cn(card, "space-y-3")}>
                <Chip on={f.first.make} onClick={() => set({ first: { ...f.first, make: !f.first.make } })}>
                  {f.first.make ? "✓ " : ""}最初のステップの企画を、いま作る
                </Chip>
                {f.first.make ? (
                  <>
                    <Field label={`企画名（${f.steps[0].label}のステップ）`}>
                      <input className={input()} value={f.first.title} onChange={(e) => set({ first: { ...f.first, title: e.target.value } })} />
                    </Field>
                    <Field label="含めるもの">
                      <div className="flex flex-wrap gap-1.5">
                        {["EP", "アルバム", "シングル", "ワンマン", "企画ライブ"].map((t) => (
                          <Chip key={t} on={f.first.types.includes(t)} onClick={() => set({ first: { ...f.first, types: f.first.types.includes(t) ? f.first.types.filter((x) => x !== t) : [...f.first.types, t] } })}>
                            {t}
                          </Chip>
                        ))}
                      </div>
                    </Field>
                    <div className="text-xs text-muted-foreground">企画は「構想」の下書きで作られます。日程・担当・予算は、企画画面からAIかテンプレートで作ります。</div>
                  </>
                ) : (
                  <div className="text-[12.5px] text-slate-500">企画はあとからロードマップの「＋ このステップに企画を追加」で作れます。</div>
                )}
              </div>
              <div className={card}>
                <Field label="本人と合意する打ち合わせ（最初のキャリアレビュー）">
                  <input type="date" className={cn(input(), "max-w-56")} value={f.reviewDate} onChange={(e) => set({ reviewDate: e.target.value })} />
                </Field>
                <div className="mt-2 text-[12.5px] text-slate-500">保存すると「判断待ち」に「キャリアプランの合意」が追加されます。打ち合わせで本人とWSの確認がそろうと、プランが確定します。</div>
              </div>
            </div>
            <div className={cn(card, "self-start")}>
              <b>プランの内容</b>
              <div className="mt-2.5">
                <b>{f.name}</b>
                <div className="text-[11.5px] text-muted-foreground">{[f.role, f.base].filter(Boolean).join(" ・ ")}</div>
              </div>
              <Note tone="primary" className="my-3">
                <b className="text-xs">{horizonYear}年末に目指す姿</b>
                <br />
                {f.vision}
              </Note>
              {f.pillars.map((p) => (
                <div key={p.id} className="border-b border-slate-100 py-1.5 text-[12.5px]">
                  <b>{p.name}</b>
                  {p.kpis.map((k, j) => (
                    <span key={j}>
                      {j > 0 && "／"}
                      {k.label} {formatKpi(k.now, k.unit)} → {k.target === "" ? <span className="text-red-600">未設定</span> : formatKpi(num(k.target), k.unit)}
                    </span>
                  ))}
                </div>
              ))}
              <div className="mt-2.5 text-xs font-semibold text-muted-foreground">ステップ</div>
              {f.steps.map((s) => (
                <div key={s.label} className="py-0.5 text-[12.5px]">
                  <b>{s.label}</b>　{s.text || <span className="text-red-600">未入力</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-4 flex justify-between">
          <Button variant="outline" onClick={() => go(step - 1)} disabled={step === 0}>
            戻る
          </Button>
          {step < 5 ? (
            <Button onClick={() => go(step + 1)}>次へ：{STEPS[step + 1]}</Button>
          ) : (
            <Button onClick={save} disabled={saving}>
              下書きとして保存
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

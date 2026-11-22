import { z } from "zod";
import type { AiBlock } from "@/lib/domain/ai";
import { fmt, isLate, pillarProgress, today } from "@/lib/domain/calc";
import { PEOPLE, WORKSTREAMS } from "@/lib/domain/constants";
import type { Artist, PillarKey, Project } from "@/lib/domain/types";
import { NOA_OPTIONS, optionSummary } from "@/server/store/plan-generator";
import { db } from "@/server/store/store";
import { authedProcedure } from "../base";
import { findProject } from "./projects";

/**
 * AI 企画相談（デモ版）。
 * 決まった質問にだけ、社内データ（キャリアプラン・企画・ナレッジ）から組み立てた回答を返す。
 * 実装時はここで LLM API を呼び、同じ AiBlock 形式で返す。
 */

const IDEAS: Record<string, { title: string; pillars: PillarKey[]; reason: string }[]> = {
  carz: [
    { title: "東京での対バン出演を年6本", pillars: ["live", "fan"], reason: "東京のライブハウスでの出演実績をつくり、2029年のワンマンの下地にする" },
    { title: "東京のアーティストとの客演シングル", pillars: ["fan", "work"], reason: "客演曲で相手側のリスナーが流入した実績（2026夏）があるため" },
    { title: "2ndアルバム（東京リリースイベント付き）", pillars: ["work", "live"], reason: "作品の柱「フルアルバム2作」の2作目" },
  ],
  default: [
    { title: "対バン企画を年3本", pillars: ["live", "fan"], reason: "固定客をつくる接点を増やす" },
    { title: "次のEP", pillars: ["work", "fan"], reason: "作品の柱を進める" },
  ],
};

function planOptions(projectId: string): AiBlock[] {
  return [
    { type: "text", text: "2028年のゴール「東京でライブに定評のあるシンガーとして、固定客でワンマンを続けられている」に向けた最初のステップとして考えました。いまの月間リスナーは9,000人、本人の過去のライブ転換率は0.8%です。" },
    {
      type: "options",
      projectId,
      options: NOA_OPTIONS.map((o) => {
        const s = optionSummary(o);
        return {
          key: o.key,
          title: o.title,
          singles: o.singles,
          release: o.release,
          show: o.show,
          showName: o.showName,
          weeks: s.weeks,
          total: s.total,
          required: s.required,
          listenersTarget: o.listenersTarget,
          goalShare: Math.round((o.listenersTarget / 30000) * 100),
          risk: o.risk,
        };
      }),
    },
    { type: "note", text: "どれを採るかは社内で判断してください。" },
  ];
}

function answer(q: string, artist: Artist | null, project: Project | null): AiBlock[] {
  const now = today();
  const isNoaPlan = project?.id === "P2" || (!project && artist?.id === "noa");
  if (/進め方の案/.test(q)) {
    if (isNoaPlan) return planOptions("P2");
    return [{ type: "text", text: "デモでは、進め方の案の比較は NOA（仮）の「2nd EPリリースと東京ワンマン」で試せます。実装時は、どの企画でも目標・過去の実績・標準テンプレートから案を作ります。" }];
  }
  if (/規模|250人/.test(q)) {
    return [
      { type: "text", text: "キャパ250人を満員にするには、本人の過去実績（転換率0.8%）なら月間リスナー約31,000人が必要です。いまは9,000人なので、EP期間中に3倍以上に伸ばす前提になります。" },
      { type: "text", text: "案C（リリースパーティー150人）で手応えを測ってから250人に進む段階型の方が、ゴール「固定客でワンマンを続ける」には確実かもしれません。" },
    ];
  }
  if (/どんな企画/.test(q) && artist) {
    const pl = artist.plan;
    const step = pl.steps[1] ?? pl.steps[0];
    const weak = [...pl.pillars].sort((a, b) => pillarProgress(a) - pillarProgress(b))[0];
    const ideas = IDEAS[artist.id] ?? IDEAS.default;
    return [
      { type: "text", text: `${step.label}のステップ「${step.text}」に向けた企画の候補です。いま一番進んでいない柱は「${weak.name}」（${Math.round(pillarProgress(weak) * 100)}%）です。` },
      {
        type: "ideas",
        artistId: artist.id,
        step: pl.steps[1] ? 1 : 0,
        ideas: ideas.map((x) => ({ ...x, pillarNames: x.pillars.map((k) => pl.pillars.find((p) => p.id === k)?.name ?? k) })),
      },
    ];
  }
  if (/届きそう/.test(q) && artist) {
    const pl = artist.plan;
    const k = pl.pillars.find((p) => p.id === "fan")?.kpis[0];
    if (!k || !k.now) return [{ type: "text", text: "リスナーの柱に数値がまだないため、計算できません。" }];
    const need = (Math.pow(k.target / k.now, 1 / (pl.years * 12 + 1)) - 1) * 100;
    return [
      { type: "text", text: `リスナーの柱で見ると、月間リスナー ${fmt(k.now)}人 → ${fmt(k.target)}人 には、毎月およそ ${need.toFixed(1)}% の伸びが必要です。` },
      { type: "text", text: `直近（プラン策定後）は ${fmt(k.base)}人 → ${fmt(k.now)}人 と伸びていますが、リリースが続いた時期を含むため、そのまま続く前提は置かない方が安全です。` },
      { type: "text", text: "ライブの柱は実績がまだ少ないので、次回レビューで最初のワンマンの結果をもとに目標を見直す前提で進めるのがよさそうです。" },
    ];
  }
  if (/妥当/.test(q) && project && artist) {
    const g = project.goals.find((x) => x.pillar === "fan");
    const k = artist.plan.pillars.find((p) => p.id === "fan")?.kpis[0];
    if (!g || !k || g.now == null) return [{ type: "text", text: "この企画にはリスナーの目標がまだありません。" }];
    const share = Math.round(((g.target - g.now) / (k.target - g.now || 1)) * 100);
    return [
      { type: "text", text: `この企画の月間リスナー目標 ${fmt(g.target)}人 は、いま（${fmt(g.now)}人）からゴール（${fmt(k.target)}人）までの ${share}% を、このステップで進める設定です。` },
      { type: "text", text: `ステップが${artist.plan.steps.length}つあることを考えると、最初のステップとしてはやや意欲的ですが、ワンマン満員に必要な水準でもあるので筋は通っています。` },
    ];
  }
  if (/遅れ/.test(q) && project) {
    const late = project.tasks.filter((t) => isLate(t, now));
    if (!late.length) return [{ type: "text", text: "遅れているタスクはありません。" }];
    return [
      { type: "text", text: `遅れているのは ${late.map((t) => `「${t.title}」`).join("、")} です。` },
      { type: "list", items: late.map((t) => `${t.title}：影響する仕事は ${t.affects ?? "未設定"}`) },
      { type: "text", text: "会場の本契約は告知・券売の前提なので、判断待ち（本人確認）を先に進めるのがよさそうです。" },
    ];
  }
  if (/優先/.test(q)) {
    const pending = db().approvals.filter((a) => !(a.ws && a.artist)).sort((a, b) => a.due.localeCompare(b.due));
    return [
      { type: "text", text: "期限の近い順に、判断待ちを並べました。期限を過ぎているものから進めるのがよさそうです。" },
      { type: "list", items: pending.slice(0, 4).map((a) => `${a.due.slice(5).replace("-", "/")}まで：${a.title}`) },
    ];
  }
  if (/進み具合|遅れている/.test(q)) {
    return [
      {
        type: "list",
        items: db().artists.map((a) => {
          const weak = [...a.plan.pillars].sort((x, y) => pillarProgress(x) - pillarProgress(y))[0];
          return `${a.name}：一番進んでいない柱は「${weak.name}」（${Math.round(pillarProgress(weak) * 100)}%）`;
        }),
      },
    ];
  }
  return [{ type: "text", text: "デモ版のため、決まった質問にだけ答えます。実装時は、キャリアプラン・企画・振り返り・業務ルールを参照して回答を作ります。" }];
}

export const aiRouter = {
  ask: authedProcedure
    .input(z.object({ question: z.string().min(1), artistId: z.string().optional(), projectId: z.string().optional() }))
    .handler(({ input }) => {
      const d = db();
      const project = input.projectId ? (d.projects.find((p) => p.id === input.projectId) ?? null) : null;
      const artistId = project?.artistId ?? input.artistId;
      const artist = artistId ? (d.artists.find((a) => a.id === artistId) ?? null) : null;
      return { blocks: answer(input.question, artist, project) };
    }),

  /** 採用前のプレビュー（日程・担当・予算・注意点） */
  preview: authedProcedure
    .input(z.object({ projectId: z.string(), option: z.enum(["A", "B", "C"]) }))
    .handler(({ input }): { blocks: AiBlock[] } => {
      findProject(input.projectId);
      const o = NOA_OPTIONS.find((x) => x.key === input.option)!;
      const s = optionSummary(o);
      const kinds: Record<string, string> = { ws: "WS", artist: "本人", ext: "外部", joint: "共同", tbd: "未指定" };
      const byKind: Record<string, number> = {};
      s.plan.tasks.forEach((t) => {
        const k = PEOPLE[t.exec]?.kind ?? "artist";
        byKind[k] = (byKind[k] ?? 0) + 1;
      });
      const warnings = [
        "担当（ステータスを管理する従業員）は、反映後にタスク画面で割り当ててください",
        "ライブ物販はWSの標準業務外のため「個別協議」にしました",
        "外部流通の提携先が未確定のため、配信登録の担当は「提携先 未確定」です",
      ];
      if (s.weeks < 8) warnings.push(`告知期間が${s.weeks}週と、目安（8〜10週）より短めです`);
      return {
        blocks: [
          { type: "text", text: `案${o.key}を、日程・担当・予算・タスクに展開しました（下書き）。` },
          {
            type: "preview",
            projectId: input.projectId,
            option: o.key,
            title: o.title,
            milestones: s.plan.milestones,
            taskCount: s.taskCount,
            byWorkstream: WORKSTREAMS.map((w) => ({ name: w.name, count: s.plan.tasks.filter((t) => t.ws === w.key).length })),
            byPerson: Object.entries(kinds).map(([k, label]) => ({ label, count: byKind[k] ?? 0 })),
            total: s.total,
            warnings,
          },
        ],
      };
    }),
};

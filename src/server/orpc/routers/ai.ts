import { z } from "zod";
import type { AiBlock } from "@/lib/domain/ai";
import { fmt, isLate, pillarProgress, today } from "@/lib/domain/calc";
import { PEOPLE, WORKSTREAMS } from "@/lib/domain/constants";
import type { Artist, PillarKey, Project } from "@/lib/domain/types";
import { buildOptions, optionSummary, projectShape, type OptionKey } from "@/server/store/plan-generator";
import { getArtist, getProject, listApprovals, listArtists, listProjects } from "@/server/repo";
import type { Approval } from "@/lib/domain/types";
import { authedProcedure } from "../base";

/**
 * AI 企画相談（試作版）。
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

function planOptions(p: Project, artist: Artist, now: string): AiBlock[] {
  const step = artist.plan.steps[p.step] ?? artist.plan.steps[0];
  const fanKpi = artist.plan.pillars.find((x) => x.id === "fan")?.kpis[0];
  const { listenersGoal } = projectShape(p);
  const listenersNow = listenersGoal?.now ?? fanKpi?.now ?? 0;
  return [
    {
      type: "text",
      text: `${artist.plan.horizon}のゴール「${artist.plan.vision}」に向けた、${step.label}のステップ「${step.text}」の企画として考えました。いまの月間リスナーは${fmt(listenersNow)}人です。`,
    },
    {
      type: "options",
      projectId: p.id,
      options: buildOptions(p, artist, now).map((o) => {
        const s = optionSummary(o, p, now);
        return {
          key: o.key,
          title: o.title,
          singles: o.singles,
          release: o.release,
          releaseName: o.releaseName,
          show: o.show,
          showName: o.showName,
          weeks: s.weeks,
          total: s.total,
          required: s.required,
          listenersTarget: o.listenersTarget,
          goalShare: fanKpi?.target ? Math.round((o.listenersTarget / fanKpi.target) * 100) : 0,
          risk: o.risk,
        };
      }),
    },
    { type: "note", text: "どれを採るかは社内で判断してください。選んだ案は「協議」の下書きとして企画に入り、共同承認で確定します。" },
  ];
}

interface Ctx {
  artist: Artist | null;
  project: Project | null;
  projects: Project[];
  artists: Artist[];
  approvals: Approval[];
}

function answer(q: string, { artist, project, projects, artists, approvals }: Ctx): AiBlock[] {
  const now = today();
  if (/進め方の案/.test(q)) {
    const target = project ?? (artist ? (projects.find((p) => p.artistId === artist.id && !p.tasks.length && p.phase < 2) ?? null) : null);
    const targetArtist = target ? (artists.find((a) => a.id === target.artistId) ?? null) : null;
    if (target && targetArtist) {
      if (target.phase >= 2) return [{ type: "text", text: "この企画はすでに共同承認に進んでいます。計画の変更は「変更を記録」から行ってください。" }];
      return planOptions(target, targetArtist, now);
    }
    return [{ type: "text", text: "進め方の案を出す企画を開いてから、もう一度お試しください。" }];
  }
  if (/規模|無理がない/.test(q) && project) {
    const { liveGoal, listenersGoal } = projectShape(project);
    if (!liveGoal) return [{ type: "text", text: "この企画にはライブの動員目標がありません。" }];
    const record = project.model.record ?? 1.0;
    const need = Math.round(liveGoal.target / (record / 100));
    const nowL = listenersGoal?.now ?? 0;
    return [
      { type: "text", text: `キャパ${fmt(liveGoal.target)}人を満員にするには、ライブ転換率${record}%なら月間リスナー約${fmt(need)}人が必要です。いまは${fmt(nowL)}人${nowL ? `なので、企画の期間中に約${(need / nowL).toFixed(1)}倍に伸ばす前提になります` : "です"}。` },
      { type: "text", text: need > nowL * 2 ? "伸びが大きい前提なので、小さめの会場で手応えを測る段階型（案C）も検討の余地があります。" : "いまのリスナー数から見て、無理の少ない規模です。" },
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
    const pending = approvals.filter((a) => !(a.ws && a.artist)).sort((a, b) => a.due.localeCompare(b.due));
    return [
      { type: "text", text: "期限の近い順に、判断待ちを並べました。期限を過ぎているものから進めるのがよさそうです。" },
      { type: "list", items: pending.slice(0, 4).map((a) => `${a.due.slice(5).replace("-", "/")}まで：${a.title}`) },
    ];
  }
  if (/進み具合|遅れている/.test(q)) {
    return [
      {
        type: "list",
        items: artists.map((a) => {
          const weak = [...a.plan.pillars].sort((x, y) => pillarProgress(x) - pillarProgress(y))[0];
          return `${a.name}：一番進んでいない柱は「${weak.name}」（${Math.round(pillarProgress(weak) * 100)}%）`;
        }),
      },
    ];
  }
  return [{ type: "text", text: "試作版のため、決まった質問（下の候補）にだけ答えます。今後、キャリアプラン・企画・振り返り・業務ルールを参照して回答を作れるようにします。" }];
}

export const aiRouter = {
  ask: authedProcedure
    .input(z.object({ question: z.string().min(1), artistId: z.string().optional(), projectId: z.string().optional() }))
    .handler(async ({ input, context }) => {
      const sb = context.supabase;
      const [artists, projects, approvals] = await Promise.all([listArtists(sb), listProjects(sb), listApprovals(sb)]);
      const project = input.projectId ? (projects.find((p) => p.id === input.projectId) ?? null) : null;
      const artistId = project?.artistId ?? input.artistId;
      const artist = artistId ? (artists.find((a) => a.id === artistId) ?? null) : null;
      return { blocks: answer(input.question, { artist, project, projects, artists, approvals }) };
    }),

  /** 採用前のプレビュー（日程・担当・予算・注意点） */
  preview: authedProcedure
    .input(z.object({ projectId: z.string(), option: z.enum(["A", "B", "C"]) }))
    .handler(async ({ input, context }): Promise<{ blocks: AiBlock[] }> => {
      const now = today();
      const p = await getProject(context.supabase, input.projectId);
      const artist = await getArtist(context.supabase, p.artistId);
      const o = buildOptions(p, artist, now).find((x) => x.key === (input.option as OptionKey))!;
      const s = optionSummary(o, p, now);
      const kinds: Record<string, string> = { ws: "WS", artist: "本人", ext: "外部", joint: "共同", tbd: "未指定" };
      const byKind: Record<string, number> = {};
      s.plan.tasks.forEach((t) => {
        const k = PEOPLE[t.exec]?.kind ?? "artist";
        byKind[k] = (byKind[k] ?? 0) + 1;
      });
      const warnings = ["担当（ステータスを管理する従業員）は、反映後にタスク画面で割り当ててください"];
      if (s.plan.tasks.some((t) => t.scope === "個別協議")) warnings.push("ライブ物販はWSの標準業務外のため「個別協議」にしました");
      if (s.plan.tasks.some((t) => t.exec === "dist")) warnings.push("外部流通の提携先が未確定のため、配信登録の実行は「提携先 未確定」です");
      if (s.weeks && s.weeks < 8) warnings.push(`告知期間が${s.weeks}週と、目安（8〜10週）より短めです`);
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

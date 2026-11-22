import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { addDays, fmt, isImportantChange, today } from "@/lib/domain/calc";
import type { Goal, Project } from "@/lib/domain/types";
import { buildOptions, generatePlan, projectShape, type OptionKey } from "@/server/store/plan-generator";
import { getArtist, getProject, insertApproval, insertKnowledge, insertProject, listProjects, mutateArtist, mutateProject, newId } from "@/server/repo";
import { authedProcedure } from "../base";

const pillarKey = z.enum(["work", "live", "fan", "base"]);
const LIVE_TYPES = ["ワンマン", "ツアー", "対バン・イベント", "企画ライブ"];

const nextChangeId = (p: Project) => `CH-${String(p.changes.length + 1).padStart(3, "0")}`;

export const projectsRouter = {
  list: authedProcedure.handler(({ context }) => listProjects(context.supabase)),

  get: authedProcedure.input(z.object({ id: z.string() })).handler(async ({ input, context }) => {
    const project = await getProject(context.supabase, input.id);
    return { project, artist: await getArtist(context.supabase, project.artistId) };
  }),

  /** キャリアプランのステップから企画を作成（協議中の下書き） */
  create: authedProcedure
    .input(
      z.object({
        artistId: z.string(),
        step: z.number().int().min(0),
        pillars: z.array(pillarKey).min(1),
        types: z.array(z.string()),
        title: z.string(),
        goals: z.array(z.object({ label: z.string(), now: z.number(), target: z.number(), unit: z.string(), pillar: pillarKey })),
        ideaId: z.string().optional(),
      }),
    )
    .handler(async ({ input, context }) => {
      const sb = context.supabase;
      const artist = await getArtist(sb, input.artistId);
      const step = artist.plan.steps[input.step] ?? artist.plan.steps[0];
      const id = newId("P");
      const goals: Goal[] = input.goals.map((g, i) => ({ id: `G${i + 1}`, label: g.label, now: g.now, target: g.target, unit: g.unit, due: "未定", basis: "新規企画で設定", pillar: g.pillar }));
      const hasLive = input.types.some((t) => LIVE_TYPES.includes(t));
      if (hasLive) goals.push({ id: `G${goals.length + 1}`, label: "ライブ単体の収支", now: null, target: 0, unit: "円以上", due: "未定", basis: "チケット＋物販 − 会場・制作・物販原価", pillar: "base" });
      const listeners = goals.find((g) => g.pillar === "fan");
      const live = goals.find((g) => g.pillar === "live" && g.unit === "人");
      await insertProject(sb, {
        id,
        artistId: artist.id,
        title: input.title || `${step.label}の新しい企画`,
        types: input.types.length ? input.types : ["未定"],
        linked: "",
        phase: 1,
        period: "未定",
        purpose: input.pillars.map((k) => artist.plan.pillars.find((p) => p.id === k)?.goal ?? "").filter(Boolean),
        goals,
        model: { listeners: listeners?.target ?? 0, conv: 1, capacity: live?.target ?? 0, price: 3500, merchRate: 30, merchSpend: 3000, plays: 0, perPlay: 0.4 },
        milestones: [],
        tasks: [],
        budget: [],
        changes: [],
        planSource: null,
        step: input.step,
        pillars: input.pillars,
        why: `${step.label}のステップ「${step.text}」のための企画。`,
      });
      if (input.ideaId) {
        await mutateArtist(sb, artist.id, (a) => {
          a.plan.ideas = a.plan.ideas.filter((x) => x.id !== input.ideaId);
        });
      }
      return { id };
    }),

  updateTask: authedProcedure
    .input(
      z.object({
        projectId: z.string(),
        taskId: z.string(),
        patch: z
          .object({
            title: z.string(),
            status: z.enum(["未着手", "進行中", "確認待ち", "完了", "保留"]),
            assignee: z.uuid().nullable(),
            exec: z.string(),
            approver: z.string(),
            start: z.string(),
            due: z.string(),
            trigger: z.string(),
            doneWhen: z.string(),
            affects: z.string(),
            onChange: z.string(),
          })
          .partial(),
      }),
    )
    .handler(async ({ input, context }) => {
      // 担当に割り当てられるのは従業員だけ
      if (input.patch.assignee) {
        const { data: m } = await context.supabase.from("members").select("kind, status").eq("id", input.patch.assignee).maybeSingle();
        if (!m || m.kind !== "employee" || m.status === "disabled") throw new ORPCError("BAD_REQUEST", { message: "担当に割り当てられるのは従業員だけです" });
      }
      return mutateProject(context.supabase, input.projectId, (p) => {
        const task = p.tasks.find((t) => t.id === input.taskId);
        if (!task) throw new ORPCError("NOT_FOUND", { message: "タスクが見つかりません" });
        Object.assign(task, input.patch);
        return task;
      });
    }),

  /** 変更を記録。重要な変更は判断待ちに追加 */
  createChange: authedProcedure
    .input(
      z.object({
        projectId: z.string(),
        title: z.string().min(1),
        type: z.string(),
        areas: z.array(z.string()),
        cost: z.number(),
        days: z.number(),
      }),
    )
    .handler(async ({ input, context }) => {
      const sb = context.supabase;
      const r = await mutateProject(sb, input.projectId, (p) => {
        const important = isImportantChange(p, input);
        const id = nextChangeId(p);
        p.changes.unshift({
          id,
          date: today(),
          title: input.title,
          type: input.type,
          areas: input.areas,
          cost: input.cost,
          days: input.days,
          judgement: important ? "重要" : "権限内",
          status: important ? "判断待ち" : "調整済み",
          by: "WS",
          memo: important ? "本人＋WSでの判断待ち" : "担当者の権限内で調整",
        });
        return { id, important, artistId: p.artistId };
      });
      if (r.important) {
        await insertApproval(sb, {
          id: newId("A"),
          kind: "change",
          projectId: input.projectId,
          artistId: r.artistId,
          ref: r.id,
          title: input.title,
          reason: "重要な変更（自動判定）",
          due: addDays(today(), 5),
          ws: false,
          artist: false,
        });
      }
      return { id: r.id, important: r.important };
    }),

  /** 進め方の案（またはテンプレート＝案A）を企画に反映（共同承認前の下書き） */
  applyPlan: authedProcedure
    .input(z.object({ projectId: z.string(), option: z.enum(["A", "B", "C"]), source: z.enum(["ai", "template"]).default("ai") }))
    .handler(async ({ input, context }) => {
      const sb = context.supabase;
      const now = today();
      const current = await getProject(sb, input.projectId);
      const artist = await getArtist(sb, current.artistId);
      const o = buildOptions(current, artist, now).find((x) => x.key === (input.option as OptionKey))!;
      await mutateProject(sb, input.projectId, (p) => {
        const g = generatePlan(o, p, now);
        const { listenersGoal, liveGoal } = projectShape(p);
        const end = g.milestones[g.milestones.length - 1]?.date ?? addDays(now, 90);
        p.tasks = g.tasks;
        p.milestones = g.milestones;
        p.budget = g.budget;
        p.planSource = input.source === "template" ? "標準テンプレートから作成（共同承認前の下書き）" : `AI案${o.key}「${o.title}」を採用（共同承認前の下書き）`;
        p.period = `${now.slice(0, 7).replace("-", "/")} – ${addDays(end, 28).slice(0, 7).replace("-", "/")}（予定）`;
        p.model.capacity = o.capacity;
        p.model.listeners = o.listenersTarget;
        if (listenersGoal) {
          listenersGoal.target = o.listenersTarget;
          listenersGoal.due = (o.show ?? o.release ?? end).slice(0, 7);
        }
        if (liveGoal && o.show) {
          liveGoal.target = o.capacity;
          liveGoal.due = o.show;
        }
        p.goals.forEach((x) => {
          if (x.due === "未定") x.due = addDays(end, 28).slice(0, 7);
        });
        p.changes.unshift({
          id: nextChangeId(p),
          date: now,
          title: input.source === "template" ? "標準テンプレートから計画を作成" : `AI案${o.key}「${o.title}」を計画に反映`,
          type: "計画作成",
          areas: ["日程", "担当", "予算", "タスク"],
          cost: 0,
          days: 0,
          judgement: "権限内",
          status: "調整済み",
          by: "WS",
          memo: "企画の共同承認で確定",
        });
      });
      return { ok: true };
    }),

  /** 企画の段階を進める。協議 → 共同承認 は判断待ちを作り、本人＋WSの確認がそろうと実行中になる */
  advancePhase: authedProcedure.input(z.object({ projectId: z.string() })).handler(async ({ input, context }) => {
    const sb = context.supabase;
    const r = await mutateProject(sb, input.projectId, (p) => {
      if (p.phase === 0) {
        p.phase = 1;
        return { phase: 1, approval: false, p };
      }
      if (p.phase === 1) {
        if (!p.tasks.length) throw new ORPCError("BAD_REQUEST", { message: "先に計画（日程・担当・予算・タスク）を作ってください" });
        p.phase = 2;
        return { phase: 2, approval: true, p };
      }
      if (p.phase === 3) {
        p.phase = 4;
        return { phase: 4, approval: false, p };
      }
      if (p.phase === 2) throw new ORPCError("BAD_REQUEST", { message: "共同承認（判断待ち）がそろうと、実行中に進みます" });
      throw new ORPCError("BAD_REQUEST", { message: "振り返りタブで結果を記録すると完了します" });
    });
    if (r.approval) {
      await insertApproval(sb, {
        id: newId("A"),
        kind: "project",
        projectId: r.p.id,
        artistId: r.p.artistId,
        ref: "PROJECT",
        title: `「${r.p.title}」の共同承認（企画書）`,
        reason: "企画の目的・日程・予算・役割の確定には、本人とWSの共同承認が必要",
        due: addDays(today(), 7),
        ws: false,
        artist: false,
      });
    }
    return { phase: r.phase };
  }),

  /** 振り返りを記録：結果を柱の数値に反映し、ナレッジに登録して企画を完了にする */
  recordReview: authedProcedure
    .input(
      z.object({
        projectId: z.string(),
        results: z.array(z.object({ goalId: z.string(), result: z.number() })),
        good: z.array(z.string()),
        issues: z.array(z.string()),
        next: z.array(z.string()),
      }),
    )
    .handler(async ({ input, context }) => {
      const sb = context.supabase;
      const now = today();
      const project = await getProject(sb, input.projectId);
      if (project.phase < 3) throw new ORPCError("BAD_REQUEST", { message: "実行中・本番後の企画だけ振り返りを記録できます" });
      const result = (id: string) => input.results.find((x) => x.goalId === id)?.result;

      // キャリアプランの柱に反映
      const careerUpdates: string[] = [];
      const touched = new Set<string>();
      await mutateArtist(sb, project.artistId, (a) => {
        project.goals.forEach((g) => {
          const v = result(g.id);
          if (v == null || !g.pillar || g.unit === "円以上") return;
          const pillar = a.plan.pillars.find((x) => x.id === g.pillar);
          const kpi = pillar?.kpis.find((k) => k.label === g.label || (/動員/.test(g.label) && /動員/.test(k.label)));
          if (!pillar || !kpi) return;
          touched.add(`${pillar.id}:${kpi.label}`);
          if (v > kpi.now) {
            careerUpdates.push(`柱「${pillar.name}」の${kpi.label}を ${fmt(kpi.now)} → ${fmt(v)}${kpi.unit} に更新`);
            kpi.now = v;
          } else {
            careerUpdates.push(`柱「${pillar.name}」の${kpi.label}は ${fmt(kpi.now)}${kpi.unit} のまま（今回 ${fmt(v)}${kpi.unit}）`);
          }
        });
        // 作品をリリースした企画は、作品の柱の「作」の指標を1つ進める
        const work = a.plan.pillars.find((x) => x.id === "work");
        const rel = projectShape(project).releaseName;
        const workKpi = work?.kpis.find((k) => k.unit === "作");
        if (work && workKpi && rel && rel !== "シングル" && !touched.has(`work:${workKpi.label}`)) {
          careerUpdates.push(`柱「${work.name}」の${workKpi.label}を ${workKpi.now} → ${workKpi.now + 1}${workKpi.unit} に更新`);
          workKpi.now += 1;
        }
        careerUpdates.push(`次のキャリアレビュー（${a.plan.nextReview.replace(/-/g, "/")}）の議題に追加`);
      });

      const kpis = project.goals.map((g) => {
        const v = result(g.id);
        const money = g.unit === "円以上";
        const target = money ? "±0以上" : `${fmt(g.target)}${g.unit}`;
        if (v == null) return { label: g.label, target, result: "未入力", verdict: "未入力" };
        const ok = v >= g.target;
        const verdict = ok ? "達成" : money ? "未達" : `未達（${Math.round((v / (g.target || 1)) * 100)}%）`;
        return { label: g.label, target, result: money ? `${v >= 0 ? "+" : ""}${fmt(v)}円` : `${fmt(v)}${g.unit}`, verdict };
      });

      await mutateProject(sb, input.projectId, (p) => {
        p.review = { recordedAt: now, kpis, good: input.good, issues: input.issues, next: input.next, careerUpdates };
        p.phase = 5;
        p.period = p.period.replace("（予定）", "（完了）");
        p.tasks.forEach((t) => {
          if (/振り返り|収支の確認/.test(t.affects ?? "") && t.status !== "完了") t.status = "完了";
        });
      });
      await insertKnowledge(sb, {
        projectId: project.id,
        artistId: project.artistId,
        title: project.title,
        date: now.slice(0, 7).replace("-", "/"),
        metrics: kpis.filter((k) => k.result !== "未入力").slice(0, 3).map((k) => [k.label, `${k.result}（目標 ${k.target}）`] as [string, string]),
        learning: [...input.next].join("／") || "—",
      });
      return { ok: true, careerUpdates };
    }),
};

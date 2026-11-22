import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { addDays, isImportantChange, today } from "@/lib/domain/calc";
import type { Project } from "@/lib/domain/types";
import { NOA_OPTIONS, generatePlan } from "@/server/store/plan-generator";
import { db, nextId } from "@/server/store/store";
import { authedProcedure } from "../base";
import { findArtist } from "./artists";

const pillarKey = z.enum(["work", "live", "fan", "base"]);

export function findProject(id: string): Project {
  const p = db().projects.find((x) => x.id === id);
  if (!p) throw new ORPCError("NOT_FOUND", { message: "企画が見つかりません" });
  return p;
}

export const projectsRouter = {
  list: authedProcedure.handler(() => db().projects),

  get: authedProcedure.input(z.object({ id: z.string() })).handler(({ input }) => {
    const project = findProject(input.id);
    return { project, artist: findArtist(project.artistId) };
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
    .handler(({ input }) => {
      const d = db();
      const artist = findArtist(input.artistId);
      const step = artist.plan.steps[input.step] ?? artist.plan.steps[0];
      const id = nextId("P");
      d.projects.push({
        id,
        artistId: artist.id,
        title: input.title || `${step.label}の新しい企画`,
        types: input.types.length ? input.types : ["未定"],
        linked: "",
        phase: 1,
        period: "未定",
        purpose: input.pillars.map((k) => artist.plan.pillars.find((p) => p.id === k)?.goal ?? ""),
        goals: input.goals.map((g, i) => ({ id: `X${i + 1}`, label: g.label, now: g.now, target: g.target, unit: g.unit, due: "未定", basis: "新規企画で設定", pillar: g.pillar })),
        model: { listeners: 0, conv: 1, capacity: 0, price: 3500, merchRate: 30, merchSpend: 3000, plays: 0, perPlay: 0.4 },
        milestones: [],
        tasks: [],
        budget: [],
        changes: [],
        planSource: null,
        step: input.step,
        pillars: input.pillars,
        why: `${step.label}のステップ「${step.text}」のための企画。`,
      });
      if (input.ideaId) artist.plan.ideas = artist.plan.ideas.filter((x) => x.id !== input.ideaId);
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
    .handler(({ input }) => {
      const task = findProject(input.projectId).tasks.find((t) => t.id === input.taskId);
      if (!task) throw new ORPCError("NOT_FOUND", { message: "タスクが見つかりません" });
      Object.assign(task, input.patch);
      return task;
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
    .handler(({ input }) => {
      const d = db();
      const p = findProject(input.projectId);
      const important = isImportantChange(p, input);
      const id = `CH-${String(p.changes.length + 1).padStart(3, "0")}`;
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
        by: "WS代表",
        memo: important ? "本人＋WSでの判断待ち" : "担当者の権限内で調整",
      });
      if (important) {
        d.approvals.unshift({
          id: nextId("A"),
          kind: "change",
          projectId: p.id,
          artistId: p.artistId,
          ref: id,
          title: input.title,
          reason: "重要な変更（自動判定）",
          due: addDays(today(), 5),
          ws: false,
          artist: false,
        });
      }
      return { id, important };
    }),

  /** AI の進め方の案を企画に反映（共同承認前の下書き） */
  applyPlan: authedProcedure
    .input(z.object({ projectId: z.string(), option: z.enum(["A", "B", "C"]) }))
    .handler(({ input }) => {
      const p = findProject(input.projectId);
      const o = NOA_OPTIONS.find((x) => x.key === input.option)!;
      const g = generatePlan(o);
      p.tasks = g.tasks;
      p.milestones = g.milestones;
      p.budget = g.budget;
      p.planSource = `AI案${o.key}を採用（共同承認前の下書き）`;
      p.period = `2026/11 – ${addDays(o.show, 28).slice(0, 7).replace("-", "/")}（予定）`;
      p.model.capacity = o.capacity;
      p.model.listeners = o.listenersTarget;
      p.goals.forEach((goal) => {
        if (goal.id === "G1") goal.target = o.listenersTarget;
        if (goal.id === "G3") goal.target = o.capacity;
      });
      p.changes.unshift({
        id: `CH-${String(p.changes.length + 1).padStart(3, "0")}`,
        date: today(),
        title: `AI案${o.key}「${o.title}」を計画に反映`,
        type: "計画作成",
        areas: ["日程", "担当", "予算", "タスク"],
        cost: 0,
        days: 0,
        judgement: "重要",
        status: "判断待ち",
        by: "WS代表",
        memo: "共同承認で確定",
      });
      return { ok: true };
    }),
};

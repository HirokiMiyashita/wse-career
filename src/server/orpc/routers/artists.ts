import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { addDays, today } from "@/lib/domain/calc";
import { ARTIST_COLORS } from "@/lib/domain/constants";
import type { Artist, PillarKey, Project } from "@/lib/domain/types";
import { db, nextId } from "@/server/store/store";
import { authedProcedure } from "../base";

const pillarKey = z.enum(["work", "live", "fan", "base"]);
const scopeLevel = z.enum(["提供", "個別協議", "担当外"]);

export function findArtist(id: string): Artist {
  const a = db().artists.find((x) => x.id === id);
  if (!a) throw new ORPCError("NOT_FOUND", { message: "アーティストが見つかりません" });
  return a;
}

export const artistsRouter = {
  list: authedProcedure.handler(() => db().artists),

  get: authedProcedure.input(z.object({ id: z.string() })).handler(({ input }) => findArtist(input.id)),

  /** 新しいアーティストとキャリアプラン（下書き）を作成 */
  create: authedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        role: z.string(),
        base: z.string(),
        scope: z.record(z.string(), scopeLevel),
        memo: z.object({ want: z.string(), worry: z.string() }),
        years: z.number().int().min(1).max(10),
        vision: z.string().min(1),
        pillars: z.array(
          z.object({
            id: pillarKey,
            name: z.string(),
            goal: z.string(),
            kpis: z.array(z.object({ label: z.string(), base: z.number(), now: z.number(), target: z.number(), unit: z.string() })),
          }),
        ),
        steps: z.array(z.object({ label: z.string(), text: z.string(), focus: z.array(pillarKey) })).min(1),
        firstProject: z.object({ make: z.boolean(), title: z.string(), types: z.array(z.string()) }),
        reviewDate: z.string(),
      }),
    )
    .handler(({ input }) => {
      const d = db();
      const id = nextId("a");
      const horizonYear = Number(today().slice(0, 4)) + input.years;
      d.artists.push({
        id,
        name: input.name,
        role: [input.role, input.base].filter(Boolean).join("／"),
        color: ARTIST_COLORS[(d.artists.length - 3 + ARTIST_COLORS.length) % ARTIST_COLORS.length],
        plan: {
          horizon: `${horizonYear}年末`,
          years: input.years,
          vision: input.vision,
          pillars: input.pillars,
          steps: input.steps.map((s) => ({ ...s, text: s.text || "（未入力）" })),
          ideas: [],
          nextReview: input.reviewDate,
          reviews: [],
          status: "下書き",
          scope: input.scope,
          memo: input.memo,
        },
      });
      let projectId: string | null = null;
      if (input.firstProject.make) {
        projectId = nextId("P");
        const fan = input.pillars.find((p) => p.id === "fan")?.kpis[0];
        const step = input.steps[0];
        const project: Project = {
          id: projectId,
          artistId: id,
          title: input.firstProject.title || "最初の企画",
          types: input.firstProject.types.length ? input.firstProject.types : ["未定"],
          linked: "",
          phase: 0,
          period: "未定",
          purpose: [step.text || "最初のステップ"],
          goals: fan
            ? [{ id: "G1", label: fan.label, now: fan.now, target: Math.round(fan.now + (fan.target - fan.now) / input.steps.length), unit: fan.unit, due: "未定", basis: "キャリアプランから逆算", pillar: "fan" }]
            : [],
          model: { listeners: 0, conv: 1, capacity: 0, price: 3000, merchRate: 30, merchSpend: 3000, plays: 0, perPlay: 0.4 },
          milestones: [],
          tasks: [],
          budget: [],
          changes: [],
          planSource: null,
          step: 0,
          pillars: step.focus,
          why: `${step.label}のステップ「${step.text}」の最初の企画。`,
        };
        d.projects.push(project);
      }
      d.approvals.unshift({
        id: nextId("A"),
        kind: "plan",
        projectId: null,
        artistId: id,
        ref: "PLAN",
        title: `${input.name} のキャリアプランの合意`,
        reason: "キャリアプランの確定には、本人とWSの合意が必要",
        due: input.reviewDate,
        ws: false,
        artist: false,
      });
      return { id, projectId };
    }),

  /** キャリアレビューを記録 */
  addReview: authedProcedure
    .input(
      z.object({
        artistId: z.string(),
        summary: z.string(),
        decisions: z.array(z.string()),
        nextActions: z.array(z.string()),
        nextReview: z.string(),
      }),
    )
    .handler(({ input }) => {
      const a = findArtist(input.artistId);
      a.plan.reviews.unshift({
        date: today(),
        kind: "キャリアレビュー",
        participants: `${a.name}・WS代表`,
        summary: input.summary || "（まとめ未入力）",
        decisions: input.decisions.length ? input.decisions : ["—"],
        nextActions: input.nextActions.length ? input.nextActions : ["—"],
      });
      a.plan.nextReview = input.nextReview || addDays(today(), 90);
      return { ok: true };
    }),

  /** ロードマップに構想中の企画を追加 */
  addIdea: authedProcedure
    .input(z.object({ artistId: z.string(), title: z.string().min(1), pillars: z.array(pillarKey), step: z.number().int().min(0) }))
    .handler(({ input }) => {
      const a = findArtist(input.artistId);
      if (a.plan.ideas.some((x) => x.title === input.title)) return { added: false };
      a.plan.ideas.push({
        id: nextId("I"),
        step: Math.min(input.step, a.plan.steps.length - 1),
        title: input.title,
        pillars: input.pillars as PillarKey[],
      });
      return { added: true };
    }),
};

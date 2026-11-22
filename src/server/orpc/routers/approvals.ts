import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { addDays, today } from "@/lib/domain/calc";
import { db } from "@/server/store/store";
import { authedProcedure } from "../base";

export const approvalsRouter = {
  list: authedProcedure.handler(() => db().approvals),

  /** WS の承認／本人の確認を切り替える。両方そろうと確定し、元の変更・タスク・プランに反映 */
  toggle: authedProcedure
    .input(z.object({ id: z.string(), who: z.enum(["ws", "artist"]) }))
    .handler(({ input }) => {
      const d = db();
      const a = d.approvals.find((x) => x.id === input.id);
      if (!a) throw new ORPCError("NOT_FOUND", { message: "判断待ちが見つかりません" });
      a[input.who] = !a[input.who];
      const confirmed = a.ws && a.artist;
      if (!confirmed) return { confirmed };

      if (a.kind === "plan") {
        const artist = d.artists.find((x) => x.id === a.artistId);
        if (artist) {
          const pl = artist.plan;
          pl.status = "確定";
          pl.reviews.unshift({
            date: today(),
            kind: "キャリアプラン策定",
            participants: `${artist.name}・WS代表`,
            summary: "目指す姿・柱・ステップを本人と確認し、合意した。",
            decisions: [`${pl.horizon}に目指す姿：${pl.vision}`, `最初のステップ（${pl.steps[0].label}）：${pl.steps[0].text}`],
            nextActions: ["最初の企画の計画を作る"],
          });
          pl.nextReview = addDays(today(), 90);
        }
      }
      if (a.projectId) {
        const p = d.projects.find((x) => x.id === a.projectId);
        if (p) {
          const change = p.changes.find((c) => c.id === a.ref);
          if (change) change.status = "承認済み";
          const task = p.tasks.find((t) => t.id === a.ref);
          if (task && task.status === "確認待ち") task.status = "完了";
          if (a.ref === "CH-003") {
            const feat = p.tasks.find((t) => t.id === "T07");
            if (feat) feat.status = "未着手";
          }
        }
      }
      return { confirmed };
    }),
};

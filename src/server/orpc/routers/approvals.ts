import { z } from "zod";
import { addDays, today } from "@/lib/domain/calc";
import { getApproval, listApprovals, mutateArtist, mutateProject, updateApproval } from "@/server/repo";
import { authedProcedure } from "../base";

export const approvalsRouter = {
  list: authedProcedure.handler(({ context }) => listApprovals(context.supabase)),

  /** WS の承認／本人の確認を切り替える。両方そろうと確定し、元の変更・タスク・企画・プランに反映 */
  toggle: authedProcedure
    .input(z.object({ id: z.string(), who: z.enum(["ws", "artist"]) }))
    .handler(async ({ input, context }) => {
      const sb = context.supabase;
      const a = await getApproval(sb, input.id);
      const next = { ws: a.ws, artist: a.artist, [input.who]: !a[input.who] };
      await updateApproval(sb, a.id, { [input.who]: next[input.who] });
      const confirmed = next.ws && next.artist;
      if (!confirmed) return { confirmed };

      if (a.kind === "plan") {
        await mutateArtist(sb, a.artistId, (artist) => {
          const pl = artist.plan;
          pl.status = "確定";
          pl.reviews.unshift({
            date: today(),
            kind: "キャリアプラン策定",
            participants: `${artist.name}・WS`,
            summary: "目指す姿・柱・ステップを本人と確認し、合意した。",
            decisions: [`${pl.horizon}に目指す姿：${pl.vision}`, `最初のステップ（${pl.steps[0].label}）：${pl.steps[0].text}`],
            nextActions: ["最初の企画の計画を作る"],
          });
          pl.nextReview = addDays(today(), 90);
        });
      }
      if (a.projectId) {
        await mutateProject(sb, a.projectId, (p) => {
          if (a.kind === "project") {
            // 企画の共同承認：実行中に進め、企画書の承認タスクを完了にする
            if (p.phase === 2) p.phase = 3;
            p.tasks.forEach((t) => {
              if (t.ws === "plan" && t.status !== "完了") t.status = "完了";
            });
            if (p.planSource) p.planSource = p.planSource.replace("（共同承認前の下書き）", "（共同承認済み）");
          }
          const change = p.changes.find((c) => c.id === a.ref);
          if (change) change.status = "承認済み";
          const task = p.tasks.find((t) => t.id === a.ref);
          if (task && task.status === "確認待ち") task.status = "完了";
          // この判断を着手条件にしていた保留中のタスクを再開
          p.tasks.forEach((t) => {
            if (t.status === "保留" && a.ref && t.trigger?.includes(a.ref)) t.status = "未着手";
          });
        });
      }
      return { confirmed };
    }),
};

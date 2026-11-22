import { api } from "@/lib/orpc/server";
import { today } from "@/lib/domain/calc";
import { PageHeader } from "@/components/app/ui";
import { ApprovalCard } from "@/components/approvals/approval-card";

export default async function ApprovalsPage() {
  const [approvals, artists, projects] = await Promise.all([api.approvals.list(), api.artists.list(), api.projects.list()]);
  const now = today();
  return (
    <>
      <PageHeader title="判断待ち" sub="担当者は承認済みの範囲で進め、重要なことだけを本人とWSで判断します。両方の確認がそろうと確定します" />
      <div className="grid gap-4 lg:grid-cols-2">
        {approvals.map((a) => {
          const artist = artists.find((x) => x.id === a.artistId);
          const project = a.projectId ? projects.find((x) => x.id === a.projectId) : undefined;
          const href = a.kind === "plan" ? `/dashboard/artists/${a.artistId}` : project ? `/dashboard/projects/${project.id}/${a.ref.startsWith("CH") ? "changes" : `tasks?task=${a.ref}`}` : `/dashboard/artists/${a.artistId}/deals`;
          return (
            <ApprovalCard
              key={a.id}
              approval={a}
              now={now}
              artistName={artist?.name ?? a.artistId}
              artistColor={artist?.color ?? "#333"}
              context={a.kind === "plan" ? "キャリアプラン" : (project?.title ?? "案件")}
              href={href}
              linkLabel={a.kind === "plan" ? "キャリアプランを開く" : project ? "詳細を開く" : "案件を開く"}
            />
          );
        })}
      </div>
      <p className="mt-3.5 text-xs text-muted-foreground">本人の確認は、本人がツールで承認するか、WSが「本人確認済み」として記録します（本人へのアカウント付与範囲は未確定）。</p>
    </>
  );
}

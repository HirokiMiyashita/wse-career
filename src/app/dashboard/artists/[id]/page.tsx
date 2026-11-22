import Link from "next/link";
import { api } from "@/lib/orpc/server";
import { buildAgenda } from "@/lib/domain/agenda";
import { diffDays, nextMilestone, progress, today, ymd } from "@/lib/domain/calc";
import { getArtistOr404 } from "@/server/queries";
import { Button } from "@/components/ui/button";
import { CareerMap } from "@/components/artist/career-map";
import { DraftBanner } from "@/components/artist/draft-banner";
import { ReviewButton } from "@/components/artist/review-dialog";
import { ScopeCard } from "@/components/artist/scope-card";

export default async function ArtistPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [artist, artists, projects, approvals] = await Promise.all([getArtistOr404(id), api.artists.list(), api.projects.list(), api.approvals.list()]);
  const pl = artist.plan;
  const now = today();
  const planApproval = approvals.find((a) => a.kind === "plan" && a.artistId === id) ?? null;
  const cards = projects
    .filter((p) => p.artistId === id)
    .map((p) => ({ id: p.id, title: p.title, types: p.types, phase: p.phase, step: p.step, pillars: p.pillars, progress: progress(p), hasPlan: p.tasks.length > 0, next: nextMilestone(p, now) }));

  return (
    <>
      {pl.status === "下書き" && planApproval && <DraftBanner approval={planApproval} reviewDate={pl.nextReview} />}
      <section className="rounded-xl border bg-linear-to-b from-white to-indigo-50/40 p-5 shadow-xs">
        <div className="text-[12.5px] font-bold text-accent-foreground">{pl.horizon}に目指す姿</div>
        <div className="mt-1.5 text-[22px] font-bold leading-normal tracking-tight">{pl.vision}</div>
      </section>

      <CareerMap artist={artist} artists={artists} projects={cards} />

      <section className="mt-4 flex flex-wrap items-center gap-4 rounded-xl border bg-card p-5 shadow-xs">
        <div className="min-w-60 flex-1">
          <b>
            次のキャリアレビュー：{ymd(pl.nextReview)}（{diffDays(now, pl.nextReview) >= 0 ? `あと${diffDays(now, pl.nextReview)}日` : "期日を過ぎています"}）
          </b>
          <div className="text-[12.5px] text-slate-500">本人と柱の進み具合を確認し、ステップや企画を見直します。議題は自動で用意されます。</div>
        </div>
        <Button variant="outline" asChild>
          <Link href={`/dashboard/artists/${id}/review`}>議題を見る</Link>
        </Button>
        <ReviewButton artist={artist} agenda={buildAgenda(artist, projects, approvals, now)} />
      </section>
      <ScopeCard scope={pl.scope} />
    </>
  );
}

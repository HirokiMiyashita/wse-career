import { api } from "@/lib/orpc/server";
import { buildAgenda } from "@/lib/domain/agenda";
import { today, ymd } from "@/lib/domain/calc";
import { getArtistOr404 } from "@/server/queries";
import { Note, Panel } from "@/components/app/ui";
import { ReviewButton } from "@/components/artist/review-dialog";

export default async function ArtistReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [artist, projects, approvals] = await Promise.all([getArtistOr404(id), api.projects.list(), api.approvals.list()]);
  const agenda = buildAgenda(artist, projects, approvals, today());
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
      <div>
        <Panel title={`次回レビュー ${ymd(artist.plan.nextReview)}`} hint="議題は柱・企画・判断待ちから自動で作成" action={<ReviewButton artist={artist} agenda={agenda} size="sm" />}>
          <div className="px-5 pb-3 pt-2">
            {agenda.map((x, i) => (
              <div key={x} className="flex gap-2.5 border-b border-slate-100 py-2.5 text-[13px] last:border-b-0">
                <span className="mt-px flex size-[18px] shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-white">{i + 1}</span>
                {x}
              </div>
            ))}
          </div>
        </Panel>
        <h2 className="mb-3 mt-7 text-base font-bold">これまでのレビュー</h2>
        {artist.plan.reviews.length === 0 && <div className="rounded-xl border bg-card p-5 text-sm text-muted-foreground">まだ記録がありません。</div>}
        {artist.plan.reviews.map((r) => (
          <section key={r.date + r.kind} className="mb-3 rounded-xl border bg-card p-5 shadow-xs">
            <div className="flex flex-wrap justify-between gap-2.5">
              <b>
                {ymd(r.date)} ・ {r.kind}
              </b>
              <span className="text-[11.5px] text-muted-foreground">参加：{r.participants}</span>
            </div>
            <div className="mb-2.5 mt-2">{r.summary}</div>
            <div className="grid gap-3 md:grid-cols-2">
              <Note>
                <b className="mb-1 block text-xs">決めたこと</b>
                {r.decisions.map((d) => (
                  <div key={d}>・{d}</div>
                ))}
              </Note>
              <Note>
                <b className="mb-1 block text-xs">次にやること</b>
                {r.nextActions.map((d) => (
                  <div key={d}>・{d}</div>
                ))}
              </Note>
            </div>
          </section>
        ))}
      </div>
      <section className="self-start rounded-xl border bg-card p-5 shadow-xs">
        <b>レビューのしかた</b>
        <ol className="ml-4 mt-2 list-decimal text-[12.5px] leading-loose text-slate-600">
          <li>柱ごとの数値と、本人の手応えを確認する</li>
          <li>進行中の企画が、ゴールに効いているかを確認する</li>
          <li>必要ならステップ・企画・ゴールを見直す</li>
          <li>決めたことと次にやることを記録する</li>
        </ol>
        <Note tone="primary" className="mt-3">
          四半期ごとを基本に、企画の振り返りのあとにも実施します。記録はロードマップと次の企画の目標づくりに使われます。
        </Note>
      </section>
    </div>
  );
}

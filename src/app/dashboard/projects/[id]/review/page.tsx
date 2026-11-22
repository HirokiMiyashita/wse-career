import Link from "next/link";
import { fmt, ymd } from "@/lib/domain/calc";
import { getProjectOr404 } from "@/server/queries";
import { Pill } from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import { ReviewForm } from "@/components/project/review-form";

export default async function ProjectReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { project: p, artist } = await getProjectOr404(id);
  const r = p.review;
  if (!r && p.phase >= 3)
    return (
      <ReviewForm
        projectId={p.id}
        goals={p.goals.map((g) => ({ id: g.id, label: g.label, target: g.target, unit: g.unit, pillarName: g.pillar ? (artist.plan.pillars.find((x) => x.id === g.pillar)?.name ?? null) : null }))}
      />
    );
  if (!r)
    return (
      <section className="rounded-xl border bg-card p-5 shadow-xs">
        <b>実行中になると記録できます</b>
        <div className="mb-3.5 mt-1.5 text-[13px] text-slate-500">目標ごとの結果、うまくいったこと・課題・次に活かすことを記録すると、柱の数値が更新され、次のキャリアレビューの議題に入ります。</div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-slate-50 text-left text-xs text-muted-foreground">
                <th className="border-b px-3.5 py-2.5 font-semibold">目標</th>
                <th className="border-b px-3.5 py-2.5 font-semibold">柱</th>
                <th className="border-b px-3.5 py-2.5 text-right font-semibold">目標値</th>
                <th className="border-b px-3.5 py-2.5 text-right font-semibold">結果</th>
              </tr>
            </thead>
            <tbody>
              {p.goals.map((g) => (
                <tr key={g.id} className="border-b border-slate-100">
                  <td className="px-3.5 py-2.5 font-bold">{g.label}</td>
                  <td className="px-3.5 py-2.5 text-xs">{g.pillar ? (artist.plan.pillars.find((x) => x.id === g.pillar)?.name ?? "—") : "—"}</td>
                  <td className="px-3.5 py-2.5 text-right">{g.unit === "円以上" ? "±0以上" : `${fmt(g.target)}${g.unit}`}</td>
                  <td className="px-3.5 py-2.5 text-right">
                    <input disabled placeholder="本番後に入力" className="h-8 w-32 rounded-lg border bg-slate-50 px-2.5 text-right text-sm" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    );
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
      <div className="grid content-start gap-4">
        <section className="overflow-x-auto rounded-xl border bg-card shadow-xs">
          <header className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
            <h3 className="text-[15px] font-bold">目標と結果</h3>
            <span className="text-[11.5px] text-muted-foreground">記録日 {ymd(r.recordedAt)}</span>
          </header>
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-slate-50 text-left text-xs text-muted-foreground">
                <th className="border-b px-3.5 py-2.5 font-semibold">指標</th>
                <th className="border-b px-3.5 py-2.5 text-right font-semibold">目標</th>
                <th className="border-b px-3.5 py-2.5 text-right font-semibold">結果</th>
                <th className="border-b px-3.5 py-2.5 font-semibold">判定</th>
              </tr>
            </thead>
            <tbody>
              {r.kpis.map((k) => (
                <tr key={k.label} className="border-b border-slate-100 last:border-b-0">
                  <td className="px-3.5 py-2.5 font-bold">{k.label}</td>
                  <td className="px-3.5 py-2.5 text-right">{k.target}</td>
                  <td className="px-3.5 py-2.5 text-right font-bold">{k.result}</td>
                  <td className="px-3.5 py-2.5">
                    <Pill tone={k.verdict.startsWith("達成") ? "done" : "wait"}>{k.verdict}</Pill>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <div className="grid gap-4 md:grid-cols-2">
          {(
            [
              ["うまくいったこと", r.good],
              ["課題", r.issues],
            ] as const
          ).map(([title, items]) => (
            <section key={title} className="rounded-xl border bg-card p-5 shadow-xs">
              <b>{title}</b>
              <div className="mt-1.5 text-[13px] leading-loose">
                {items.map((x) => (
                  <div key={x}>・{x}</div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
      <div className="grid content-start gap-4">
        <section className="rounded-xl border border-indigo-200 bg-card p-5 shadow-xs">
          <b>キャリアプランへの反映</b>
          <div className="mb-2.5 mt-1.5 text-[12.5px] text-slate-500">結果を柱の数値に反映し、次のステップの見直しにつなげます</div>
          {r.careerUpdates.map((x) => (
            <div key={x} className="flex gap-2.5 border-b border-slate-100 py-2 text-[13px] last:border-b-0">
              <span className="mt-px flex size-[18px] shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[11px] font-bold text-white">✓</span>
              {x}
            </div>
          ))}
          <Button variant="outline" size="sm" className="mt-2.5" asChild>
            <Link href={`/dashboard/artists/${artist.id}/review`}>レビューを見る</Link>
          </Button>
        </section>
        <section className="rounded-xl border bg-card p-5 shadow-xs">
          <b>次の企画に活かすこと</b>
          <div className="mt-1.5 text-[13px] leading-loose">
            {r.next.map((x) => (
              <div key={x}>・{x}</div>
            ))}
          </div>
          <div className="mt-2 text-xs text-muted-foreground">ナレッジに登録済み。AIの提案と計画チェックで使われます。</div>
        </section>
      </div>
    </div>
  );
}

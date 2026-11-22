import { api } from "@/lib/orpc/server";
import { md } from "@/lib/domain/calc";
import { DEAL_STAGES } from "@/lib/domain/constants";
import { Empty, Note, Pill } from "@/components/app/ui";
import { cn } from "@/lib/utils";

export default async function ArtistDealsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const deals = await api.library.deals({ artistId: id });
  return (
    <>
      <Note className="mb-3">WSが窓口となり交渉します。表現の制約や競合条項がある案件だけ本人と協議します。こちらから営業をかける案件は扱いません。</Note>
      {deals.length === 0 ? (
        <Empty title="受付中の案件はありません" />
      ) : (
        <section className="rounded-xl border bg-card shadow-xs">
          {deals.map((d) => (
            <div key={d.id} className="flex items-start gap-3 border-b border-slate-100 px-5 py-4 last:border-b-0">
              <div className="min-w-0 flex-1">
                <div className="font-semibold">{d.title}</div>
                <div className="text-[11.5px] text-muted-foreground">
                  {md(d.date)} 受付 ・ {d.fee} ・ 次：{d.next}
                </div>
                <div className="mt-2.5 flex gap-1">
                  {DEAL_STAGES.map((s, i) => (
                    <div key={s} className="flex-1">
                      <div className={cn("h-1 rounded-full", i < d.stage ? "bg-emerald-600" : i === d.stage ? "bg-primary" : "bg-slate-200")} />
                      <div className={cn("mt-1 text-[11px]", i === d.stage ? "font-bold text-accent-foreground" : "text-muted-foreground")}>{s}</div>
                    </div>
                  ))}
                </div>
              </div>
              {d.sensitive && <Pill tone="wait">本人と協議</Pill>}
            </div>
          ))}
        </section>
      )}
    </>
  );
}

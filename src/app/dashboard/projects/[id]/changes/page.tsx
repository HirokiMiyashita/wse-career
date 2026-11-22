import { yen, ymd } from "@/lib/domain/calc";
import { getProjectOr404 } from "@/server/queries";
import { Empty, Pill, Tag } from "@/components/app/ui";
import { ChangeButton } from "@/components/project/change-dialog";

export default async function ChangesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { project: p } = await getProjectOr404(id);
  return (
    <>
      <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2.5">
        <div className="text-[13px] text-slate-500">追加・差し替え・延期・統合・中止を、影響と判断とあわせて記録します。重要な変更だけが「判断待ち」に上がります。</div>
        <ChangeButton project={p} label="＋ 変更を記録" />
      </div>
      {p.changes.length === 0 ? (
        <Empty title="変更の記録はまだありません" />
      ) : (
        <section className="rounded-xl border bg-card shadow-xs">
          {p.changes.map((c) => (
            <div key={c.id} className="flex items-start gap-3 border-b border-slate-100 px-5 py-4 last:border-b-0">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <b>{c.title}</b>
                  <Tag>{c.type}</Tag>
                </div>
                <div className="mb-2 mt-0.5 text-[11.5px] text-muted-foreground">
                  {ymd(c.date)} ・ {c.by} ・ {c.memo}
                </div>
                <div className="flex flex-wrap gap-1">
                  {c.areas.map((a) => (
                    <Tag key={a} variant="white">
                      {a}
                    </Tag>
                  ))}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <Pill tone={c.status === "判断待ち" ? "wait" : "done"}>{c.status}</Pill>
                <div className="mt-1.5 text-[11.5px] text-muted-foreground">{c.judgement === "重要" ? "本人＋WSで判断" : "担当者が調整"}</div>
                <div className="mt-0.5 text-[11.5px]">
                  費用 {c.cost ? `+${yen(c.cost)}` : "±0"} ・ 日程 {c.days ? `+${c.days}日` : "影響なし"}
                </div>
              </div>
            </div>
          ))}
        </section>
      )}
    </>
  );
}

import { budgetSum, yen } from "@/lib/domain/calc";
import { getProjectOr404 } from "@/server/queries";
import { Bar, Note, Tag } from "@/components/app/ui";
import { NoPlan } from "@/components/project/no-plan";

export default async function BudgetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { project: p } = await getProjectOr404(id);
  if (!p.budget.length) return <NoPlan projectId={p.id} />;
  const cats = [...new Set(p.budget.map((b) => b.category))];
  const total = budgetSum(p, "plan");
  const committed = budgetSum(p, "committed");
  const paid = budgetSum(p, "paid");
  const pendingIncrease = p.changes.filter((c) => c.status === "判断待ち").reduce((s, c) => s + c.cost, 0);
  const kpis = [
    ["承認済み予算", yen(total), "共同承認で確定", false],
    ["発注済み・見込", yen(committed), `予算の${total ? Math.round((committed / total) * 100) : 0}%`, false],
    ["支払済み", yen(paid), "経理担当から共有された値", false],
    ["判断待ちの増額", pendingIncrease ? `+${yen(pendingIncrease)}` : "なし", pendingIncrease ? "変更タブを確認" : "", pendingIncrease > 0],
  ] as const;
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map(([label, value, sub, alert]) => (
          <div key={label} className="rounded-xl border bg-card p-5 shadow-xs">
            <div className="text-xs font-semibold text-muted-foreground">{label}</div>
            <div className={`mt-1 text-[22px] font-bold ${alert ? "text-red-600" : ""}`}>{value}</div>
            <div className="text-[11.5px] text-muted-foreground">{sub}</div>
          </div>
        ))}
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-slate-50 text-left text-xs text-muted-foreground">
                <th className="border-b px-3.5 py-2.5 font-semibold">費目</th>
                <th className="border-b px-3.5 py-2.5 text-right font-semibold">予算</th>
                <th className="border-b px-3.5 py-2.5 text-right font-semibold">発注済み・見込</th>
                <th className="border-b px-3.5 py-2.5 text-right font-semibold">支払済み</th>
                <th className="w-28 border-b px-3.5 py-2.5 font-semibold">消化</th>
              </tr>
            </thead>
            <tbody>
              {cats.map((c) => {
                const rows = p.budget.filter((b) => b.category === c);
                const cp = rows.reduce((s, b) => s + (b.plan ?? 0), 0);
                const cc = rows.reduce((s, b) => s + (b.committed ?? 0), 0);
                return [
                  <tr key={c} className="bg-slate-50 font-bold text-slate-600">
                    <td className="px-3.5 py-2">{c}</td>
                    <td className="px-3.5 py-2 text-right">{cp ? yen(cp) : "—"}</td>
                    <td className="px-3.5 py-2 text-right">{cc ? yen(cc) : "—"}</td>
                    <td />
                    <td className="px-3.5 py-2">{cp ? <Bar value={(cc / cp) * 100} /> : null}</td>
                  </tr>,
                  ...rows.map((b) => (
                    <tr key={c + b.item} className="border-b border-slate-100">
                      <td className="py-2.5 pl-7 pr-3.5">
                        {b.item} {b.plan === null && <Tag variant="dashed">条件未確定</Tag>}
                      </td>
                      <td className="px-3.5 py-2.5 text-right">{b.plan === null ? "—" : yen(b.plan)}</td>
                      <td className="px-3.5 py-2.5 text-right">{b.committed ? yen(b.committed) : <span className="text-muted-foreground">—</span>}</td>
                      <td className="px-3.5 py-2.5 text-right">{b.paid ? yen(b.paid) : <span className="text-muted-foreground">—</span>}</td>
                      <td />
                    </tr>
                  )),
                ];
              })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 font-bold">
                <td className="border-t px-3.5 py-2.5">合計</td>
                <td className="border-t px-3.5 py-2.5 text-right">{yen(total)}</td>
                <td className="border-t px-3.5 py-2.5 text-right">{yen(committed)}</td>
                <td className="border-t px-3.5 py-2.5 text-right">{yen(paid)}</td>
                <td className="border-t" />
              </tr>
            </tfoot>
          </table>
        </div>
        <div className="grid content-start gap-4">
          <section className="rounded-xl border bg-card p-5 shadow-xs">
            <b>誰が判断するか</b>
            <div className="mt-2 text-[13px] leading-loose">
              <b>担当者が調整</b>：承認済み予算の範囲で、費目内の調整
              <br />
              <b>本人＋WSで判断</b>：予算超過、費目間の大きな移動、契約・権利を伴う支出、作品の方針に関わる変更
            </div>
            <Note tone="warn" className="mt-2.5">
              「大きな移動」の基準と、予算内でも事前承認が必要な契約・権利の範囲は未確定です。
            </Note>
          </section>
          <section className="rounded-xl border bg-card p-5 shadow-xs">
            <b>このツールで扱わないこと</b>
            <div className="mt-1.5 text-[12.5px] text-slate-500">請求書の発行・入金確認・精算は扱いません。支払済みの金額は経理担当から共有された値を記録し、WSは月に1回、収支の状況を確認します。</div>
          </section>
        </div>
      </div>
    </>
  );
}

import Link from "next/link";
import { api } from "@/lib/orpc/server";
import { BENCHMARKS } from "@/lib/domain/constants";
import { ArtistAvatar, Note, PageHeader, Panel } from "@/components/app/ui";

export default async function KnowledgePage() {
  const [items, artists] = await Promise.all([api.library.knowledge(), api.artists.list()]);
  return (
    <>
      <PageHeader title="ナレッジ" sub="企画の振り返りとキャリアレビューから集まった学び。AIの提案と計画チェックはここを参照します" />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <div className="grid content-start gap-4">
          {items.map((k) => {
            const a = artists.find((x) => x.id === k.artistId);
            const body = (
              <>
                <div className="flex items-center gap-2">
                  {a && <ArtistAvatar name={a.name} color={a.color} size="sm" />}
                  <span className="text-[12.5px] text-slate-500">
                    {a?.name} ・ {k.date}
                  </span>
                  {k.projectId && <span className="ml-auto text-xs text-primary">振り返りを開く</span>}
                </div>
                <b className="my-2 block text-[15px]">{k.title}</b>
                <div className="flex flex-wrap gap-5">
                  {k.metrics.map(([label, value]) => (
                    <div key={label}>
                      <div className="text-[11.5px] text-muted-foreground">{label}</div>
                      <b>{value}</b>
                    </div>
                  ))}
                </div>
                <Note className="mt-2.5">
                  <b className="text-xs">学び</b>　{k.learning}
                </Note>
              </>
            );
            const cls = "block rounded-xl border bg-card p-5 shadow-xs";
            return k.projectId ? (
              <Link key={k.title} href={`/dashboard/projects/${k.projectId}/review`} className={`${cls} transition hover:border-indigo-200 hover:shadow-md`}>
                {body}
              </Link>
            ) : (
              <section key={k.title} className={cls}>
                {body}
              </section>
            );
          })}
        </div>
        <Panel title="社内の目安" className="self-start">
          <table className="w-full text-[13px]">
            <tbody>
              {BENCHMARKS.map((b) => (
                <tr key={b.label} className="border-b border-slate-100 last:border-b-0">
                  <td className="px-5 py-2.5 text-xs">{b.label}</td>
                  <td className="px-5 py-2.5 text-right">
                    <b>{b.value}</b>
                    <div className="text-[11.5px] text-muted-foreground">{b.source}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-5 pb-4 text-xs text-muted-foreground">件数が少ないうちは参考値です</div>
        </Panel>
      </div>
    </>
  );
}

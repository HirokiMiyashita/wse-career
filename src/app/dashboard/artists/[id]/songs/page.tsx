import Link from "next/link";
import { api } from "@/lib/orpc/server";
import { RIGHTS_LABELS, SONG_STAGES } from "@/lib/domain/constants";
import { Bar, Empty, Note, Panel, Pill } from "@/components/app/ui";

export default async function ArtistSongsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const songs = await api.library.songs({ artistId: id });
  if (!songs.length)
    return <Empty title="収録候補の楽曲はまだありません">企画で収録候補が決まると、ここに制作段階と権利の確認状況が並びます。日常のデモ制作は対象外です。</Empty>;
  return (
    <>
      <Note tone="warn" className="mb-3">
        「買い切り」の範囲は契約によって異なります。独占利用・著作権・原盤・印税分配を一括で取得したと推定せず、項目ごとに確認します。
      </Note>
      <Panel title={`収録候補（${songs.length}曲）`} action={<Link href="/dashboard/projects/P1" className="text-xs text-primary">企画を開く</Link>}>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-slate-50 text-left text-xs text-muted-foreground">
                {["No.", "曲名", "ビート", "制作段階", ...RIGHTS_LABELS, "メモ"].map((h) => (
                  <th key={h} className="whitespace-nowrap border-b px-3.5 py-2.5 font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {songs.map((s) => (
                <tr key={s.no} className="border-b border-slate-100 last:border-b-0">
                  <td className="px-3.5 py-2.5">{s.no}</td>
                  <td className="px-3.5 py-2.5 font-bold">{s.title}</td>
                  <td className="px-3.5 py-2.5 text-xs">{s.beat}</td>
                  <td className="min-w-36 px-3.5 py-2.5">
                    <Bar value={(s.stage / 5) * 100} tone={s.stage === 5 ? "ok" : "primary"} />
                    <div className="mt-1 text-[11.5px] text-muted-foreground">{SONG_STAGES[s.stage]}</div>
                  </td>
                  {s.rights.map((r, i) => (
                    <td key={i} className="px-3.5 py-2.5">
                      {r === "ok" ? <Pill tone="done">確認済</Pill> : r === "ng" ? <Pill tone="wait">要確認</Pill> : <span className="text-[11.5px] text-muted-foreground">対象外</span>}
                    </td>
                  ))}
                  <td className="px-3.5 py-2.5 text-[11.5px] text-muted-foreground">{s.memo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}

import { api } from "@/lib/orpc/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMember, listMembers, memberName, type Invitation } from "@/server/members";
import { Note, PageHeader, Panel, Pill, Tag } from "@/components/app/ui";
import { InviteForm, InviteRowActions } from "./member-forms";

/** timestamptz を日本時間の日付で表示 */
const jstDate = (ts: string) => new Date(ts).toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo" });

const KIND_LABEL = { employee: "従業員", artist: "アーティスト" } as const;

export default async function MembersPage() {
  const [me, members, artists] = await Promise.all([getCurrentMember(), listMembers(), api.artists.list()]);
  const isAdmin = !!me?.is_admin;
  const artistName = (id: string | null) => artists.find((a) => a.id === id)?.name ?? id ?? "—";

  let invitations: Invitation[] = [];
  if (isAdmin) {
    const supabase = await createClient();
    const { data } = await supabase.from("invitations").select("id, email, kind, artist_id, member_id, status, created_at").eq("status", "pending").order("created_at", { ascending: false });
    invitations = (data as Invitation[]) ?? [];
  }
  const active = members.filter((m) => m.status !== "invited");

  return (
    <>
      <PageHeader title="メンバー" sub="アプリを使う人の一覧。タスクの担当に割り当てられるのは従業員だけです（外部パートナーはタスクに「実行」のタグを付けて管理します）" />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <div className="grid content-start gap-4">
          <Panel title={`メンバー（${active.length}人）`}>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="bg-slate-50 text-left text-xs text-muted-foreground">
                    {["名前", "種別", "タスクの担当", "登録日"].map((h) => (
                      <th key={h} className="whitespace-nowrap border-b px-3.5 py-2.5 font-semibold">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {active.map((m) => (
                    <tr key={m.id} className="border-b border-slate-100 last:border-b-0">
                      <td className="px-3.5 py-2.5">
                        <b>{memberName(m)}</b>
                        {m.id === me?.id && <span className="ml-1.5 text-[11.5px] text-muted-foreground">（自分）</span>}
                        <div className="text-[11.5px] text-muted-foreground">{m.email}</div>
                      </td>
                      <td className="px-3.5 py-2.5">
                        <div className="flex flex-wrap gap-1">
                          <Tag variant={m.kind === "employee" ? "primary" : "default"}>{KIND_LABEL[m.kind]}</Tag>
                          {m.is_admin && <Tag variant="white">管理者</Tag>}
                          {m.status === "disabled" && <Tag variant="dashed">停止中</Tag>}
                        </div>
                        {m.kind === "artist" && <div className="mt-1 text-[11.5px] text-muted-foreground">{artistName(m.artist_id)}</div>}
                      </td>
                      <td className="px-3.5 py-2.5 text-xs">{m.kind === "employee" ? <Pill tone="done">割り当て可</Pill> : <span className="text-muted-foreground">割り当て不可</span>}</td>
                      <td className="whitespace-nowrap px-3.5 py-2.5 text-xs text-muted-foreground">{jstDate(m.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          {isAdmin && (
            <Panel title={`招待中（${invitations.length}件）`} hint="メールのリンクから表示名とパスワードを設定すると、メンバーに移ります">
              {invitations.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-muted-foreground">招待中の人はいません</div>
              ) : (
                invitations.map((i) => (
                  <div key={i.id} className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-5 py-3 last:border-b-0">
                    <div className="min-w-0 flex-1">
                      <b className="text-[13px]">{i.email}</b>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11.5px] text-muted-foreground">
                        <Tag variant={i.kind === "employee" ? "primary" : "default"}>{KIND_LABEL[i.kind]}</Tag>
                        {i.kind === "artist" && <span>{artistName(i.artist_id)}</span>}
                        <span>{jstDate(i.created_at)} 招待</span>
                      </div>
                    </div>
                    <InviteRowActions invitationId={i.id} />
                  </div>
                ))
              )}
            </Panel>
          )}
        </div>

        <div className="grid content-start gap-4">
          {isAdmin ? (
            <section className="rounded-xl border bg-card p-5 shadow-xs">
              <b>メンバーを招待</b>
              <div className="mb-3 mt-0.5 text-[12.5px] text-slate-500">招待メールが届きます。リンクから表示名とパスワードを設定すると使えるようになります。</div>
              <InviteForm artists={artists.map((a) => ({ id: a.id, name: a.name }))} />
            </section>
          ) : (
            <Note>メンバーの招待は管理者が行います。</Note>
          )}
          <section className="rounded-xl border bg-card p-5 shadow-xs">
            <b>種別のちがい</b>
            <div className="mt-2 text-[12.5px] leading-loose text-slate-600">
              <b>従業員</b>：タスクの担当に割り当てられ、ステータスを更新します
              <br />
              <b>アーティスト</b>：自分のキャリアプランや企画を確認します。タスクの担当には割り当てません
              <br />
              <b>外部パートナー</b>：アプリには入りません。タスクの「実行」に付けるタグで表します
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

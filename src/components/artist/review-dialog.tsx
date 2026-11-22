"use client";

import { useState } from "react";
import { client } from "@/lib/orpc/client";
import { addDays, today, ymd } from "@/lib/domain/calc";
import type { Artist } from "@/lib/domain/types";
import { Modal } from "@/components/app/overlay";
import { useAction } from "@/components/app/use-action";
import { Field } from "@/components/project/new-project-dialog";
import { Button } from "@/components/ui/button";

const lines = (s: string) =>
  s
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);

/** キャリアレビューを記録するダイアログ */
export function ReviewButton({ artist, agenda, size = "default" }: { artist: Artist; agenda: string[]; size?: "default" | "sm" }) {
  const [open, setOpen] = useState(false);
  const [summary, setSummary] = useState("");
  const [decisions, setDecisions] = useState("");
  const [nextActions, setNextActions] = useState("");
  const [nextReview, setNextReview] = useState(addDays(today(), 90));
  const { run, pending } = useAction();

  async function save() {
    const r = await run(
      () => client.artists.addReview({ artistId: artist.id, summary, decisions: lines(decisions), nextActions: lines(nextActions), nextReview }),
      "レビューを記録しました",
    );
    if (r) {
      setOpen(false);
      setSummary("");
      setDecisions("");
      setNextActions("");
    }
  }
  const ta = "w-full rounded-lg border px-3 py-2 text-sm leading-relaxed outline-none focus:border-primary";
  return (
    <>
      <Button size={size} onClick={() => setOpen(true)}>
        レビューを始める
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={`キャリアレビュー（${artist.name}）`}
        sub={`${ymd(today())} ・ 参加：${artist.name}・WS代表`}
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>
              キャンセル
            </Button>
            <Button onClick={save} disabled={pending}>
              記録する
            </Button>
          </>
        }
      >
        {agenda.length > 0 && (
          <div className="mb-4 rounded-lg bg-slate-50 px-3 py-2.5 text-[12.5px] leading-relaxed text-slate-600">
            <b className="text-xs">議題</b>
            {agenda.slice(0, 7).map((a) => (
              <div key={a}>・{a}</div>
            ))}
          </div>
        )}
        <div className="space-y-4">
          <Field label="今回のまとめ">
            <textarea className={ta} rows={2} value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="例：先行曲①の反応が良く、リスナーの柱が前倒しで進んでいる" />
          </Field>
          <Field label="決めたこと（1行に1つ）">
            <textarea className={ta} rows={3} value={decisions} onChange={(e) => setDecisions(e.target.value)} placeholder="例：2028年のステップに東京での対バン出演を追加する" />
          </Field>
          <Field label="次にやること（1行に1つ）">
            <textarea className={ta} rows={2} value={nextActions} onChange={(e) => setNextActions(e.target.value)} />
          </Field>
          <Field label="次回のレビュー日">
            <input type="date" className="h-9 rounded-lg border px-3 text-sm" value={nextReview} onChange={(e) => setNextReview(e.target.value)} />
          </Field>
        </div>
      </Modal>
    </>
  );
}

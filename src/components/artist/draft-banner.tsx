"use client";

import { client } from "@/lib/orpc/client";
import { ymd } from "@/lib/domain/calc";
import type { Approval } from "@/lib/domain/types";
import { useAction } from "@/components/app/use-action";
import { Button } from "@/components/ui/button";

/** 下書きのキャリアプラン：WS の確認と本人の合意がそろうと確定 */
export function DraftBanner({ approval, reviewDate }: { approval: Approval; reviewDate: string }) {
  const { run, pending } = useAction();
  const toggle = (who: "ws" | "artist") =>
    run(() => client.approvals.toggle({ id: approval.id, who }), (r) => (r.confirmed ? "キャリアプランが確定しました" : "記録しました"));
  return (
    <section className="mb-4 flex flex-wrap items-center gap-4 rounded-xl border border-amber-200 bg-amber-50/60 p-5">
      <div className="min-w-64 flex-1">
        <b>このキャリアプランは下書きです</b>
        <div className="text-[12.5px] text-slate-600">{ymd(reviewDate)}の打ち合わせで本人と内容を確認し、合意したら確定します。確定するまでは、内容を自由に直せます。</div>
      </div>
      <Button variant={approval.ws ? "default" : "outline"} className={approval.ws ? "bg-emerald-600 hover:bg-emerald-700" : ""} disabled={pending} onClick={() => toggle("ws")}>
        {approval.ws ? "✓ WS確認済み" : "WSとして確認"}
      </Button>
      <Button variant={approval.artist ? "default" : "outline"} className={approval.artist ? "bg-emerald-600 hover:bg-emerald-700" : ""} disabled={pending} onClick={() => toggle("artist")}>
        {approval.artist ? "✓ 本人の合意あり" : "本人の合意を記録"}
      </Button>
    </section>
  );
}

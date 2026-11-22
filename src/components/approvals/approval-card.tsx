"use client";

import Link from "next/link";
import { client } from "@/lib/orpc/client";
import { md } from "@/lib/domain/calc";
import type { Approval } from "@/lib/domain/types";
import { ArtistAvatar, Pill } from "@/components/app/ui";
import { useAction } from "@/components/app/use-action";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ApprovalCard({
  approval: a,
  now,
  artistName,
  artistColor,
  context,
  href,
  linkLabel,
}: {
  approval: Approval;
  now: string;
  artistName: string;
  artistColor: string;
  context: string;
  href: string;
  linkLabel: string;
}) {
  const { run, pending } = useAction();
  const done = a.ws && a.artist;
  const toggle = (who: "ws" | "artist") => run(() => client.approvals.toggle({ id: a.id, who }), (r) => (r.confirmed ? "本人とWSの確認がそろい、確定しました" : "記録しました"));
  const ok = "bg-emerald-600 text-white hover:bg-emerald-700";
  return (
    <section className={cn("rounded-xl border bg-card p-5 shadow-xs", done && "opacity-60")}>
      <div className="flex items-center gap-2">
        <ArtistAvatar name={artistName} color={artistColor} size="sm" />
        <span className="text-[12.5px] text-slate-500">
          {artistName} ・ {context}
        </span>
        <span className="ml-auto">
          <Pill tone={done ? "done" : a.due < now ? "late" : "wait"}>{done ? "確定" : `${md(a.due)}まで`}</Pill>
        </span>
      </div>
      <div className="mb-1 mt-2.5 text-[15px] font-bold">{a.title}</div>
      <div className="text-[12.5px] text-slate-500">{a.reason}</div>
      <div className="mt-3.5 grid grid-cols-2 gap-2">
        <Button variant="outline" className={cn(a.ws && ok)} disabled={pending} onClick={() => toggle("ws")}>
          {a.ws ? "✓ WS承認済み" : "WSとして承認"}
        </Button>
        <Button variant="outline" className={cn(a.artist && ok)} disabled={pending} onClick={() => toggle("artist")}>
          {a.artist ? "✓ 本人確認済み" : "本人の確認を記録"}
        </Button>
      </div>
      <Link href={href} className="mt-2.5 inline-block text-xs text-primary">
        {linkLabel}
      </Link>
    </section>
  );
}

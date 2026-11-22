"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Chip, Field } from "@/components/project/new-project-dialog";
import { useToast } from "@/components/app/overlay";
import { cn } from "@/lib/utils";
import { inviteMember, resendInvite, revokeInvite, type InviteState } from "./actions";

/** 招待フォーム：メールアドレスと種別（従業員／アーティスト）を選ぶ */
export function InviteForm({ artists }: { artists: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState<InviteState, FormData>(inviteMember, null);
  const [kind, setKind] = useState<"employee" | "artist">("employee");
  const [artistId, setArtistId] = useState(artists[0]?.id ?? "");
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="space-y-4">
      <Field label="メールアドレス">
        <input name="email" type="email" required placeholder="name@example.com" className="h-9 w-full rounded-lg border px-3 text-sm outline-none focus:border-primary" />
      </Field>
      <Field label="種別">
        <input type="hidden" name="kind" value={kind} />
        <div className="flex flex-wrap gap-1.5">
          <Chip on={kind === "employee"} onClick={() => setKind("employee")}>
            従業員
          </Chip>
          <Chip on={kind === "artist"} onClick={() => setKind("artist")}>
            アーティスト
          </Chip>
        </div>
        <div className="mt-1.5 text-[11.5px] text-muted-foreground">{kind === "employee" ? "タスクの担当に割り当てられます" : "タスクの担当には割り当てられません"}</div>
      </Field>
      {kind === "artist" && (
        <Field label="どのアーティストか">
          <input type="hidden" name="artistId" value={artistId} />
          <div className="flex flex-wrap gap-1.5">
            {artists.map((a) => (
              <Chip key={a.id} on={artistId === a.id} onClick={() => setArtistId(a.id)}>
                {a.name}
              </Chip>
            ))}
          </div>
        </Field>
      )}
      {state && <p className={cn("text-[12.5px]", state.ok ? "text-emerald-700" : "text-red-600")}>{state.message}</p>}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "送信中…" : "招待メールを送る"}
      </Button>
    </form>
  );
}

/** 招待中の行：再送・取り消し */
export function InviteRowActions({ invitationId }: { invitationId: string }) {
  const toast = useToast();
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<InviteState>) =>
    start(async () => {
      const r = await fn();
      if (r) toast(r.ok ? r.message : `エラー：${r.message}`);
      router.refresh();
    });
  return (
    <div className="flex gap-1.5">
      <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => resendInvite(invitationId))}>
        再送
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() => {
          if (confirm("この招待を取り消しますか？")) run(() => revokeInvite(invitationId));
        }}
      >
        取り消す
      </Button>
    </div>
  );
}

"use client";

import Link from "next/link";
import { client } from "@/lib/orpc/client";
import { Button } from "@/components/ui/button";
import { useAction } from "@/components/app/use-action";

/** 企画の段階を次に進めるボタン（構想 → 協議 → 共同承認 → 実行中 → 公開・本番 → 振り返り） */
export function PhaseButton({ projectId, phase, hasPlan }: { projectId: string; phase: number; hasPlan: boolean }) {
  const { run, pending } = useAction();
  const advance = (msg: string) => run(() => client.projects.advancePhase({ projectId }), msg);
  if (phase === 0) return <Button disabled={pending} onClick={() => advance("協議に進めました")}>協議に進める</Button>;
  if (phase === 1)
    return (
      <Button disabled={pending || !hasPlan} title={hasPlan ? undefined : "先に計画を作ってください"} onClick={() => advance("共同承認に出しました（判断待ちに追加）")}>
        共同承認に出す
      </Button>
    );
  if (phase === 2)
    return (
      <Button variant="outline" asChild>
        <Link href="/dashboard/approvals">共同承認の判断待ちを開く</Link>
      </Button>
    );
  if (phase === 3) return <Button disabled={pending} onClick={() => advance("公開・本番に進めました")}>公開・本番に進める</Button>;
  if (phase === 4)
    return (
      <Button asChild>
        <Link href={`/dashboard/projects/${projectId}/review`}>振り返りを記録する</Link>
      </Button>
    );
  return null;
}

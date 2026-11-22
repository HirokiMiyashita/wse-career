"use client";

import { client } from "@/lib/orpc/client";
import { Button } from "@/components/ui/button";
import { useAction } from "@/components/app/use-action";
import { openAiPanel } from "./new-project-dialog";

export function NoPlan({ projectId }: { projectId: string }) {
  const { run, pending } = useAction();
  return (
    <div className="rounded-xl border bg-card px-5 py-10 text-center text-sm text-slate-500">
      <div className="mb-1.5 text-[15px] font-bold text-foreground">まだ計画がありません</div>
      <p className="mb-4">目標は決まっています。AIに進め方の案を比較してもらうか、標準テンプレートから日程・担当・予算・タスクを作ります。</p>
      <div className="flex flex-wrap justify-center gap-2">
        <Button onClick={openAiPanel}>AIで進め方の案を出す</Button>
        <Button
          variant="outline"
          disabled={pending}
          onClick={() => run(() => client.projects.applyPlan({ projectId, option: "A", source: "template" }), "標準テンプレートから計画を作りました（共同承認前の下書き）")}
        >
          テンプレートから作る
        </Button>
      </div>
    </div>
  );
}

"use client";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/app/overlay";
import { openAiPanel } from "./new-project-dialog";

export function NoPlan() {
  const toast = useToast();
  return (
    <div className="rounded-xl border bg-card px-5 py-10 text-center text-sm text-slate-500">
      <div className="mb-1.5 text-[15px] font-bold text-foreground">まだ計画がありません</div>
      <p className="mb-4">目標は決まっています。AIに進め方の案を比較してもらうか、テンプレートから日程・担当・予算・タスクを作ります。</p>
      <div className="flex flex-wrap justify-center gap-2">
        <Button onClick={openAiPanel}>AIで進め方の案を出す</Button>
        <Button variant="outline" onClick={() => toast("テンプレートからの作成は今後実装します。いまはAIからの作成をお試しください")}>
          テンプレートから作る
        </Button>
      </div>
    </div>
  );
}

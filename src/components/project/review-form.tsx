"use client";

import { useState } from "react";
import { client } from "@/lib/orpc/client";
import { fmt } from "@/lib/domain/calc";
import { Button } from "@/components/ui/button";
import { Note } from "@/components/app/ui";
import { useAction } from "@/components/app/use-action";

export interface ReviewGoal {
  id: string;
  label: string;
  target: number;
  unit: string;
  pillarName: string | null;
}

const lines = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);

/** 振り返りの入力：目標ごとの結果と、うまくいったこと・課題・次に活かすこと */
export function ReviewForm({ projectId, goals }: { projectId: string; goals: ReviewGoal[] }) {
  const { run, pending } = useAction();
  const [results, setResults] = useState<Record<string, string>>({});
  const [good, setGood] = useState("");
  const [issues, setIssues] = useState("");
  const [next, setNext] = useState("");
  const input = "w-full rounded-lg border bg-white px-2.5 py-1.5 text-sm outline-none focus:border-primary";

  function submit() {
    run(
      () =>
        client.projects.recordReview({
          projectId,
          results: goals.filter((g) => results[g.id] !== undefined && results[g.id] !== "").map((g) => ({ goalId: g.id, result: Number(results[g.id]) })),
          good: lines(good),
          issues: lines(issues),
          next: lines(next),
        }),
      "振り返りを記録し、キャリアプランの柱に反映しました",
    );
  }

  return (
    <section className="rounded-xl border bg-card p-5 shadow-xs">
      <b>振り返りを記録する</b>
      <div className="mb-3.5 mt-1.5 text-[13px] text-slate-500">目標ごとの結果を入れると、達成したかを判定し、キャリアプランの柱の数値を更新します。記録した内容はナレッジに入り、次のキャリアレビューの議題になります。</div>
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="bg-slate-50 text-left text-xs text-muted-foreground">
              <th className="border-b px-3.5 py-2.5 font-semibold">目標</th>
              <th className="border-b px-3.5 py-2.5 font-semibold">柱</th>
              <th className="border-b px-3.5 py-2.5 text-right font-semibold">目標値</th>
              <th className="border-b px-3.5 py-2.5 text-right font-semibold">結果</th>
            </tr>
          </thead>
          <tbody>
            {goals.map((g) => {
              const money = g.unit === "円以上";
              return (
                <tr key={g.id} className="border-b border-slate-100">
                  <td className="px-3.5 py-2.5 font-bold">{g.label}</td>
                  <td className="px-3.5 py-2.5 text-xs">{g.pillarName ?? "—"}</td>
                  <td className="px-3.5 py-2.5 text-right">{money ? "±0円以上" : `${fmt(g.target)}${g.unit}`}</td>
                  <td className="px-3.5 py-2.5 text-right">
                    <span className="inline-flex items-center gap-1.5">
                      <input
                        type="number"
                        aria-label={`${g.label}の結果`}
                        className="h-8 w-32 rounded-lg border bg-white px-2.5 text-right text-sm outline-none focus:border-primary"
                        value={results[g.id] ?? ""}
                        placeholder={money ? "例：120000" : ""}
                        onChange={(e) => setResults({ ...results, [g.id]: e.target.value })}
                      />
                      <span className="w-6 text-left text-xs text-muted-foreground">{money ? "円" : g.unit}</span>
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {(
          [
            ["うまくいったこと", good, setGood],
            ["課題", issues, setIssues],
            ["次の企画に活かすこと", next, setNext],
          ] as const
        ).map(([label, value, set]) => (
          <label key={label} className="block text-xs font-semibold text-slate-600">
            {label}（1行に1つ）
            <textarea rows={4} className={`${input} mt-1.5 font-normal leading-relaxed`} value={value} onChange={(e) => set(e.target.value)} />
          </label>
        ))}
      </div>
      <Note tone="primary" className="mt-3">
        記録すると企画は「振り返り」の段階になり、完了として扱われます。
      </Note>
      <div className="mt-3 flex justify-end">
        <Button disabled={pending} onClick={submit}>
          記録してキャリアプランに反映する
        </Button>
      </div>
    </section>
  );
}

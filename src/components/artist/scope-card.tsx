import type { ScopeLevel } from "@/lib/domain/types";
import { Pill } from "@/components/app/ui";

/** WS の業務範囲（タスクの担当を決めるときの注意表示に使う） */
export function ScopeCard({ scope }: { scope: Record<string, ScopeLevel> | null }) {
  if (!scope)
    return (
      <section className="mt-4 rounded-xl border bg-card p-5 shadow-xs">
        <b>WSの業務範囲</b>
        <div className="mt-1 text-[12.5px] text-slate-500">契約内容に応じて設定します。</div>
      </section>
    );
  const by = (v: ScopeLevel) => Object.entries(scope).filter(([, x]) => x === v).map(([k]) => k);
  const groups: [ScopeLevel, string, "done" | "wait" | "todo"][] = [
    ["提供", "標準で提供", "done"],
    ["個別協議", "個別に協議", "wait"],
    ["担当外", "原則担当しない", "todo"],
  ];
  return (
    <section className="mt-4 rounded-xl border bg-card p-5 shadow-xs">
      <b>WSの業務範囲</b>
      <span className="ml-2 text-xs text-muted-foreground">タスクの担当を決めるときの注意表示に使われます</span>
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        {groups.map(([v, label, tone]) => (
          <div key={v}>
            <Pill tone={tone}>
              {label}（{by(v).length}）
            </Pill>
            <div className="mt-1.5 text-xs leading-relaxed text-slate-500">{by(v).join("／")}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

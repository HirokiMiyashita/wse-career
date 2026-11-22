"use client";

import Link from "next/link";
import { client } from "@/lib/orpc/client";
import { md } from "@/lib/domain/calc";
import { ArtistAvatar, Pill } from "@/components/app/ui";
import { useAction } from "@/components/app/use-action";

export interface WeeklyItem {
  projectId: string;
  taskId: string;
  title: string;
  project: string;
  artistName: string;
  artistColor: string;
  due: string;
  late: boolean;
}

/** チェックを入れるだけで完了にできるタスク一覧 */
export function WeeklyTasks({ items }: { items: WeeklyItem[] }) {
  const { run } = useAction();
  if (!items.length) return <div className="px-5 py-10 text-center text-sm text-muted-foreground">担当のタスクはありません</div>;
  return (
    <div>
      {items.map((i) => (
        <div key={i.projectId + i.taskId} className="flex items-center gap-3 border-b border-slate-100 px-5 py-3 last:border-b-0">
          <button
            title="完了にする"
            className="flex size-5 shrink-0 items-center justify-center rounded-md border-[1.5px] border-slate-300 bg-white hover:border-emerald-600"
            onClick={() => run(() => client.projects.updateTask({ projectId: i.projectId, taskId: i.taskId, patch: { status: "完了" } }), `「${i.title}」を完了にしました`)}
          />
          <Link href={`/dashboard/projects/${i.projectId}/tasks?task=${i.taskId}`} className="min-w-0 flex-1">
            <div className="font-semibold leading-snug">{i.title}</div>
            <div className="flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
              <ArtistAvatar name={i.artistName} color={i.artistColor} size="sm" />
              {i.project}
            </div>
          </Link>
          <Pill tone={i.late ? "late" : "wait"}>{i.late ? "遅れ" : `${md(i.due)}まで`}</Pill>
        </div>
      ))}
    </div>
  );
}

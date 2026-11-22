"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { client } from "@/lib/orpc/client";
import { isLate, md, taskInfo } from "@/lib/domain/calc";
import { BOARD_COLUMNS, PEOPLE, TASK_STATUSES, WORKSTREAMS, WS_NAME, personName } from "@/lib/domain/constants";
import type { Project, Task, TaskStatus } from "@/lib/domain/types";
import { Sheet } from "@/components/app/overlay";
import { Note, Pill, Tag, TaskStatusPill, statusTone } from "@/components/app/ui";
import { useAction } from "@/components/app/use-action";
import { cn } from "@/lib/utils";
import { ChangeButton } from "./change-dialog";

/** タスク：ボード（ドラッグで状態変更）と流れ別リスト、詳細パネル（その場で編集） */
export function TaskBoard({ project, artistName, now, initialTask }: { project: Project; artistName: string; now: string; initialTask: string | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const [view, setView] = useState<"board" | "list">("board");
  const [showAll, setShowAll] = useState(false);
  const [openId, setOpenId] = useState<string | null>(initialTask);
  const [over, setOver] = useState<TaskStatus | null>(null);
  const { run } = useAction();
  const open = project.tasks.find((t) => t.id === openId) ?? null;
  const who = (k: string) => personName(k, artistName);

  function openTask(id: string | null) {
    setOpenId(id);
    router.replace(id ? `${pathname}?task=${id}` : pathname);
  }
  function drop(e: React.DragEvent, status: TaskStatus) {
    e.preventDefault();
    setOver(null);
    const id = e.dataTransfer.getData("text/plain");
    const t = project.tasks.find((x) => x.id === id);
    if (!t || t.status === status) return;
    run(() => client.projects.updateTask({ projectId: project.id, taskId: id, patch: { status } }), `「${t.title}」を${status}にしました`);
  }

  return (
    <>
      <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2.5">
        <div className="inline-flex rounded-[9px] border bg-muted p-0.5">
          {(
            [
              ["board", "ボード"],
              ["list", "流れ別リスト"],
            ] as const
          ).map(([k, l]) => (
            <button key={k} onClick={() => setView(k)} className={cn("h-7 rounded-[7px] px-3 text-[12.5px] font-semibold", view === k ? "bg-card text-foreground shadow-sm" : "text-slate-500")}>
              {l}
            </button>
          ))}
        </div>
        <span className="text-[12.5px] text-muted-foreground">{view === "board" ? "カードをドラッグして状態を変えられます" : "クリックで詳細と編集"}</span>
      </div>

      {view === "board" ? (
        <div className="grid gap-3 overflow-x-auto pb-1.5" style={{ gridTemplateColumns: "repeat(4, minmax(220px, 1fr))" }}>
          {BOARD_COLUMNS.map((s) => {
            const ts = project.tasks.filter((t) => t.status === s || (s === "未着手" && t.status === "保留")).sort((a, b) => a.due.localeCompare(b.due));
            const shown = s === "未着手" && !showAll ? ts.slice(0, 6) : ts;
            return (
              <div
                key={s}
                onDragOver={(e) => {
                  e.preventDefault();
                  setOver(s);
                }}
                onDragLeave={() => setOver(null)}
                onDrop={(e) => drop(e, s)}
                className={cn("min-h-[420px] rounded-xl p-2.5 transition-colors", over === s ? "bg-indigo-100" : "bg-slate-100")}
              >
                <h4 className="flex items-center gap-2 px-1 pb-2.5 pt-1 text-[13px]">
                  <Pill tone={statusTone(s)}>{s}</Pill>
                  <span className="ml-auto text-xs font-medium text-muted-foreground">{ts.length}件</span>
                </h4>
                {shown.map((t) => (
                  <div
                    key={t.id}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData("text/plain", t.id)}
                    onClick={() => openTask(t.id)}
                    className="mb-2 cursor-grab rounded-[10px] border bg-card px-3 py-2.5 shadow-xs hover:border-indigo-200"
                  >
                    <div className="flex flex-wrap gap-1">
                      <Tag>{WS_NAME[t.ws]}</Tag>
                      {t.status === "保留" && <Tag variant="dashed">保留</Tag>}
                      {t.group && <Tag variant="primary">まとめて実施</Tag>}
                    </div>
                    <div className="mb-2 mt-1 text-[13px] font-semibold leading-snug">{t.title}</div>
                    <div className="flex items-center justify-between gap-1.5 text-[11.5px] text-slate-500">
                      <span className={cn(t.exec === "acct" && "text-red-600")}>{who(t.exec)}</span>
                      <span className={cn(isLate(t, now) && "font-bold text-red-600")}>
                        {isLate(t, now) ? "遅れ " : ""}
                        {md(t.due)}
                      </span>
                    </div>
                  </div>
                ))}
                {s === "未着手" && ts.length > 6 && (
                  <button onClick={() => setShowAll(!showAll)} className="h-9 w-full rounded-[10px] border-[1.5px] border-dashed border-slate-300 text-[12.5px] font-semibold text-slate-500 hover:border-primary hover:bg-white hover:text-primary">
                    {showAll ? "期限の近い6件だけ表示" : `残り${ts.length - 6}件を表示（期限が先のもの）`}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-slate-50 text-left text-xs text-muted-foreground">
                {["タスク", "実行", "承認", "期間", "状態", "必要情報"].map((h) => (
                  <th key={h} className="whitespace-nowrap border-b px-3.5 py-2.5 font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {WORKSTREAMS.map((w) => {
                const ts = project.tasks.filter((t) => t.ws === w.key);
                if (!ts.length) return null;
                return [
                  <tr key={w.key} className="bg-slate-50">
                    <td colSpan={6} className="px-3.5 py-2 text-[12.5px] font-bold text-slate-600">
                      {w.name}
                      <span className="ml-2.5 font-normal text-muted-foreground">{w.role}</span>
                    </td>
                  </tr>,
                  ...ts.map((t) => {
                    const info = taskInfo(t);
                    return (
                      <tr key={t.id} onClick={() => openTask(t.id)} className="cursor-pointer border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-3.5 py-2.5">
                          <b>{t.title}</b> {t.group && <Tag variant="primary">まとめて実施</Tag>} {t.scope && <Tag variant="dashed">個別協議</Tag>}
                        </td>
                        <td className={cn("px-3.5 py-2.5 text-xs", t.exec === "acct" && "text-red-600")}>{who(t.exec)}</td>
                        <td className="px-3.5 py-2.5 text-xs">{who(t.approver)}</td>
                        <td className="whitespace-nowrap px-3.5 py-2.5 text-xs">{t.start === t.due ? md(t.due) : `${md(t.start)}〜${md(t.due)}`}</td>
                        <td className="px-3.5 py-2.5">
                          <TaskStatusPill status={t.status} late={isLate(t, now)} due={md(t.due)} />
                        </td>
                        <td className={cn("px-3.5 py-2.5 text-right text-xs", info.missing ? "text-red-600" : "text-muted-foreground")}>{info.filled}/8</td>
                      </tr>
                    );
                  }),
                ];
              })}
            </tbody>
          </table>
        </div>
      )}

      <Sheet open={!!open} onClose={() => openTask(null)}>
        {open && <TaskDetail key={open.id} project={project} task={open} artistName={artistName} now={now} onOpen={openTask} />}
      </Sheet>
    </>
  );
}

const FIELDS: { key: "trigger" | "doneWhen" | "affects" | "onChange"; label: string }[] = [
  { key: "trigger", label: "着手条件（何がそろったら始めるか）" },
  { key: "doneWhen", label: "完了条件（何ができたら終わりか）" },
  { key: "affects", label: "影響する仕事" },
  { key: "onChange", label: "変更があったときの対応" },
];

function TaskDetail({ project, task: t, artistName, now, onOpen }: { project: Project; task: Task; artistName: string; now: string; onOpen: (id: string) => void }) {
  const { run } = useAction();
  const info = taskInfo(t);
  const save = (patch: Partial<Pick<Task, "title" | "status" | "exec" | "approver" | "start" | "due" | "trigger" | "doneWhen" | "affects" | "onChange">>) =>
    run(() => client.projects.updateTask({ projectId: project.id, taskId: t.id, patch }), "保存しました");
  const people = Object.values(PEOPLE);
  const input = "w-full rounded-lg border bg-white px-2.5 py-1.5 text-sm outline-none focus:border-primary";
  const group = t.group ? project.tasks.filter((x) => x.group === t.group && x.id !== t.id) : [];

  return (
    <>
      <div className="border-b px-5 pb-3.5 pt-4">
        <div className="text-[11.5px] text-muted-foreground">
          {project.title} ・ {WS_NAME[t.ws]}
        </div>
        <div className="mb-2.5 mr-9 mt-1 text-lg font-bold leading-snug">{t.title}</div>
        <div className="inline-flex flex-wrap rounded-[9px] border bg-muted p-0.5">
          {TASK_STATUSES.map((s) => (
            <button key={s} onClick={() => save({ status: s })} className={cn("h-7 rounded-[7px] px-2.5 text-[12.5px] font-semibold", t.status === s ? "bg-card text-foreground shadow-sm" : "text-slate-500")}>
              {s}
            </button>
          ))}
        </div>
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          {isLate(t, now) && <Pill tone="late">遅れ</Pill>}
          {t.group && <Tag variant="primary">まとめて実施：{group.length + 1}件を同日に</Tag>}
          {t.scope && <Tag variant="dashed">個別協議（WSの標準業務外）</Tag>}
          <span className={cn("ml-auto text-[11.5px]", info.missing ? "text-red-600" : "text-muted-foreground")}>必要情報 {info.filled}/8</span>
        </div>
      </div>
      <div className="flex-1 space-y-0 overflow-auto px-5 pb-8 pt-1">
        <Row label="何をする">
          <input className={input} defaultValue={t.title} onBlur={(e) => e.target.value !== t.title && save({ title: e.target.value })} />
        </Row>
        <div className="grid grid-cols-2 gap-2.5">
          <Row label="誰が実行" warn={t.exec === "acct" ? "要指定" : undefined}>
            <select className={cn(input, t.exec === "acct" && "border-red-300 bg-red-50/40")} value={t.exec} onChange={(e) => save({ exec: e.target.value })}>
              {people.map((p) => (
                <option key={p.key} value={p.key}>
                  {personName(p.key, artistName)}
                </option>
              ))}
            </select>
          </Row>
          <Row label="誰が承認">
            <select className={input} value={t.approver} onChange={(e) => save({ approver: e.target.value })}>
              {people.map((p) => (
                <option key={p.key} value={p.key}>
                  {personName(p.key, artistName)}
                </option>
              ))}
            </select>
          </Row>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <Row label="開始">
            <input type="date" className={input} defaultValue={t.start} onBlur={(e) => e.target.value !== t.start && save({ start: e.target.value })} />
          </Row>
          <Row label="期限">
            <input type="date" className={input} defaultValue={t.due} onBlur={(e) => e.target.value !== t.due && save({ due: e.target.value })} />
          </Row>
        </div>
        {FIELDS.map((f) => (
          <Row key={f.key} label={f.label} warn={t[f.key] ? undefined : "未入力"}>
            <textarea
              rows={2}
              className={cn(input, "leading-relaxed", !t[f.key] && "border-red-200 bg-red-50/30")}
              defaultValue={t[f.key] ?? ""}
              onBlur={(e) => e.target.value !== (t[f.key] ?? "") && save({ [f.key]: e.target.value })}
            />
          </Row>
        ))}
        {group.length > 0 && (
          <Row label="同じ日にまとめて行うタスク">
            {group.map((x) => (
              <button key={x.id} onClick={() => onOpen(x.id)} className="block text-left text-[13px] text-primary hover:underline">
                {x.title}
              </button>
            ))}
          </Row>
        )}
        {t.note && (
          <Note tone="primary" className="mt-3">
            {t.note}
          </Note>
        )}
        {t.exec === "acct" && (
          <Note tone="warn" className="mt-3">
            経理・契約の実務担当はまだ決まっていません。企画の共同承認までに指定してください。
          </Note>
        )}
        <div className="mt-4">
          <ChangeButton project={project} taskTitle={t.title} label="このタスクの変更を記録" size="sm" />
        </div>
      </div>
    </>
  );
}

function Row({ label, warn, children }: { label: string; warn?: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-slate-100 py-2.5">
      <div className="mb-1.5 flex justify-between text-xs font-semibold text-slate-600">
        {label}
        {warn && <span className="text-red-600">{warn}</span>}
      </div>
      {children}
    </div>
  );
}

"use client";

import { useState } from "react";
import { client } from "@/lib/orpc/client";
import { isImportantChange, md } from "@/lib/domain/calc";
import { BASE_CHANGE_AREAS, CHANGE_TEMPLATES, personName } from "@/lib/domain/constants";
import type { Project } from "@/lib/domain/types";
import { Modal } from "@/components/app/overlay";
import { Note } from "@/components/app/ui";
import { useAction } from "@/components/app/use-action";
import { Button } from "@/components/ui/button";
import { Chip, Field } from "./new-project-dialog";

/** 変更を記録（業務フロー06）。影響範囲から「担当者が調整」か「本人＋WSで判断」かを自動判定 */
export function ChangeButton({ project, taskTitle, label = "変更を記録", size = "default" }: { project: Project; taskTitle?: string; label?: string; size?: "default" | "sm" }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" size={size} onClick={() => setOpen(true)}>
        {label}
      </Button>
      {open && <ChangeDialog project={project} taskTitle={taskTitle} onClose={() => setOpen(false)} />}
    </>
  );
}

function ChangeDialog({ project, taskTitle, onClose }: { project: Project; taskTitle?: string; onClose: () => void }) {
  const first = taskTitle ? CHANGE_TEMPLATES[CHANGE_TEMPLATES.length - 1] : CHANGE_TEMPLATES[0];
  const [tpl, setTpl] = useState(first.key);
  const [title, setTitle] = useState(taskTitle ? `${taskTitle} の変更` : first.key);
  const [areas, setAreas] = useState<string[]>([...first.areas]);
  const [cost, setCost] = useState(first.cost);
  const [days, setDays] = useState(first.days);
  const { run, pending } = useAction();
  const t = CHANGE_TEMPLATES.find((x) => x.key === tpl) ?? first;
  const related = project.tasks.filter((x) => x.status !== "完了" && t.keywords.some((k) => x.title.includes(k)));
  const important = isImportantChange(project, { areas, cost, days });
  const allAreas = [...new Set([...BASE_CHANGE_AREAS, ...t.areas])];

  function pick(key: string) {
    const x = CHANGE_TEMPLATES.find((c) => c.key === key)!;
    setTpl(key);
    setAreas([...x.areas]);
    setCost(x.cost);
    setDays(x.days);
    if (key !== "その他") setTitle(key);
  }
  async function submit() {
    const r = await run(
      () => client.projects.createChange({ projectId: project.id, title: title || tpl, type: t.type, areas, cost, days }),
      (x) => (x.important ? "記録して「判断待ち」に追加しました" : "変更を記録しました"),
    );
    if (r) onClose();
  }
  return (
    <Modal
      open
      onClose={onClose}
      title="変更を記録"
      sub={project.title}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            キャンセル
          </Button>
          <Button onClick={submit} disabled={pending}>
            記録する
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="よくある変更から選ぶ">
          <div className="flex flex-wrap gap-1.5">
            {CHANGE_TEMPLATES.map((c) => (
              <Chip key={c.key} on={tpl === c.key} onClick={() => pick(c.key)}>
                {c.key}
              </Chip>
            ))}
          </div>
        </Field>
        <Field label="変更の内容">
          <input className="h-9 w-full rounded-lg border px-3 text-sm outline-none focus:border-primary" value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <Field label="影響を受けるもの（自動で選択。必要なら追加）">
          <div className="flex flex-wrap gap-1.5">
            {allAreas.map((a) => (
              <Chip key={a} on={areas.includes(a)} onClick={() => setAreas(areas.includes(a) ? areas.filter((x) => x !== a) : [...areas, a])}>
                {a}
              </Chip>
            ))}
          </div>
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="費用への影響（円）">
            <input type="number" className="h-9 w-full rounded-lg border px-3 text-right text-sm" value={cost} onChange={(e) => setCost(Number(e.target.value))} />
          </Field>
          <Field label="日程への影響（日）">
            <input type="number" className="h-9 w-full rounded-lg border px-3 text-right text-sm" value={days} onChange={(e) => setDays(Number(e.target.value))} />
          </Field>
        </div>
        <Field label="関係しそうなタスク">
          {related.length ? (
            related.map((x) => (
              <div key={x.id} className="text-[13px]">
                ・{x.title} <span className="text-muted-foreground">（{personName(x.exec)}・{md(x.due)}）</span>
              </div>
            ))
          ) : (
            <span className="text-[13px] text-muted-foreground">該当なし</span>
          )}
        </Field>
        {important ? (
          <Note tone="warn">
            <b>本人＋WSで判断する変更です</b>
            <br />
            契約・権利を伴う、または予算超過・大きな日程変更のため「判断待ち」に追加されます。
          </Note>
        ) : (
          <Note>
            <b>担当者が調整できる変更です</b>
            <br />
            承認済み予算と権利条件の範囲内なので、調整して結果を記録します。
          </Note>
        )}
      </div>
    </Modal>
  );
}

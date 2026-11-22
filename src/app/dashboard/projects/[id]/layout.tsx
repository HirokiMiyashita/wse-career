import { isLate, today } from "@/lib/domain/calc";
import { PHASES } from "@/lib/domain/constants";
import { getProjectOr404 } from "@/server/queries";
import { AiButton } from "@/components/app/ai-button";
import { TabsNav } from "@/components/app/tabs-nav";
import { PageHeader, PhasePill, Tag } from "@/components/app/ui";
import { ChangeButton } from "@/components/project/change-dialog";
import { PhaseButton } from "@/components/project/phase-button";
import { cn } from "@/lib/utils";

export default async function ProjectLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { project: p, artist } = await getProjectOr404(id);
  const step = artist.plan.steps[p.step] ?? artist.plan.steps[0];
  const base = `/dashboard/projects/${id}`;
  const now = today();
  const pendingChanges = p.changes.filter((c) => c.status === "判断待ち").length;
  const late = p.tasks.filter((t) => isLate(t, now)).length;
  return (
    <>
      <PageHeader
        crumb={[{ href: `/dashboard/artists/${artist.id}`, label: `${artist.name} のキャリアプラン` }, { label: `${step.label} のステップ` }]}
        title={
          <span className="flex flex-wrap items-center gap-2.5">
            {p.title} <PhasePill phase={p.phase} />
          </span>
        }
        sub={`${p.types.join("＋")} ・ ${p.period}`}
        actions={
          <>
            <AiButton />
            <ChangeButton project={p} />
            <PhaseButton projectId={p.id} phase={p.phase} hasPlan={p.tasks.length > 0} />
          </>
        }
      />
      <div className="mb-4 flex flex-col gap-1.5 rounded-xl border border-indigo-100 bg-accent px-5 py-3.5 sm:flex-row sm:gap-4">
        <div className="whitespace-nowrap pt-0.5 text-[11.5px] font-bold text-accent-foreground">キャリアでの役割</div>
        <div className="flex-1">
          <div className="font-semibold">
            {step.label}：{step.text}
          </div>
          <div className="mt-0.5 text-[12.5px] text-indigo-800">{p.why}</div>
          <div className="mt-2 flex flex-wrap gap-1">
            {p.pillars.map((k) => (
              <Tag key={k} variant="white">
                柱：{artist.plan.pillars.find((x) => x.id === k)?.name ?? k}
              </Tag>
            ))}
          </div>
        </div>
      </div>
      <div className="mb-4 flex flex-wrap gap-1.5">
        {PHASES.map((x, i) => (
          <div
            key={x}
            className={cn(
              "min-w-24 flex-1 border-t-[3px] pt-2 text-xs font-medium",
              i < p.phase ? "border-emerald-600 text-slate-500" : i === p.phase ? "border-primary font-bold text-accent-foreground" : "border-slate-200 text-muted-foreground",
            )}
          >
            {i + 1}. {x}
          </div>
        ))}
      </div>
      <TabsNav
        items={[
          { href: base, label: "概要", exact: true },
          { href: `${base}/schedule`, label: "スケジュール" },
          { href: `${base}/tasks`, label: "タスク", badge: late || undefined },
          { href: `${base}/budget`, label: "予算" },
          { href: `${base}/changes`, label: "変更", badge: pendingChanges || undefined },
          { href: `${base}/review`, label: "振り返り" },
        ]}
      />
      {children}
    </>
  );
}

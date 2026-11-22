import { today } from "@/lib/domain/calc";
import { getProjectOr404 } from "@/server/queries";
import { Gantt } from "@/components/project/gantt";
import { NoPlan } from "@/components/project/no-plan";

export default async function SchedulePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { project } = await getProjectOr404(id);
  if (!project.tasks.length) return <NoPlan projectId={project.id} />;
  return <Gantt project={project} now={today()} />;
}

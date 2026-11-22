import { today } from "@/lib/domain/calc";
import { getProjectOr404 } from "@/server/queries";
import { NoPlan } from "@/components/project/no-plan";
import { TaskBoard } from "@/components/project/task-board";

export default async function TasksPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ task?: string }> }) {
  const [{ id }, { task }] = await Promise.all([params, searchParams]);
  const { project, artist } = await getProjectOr404(id);
  if (!project.tasks.length) return <NoPlan />;
  return <TaskBoard project={project} artistName={artist.name} now={today()} initialTask={task ?? null} />;
}

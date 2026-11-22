import { today } from "@/lib/domain/calc";
import { getProjectOr404 } from "@/server/queries";
import { listAssignees } from "@/server/members";
import { NoPlan } from "@/components/project/no-plan";
import { TaskBoard } from "@/components/project/task-board";

export default async function TasksPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ task?: string }> }) {
  const [{ id }, { task }] = await Promise.all([params, searchParams]);
  const [{ project, artist }, assignees] = await Promise.all([getProjectOr404(id), listAssignees()]);
  if (!project.tasks.length) return <NoPlan />;
  return <TaskBoard project={project} artistName={artist.name} assignees={assignees} now={today()} initialTask={task ?? null} />;
}

import "server-only";
import { notFound } from "next/navigation";
import { api } from "@/lib/orpc/server";

/** Server Component 用：見つからなければ 404 */
export async function getArtistOr404(id: string) {
  try {
    return await api.artists.get({ id });
  } catch {
    notFound();
  }
}
export async function getProjectOr404(id: string) {
  try {
    return await api.projects.get({ id });
  } catch {
    notFound();
  }
}

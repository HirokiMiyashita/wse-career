import { aiRouter } from "./routers/ai";
import { approvalsRouter } from "./routers/approvals";
import { artistsRouter } from "./routers/artists";
import { healthRouter } from "./routers/health";
import { libraryRouter } from "./routers/library";
import { meRouter } from "./routers/me";
import { projectsRouter } from "./routers/projects";

/**
 * ルーターの追加例:
 *   routers/xxx.ts を作成し、ここに xxx: xxxRouter を追加
 * 入力バリデーションは .input(z.object({...})) で zod スキーマを指定
 */
export const router = {
  health: healthRouter,
  me: meRouter,
  artists: artistsRouter,
  projects: projectsRouter,
  approvals: approvalsRouter,
  library: libraryRouter,
  ai: aiRouter,
};

export type AppRouter = typeof router;

import "server-only";
import { createRouterClient } from "@orpc/server";
import { createContext } from "@/server/orpc/context";
import { router } from "@/server/orpc/router";

/**
 * Server Component / Server Action 用の oRPC クライアント。
 * HTTP を経由せずにプロシージャを直接呼び出す。
 */
export const api = createRouterClient(router, {
  context: createContext,
});

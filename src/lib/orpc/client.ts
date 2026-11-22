import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { RouterClient } from "@orpc/server";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import type { AppRouter } from "@/server/orpc/router";

/**
 * Client Component 用の oRPC クライアント。
 * Server Component / Server Action では "@/lib/orpc/server" の api を使う。
 */
const link = new RPCLink({
  url: () => {
    if (typeof window === "undefined") {
      throw new Error("サーバー側では @/lib/orpc/server の api を使用してください");
    }
    return `${window.location.origin}/rpc`;
  },
});

export const client: RouterClient<AppRouter> = createORPCClient(link);

/** TanStack Query 用ユーティリティ: useQuery(orpc.health.ping.queryOptions()) */
export const orpc = createTanstackQueryUtils(client);

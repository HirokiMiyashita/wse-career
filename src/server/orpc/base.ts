import { ORPCError, os } from "@orpc/server";
import type { Context } from "./context";

/** 認証不要のプロシージャ */
export const publicProcedure = os.$context<Context>();

/** 認証必須のプロシージャ（context.user が使える） */
export const authedProcedure = publicProcedure.use(async ({ context, next }) => {
  const {
    data: { user },
  } = await context.supabase.auth.getUser();

  if (!user) {
    throw new ORPCError("UNAUTHORIZED");
  }

  return next({ context: { user } });
});

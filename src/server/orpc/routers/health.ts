import { publicProcedure } from "../base";

export const healthRouter = {
  ping: publicProcedure.handler(() => ({
    status: "ok" as const,
    time: new Date().toISOString(),
  })),
};

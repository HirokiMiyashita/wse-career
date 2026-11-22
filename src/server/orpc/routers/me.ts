import { authedProcedure } from "../base";

export const meRouter = {
  get: authedProcedure.handler(({ context }) => ({
    id: context.user.id,
    email: context.user.email ?? null,
  })),
};

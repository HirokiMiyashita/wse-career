import { z } from "zod";
import { db } from "@/server/store/store";
import { authedProcedure } from "../base";

/** 楽曲・案件・ナレッジ */
export const libraryRouter = {
  songs: authedProcedure.input(z.object({ artistId: z.string() })).handler(({ input }) => db().songs[input.artistId] ?? []),
  deals: authedProcedure
    .input(z.object({ artistId: z.string().optional() }))
    .handler(({ input }) => db().deals.filter((x) => !input.artistId || x.artistId === input.artistId)),
  knowledge: authedProcedure.handler(() => db().knowledge),
};

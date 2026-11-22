import { z } from "zod";
import { listDeals, listKnowledge, listSongs } from "@/server/repo";
import { authedProcedure } from "../base";

/** 楽曲・案件・ナレッジ */
export const libraryRouter = {
  songs: authedProcedure.input(z.object({ artistId: z.string() })).handler(({ input, context }) => listSongs(context.supabase, input.artistId)),
  deals: authedProcedure.input(z.object({ artistId: z.string().optional() })).handler(({ input, context }) => listDeals(context.supabase, input.artistId)),
  knowledge: authedProcedure.handler(({ context }) => listKnowledge(context.supabase)),
};

import { createTRPCRouter } from '../trpc';
import { dialogueRouter } from './dialogue';
import { npcRouter } from './npc';
import { questRouter } from './quest';

export const appRouter = createTRPCRouter({
  dialogue: dialogueRouter,
  npc: npcRouter,
  quest: questRouter,
  // localization: localizationRouter, // TODO: implement
});

export type AppRouter = typeof appRouter;
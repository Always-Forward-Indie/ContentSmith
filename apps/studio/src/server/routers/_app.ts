import { createTRPCRouter } from '../trpc';
import { dialogueRouter } from './dialogue';
import { npcRouter } from './npc';

export const appRouter = createTRPCRouter({
  dialogue: dialogueRouter,
  npc: npcRouter,
  // quest: questRouter,     // TODO: implement
  // localization: localizationRouter, // TODO: implement
});

export type AppRouter = typeof appRouter;
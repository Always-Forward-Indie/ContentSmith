import { createTRPCRouter } from '../trpc';
import { dialogueRouter } from './dialogue';
import { npcRouter } from './npc';
import { questRouter } from './quest';
import { skillsRouter } from './skills';

export const appRouter = createTRPCRouter({
  dialogue: dialogueRouter,
  npc: npcRouter,
  quest: questRouter,
  skills: skillsRouter,
  // localization: localizationRouter, // TODO: implement
});

export type AppRouter = typeof appRouter;
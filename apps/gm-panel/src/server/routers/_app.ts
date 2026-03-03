import { createTRPCRouter } from '../trpc';
import { accountsRouter } from './accounts';
import { charactersRouter } from './characters';
import { inventoryRouter } from './inventory';
import { questsRouter } from './quests';
import { flagsRouter } from './flags';
import { effectsRouter } from './effects';
import { attributesRouter } from './attributes';
import { skillsRouter } from './skills';
import { bansRouter } from './bans';
import { sessionsRouter } from './sessions';
import { equipmentRouter } from './equipment';
import { transactionsRouter } from './transactions';
import { gmLogRouter } from './gmLog';

export const appRouter = createTRPCRouter({
  accounts: accountsRouter,
  characters: charactersRouter,
  inventory: inventoryRouter,
  quests: questsRouter,
  flags: flagsRouter,
  effects: effectsRouter,
  attributes: attributesRouter,
  skills: skillsRouter,
  bans: bansRouter,
  sessions: sessionsRouter,
  equipment: equipmentRouter,
  transactions: transactionsRouter,
  gmLog: gmLogRouter,
});

export type AppRouter = typeof appRouter;


import { createTRPCRouter } from '../trpc';
import { dialogueRouter } from './dialogue';
import { npcRouter } from './npc';
import { questRouter } from './quest';
import { skillsRouter } from './skills';
import { skillSchoolsRouter } from './skill-schools';
import { skillScaleTypesRouter } from './skill-scale-types';
import { skillPropertiesRouter } from './skill-properties';
import { skillEffectsTypeRouter } from './skill-effects-type';
import { skillEffectRouter } from './skill-effects';
import { entityAttributesRouter } from './entity-attributes';
import { raceRouter } from './race';

export const appRouter = createTRPCRouter({
  dialogue: dialogueRouter,
  npc: npcRouter,
  quest: questRouter,
  skills: skillsRouter,
  skillSchools: skillSchoolsRouter,
  skillScaleTypes: skillScaleTypesRouter,
  skillProperties: skillPropertiesRouter,
  skillEffectsType: skillEffectsTypeRouter,
  skillEffects: skillEffectRouter,
  entityAttributes: entityAttributesRouter,
  race: raceRouter,
});

export type AppRouter = typeof appRouter;
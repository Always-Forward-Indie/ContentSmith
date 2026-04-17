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
import { itemsRouter } from './items';
import { itemAttributesRouter } from './itemAttributes';
import { itemsRarityRouter } from './itemsRarity';
import { itemTypesRouter } from './itemTypes';
import { equipSlotsRouter } from './equip-slots';
import { mobsRouter } from './mobs';
import { classesRouter } from './classes';
import { expForLevelRouter } from './exp-for-level';
import { vendorsRouter } from './vendors';
import { zonesRouter } from './zones';
import { mobRaceRouter } from './mob-race';
import { mobRanksRouter } from './mob-ranks';
import { targetTypeRouter } from './target-type';
import { characterGendersRouter } from './character-genders';
import { factionsRouter } from './factions';
import { damageElementsRouter } from './damage-elements';
import { masteryDefinitionsRouter } from './mastery-definitions';
import { statusEffectsRouter } from './status-effects';
import { itemSetsRouter } from './item-sets';
import { titleDefinitionsRouter } from './title-definitions';
import { emoteDefinitionsRouter } from './emote-definitions';
import { respawnZonesRouter } from './respawn-zones';
import { zoneEventsRouter } from './zone-events';
import { timedChampionsRouter } from './timed-champions';
import { worldObjectsRouter } from './world-objects';

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
  items: itemsRouter,
  itemAttributes: itemAttributesRouter,
  itemsRarity: itemsRarityRouter,
  itemTypes: itemTypesRouter,
  equipSlots: equipSlotsRouter,
  mobs: mobsRouter,
  classes: classesRouter,
  expForLevel: expForLevelRouter,
  vendors: vendorsRouter,
  zones: zonesRouter,
  mobRace: mobRaceRouter,
  mobRanks: mobRanksRouter,
  targetType: targetTypeRouter,
  characterGenders: characterGendersRouter,
  factions: factionsRouter,
  damageElements: damageElementsRouter,
  masteryDefinitions: masteryDefinitionsRouter,
  statusEffects: statusEffectsRouter,
  itemSets: itemSetsRouter,
  titleDefinitions: titleDefinitionsRouter,
  emoteDefinitions: emoteDefinitionsRouter,
  respawnZones: respawnZonesRouter,
  zoneEvents: zoneEventsRouter,
  timedChampions: timedChampionsRouter,
  worldObjects: worldObjectsRouter,
});

export type AppRouter = typeof appRouter;
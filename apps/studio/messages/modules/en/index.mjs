/**
 * Module loader for next-intl
 * 
 * This module combines all translation modules into a single object
 * for use with next-intl. This approach provides several benefits:
 * 
 * 1. Modular organization - translations are split by feature/component
 * 2. Better maintainability - smaller, focused files are easier to manage
 * 3. Scalability - new features can add their own translation modules
 * 4. Type safety - each module can have its own TypeScript definitions
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const loadJson = (filename) => JSON.parse(readFileSync(join(__dirname, filename), 'utf8'));

const common = loadJson('common.json');
const navigation = loadJson('navigation.json');
const dialogues = loadJson('dialogues.json');
const quests = loadJson('quests.json');
const editors = loadJson('editors.json');
const errors = loadJson('errors.json');
const home = loadJson('home.json');
const npcs = loadJson('npcs.json');
const skills = loadJson('skills.json');
const skillSchools = loadJson('skill-schools.json');
const skillScaleTypes = loadJson('skill-scale-types.json');
const skillProperties = loadJson('skill-properties.json');
const skillEffectsType = loadJson('skill-effects-type.json');
const skillEffects = loadJson('skill-effects.json');
const entityAttributes = loadJson('entity-attributes.json');
const races = loadJson('races.json');
const items = loadJson('items.json');
const itemAttributes = loadJson('item-attributes.json');
const itemsRarity = loadJson('items-rarity.json');
const itemTypes = loadJson('item-types.json');
const mobs = loadJson('mobs.json');
const classes = loadJson('classes.json');
const expForLevel = loadJson('exp-for-level.json');
const vendors = loadJson('vendors.json');
const zones = loadJson('zones.json');
const mobRaces = loadJson('mob-races.json');
const mobRanks = loadJson('mob-ranks.json');
const targetTypes = loadJson('target-types.json');
const characterGenders = loadJson('character-genders.json');
const spawnZones = loadJson('spawn-zones.json');
const factions = loadJson('factions.json');
const damageElements = loadJson('damage-elements.json');
const masteryDefinitions = loadJson('mastery-definitions.json');
const statusEffects = loadJson('status-effects.json');
const itemSets = loadJson('item-sets.json');
const titleDefinitions = loadJson('title-definitions.json');
const emoteDefinitions = loadJson('emote-definitions.json');
const respawnZones = loadJson('respawn-zones.json');
const zoneEvents = loadJson('zone-events.json');
const timedChampions = loadJson('timed-champions.json');
const worldObjects = loadJson('world-objects.json');

export default {
  common,
  navigation,
  dialogues,
  quests,
  editors,
  errors,
  home,
  npcs,
  skills,
  skillSchools,
  skillScaleTypes,
  skillProperties,
  skillEffectsType,
  skillEffects,
  entityAttributes,
  races,
  items,
  itemAttributes,
  itemsRarity,
  itemTypes,
  mobs,
  classes,
  expForLevel,
  vendors,
  zones,
  mobRaces,
  mobRanks,
  targetTypes,
  characterGenders,
  spawnZones,
  factions,
  damageElements,
  masteryDefinitions,
  statusEffects,
  itemSets,
  titleDefinitions,
  emoteDefinitions,
  respawnZones,
  zoneEvents,
  timedChampions,
  worldObjects,
};
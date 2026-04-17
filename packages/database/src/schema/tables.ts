import {
  pgTable,
  bigserial,
  serial,
  text,
  integer,
  boolean,
  bigint,
  jsonb,
  timestamp,
  index,
  unique,
  check,
  primaryKey,
  doublePrecision,
  smallint,
  varchar,
  numeric,
  inet,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import {
  nodeTypeEnum,
  questStateEnum,
  questStepTypeEnum,
  effectModifierTypeEnum,
  statusEffectCategoryEnum,
} from './enums';

// ===== DIALOGUES =====
export const dialogue = pgTable('dialogue', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  slug: text('slug').notNull().unique(),
  version: integer('version').notNull().default(1),
  startNodeId: bigint('start_node_id', { mode: 'number' }),
}, (table) => ({
  slugIdx: index('ix_dialogue_slug').on(table.slug),
}));

export const npcDialogue = pgTable('npc_dialogue', {
  npcId: bigint('npc_id', { mode: 'number' }).notNull(),
  dialogueId: bigint('dialogue_id', { mode: 'number' }).notNull().references(() => dialogue.id, { onDelete: 'cascade' }),
  priority: integer('priority').notNull().default(0),
  conditionGroup: jsonb('condition_group').$type<unknown>(),
}, (table) => ({
  pk: primaryKey({ columns: [table.npcId, table.dialogueId] }),
}));

export const dialogueNode = pgTable('dialogue_node', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  dialogueId: bigint('dialogue_id', { mode: 'number' }).notNull().references(() => dialogue.id, { onDelete: 'cascade' }),
  type: nodeTypeEnum('type').notNull(),
  speakerNpcId: bigint('speaker_npc_id', { mode: 'number' }),
  clientNodeKey: text('client_node_key'),
  conditionGroup: jsonb('condition_group').$type<unknown>(),
  actionGroup: jsonb('action_group').$type<unknown>(),
  jumpTargetNodeId: bigint('jump_target_node_id', { mode: 'number' })
}, (table) => ({
  dialogueIdx: index('ix_node_dialogue').on(table.dialogueId),
}));

export const dialogueEdge = pgTable('dialogue_edge', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  fromNodeId: bigint('from_node_id', { mode: 'number' }).notNull().references(() => dialogueNode.id, { onDelete: 'cascade' }),
  toNodeId: bigint('to_node_id', { mode: 'number' }).notNull().references(() => dialogueNode.id, { onDelete: 'cascade' }),
  orderIndex: integer('order_index').notNull().default(0),
  clientChoiceKey: text('client_choice_key'),
  conditionGroup: jsonb('condition_group').$type<unknown>(),
  actionGroup: jsonb('action_group').$type<unknown>(),
  hideIfLocked: boolean('hide_if_locked').notNull().default(false),
}, (table) => ({
  fromIdx: index('ix_edge_from').on(table.fromNodeId),
  toIdx: index('ix_edge_to').on(table.toNodeId),
}));

// ===== QUESTS =====
export const quest = pgTable('quest', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  slug: text('slug').notNull().unique(),
  minLevel: integer('min_level').notNull().default(1),
  repeatable: boolean('repeatable').notNull().default(false),
  cooldownSec: integer('cooldown_sec').notNull().default(0),
  giverNpcId: bigint('giver_npc_id', { mode: 'number' }),
  turninNpcId: bigint('turnin_npc_id', { mode: 'number' }),
  clientQuestKey: text('client_quest_key'),
  reputationFactionSlug: varchar('reputation_faction_slug', { length: 64 }),
  reputationOnComplete: integer('reputation_on_complete').notNull().default(0),
  reputationOnFail: integer('reputation_on_fail').notNull().default(0),
}, (table) => ({
  slugIdx: index('ix_quest_slug').on(table.slug),
}));

export const questStep = pgTable('quest_step', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  questId: bigint('quest_id', { mode: 'number' }).notNull().references(() => quest.id, { onDelete: 'cascade' }),
  stepIndex: integer('step_index').notNull(),
  stepType: questStepTypeEnum('step_type').notNull(),
  params: jsonb('params').$type<unknown>().notNull(),
  clientStepKey: text('client_step_key'),
  completionMode: text('completion_mode').notNull().default('auto'),
}, (table) => ({
  questStepIdx: index('ix_quest_step_q').on(table.questId, table.stepIndex),
  questStepUnique: unique().on(table.questId, table.stepIndex),
}));

export const questReward = pgTable('quest_reward', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  questId: bigint('quest_id', { mode: 'number' }).notNull().references(() => quest.id, { onDelete: 'cascade' }),
  rewardType: text('reward_type').notNull(),
  itemId: bigint('item_id', { mode: 'number' }),
  quantity: integer('quantity').notNull().default(1),
  amount: bigint('amount', { mode: 'number' }).notNull().default(0),
  isHidden: boolean('is_hidden').notNull().default(false),
}, (table) => ({
  questRewardIdx: index('ix_quest_reward_quest').on(table.questId),
}));

// ===== PLAYER DATA =====
export const playerQuest = pgTable('player_quest', {
  playerId: bigint('player_id', { mode: 'number' }).notNull(),
  questId: bigint('quest_id', { mode: 'number' }).notNull().references(() => quest.id, { onDelete: 'cascade' }),
  state: questStateEnum('state').notNull(),
  currentStep: integer('current_step').notNull().default(0),
  progress: jsonb('progress').$type<unknown>(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.playerId, table.questId] }),
  stateIdx: index('ix_player_quest_state').on(table.playerId, table.state),
}));

// ===== NPC =====
export const npc = pgTable('npc', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 50 }).notNull(),
  raceId: integer('race_id').notNull().default(1),
  level: integer('level').notNull(),
  currentHealth: integer('current_health').notNull().default(1),
  currentMana: integer('current_mana').notNull().default(1),
  isDead: boolean('is_dead').notNull().default(false),
  slug: varchar('slug', { length: 50 }),
  radius: integer('radius').notNull().default(100),
  isInteractable: boolean('is_interactable').notNull().default(true),
  npcType: integer('npc_type').notNull().default(1),
  factionSlug: varchar('faction_slug', { length: 60 }),
}, (table) => ({
  nameIdx: index('ix_npc_name').on(table.name),
  slugIdx: index('ix_npc_slug').on(table.slug),
}));

export const playerFlag = pgTable('player_flag', {
  playerId: bigint('player_id', { mode: 'number' }).notNull(),
  flagKey: text('flag_key').notNull(),
  intValue: integer('int_value'),
  boolValue: boolean('bool_value'),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.playerId, table.flagKey] }),
  boolIdx: index('ix_player_flag_bool').on(table.playerId, table.flagKey, table.boolValue),
  intIdx: index('ix_player_flag_int').on(table.playerId, table.flagKey, table.intValue),
}));

// ===== NPC RELATED TABLES =====
export const race = pgTable('race', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
}, (table) => ({
  slugIdx: index('ix_race_slug').on(table.slug),
}));

export const npcType = pgTable('npc_type', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
}, (table) => ({
  slugIdx: index('ix_npc_type_slug').on(table.slug),
}));

export const npcPosition = pgTable('npc_position', {
  id: bigint('id', { mode: 'number' }),
  npcId: bigint('npc_id', { mode: 'number' }).notNull().references(() => npc.id, { onDelete: 'cascade' }),
  x: doublePrecision('x').notNull(),
  y: doublePrecision('y').notNull(),
  z: doublePrecision('z').notNull(),
  rotZ: doublePrecision('rot_z').notNull().default(0),
  zoneId: integer('zone_id').references(() => zones.id, { onDelete: 'set null' }),
}, (table) => ({
  npcIdx: index('ix_npc_position_npc').on(table.npcId),
  zoneIdx: index('ix_npc_position_zone').on(table.zoneId),
}));

export const npcPlacements = pgTable('npc_placements', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  npcId: bigint('npc_id', { mode: 'number' }).notNull().references(() => npc.id, { onDelete: 'cascade' }),
  zoneId: integer('zone_id').references(() => zones.id, { onDelete: 'set null' }),
  x: doublePrecision('x').notNull().default(0),
  y: doublePrecision('y').notNull().default(0),
  z: doublePrecision('z').notNull().default(0),
  rotZ: doublePrecision('rot_z').notNull().default(0),
}, (table) => ({
  npcIdx: index('idx_npc_placements_npc').on(table.npcId),
  zoneIdx: index('idx_npc_placements_zone').on(table.zoneId),
}));

export const entityAttributes = pgTable('entity_attributes', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
}, (table) => ({
  slugIdx: index('ix_entity_attributes_slug').on(table.slug),
}));

export const npcAttributes = pgTable('npc_attributes', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  npcId: bigint('npc_id', { mode: 'number' }).notNull().references(() => npc.id, { onDelete: 'cascade' }),
  attributeId: integer('attribute_id').notNull().references(() => entityAttributes.id),
  value: integer('value').notNull(),
}, (table) => ({
  npcAttrIdx: index('ix_npc_attributes_npc').on(table.npcId),
  uniqueNpcAttr: unique().on(table.npcId, table.attributeId),
}));

export const skillSchool = pgTable('skill_school', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
}, (table) => ({
  slugIdx: index('ix_skill_school_slug').on(table.slug),
}));

export const skillScaleType = pgTable('skill_scale_type', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
}, (table) => ({
  slugIdx: index('ix_skill_scale_type_slug').on(table.slug),
}));

export const skills = pgTable('skills', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  scaleStatId: integer('scale_stat_id').notNull().default(1).references(() => skillScaleType.id),
  schoolId: integer('school_id').notNull().default(1).references(() => skillSchool.id),
  animationName: varchar('animation_name', { length: 100 }),
  isPassive: boolean('is_passive').notNull().default(false),
}, (table) => ({
  slugIdx: index('ix_skills_slug').on(table.slug),
}));

export const npcSkills = pgTable('npc_skills', {
  id: serial('id').primaryKey(),
  npcId: bigint('npc_id', { mode: 'number' }).notNull().references(() => npc.id, { onDelete: 'cascade' }),
  skillId: integer('skill_id').notNull().references(() => skills.id),
  currentLevel: integer('current_level').notNull().default(1),
}, (table) => ({
  npcSkillIdx: index('ix_npc_skills_npc').on(table.npcId),
  uniqueNpcSkill: unique().on(table.npcId, table.skillId),
}));

export const skillProperties = pgTable('skill_properties', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
}, (table) => ({
  slugIdx: index('ix_skill_properties_slug').on(table.slug),
}));

export const skillPropertiesMapping = pgTable('skill_properties_mapping', {
  id: serial('id').primaryKey(),
  skillId: integer('skill_id').notNull().references(() => skills.id),
  skillLevel: integer('skill_level').notNull(),
  propertyId: integer('property_id').notNull().references(() => skillProperties.id),
  propertyValue: doublePrecision('property_value').notNull(),
}, (table) => ({
  skillPropIdx: index('ix_skill_props_mapping').on(table.skillId, table.skillLevel),
  uniqueSkillProp: unique().on(table.skillId, table.skillLevel, table.propertyId),
}));

export const targetType = pgTable('target_type', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull(),
}, (table) => ({
  slugIdx: index('ix_target_type_slug').on(table.slug),
}));

export const skillDamageTypes = pgTable('skill_damage_types', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull(),
}, (table) => ({
  slugIdx: index('ix_skill_damage_types_slug').on(table.slug),
}));

export const skillDamageFormulas = pgTable('skill_damage_formulas', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull(),
  effectTypeId: integer('effect_type_id').notNull().default(1).references(() => skillDamageTypes.id),
}, (table) => ({
  slugIdx: index('ix_skill_damage_formulas_slug').on(table.slug),
}));

export const skillEffectInstances = pgTable('skill_effect_instances', {
  id: serial('id').primaryKey(),
  skillId: integer('skill_id').notNull().references(() => skills.id),
  orderIdx: smallint('order_idx').notNull().default(1),
  targetTypeId: integer('target_type_id').notNull().references(() => targetType.id),
}, (table) => ({
  skillEffectIdx: index('ix_skill_effect_instances_skill').on(table.skillId),
  uniqueSkillOrder: unique().on(table.skillId, table.orderIdx),
}));

export const skillEffectsMapping = pgTable('skill_effects_mapping', {
  id: serial('id').primaryKey(),
  effectInstanceId: integer('effect_instance_id').notNull().references(() => skillEffectInstances.id),
  effectId: integer('effect_id').notNull().references(() => skillDamageFormulas.id),
  value: doublePrecision('value').notNull(),
  level: integer('level').notNull().default(1),
  tickMs: integer('tick_ms').notNull().default(0),
  durationMs: integer('duration_ms').notNull().default(0),
  attributeId: integer('attribute_id').references(() => entityAttributes.id),
}, (table) => ({
  effectMappingIdx: index('ix_skill_effects_mapping').on(table.effectInstanceId, table.level),
  uniqueEffectMapping: unique().on(table.effectInstanceId, table.level, table.effectId),
}));

// ===== ITEMS =====
export const itemTypes = pgTable('item_types', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 50 }).notNull(),
  slug: varchar('slug', { length: 50 }).notNull(),
}, (table) => ({
  slugIdx: index('ix_item_types_slug').on(table.slug),
}));

export const equipSlot = pgTable('equip_slot', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 50 }).notNull(),
  slug: varchar('slug', { length: 50 }).notNull(),
}, (table) => ({
  slugIdx: index('ix_equip_slot_slug').on(table.slug),
}));

export const itemsRarity = pgTable('items_rarity', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 30 }).notNull(),
  colorHex: varchar('color_hex', { length: 7 }).notNull(),
  slug: varchar('slug', { length: 30 }),
}, (table) => ({
  slugIdx: index('ix_items_rarity_slug').on(table.slug),
}));

export const items = pgTable('items', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  name: varchar('name', { length: 50 }).notNull(),
  slug: varchar('slug', { length: 50 }).notNull(),
  description: text('description'),
  isQuestItem: boolean('is_quest_item').notNull().default(false),
  itemType: bigint('item_type', { mode: 'number' }).notNull().references(() => itemTypes.id),
  weight: doublePrecision('weight').notNull().default(0.0),
  rarityId: bigint('rarity_id', { mode: 'number' }).notNull().default(1).references(() => itemsRarity.id),
  stackMax: bigint('stack_max', { mode: 'number' }).notNull().default(64),
  isContainer: boolean('is_container').notNull().default(false),
  isDurable: boolean('is_durable').notNull().default(false),
  isTradable: boolean('is_tradable').notNull().default(true),
  durabilityMax: bigint('durability_max', { mode: 'number' }).notNull().default(100),
  vendorPriceBuy: bigint('vendor_price_buy', { mode: 'number' }).notNull().default(1),
  vendorPriceSell: bigint('vendor_price_sell', { mode: 'number' }).notNull().default(1),
  equipSlot: integer('equip_slot').default(0).references(() => equipSlot.id),
  levelRequirement: bigint('level_requirement', { mode: 'number' }).notNull().default(0),
  isEquippable: boolean('is_equippable').notNull().default(false),
  isHarvest: boolean('is_harvest').notNull().default(false),
  isUsable: boolean('is_usable').notNull().default(false),
  isTwoHanded: boolean('is_two_handed').notNull().default(false),
  masterySlug: varchar('mastery_slug', { length: 60 }),
}, (table) => ({
  nameIdx: index('ix_items_name').on(table.name),
  slugIdx: index('ix_items_slug').on(table.slug),
  typeIdx: index('ix_items_type').on(table.itemType),
  rarityIdx: index('ix_items_rarity').on(table.rarityId),
}));

export const itemAttributesMapping = pgTable('item_attributes_mapping', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  itemId: bigint('item_id', { mode: 'number' }).notNull().references(() => items.id, { onDelete: 'cascade' }),
  attributeId: integer('attribute_id').notNull().references(() => entityAttributes.id),
  value: integer('value').notNull(),
  applyOn: text('apply_on').notNull().default('equip'),
}, (table) => ({
  itemAttrIdx: index('ix_item_attributes_mapping_item').on(table.itemId),
  uniqueItemAttr: unique().on(table.itemId, table.attributeId),
}));

// ===== MOBS =====

// Separate race table for mobs (independent of NPC races)
export const mobRace = pgTable('mob_race', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 50 }).notNull(),
});

// Rank system with stat multipliers: normal, pack, strong, elite, miniboss, boss
export const mobRanks = pgTable('mob_ranks', {
  rankId: smallint('rank_id').primaryKey(),
  code: text('code').notNull().unique(),
  mult: doublePrecision('mult').notNull().default(1.0),
});

export const mob = pgTable('mob', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 50 }).notNull(),
  raceId: integer('race_id').notNull().default(1).references(() => mobRace.id),
  level: integer('level').notNull(),
  spawnHealth: integer('spawn_health').notNull().default(1),
  spawnMana: integer('spawn_mana').notNull().default(1),
  isAggressive: boolean('is_aggressive').notNull().default(false),
  isDead: boolean('is_dead').notNull().default(false),
  slug: varchar('slug', { length: 50 }).unique(),
  radius: integer('radius').notNull().default(100),
  baseXp: integer('base_xp').notNull().default(1),
  rankId: integer('rank_id').notNull().default(1).references(() => mobRanks.rankId),
  aggroRange: doublePrecision('aggro_range').notNull().default(400.0),
  attackRange: doublePrecision('attack_range').notNull().default(150.0),
  attackCooldown: doublePrecision('attack_cooldown').notNull().default(2.0),
  chaseMultiplier: doublePrecision('chase_multiplier').notNull().default(2.0),
  patrolSpeed: doublePrecision('patrol_speed').notNull().default(1.0),
  isSocial: boolean('is_social').notNull().default(false),
  chaseDuration: doublePrecision('chase_duration').notNull().default(30.0),
  fleeHpThreshold: doublePrecision('flee_hp_threshold').notNull().default(0.0),
  aiArchetype: varchar('ai_archetype', { length: 20 }).notNull().default('melee'),
  canEvolve: boolean('can_evolve').notNull().default(false),
  isRare: boolean('is_rare').notNull().default(false),
  rareSpawnChance: doublePrecision('rare_spawn_chance').notNull().default(0.0),
  rareSpawnCondition: varchar('rare_spawn_condition', { length: 30 }),
  factionSlug: varchar('faction_slug', { length: 60 }),
  repDeltaPerKill: integer('rep_delta_per_kill').default(0),
  biomeSlug: varchar('biome_slug', { length: 64 }).notNull().default(''),
  mobTypeSlug: varchar('mob_type_slug', { length: 64 }).notNull().default('beast'),
}, (table) => ({
  slugIdx: index('mob_slug_key').on(table.slug),
}));

export const mobPosition = pgTable('mob_position', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  mobId: bigint('mob_id', { mode: 'number' }).notNull().references(() => mob.id),
  x: doublePrecision('x').notNull().default(0),
  y: doublePrecision('y').notNull().default(0),
  z: doublePrecision('z').notNull().default(0),
  rotZ: doublePrecision('rot_z').notNull().default(0),
  zoneId: integer('zone_id').references(() => zones.id, { onDelete: 'set null' }),
}, (table) => ({
  mobIdx: index('idx_mob_position_mob').on(table.mobId),
  zoneIdx: index('idx_mob_position_zone').on(table.zoneId),
}));

export const mobStat = pgTable('mob_stat', {
  id: serial('id').primaryKey(),
  mobId: integer('mob_id').notNull().references(() => mob.id, { onDelete: 'cascade' }),
  attributeId: integer('attribute_id').notNull().references(() => entityAttributes.id),
  flatValue: doublePrecision('flat_value').notNull(),
  multiplier: doublePrecision('multiplier'),
  exponent: doublePrecision('exponent'),
}, (table) => ({
  mobStatIdx: index('ix_mob_stat_mob').on(table.mobId),
  uniqueMobStat: unique('uq_mob_stat').on(table.mobId, table.attributeId),
}));

export const mobSkills = pgTable('mob_skills', {
  id: serial('id').primaryKey(),
  mobId: integer('mob_id').notNull().references(() => mob.id),
  skillId: integer('skill_id').notNull().references(() => skills.id),
  currentLevel: integer('current_level').notNull().default(1),
}, (table) => ({
  uniqueMobSkill: unique('uq_mob_skills').on(table.mobId, table.skillId),
}));

export const mobLootInfo = pgTable('mob_loot_info', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  mobId: integer('mob_id').notNull().references(() => mob.id),
  itemId: bigint('item_id', { mode: 'number' }).notNull().references(() => items.id),
  dropChance: doublePrecision('drop_chance').notNull().default(0),
  isHarvestOnly: boolean('is_harvest_only').notNull().default(false),
  minQuantity: smallint('min_quantity').notNull().default(1),
  maxQuantity: smallint('max_quantity').notNull().default(1),
  lootTier: varchar('loot_tier', { length: 32 }).notNull().default('common'),
}, (table) => ({
  mobLootIdx: index('idx_mob_loot_info_mob').on(table.mobId),
}));

export const spawnZones = pgTable('spawn_zones', {
  zoneId: serial('zone_id').primaryKey(),
  zoneName: varchar('zone_name', { length: 100 }).notNull(),
  minSpawnX: doublePrecision('min_spawn_x').notNull().default(0),
  minSpawnY: doublePrecision('min_spawn_y').notNull().default(0),
  minSpawnZ: doublePrecision('min_spawn_z').notNull().default(0),
  maxSpawnX: doublePrecision('max_spawn_x').notNull().default(0),
  maxSpawnY: doublePrecision('max_spawn_y').notNull().default(0),
  maxSpawnZ: doublePrecision('max_spawn_z').notNull().default(0),
  gameZoneId: integer('game_zone_id').references(() => zones.id, { onDelete: 'set null' }),
}, (table) => ({
  gameZoneIdx: index('idx_spawn_zones_game_zone').on(table.gameZoneId),
}));

export const spawnZoneMobs = pgTable('spawn_zone_mobs', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  spawnZoneId: integer('spawn_zone_id').notNull().references(() => spawnZones.zoneId, { onDelete: 'cascade' }),
  mobId: integer('mob_id').notNull().references(() => mob.id, { onDelete: 'cascade' }),
  spawnCount: integer('spawn_count').notNull().default(1),
  respawnTime: text('respawn_time').notNull().default('00:05:00'),
}, (table) => ({
  zoneIdx: index('idx_spawn_zone_mobs_zone').on(table.spawnZoneId),
  mobIdx: index('idx_spawn_zone_mobs_mob').on(table.mobId),
  uniqueZoneMob: unique('uq_spawn_zone_mobs').on(table.spawnZoneId, table.mobId),
}));

// ─── Classes ───────────────────────────────────────────────────────────────────

export const characterClass = pgTable('character_class', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  slug: varchar('slug', { length: 100 }),
  description: text('description'),
});

export const classStatFormula = pgTable('class_stat_formula', {
  classId: integer('class_id').notNull().references(() => characterClass.id),
  attributeId: integer('attribute_id').notNull().references(() => entityAttributes.id),
  baseValue: doublePrecision('base_value').notNull().default(0),
  multiplier: doublePrecision('multiplier').notNull().default(0),
  exponent: doublePrecision('exponent').notNull().default(1),
}, (table) => ({
  pk: primaryKey({ columns: [table.classId, table.attributeId] }),
  classIdx: index('ix_class_stat_formula_class').on(table.classId),
}));

export const classSkillTree = pgTable('class_skill_tree', {
  id: serial('id').primaryKey(),
  classId: integer('class_id').notNull().references(() => characterClass.id),
  skillId: integer('skill_id').notNull().references(() => skills.id),
  requiredLevel: integer('required_level').notNull().default(1),
  isDefault: boolean('is_default').notNull().default(false),
  prerequisiteSkillId: integer('prerequisite_skill_id').references(() => skills.id),
  skillPointCost: smallint('skill_point_cost').notNull().default(0),
  goldCost: integer('gold_cost').notNull().default(0),
  maxLevel: smallint('max_level').notNull().default(1),
  requiresBook: boolean('requires_book').notNull().default(false),
  skillBookItemId: integer('skill_book_item_id').references(() => items.id),
}, (table) => ({
  classIdx: index('ix_class_skill_tree_class').on(table.classId),
}));

// ─── XP Curve ──────────────────────────────────────────────────────────────────

export const expForLevel = pgTable('exp_for_level', {
  id: serial('id').primaryKey(),
  level: integer('level').notNull().unique(),
  experiencePoints: bigint('experience_points', { mode: 'number' }).notNull(),
});

// ─── Vendors ───────────────────────────────────────────────────────────────────

export const vendorNpc = pgTable('vendor_npc', {
  id: serial('id').primaryKey(),
  npcId: integer('npc_id').notNull().references(() => npc.id),
  markupPct: smallint('markup_pct').notNull().default(0),
});

export const vendorInventory = pgTable('vendor_inventory', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  vendorNpcId: integer('vendor_npc_id').notNull().references(() => vendorNpc.id),
  itemId: bigint('item_id', { mode: 'number' }).notNull().references(() => items.id),
  stockCount: integer('stock_count').notNull().default(-1),
  priceOverride: bigint('price_override', { mode: 'number' }),
  restockAmount: integer('restock_amount').notNull().default(0),
  stockMax: integer('stock_max').notNull().default(-1),
  restockIntervalSec: integer('restock_interval_sec').notNull().default(3600),
  lastRestockAt: timestamp('last_restock_at', { withTimezone: true }),
}, (table) => ({
  vendorIdx: index('idx_vendor_inventory_vendor').on(table.vendorNpcId),
}));

// ─── Zones ─────────────────────────────────────────────────────────────────────

export const zones = pgTable('zones', {
  id: serial('id').primaryKey(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  name: varchar('name', { length: 100 }).notNull(),
  minLevel: integer('min_level').notNull().default(1),
  maxLevel: integer('max_level').notNull().default(999),
  isPvp: boolean('is_pvp').notNull().default(false),
  isSafeZone: boolean('is_safe_zone').notNull().default(false),
  minX: doublePrecision('min_x').notNull().default(0),
  maxX: doublePrecision('max_x').notNull().default(0),
  minY: doublePrecision('min_y').notNull().default(0),
  maxY: doublePrecision('max_y').notNull().default(0),
  explorationXpReward: integer('exploration_xp_reward').notNull().default(100),
  championThresholdKills: integer('champion_threshold_kills').notNull().default(100),
});

// ─── Reference Data ────────────────────────────────────────────────────────────

export const characterGenders = pgTable('character_genders', {
  id: smallint('id').primaryKey(),
  name: varchar('name', { length: 50 }).notNull(),
  label: varchar('label', { length: 50 }).notNull(),
});

// ─── Game Config ────────────────────────────────────────────────────────────────

export const gameConfig = pgTable('game_config', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  valueType: text('value_type').notNull().default('float'),
  description: text('description'),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ===== FACTIONS & REPUTATION =====

export const factions = pgTable('factions', {
  id: serial('id').primaryKey(),
  slug: varchar('slug', { length: 60 }).notNull().unique(),
  name: varchar('name', { length: 120 }).notNull(),
}, (table) => ({
  slugIdx: index('ix_factions_slug').on(table.slug),
}));

// ===== DAMAGE ELEMENTS =====

export const damageElements = pgTable('damage_elements', {
  slug: varchar('slug', { length: 64 }).primaryKey(),
});

// ===== MASTERY =====

export const masteryDefinitions = pgTable('mastery_definitions', {
  slug: varchar('slug', { length: 60 }).primaryKey(),
  name: varchar('name', { length: 120 }).notNull(),
  weaponTypeSlug: varchar('weapon_type_slug', { length: 60 }),
  maxValue: doublePrecision('max_value').notNull().default(100.0),
});

// ===== STATUS EFFECTS =====

export const statusEffects = pgTable('status_effects', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  category: statusEffectCategoryEnum('category').notNull(),
  durationSec: integer('duration_sec'),
}, (table) => ({
  slugIdx: index('ix_status_effects_slug').on(table.slug),
}));

export const statusEffectModifiers = pgTable('status_effect_modifiers', {
  id: serial('id').primaryKey(),
  statusEffectId: integer('status_effect_id').notNull().references(() => statusEffects.id, { onDelete: 'cascade' }),
  attributeId: integer('attribute_id').references(() => entityAttributes.id),
  modifierType: effectModifierTypeEnum('modifier_type').notNull(),
  value: numeric('value').notNull(),
}, (table) => ({
  effectIdx: index('ix_status_effect_modifiers_effect').on(table.statusEffectId),
}));

// ===== PASSIVE SKILL MODIFIERS =====

export const passiveSkillModifiers = pgTable('passive_skill_modifiers', {
  id: serial('id').primaryKey(),
  skillId: integer('skill_id').notNull().references(() => skills.id, { onDelete: 'cascade' }),
  attributeSlug: text('attribute_slug').notNull(),
  modifierType: text('modifier_type').notNull().default('flat'),
  value: numeric('value').notNull(),
}, (table) => ({
  skillIdx: index('ix_passive_skill_modifiers_skill').on(table.skillId),
}));

// ===== ITEM SETS =====

export const itemSets = pgTable('item_sets', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 128 }).notNull(),
  slug: varchar('slug', { length: 128 }).notNull().unique(),
});

export const itemSetMembers = pgTable('item_set_members', {
  setId: integer('set_id').notNull().references(() => itemSets.id, { onDelete: 'cascade' }),
  itemId: integer('item_id').notNull().references(() => items.id, { onDelete: 'cascade' }),
}, (table) => ({
  pk: primaryKey({ columns: [table.setId, table.itemId] }),
}));

export const itemSetBonuses = pgTable('item_set_bonuses', {
  id: serial('id').primaryKey(),
  setId: integer('set_id').notNull().references(() => itemSets.id, { onDelete: 'cascade' }),
  piecesRequired: integer('pieces_required').notNull(),
  attributeId: integer('attribute_id').notNull().references(() => entityAttributes.id),
  bonusValue: integer('bonus_value').notNull(),
}, (table) => ({
  setIdx: index('ix_item_set_bonuses_set').on(table.setId),
}));

// ===== ITEM CLASS RESTRICTIONS =====

export const itemClassRestrictions = pgTable('item_class_restrictions', {
  itemId: integer('item_id').notNull().references(() => items.id, { onDelete: 'cascade' }),
  classId: integer('class_id').notNull().references(() => characterClass.id, { onDelete: 'cascade' }),
}, (table) => ({
  pk: primaryKey({ columns: [table.itemId, table.classId] }),
}));

// ===== ITEM USE EFFECTS =====

export const itemUseEffects = pgTable('item_use_effects', {
  id: serial('id').primaryKey(),
  itemId: integer('item_id').notNull().references(() => items.id, { onDelete: 'cascade' }),
  effectSlug: varchar('effect_slug', { length: 64 }).notNull(),
  attributeSlug: varchar('attribute_slug', { length: 64 }).notNull().default(''),
  value: doublePrecision('value').notNull().default(0),
  isInstant: boolean('is_instant').notNull().default(true),
  durationSeconds: integer('duration_seconds').notNull().default(0),
  tickMs: integer('tick_ms').notNull().default(0),
  cooldownSeconds: integer('cooldown_seconds').notNull().default(30),
}, (table) => ({
  itemIdx: index('ix_item_use_effects_item').on(table.itemId),
}));

// ===== MOB RESISTANCES & WEAKNESSES =====

export const mobResistances = pgTable('mob_resistances', {
  mobId: integer('mob_id').notNull().references(() => mob.id, { onDelete: 'cascade' }),
  elementSlug: varchar('element_slug', { length: 64 }).notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.mobId, table.elementSlug] }),
}));

export const mobWeaknesses = pgTable('mob_weaknesses', {
  mobId: integer('mob_id').notNull().references(() => mob.id, { onDelete: 'cascade' }),
  elementSlug: varchar('element_slug', { length: 64 }).notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.mobId, table.elementSlug] }),
}));

// ===== NPC TRAINER =====

export const npcTrainerClass = pgTable('npc_trainer_class', {
  id: serial('id').primaryKey(),
  npcId: integer('npc_id').notNull().references(() => npc.id, { onDelete: 'cascade' }),
  classId: integer('class_id').notNull().references(() => characterClass.id, { onDelete: 'cascade' }),
}, (table) => ({
  npcIdx: index('ix_npc_trainer_class_npc').on(table.npcId),
  unique: unique().on(table.npcId, table.classId),
}));

// ===== NPC AMBIENT SPEECH =====

export const npcAmbientSpeechConfigs = pgTable('npc_ambient_speech_configs', {
  id: serial('id').primaryKey(),
  npcId: integer('npc_id').notNull().references(() => npc.id, { onDelete: 'cascade' }),
  minIntervalSec: integer('min_interval_sec').notNull().default(20),
  maxIntervalSec: integer('max_interval_sec').notNull().default(60),
}, (table) => ({
  npcIdx: index('ix_npc_ambient_speech_configs_npc').on(table.npcId),
}));

export const npcAmbientSpeechLines = pgTable('npc_ambient_speech_lines', {
  id: serial('id').primaryKey(),
  npcId: integer('npc_id').notNull().references(() => npc.id, { onDelete: 'cascade' }),
  lineKey: varchar('line_key', { length: 128 }).notNull(),
  triggerType: varchar('trigger_type', { length: 16 }).notNull().default('periodic'),
  triggerRadius: integer('trigger_radius').notNull().default(400),
  priority: integer('priority').notNull().default(0),
  weight: integer('weight').notNull().default(10),
  cooldownSec: integer('cooldown_sec').notNull().default(60),
  conditionGroup: jsonb('condition_group').$type<unknown>(),
}, (table) => ({
  npcIdx: index('ix_npc_ambient_speech_lines_npc').on(table.npcId),
}));

// ===== TITLES =====

export const titleDefinitions = pgTable('title_definitions', {
  id: serial('id').primaryKey(),
  slug: varchar('slug', { length: 80 }).notNull().unique(),
  displayName: varchar('display_name', { length: 120 }).notNull(),
  description: text('description').notNull().default(''),
  earnCondition: varchar('earn_condition', { length: 80 }).notNull().default(''),
  bonuses: jsonb('bonuses').$type<unknown[]>().notNull().default(sql`'[]'::jsonb`),
  conditionParams: jsonb('condition_params').$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
}, (table) => ({
  slugIdx: index('ix_title_definitions_slug').on(table.slug),
}));

// ===== EMOTES =====

export const emoteDefinitions = pgTable('emote_definitions', {
  id: serial('id').primaryKey(),
  slug: varchar('slug', { length: 64 }).notNull().unique(),
  displayName: varchar('display_name', { length: 128 }).notNull(),
  animationName: varchar('animation_name', { length: 128 }).notNull(),
  category: varchar('category', { length: 64 }).notNull().default('general'),
  isDefault: boolean('is_default').notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  slugIdx: index('ix_emote_definitions_slug').on(table.slug),
}));

// ===== RESPAWN ZONES =====

export const respawnZones = pgTable('respawn_zones', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 64 }).notNull(),
  x: doublePrecision('x').notNull().default(0),
  y: doublePrecision('y').notNull().default(0),
  z: doublePrecision('z').notNull().default(0),
  zoneId: integer('zone_id').notNull().default(1).references(() => zones.id),
  isDefault: boolean('is_default').notNull().default(false),
}, (table) => ({
  zoneIdx: index('ix_respawn_zones_zone').on(table.zoneId),
}));

// ===== TIMED CHAMPION TEMPLATES =====

export const timedChampionTemplates = pgTable('timed_champion_templates', {
  id: serial('id').primaryKey(),
  slug: varchar('slug', { length: 60 }).notNull().unique(),
  zoneId: integer('zone_id').notNull().references(() => zones.id),
  mobTemplateId: integer('mob_template_id').notNull().references(() => mob.id),
  intervalHours: integer('interval_hours').notNull().default(6),
  windowMinutes: integer('window_minutes').notNull().default(15),
  nextSpawnAt: bigint('next_spawn_at', { mode: 'number' }),
  lastKilledAt: timestamp('last_killed_at', { withTimezone: true }),
  announcementKey: varchar('announcement_key', { length: 120 }),
}, (table) => ({
  slugIdx: index('ix_timed_champion_templates_slug').on(table.slug),
  zoneIdx: index('ix_timed_champion_templates_zone').on(table.zoneId),
}));

// ===== ZONE EVENTS =====

export const zoneEventTemplates = pgTable('zone_event_templates', {
  id: serial('id').primaryKey(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  gameZoneId: integer('game_zone_id').references(() => zones.id),
  triggerType: varchar('trigger_type', { length: 50 }).notNull().default('manual'),
  durationSec: integer('duration_sec').notNull().default(1200),
  lootMultiplier: doublePrecision('loot_multiplier').notNull().default(1.0),
  spawnRateMultiplier: doublePrecision('spawn_rate_multiplier').notNull().default(1.0),
  mobSpeedMultiplier: doublePrecision('mob_speed_multiplier').notNull().default(1.0),
  announceKey: varchar('announce_key', { length: 120 }),
  intervalHours: integer('interval_hours').default(0),
  randomChancePerHour: doublePrecision('random_chance_per_hour').default(0.0),
  hasInvasionWave: boolean('has_invasion_wave').default(false),
  invasionMobTemplateId: integer('invasion_mob_template_id').references(() => mob.id),
  invasionWaveCount: integer('invasion_wave_count').default(0),
  invasionChampionTemplateId: integer('invasion_champion_template_id'),
  invasionChampionSlug: varchar('invasion_champion_slug', { length: 100 }),
}, (table) => ({
  slugIdx: index('ix_zone_event_templates_slug').on(table.slug),
  zoneIdx: index('ix_zone_event_templates_zone').on(table.gameZoneId),
}));

// ===== WORLD OBJECTS =====

export const worldObjects = pgTable('world_objects', {
  id: serial('id').primaryKey(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  nameKey: varchar('name_key', { length: 100 }).notNull(),
  objectType: varchar('object_type', { length: 50 }).notNull(),
  scope: varchar('scope', { length: 30 }).notNull().default('per_player'),
  posX: doublePrecision('pos_x').notNull().default(0),
  posY: doublePrecision('pos_y').notNull().default(0),
  posZ: doublePrecision('pos_z').notNull().default(0),
  rotZ: doublePrecision('rot_z').notNull().default(0),
  zoneId: integer('zone_id').references(() => zones.id),
  dialogueId: integer('dialogue_id'),
  lootTableId: integer('loot_table_id'),
  requiredItemId: integer('required_item_id').references(() => items.id),
  interactionRadius: doublePrecision('interaction_radius').notNull().default(250),
  channelTimeSec: integer('channel_time_sec').notNull().default(0),
  respawnSec: integer('respawn_sec').notNull().default(0),
  isActiveByDefault: boolean('is_active_by_default').notNull().default(true),
  minLevel: integer('min_level').notNull().default(0),
  conditionGroup: jsonb('condition_group').$type<unknown>().notNull().default(sql`'null'::jsonb`),
}, (table) => ({
  slugIdx: index('ix_world_objects_slug').on(table.slug),
  zoneIdx: index('ix_world_objects_zone').on(table.zoneId),
}));

export const worldObjectStates = pgTable('world_object_states', {
  objectId: integer('object_id').primaryKey().references(() => worldObjects.id, { onDelete: 'cascade' }),
  state: varchar('state', { length: 30 }).notNull().default('active'),
  depletedAt: timestamp('depleted_at', { withTimezone: true }),
});

// ===== USERS =====

export const userRoles = pgTable('user_roles', {
  id: smallint('id').primaryKey(),
  name: varchar('name', { length: 50 }).notNull(),
  label: varchar('label', { length: 100 }).notNull(),
  isStaff: boolean('is_staff').notNull().default(false),
});

export const users = pgTable('users', {
  id: bigint('id', { mode: 'number' }).primaryKey(),
  login: varchar('login', { length: 50 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
  lastLogin: timestamp('last_login', { withTimezone: true }).notNull().defaultNow(),
  email: varchar('email', { length: 255 }),
  role: smallint('role').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  isActive: boolean('is_active').notNull().default(true),
  failedLoginAttempts: smallint('failed_login_attempts').notNull().default(0),
  lockedUntil: timestamp('locked_until', { withTimezone: true }),
  lastLoginIp: inet('last_login_ip'),
  registrationIp: inet('registration_ip'),
  isEmailVerified: boolean('is_email_verified').notNull().default(false),
}, (table) => ({
  loginIdx: index('ix_users_login').on(table.login),
}));

export const userSessions = pgTable('user_sessions', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  userId: bigint('user_id', { mode: 'number' }).notNull().references(() => users.id),
  tokenHash: varchar('token_hash', { length: 255 }).notNull().unique(),
  ip: inet('ip'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
}, (table) => ({
  userIdx: index('ix_user_sessions_user').on(table.userId),
}));

export const userBans = pgTable('user_bans', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  userId: bigint('user_id', { mode: 'number' }).notNull().references(() => users.id),
  bannedByUserId: bigint('banned_by_user_id', { mode: 'number' }),
  reason: text('reason').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  isActive: boolean('is_active').notNull().default(true),
}, (table) => ({
  userIdx: index('ix_user_bans_user').on(table.userId),
  activeIdx: index('ix_user_bans_active').on(table.userId, table.isActive),
}));

// ===== CHARACTERS =====

export const characters = pgTable('characters', {
  id: bigint('id', { mode: 'number' }).primaryKey(),
  name: varchar('name', { length: 20 }).notNull().unique(),
  ownerId: bigint('owner_id', { mode: 'number' }).notNull().references(() => users.id),
  classId: integer('class_id').notNull().default(1).references(() => characterClass.id),
  raceId: integer('race_id').notNull().default(1).references(() => race.id),
  experiencePoints: bigint('experience_points', { mode: 'number' }).notNull().default(0),
  level: integer('level').notNull().default(0),
  radius: integer('radius').notNull().default(100),
  freeSkillPoints: smallint('free_skill_points').notNull().default(0),
  gender: smallint('gender').notNull().default(0),
  accountSlot: smallint('account_slot').notNull().default(1),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  lastOnlineAt: timestamp('last_online_at', { withTimezone: true }),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  playTimeSec: bigint('play_time_sec', { mode: 'number' }).notNull().default(0),
  bindZoneId: integer('bind_zone_id').references(() => zones.id),
  bindX: doublePrecision('bind_x'),
  bindY: doublePrecision('bind_y'),
  bindZ: doublePrecision('bind_z'),
  appearance: jsonb('appearance').$type<Record<string, unknown>>(),
  experienceDebt: integer('experience_debt').notNull().default(0),
}, (table) => ({
  nameIdx: index('ix_characters_name').on(table.name),
  ownerIdx: index('ix_characters_owner').on(table.ownerId),
}));

export const characterPosition = pgTable('character_position', {
  id: bigint('id', { mode: 'number' }).primaryKey(),
  characterId: bigint('character_id', { mode: 'number' }).notNull().references(() => characters.id, { onDelete: 'cascade' }),
  x: numeric('x').notNull(),
  y: numeric('y').notNull(),
  z: numeric('z').notNull(),
  zoneId: integer('zone_id').references(() => zones.id),
  rotZ: doublePrecision('rot_z').notNull().default(0),
}, (table) => ({
  charIdx: index('ix_character_position_char').on(table.characterId),
}));

export const characterCurrentState = pgTable('character_current_state', {
  characterId: bigint('character_id', { mode: 'number' }).primaryKey().references(() => characters.id, { onDelete: 'cascade' }),
  currentHealth: integer('current_health').notNull().default(1),
  currentMana: integer('current_mana').notNull().default(1),
  isDead: boolean('is_dead').notNull().default(false),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const characterEquipment = pgTable('character_equipment', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  characterId: bigint('character_id', { mode: 'number' }).notNull().references(() => characters.id, { onDelete: 'cascade' }),
  equipSlotId: integer('equip_slot_id').notNull().references(() => equipSlot.id),
  inventoryItemId: bigint('inventory_item_id', { mode: 'number' }).notNull(),
  equippedAt: timestamp('equipped_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  charIdx: index('ix_character_equipment_char').on(table.characterId),
}));

export const characterSkills = pgTable('character_skills', {
  id: serial('id').primaryKey(),
  characterId: bigint('character_id', { mode: 'number' }).notNull().references(() => characters.id, { onDelete: 'cascade' }),
  skillId: integer('skill_id').notNull().references(() => skills.id),
  currentLevel: integer('current_level').notNull().default(1),
}, (table) => ({
  charIdx: index('ix_character_skills_char').on(table.characterId),
  unique: unique().on(table.characterId, table.skillId),
}));

export const characterSkillBar = pgTable('character_skill_bar', {
  characterId: integer('character_id').notNull().references(() => characters.id, { onDelete: 'cascade' }),
  slotIndex: smallint('slot_index').notNull(),
  skillSlug: varchar('skill_slug', { length: 64 }).notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.characterId, table.slotIndex] }),
}));

export const characterSkillMastery = pgTable('character_skill_mastery', {
  characterId: integer('character_id').notNull().references(() => characters.id, { onDelete: 'cascade' }),
  masterySlug: varchar('mastery_slug', { length: 60 }).notNull(),
  value: doublePrecision('value').notNull().default(0.0),
}, (table) => ({
  pk: primaryKey({ columns: [table.characterId, table.masterySlug] }),
}));

export const characterEmotes = pgTable('character_emotes', {
  id: serial('id').primaryKey(),
  characterId: integer('character_id').notNull().references(() => characters.id, { onDelete: 'cascade' }),
  emoteSlug: varchar('emote_slug', { length: 64 }).notNull(),
  unlockedAt: timestamp('unlocked_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  charIdx: index('ix_character_emotes_char').on(table.characterId),
  unique: unique().on(table.characterId, table.emoteSlug),
}));

export const characterTitles = pgTable('character_titles', {
  characterId: integer('character_id').notNull().references(() => characters.id, { onDelete: 'cascade' }),
  titleSlug: varchar('title_slug', { length: 80 }).notNull(),
  equipped: boolean('equipped').notNull().default(false),
  earnedAt: timestamp('earned_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.characterId, table.titleSlug] }),
}));

export const characterReputation = pgTable('character_reputation', {
  characterId: integer('character_id').notNull().references(() => characters.id, { onDelete: 'cascade' }),
  factionSlug: varchar('faction_slug', { length: 60 }).notNull(),
  value: integer('value').notNull().default(0),
}, (table) => ({
  pk: primaryKey({ columns: [table.characterId, table.factionSlug] }),
}));

export const characterPermanentModifiers = pgTable('character_permanent_modifiers', {
  id: bigint('id', { mode: 'number' }).primaryKey(),
  characterId: bigint('character_id', { mode: 'number' }).notNull().references(() => characters.id, { onDelete: 'cascade' }),
  attributeId: integer('attribute_id').notNull().references(() => entityAttributes.id),
  value: numeric('value').notNull().default('0'),
  sourceType: varchar('source_type', { length: 30 }).notNull().default('gm'),
  sourceId: integer('source_id'),
}, (table) => ({
  charIdx: index('ix_character_permanent_modifiers_char').on(table.characterId),
}));

export const characterPity = pgTable('character_pity', {
  characterId: integer('character_id').notNull().references(() => characters.id, { onDelete: 'cascade' }),
  itemId: integer('item_id').notNull().references(() => items.id, { onDelete: 'cascade' }),
  killCount: integer('kill_count').notNull().default(0),
}, (table) => ({
  pk: primaryKey({ columns: [table.characterId, table.itemId] }),
}));

export const characterBestiary = pgTable('character_bestiary', {
  characterId: integer('character_id').notNull().references(() => characters.id, { onDelete: 'cascade' }),
  mobTemplateId: integer('mob_template_id').notNull().references(() => mob.id, { onDelete: 'cascade' }),
  killCount: integer('kill_count').notNull().default(0),
}, (table) => ({
  pk: primaryKey({ columns: [table.characterId, table.mobTemplateId] }),
}));

// ===== PLAYER INVENTORY =====

export const playerInventory = pgTable('player_inventory', {
  id: bigint('id', { mode: 'number' }).primaryKey(),
  characterId: bigint('character_id', { mode: 'number' }).references(() => characters.id, { onDelete: 'set null' }),
  itemId: bigint('item_id', { mode: 'number' }).notNull().references(() => items.id),
  quantity: integer('quantity').notNull().default(1),
  slotIndex: smallint('slot_index'),
  durabilityCurrent: integer('durability_current'),
  killCount: integer('kill_count').notNull().default(0),
}, (table) => ({
  charIdx: index('ix_player_inventory_char').on(table.characterId),
}));

// ===== PLAYER ACTIVE EFFECTS =====

export const playerActiveEffect = pgTable('player_active_effect', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  playerId: bigint('player_id', { mode: 'number' }).notNull().references(() => characters.id),
  statusEffectId: integer('status_effect_id').notNull().references(() => statusEffects.id),
  sourceType: text('source_type').notNull(),
  sourceId: bigint('source_id', { mode: 'number' }),
  value: numeric('value').notNull().default('0'),
  appliedAt: timestamp('applied_at', { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  attributeId: integer('attribute_id').references(() => entityAttributes.id),
  tickMs: integer('tick_ms').notNull().default(0),
  groupId: bigint('group_id', { mode: 'number' }),
}, (table) => ({
  playerIdx: index('ix_player_active_effect_player').on(table.playerId),
}));

// ===== MOB ACTIVE EFFECTS =====

export const mobActiveEffect = pgTable('mob_active_effect', {
  id: bigint('id', { mode: 'number' }).primaryKey(),
  mobUid: integer('mob_uid').notNull(),
  effectId: integer('effect_id').notNull(),
  attributeId: integer('attribute_id').references(() => entityAttributes.id),
  value: numeric('value').notNull().default('0'),
  sourceType: text('source_type').notNull().default('skill'),
  sourcePlayerId: bigint('source_player_id', { mode: 'number' }),
  appliedAt: timestamp('applied_at', { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  tickMs: integer('tick_ms').notNull().default(0),
}, (table) => ({
  mobIdx: index('ix_mob_active_effect_mob').on(table.mobUid),
}));

// ===== CURRENCY TRANSACTIONS =====

export const currencyTransactions = pgTable('currency_transactions', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  characterId: bigint('character_id', { mode: 'number' }).notNull().references(() => characters.id),
  amount: bigint('amount', { mode: 'number' }).notNull(),
  reasonType: varchar('reason_type', { length: 50 }).notNull(),
  sourceId: bigint('source_id', { mode: 'number' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  charIdx: index('ix_currency_transactions_char').on(table.characterId),
}));

// ===== GM ACTION LOG =====

export const gmActionLog = pgTable('gm_action_log', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  gmUserId: bigint('gm_user_id', { mode: 'number' }).references(() => users.id),
  actionType: varchar('action_type', { length: 100 }).notNull(),
  targetType: varchar('target_type', { length: 50 }).notNull(),
  targetId: bigint('target_id', { mode: 'number' }),
  oldValue: jsonb('old_value').$type<unknown>(),
  newValue: jsonb('new_value').$type<unknown>(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  gmIdx: index('ix_gm_action_log_gm').on(table.gmUserId),
  targetIdx: index('ix_gm_action_log_target').on(table.targetType, table.targetId),
}));
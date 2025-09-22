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
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { nodeTypeEnum, questStateEnum, questStepTypeEnum } from './enums';

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
}, (table) => ({
  pk: primaryKey({ columns: [table.npcId, table.dialogueId] }),
}));

export const dialogueNode = pgTable('dialogue_node', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  dialogueId: bigint('dialogue_id', { mode: 'number' }).notNull().references(() => dialogue.id, { onDelete: 'cascade' }),
  type: nodeTypeEnum('type').notNull(),
  speakerNpcId: bigint('speaker_npc_id', { mode: 'number' }),
  clientNodeKey: text('client_node_key'),
  conditionGroup: jsonb('condition_group'),
  actionGroup: jsonb('action_group'),
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
  conditionGroup: jsonb('condition_group'),
  actionGroup: jsonb('action_group'),
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
}, (table) => ({
  slugIdx: index('ix_quest_slug').on(table.slug),
}));

export const questStep = pgTable('quest_step', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  questId: bigint('quest_id', { mode: 'number' }).notNull().references(() => quest.id, { onDelete: 'cascade' }),
  stepIndex: integer('step_index').notNull(),
  stepType: questStepTypeEnum('step_type').notNull(),
  params: jsonb('params').notNull(),
  clientStepKey: text('client_step_key'),
}, (table) => ({
  questStepIdx: index('ix_quest_step_q').on(table.questId, table.stepIndex),
  questStepUnique: unique().on(table.questId, table.stepIndex),
}));

// ===== PLAYER DATA =====
export const playerQuest = pgTable('player_quest', {
  playerId: bigint('player_id', { mode: 'number' }).notNull(),
  questId: bigint('quest_id', { mode: 'number' }).notNull().references(() => quest.id, { onDelete: 'cascade' }),
  state: questStateEnum('state').notNull(),
  currentStep: integer('current_step').notNull().default(0),
  progress: jsonb('progress'),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.playerId, table.questId] }),
  stateIdx: index('ix_player_quest_state').on(table.playerId, table.state),
}));

// ===== NPC =====
export const npc = pgTable('npc', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  name: text('name').notNull(),
  raceId: integer('race_id').notNull().default(1),
  level: integer('level').notNull(),
  currentHealth: integer('current_health').notNull().default(1),
  currentMana: integer('current_mana').notNull().default(1),
  isDead: boolean('is_dead').notNull().default(false),
  slug: text('slug'),
  radius: integer('radius').notNull().default(100),
  isInteractable: boolean('is_interactable').notNull().default(true),
  npcType: integer('npc_type').notNull().default(1),
  dialogueId: bigint('dialogue_id', { mode: 'number' }),
  questId: bigint('quest_id', { mode: 'number' }),
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
  x: integer('x'),
  y: integer('y'),
  z: integer('z'),
  rotZ: integer('rot_z').notNull().default(0),
}, (table) => ({
  npcIdx: index('ix_npc_position_npc').on(table.npcId),
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
  propertyValue: integer('property_value').notNull(),
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

export const skillEffectsType = pgTable('skill_effects_type', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull(),
}, (table) => ({
  slugIdx: index('ix_skill_effects_type_slug').on(table.slug),
}));

export const skillEffects = pgTable('skill_effects', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull(),
  effectTypeId: integer('effect_type_id').notNull().default(1).references(() => skillEffectsType.id),
}, (table) => ({
  slugIdx: index('ix_skill_effects_slug').on(table.slug),
}));

export const skillEffectInstances = pgTable('skill_effect_instances', {
  id: serial('id').primaryKey(),
  skillId: integer('skill_id').notNull().references(() => skills.id),
  orderIdx: integer('order_idx').notNull().default(1),
  targetTypeId: integer('target_type_id').notNull().references(() => targetType.id),
}, (table) => ({
  skillEffectIdx: index('ix_skill_effect_instances_skill').on(table.skillId),
  uniqueSkillOrder: unique().on(table.skillId, table.orderIdx),
}));

export const skillEffectsMapping = pgTable('skill_effects_mapping', {
  id: serial('id').primaryKey(),
  effectInstanceId: integer('effect_instance_id').notNull().references(() => skillEffectInstances.id),
  effectId: integer('effect_id').notNull().references(() => skillEffects.id),
  value: integer('value').notNull(),
  level: integer('level').notNull().default(1),
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

export const itemsRarity = pgTable('items_rarity', {
  id: smallint('id').primaryKey(),
  name: varchar('name', { length: 30 }).notNull(),
  colorHex: varchar('color_hex', { length: 7 }).notNull(),
  slug: varchar('slug', { length: 30 }),
}, (table) => ({
  slugIdx: index('ix_items_rarity_slug').on(table.slug),
}));

export const itemAttributes = pgTable('item_attributes', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull(),
}, (table) => ({
  slugIdx: index('ix_item_attributes_slug').on(table.slug),
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
  equipSlot: bigint('equip_slot', { mode: 'number' }).default(0),
  levelRequirement: bigint('level_requirement', { mode: 'number' }).notNull().default(0),
  isEquippable: boolean('is_equippable').notNull().default(false),
  isHarvest: boolean('is_harvest').notNull().default(false),
}, (table) => ({
  nameIdx: index('ix_items_name').on(table.name),
  slugIdx: index('ix_items_slug').on(table.slug),
  typeIdx: index('ix_items_type').on(table.itemType),
  rarityIdx: index('ix_items_rarity').on(table.rarityId),
}));

export const itemAttributesMapping = pgTable('item_attributes_mapping', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  itemId: bigint('item_id', { mode: 'number' }).notNull().references(() => items.id, { onDelete: 'cascade' }),
  attributeId: integer('attribute_id').notNull().references(() => itemAttributes.id),
  value: integer('value').notNull(),
}, (table) => ({
  itemAttrIdx: index('ix_item_attributes_mapping_item').on(table.itemId),
  uniqueItemAttr: unique().on(table.itemId, table.attributeId),
}));
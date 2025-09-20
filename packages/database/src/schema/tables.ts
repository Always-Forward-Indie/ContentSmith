import {
  pgTable,
  bigserial,
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
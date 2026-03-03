import {
  pgTable,
  bigserial,
  serial,
  integer,
  bigint,
  boolean,
  text,
  numeric,
  timestamp,
  varchar,
  jsonb,
  index,
  unique,
  smallint,
  doublePrecision,
  pgEnum,
} from 'drizzle-orm/pg-core';

// ─── Enums ───────────────────────────────────────────────
export const questStateEnum = pgEnum('quest_state', [
  'offered',
  'active',
  'completed',
  'turned_in',
  'failed',
]);

// ─── Reference / mapping tables ──────────────────────────
export const userRoles = pgTable('user_roles', {
  id: smallint('id').primaryKey(),
  name: varchar('name', { length: 30 }).notNull(),
  label: varchar('label', { length: 50 }).notNull(),
  isStaff: boolean('is_staff').notNull().default(false),
});

export const characterGenders = pgTable('character_genders', {
  id: smallint('id').primaryKey(),
  name: varchar('name', { length: 20 }).notNull(),
  label: varchar('label', { length: 30 }).notNull(),
});

// ─── Reference tables ────────────────────────────────────
export const characterClass = pgTable('character_class', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 50 }).notNull(),
  slug: varchar('slug', { length: 50 }),
  description: text('description'),
}, (t) => ({
  slugIdx: index('ix_character_class_slug').on(t.slug),
}));

export const race = pgTable('race', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
});

export const entityAttributes = pgTable('entity_attributes', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
});

export const expForLevel = pgTable('exp_for_level', {
  id: serial('id').primaryKey(),
  level: integer('level').notNull(),
  experiencePoints: bigint('experience_points', { mode: 'number' }).notNull(),
});

export const items = pgTable('items', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  name: varchar('name', { length: 50 }).notNull(),
  slug: varchar('slug', { length: 50 }).notNull(),
  description: text('description'),
});

export const quest = pgTable('quest', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  slug: text('slug').notNull(),
  clientQuestKey: text('client_quest_key'),
});

export const skillEffects = pgTable('skill_effects', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull(),
});

export const skills = pgTable('skills', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 50 }).notNull(),
  slug: varchar('slug', { length: 50 }).notNull(),
});

// ─── Users & Characters ───────────────────────────────────
export const users = pgTable('users', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  login: varchar('login', { length: 50 }).notNull(),
  password: varchar('password', { length: 100 }).notNull(),
  email: varchar('email', { length: 255 }),
  role: smallint('role').notNull().default(0).references(() => userRoles.id),
  lastLogin: timestamp('last_login', { withTimezone: true }).notNull(),
  sessionKey: varchar('session_key', { length: 50 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  isActive: boolean('is_active').notNull().default(true),
  failedLoginAttempts: smallint('failed_login_attempts').notNull().default(0),
  lockedUntil: timestamp('locked_until', { withTimezone: true }),
  lastLoginIp: text('last_login_ip'),
  registrationIp: text('registration_ip'),
  isEmailVerified: boolean('is_email_verified').notNull().default(false),
}, (t) => ({
  loginIdx: index('users_login_idx').on(t.login),
}));

export const userSessions = pgTable('user_sessions', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  userId: bigint('user_id', { mode: 'number' }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: varchar('token_hash', { length: 255 }).notNull().unique(),
  ip: text('ip'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
}, (t) => ({
  userIdx: index('ix_user_sessions_user').on(t.userId),
}));

export const userBans = pgTable('user_bans', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  userId: bigint('user_id', { mode: 'number' }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  bannedByUserId: bigint('banned_by_user_id', { mode: 'number' }).references(() => users.id, { onDelete: 'set null' }),
  reason: text('reason').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  isActive: boolean('is_active').notNull().default(true),
}, (t) => ({
  userIdx: index('ix_user_bans_user').on(t.userId),
}));

export const zones = pgTable('zones', {
  id: serial('id').primaryKey(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  name: varchar('name', { length: 100 }).notNull(),
  minLevel: integer('min_level').notNull().default(1),
  maxLevel: integer('max_level').notNull().default(999),
  isPvp: boolean('is_pvp').notNull().default(false),
  isSafeZone: boolean('is_safe_zone').notNull().default(false),
}, (t) => ({
  slugIdx: index('ix_zones_slug').on(t.slug),
}));

export const characters = pgTable('characters', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  name: varchar('name', { length: 20 }).notNull(),
  ownerId: bigint('owner_id', { mode: 'number' }).notNull().references(() => users.id),
  classId: integer('class_id').notNull().references(() => characterClass.id),
  raceId: integer('race_id').notNull().references(() => race.id),
  experiencePoints: bigint('experience_points', { mode: 'number' }).notNull().default(0),
  level: integer('level').notNull().default(1),
  currentHealth: integer('current_health').notNull().default(1),
  currentMana: integer('current_mana').notNull().default(1),
  isDead: boolean('is_dead').notNull().default(false),
  radius: integer('radius').notNull().default(100),
  freeSkillPoints: smallint('free_skill_points').notNull().default(0),
  gender: smallint('gender').notNull().default(0).references(() => characterGenders.id),
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
}, (t) => ({
  ownerIdx: index('characters_owner_idx').on(t.ownerId),
  ownerSlotIdx: index('ix_characters_owner_slot').on(t.ownerId, t.accountSlot),
}));

// ─── Character detail tables ──────────────────────────────
export const characterAttributes = pgTable('character_attributes', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  characterId: bigint('character_id', { mode: 'number' }).notNull().references(() => characters.id),
  attributeId: integer('attribute_id').notNull().references(() => entityAttributes.id),
  value: numeric('value').notNull(),
});

export const characterPosition = pgTable('character_position', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  characterId: bigint('character_id', { mode: 'number' }).notNull().references(() => characters.id),
  zoneId: integer('zone_id').references(() => zones.id),
  x: numeric('x').notNull(),
  y: numeric('y').notNull(),
  z: numeric('z').notNull(),
  rotZ: doublePrecision('rot_z').notNull().default(0),
});

export const characterSkills = pgTable('character_skills', {
  id: serial('id').primaryKey(),
  characterId: bigint('character_id', { mode: 'number' }).notNull().references(() => characters.id),
  skillId: integer('skill_id').notNull().references(() => skills.id),
  currentLevel: integer('current_level').notNull().default(1),
});

// ─── Player state tables ──────────────────────────────────
export const playerInventory = pgTable('player_inventory', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  characterId: bigint('character_id', { mode: 'number' }).notNull().references(() => characters.id),
  itemId: bigint('item_id', { mode: 'number' }).notNull().references(() => items.id),
  quantity: integer('quantity').notNull().default(1),
  slotIndex: smallint('slot_index'),
  durabilityCurrent: integer('durability_current'),
}, (t) => ({
  charIdx: index('player_inventory_char_idx').on(t.characterId),
}));

export const equipSlots = pgTable('equip_slot', {
  id: integer('id').primaryKey(),
  name: text('name').notNull(),
});

export const characterEquipment = pgTable('character_equipment', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  characterId: bigint('character_id', { mode: 'number' }).notNull().references(() => characters.id, { onDelete: 'cascade' }),
  equipSlotId: integer('equip_slot_id').notNull().references(() => equipSlots.id),
  inventoryItemId: bigint('inventory_item_id', { mode: 'number' }).notNull().references(() => playerInventory.id, { onDelete: 'cascade' }),
  equippedAt: timestamp('equipped_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  charIdx: index('ix_character_equipment_char').on(t.characterId),
  uniqueSlot: unique('uq_character_equip_slot').on(t.characterId, t.equipSlotId),
}));

export const playerQuest = pgTable('player_quest', {
  playerId: bigint('player_id', { mode: 'number' }).notNull().references(() => characters.id),
  questId: bigint('quest_id', { mode: 'number' }).notNull().references(() => quest.id),
  state: questStateEnum('state').notNull(),
  currentStep: integer('current_step').notNull().default(0),
  progress: jsonb('progress'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const playerFlag = pgTable('player_flag', {
  playerId: bigint('player_id', { mode: 'number' }).notNull().references(() => characters.id),
  flagKey: text('flag_key').notNull(),
  intValue: integer('int_value'),
  boolValue: boolean('bool_value'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const classBaseStats = pgTable('class_base_stats', {
  id: serial('id').primaryKey(),
  classId: integer('class_id').notNull().references(() => characterClass.id, { onDelete: 'cascade' }),
  attributeId: integer('attribute_id').notNull().references(() => entityAttributes.id),
  baseValue: integer('base_value').notNull().default(0),
}, (t) => ({
  classIdx: index('ix_class_base_stats_class').on(t.classId),
  uniqueClassAttr: unique('uq_class_base_stat').on(t.classId, t.attributeId),
}));

export const classSkillTree = pgTable('class_skill_tree', {
  id: serial('id').primaryKey(),
  classId: integer('class_id').notNull().references(() => characterClass.id, { onDelete: 'cascade' }),
  skillId: integer('skill_id').notNull().references(() => skills.id),
  requiredLevel: integer('required_level').notNull().default(1),
  isDefault: boolean('is_default').notNull().default(false),
}, (t) => ({
  classIdx: index('ix_class_skill_tree_class').on(t.classId),
  uniqueClassSkill: unique('uq_class_skill').on(t.classId, t.skillId),
}));

export const currencyTransactions = pgTable('currency_transactions', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  characterId: bigint('character_id', { mode: 'number' }).notNull().references(() => characters.id, { onDelete: 'cascade' }),
  amount: bigint('amount', { mode: 'number' }).notNull(),
  reasonType: varchar('reason_type', { length: 50 }).notNull(),
  sourceId: bigint('source_id', { mode: 'number' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  charIdx: index('ix_currency_transactions_char').on(t.characterId),
  createdIdx: index('ix_currency_transactions_created').on(t.createdAt),
}));

export const vendorNpc = pgTable('vendor_npc', {
  id: serial('id').primaryKey(),
  npcId: integer('npc_id').notNull().unique(),
  markupPct: smallint('markup_pct').notNull().default(0),
});

export const vendorInventory = pgTable('vendor_inventory', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  vendorNpcId: integer('vendor_npc_id').notNull().references(() => vendorNpc.id, { onDelete: 'cascade' }),
  itemId: bigint('item_id', { mode: 'number' }).notNull().references(() => items.id),
  stockCount: integer('stock_count').notNull().default(-1),
  priceOverride: bigint('price_override', { mode: 'number' }),
}, (t) => ({
  vendorIdx: index('ix_vendor_inventory_vendor').on(t.vendorNpcId),
  uniqueItem: unique('uq_vendor_item').on(t.vendorNpcId, t.itemId),
}));

export const gmActionLog = pgTable('gm_action_log', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  gmUserId: bigint('gm_user_id', { mode: 'number' }).references(() => users.id, { onDelete: 'set null' }),
  actionType: varchar('action_type', { length: 100 }).notNull(),
  targetType: varchar('target_type', { length: 50 }).notNull(),
  targetId: bigint('target_id', { mode: 'number' }),
  oldValue: jsonb('old_value').$type<Record<string, unknown>>(),
  newValue: jsonb('new_value').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  gmUserIdx: index('ix_gm_action_log_gm').on(t.gmUserId),
  targetIdx: index('ix_gm_action_log_target').on(t.targetType, t.targetId),
  createdIdx: index('ix_gm_action_log_created').on(t.createdAt),
}));

export const playerActiveEffect = pgTable('player_active_effect', {
  id: serial('id').primaryKey(),
  playerId: bigint('player_id', { mode: 'number' }).notNull().references(() => characters.id),
  effectId: integer('effect_id').notNull().references(() => skillEffects.id),
  sourceType: text('source_type').notNull(),
  sourceId: bigint('source_id', { mode: 'number' }),
  value: numeric('value').notNull().default('0'),
  appliedAt: timestamp('applied_at', { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
}, (t) => ({
  playerIdx: index('player_active_effect_player_idx').on(t.playerId),
}));

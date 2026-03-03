import { z } from 'zod';

// ===== MOB RACE =====
export const mobRaceSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1).max(50),
});

export const createMobRaceSchema = mobRaceSchema.omit({ id: true });
export const updateMobRaceSchema = mobRaceSchema.partial().required({ id: true });

// ===== MOB =====
export const mobSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1).max(50),
  slug: z.string().max(50).nullable().optional(),
  raceId: z.number().int().positive().default(1),
  level: z.number().int().positive(),
  currentHealth: z.number().int().positive().default(1),
  currentMana: z.number().int().min(0).default(1),
  isAggressive: z.boolean().default(false),
  isDead: z.boolean().default(false),
  radius: z.number().int().positive().default(100),
  baseXp: z.number().int().min(0).default(1),
  rankId: z.number().int().positive().default(1),
});

export const createMobSchema = mobSchema.omit({ id: true });
export const updateMobSchema = mobSchema.partial().required({ id: true });

// ===== MOB LIST QUERY =====
export const mobListQuerySchema = z.object({
  search: z.string().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  raceId: z.number().int().positive().optional(),
  rankId: z.number().int().positive().optional(),
  minLevel: z.number().int().min(1).optional(),
  maxLevel: z.number().int().min(1).optional(),
  isAggressive: z.boolean().optional(),
  isDead: z.boolean().optional(),
  sortBy: z.enum(['id', 'name', 'level', 'rankMult']).default('id'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// ===== MOB POSITION =====
export const mobPositionSchema = z.object({
  id: z.number().int().nullable().optional(),
  mobId: z.number().int().positive(),
  x: z.number().nullable().optional(),
  y: z.number().nullable().optional(),
  z: z.number().nullable().optional(),
});

export const createMobPositionSchema = mobPositionSchema.omit({ id: true });
export const updateMobPositionSchema = mobPositionSchema.partial().required({ mobId: true });

// ===== MOB ATTRIBUTES =====
export const mobAttributesSchema = z.object({
  id: z.number().int().positive(),
  mobId: z.number().int().positive(),
  attributeId: z.number().int().positive(),
  value: z.number(),
});

export const createMobAttributesSchema = mobAttributesSchema.omit({ id: true });
export const updateMobAttributesSchema = mobAttributesSchema.partial().required({ id: true });

// ===== MOB SKILLS =====
export const mobSkillSchema = z.object({
  id: z.number().int().positive(),
  mobId: z.number().int().positive(),
  skillId: z.number().int().positive(),
  currentLevel: z.number().int().positive().default(1),
});

export const addMobSkillSchema = mobSkillSchema.omit({ id: true });
export const removeMobSkillSchema = z.object({
  mobId: z.number().int().positive(),
  skillId: z.number().int().positive(),
});

// ===== MOB LOOT (mob_loot_info) =====
export const mobLootInfoSchema = z.object({
  id: z.number().int().positive(),
  mobId: z.number().int().positive(),
  itemId: z.number().int().positive(),
  dropChance: z.number().min(0).max(100).default(0),
});

export const addMobLootSchema = mobLootInfoSchema.omit({ id: true });
export const updateMobLootSchema = mobLootInfoSchema.partial().required({ id: true });
export const removeMobLootSchema = z.object({
  mobId: z.number().int().positive(),
  itemId: z.number().int().positive(),
});

// ===== SPAWN ZONES =====
export const spawnZoneSchema = z.object({
  zoneId: z.number().int().positive(),
  zoneName: z.string().min(1).max(100),
  minSpawnX: z.number(),
  minSpawnY: z.number(),
  minSpawnZ: z.number(),
  maxSpawnX: z.number(),
  maxSpawnY: z.number(),
  maxSpawnZ: z.number(),
  mobId: z.number().int().positive(),
  spawnCount: z.number().int().positive().default(1),
  respawnTime: z.string().regex(/^\d{2}:\d{2}:\d{2}$/).default('00:01:00'),
});

export const createSpawnZoneSchema = spawnZoneSchema.omit({ zoneId: true });
export const updateSpawnZoneSchema = spawnZoneSchema.partial().required({ zoneId: true });

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
  spawnHealth: z.number().int().positive().default(1),
  spawnMana: z.number().int().min(0).default(1),
  isAggressive: z.boolean().default(false),
  isDead: z.boolean().default(false),
  radius: z.number().int().positive().default(100),
  baseXp: z.number().int().min(0).default(1),
  rankId: z.number().int().positive().default(1),
  aggroRange: z.number().min(0).default(400.0),
  attackRange: z.number().min(0).default(150.0),
  attackCooldown: z.number().min(0).default(2.0),
  chaseMultiplier: z.number().min(0).default(2.0),
  patrolSpeed: z.number().min(0).default(1.0),
  isSocial: z.boolean().default(false),
  chaseDuration: z.number().min(0).default(30.0),
  fleeHpThreshold: z.number().min(0).max(1).default(0.0),
  aiArchetype: z.enum(['melee', 'ranged', 'caster', 'support', 'flee']).default('melee'),
  canEvolve: z.boolean().default(false),
  isRare: z.boolean().default(false),
  rareSpawnChance: z.number().min(0).max(1).default(0.0),
  rareSpawnCondition: z.string().max(30).nullable().optional(),
  factionSlug: z.string().max(60).nullable().optional(),
  repDeltaPerKill: z.number().int().default(0),
  biomeSlug: z.string().max(64).default(''),
  mobTypeSlug: z.string().max(64).default('beast'),
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

// ===== MOB STAT =====
export const mobStatSchema = z.object({
  id: z.number().int().positive(),
  mobId: z.number().int().positive(),
  attributeId: z.number().int().positive(),
  flatValue: z.number(),
  multiplier: z.number().nullable().optional(),
  exponent: z.number().nullable().optional(),
});

export const createMobStatSchema = mobStatSchema.omit({ id: true });
export const updateMobStatSchema = mobStatSchema.partial().required({ id: true });

// Backwards-compat aliases
export const mobAttributesSchema = mobStatSchema;
export const createMobAttributesSchema = createMobStatSchema;
export const updateMobAttributesSchema = updateMobStatSchema;

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
  isHarvestOnly: z.boolean().default(false),
  minQuantity: z.number().int().min(1).default(1),
  maxQuantity: z.number().int().min(1).default(1),
  lootTier: z.enum(['common', 'uncommon', 'rare', 'epic', 'legendary']).default('common'),
});

export const addMobLootSchema = mobLootInfoSchema.omit({ id: true });
export const updateMobLootSchema = mobLootInfoSchema.partial().required({ id: true });
export const removeMobLootSchema = z.object({
  mobId: z.number().int().positive(),
  itemId: z.number().int().positive(),
});

// ===== SPAWN ZONES =====
// Schemas moved to zones.ts — re-exported here for backwards compat
export {
  createSpawnZoneSchema,
  updateSpawnZoneSchema,
  spawnZoneIdSchema,
} from './zones';

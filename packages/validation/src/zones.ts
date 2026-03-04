import { z } from 'zod';

// ─── Zones ────────────────────────────────────────────────────────────────────

export const createZoneSchema = z.object({
  slug: z.string().min(1).max(100),
  name: z.string().min(1).max(100),
  minLevel: z.number().int().min(1).default(1),
  maxLevel: z.number().int().min(1).default(999),
  isPvp: z.boolean().default(false),
  isSafeZone: z.boolean().default(false),
});

export const updateZoneSchema = createZoneSchema.partial().extend({
  id: z.number().int().positive(),
});

export const zoneIdSchema = z.object({
  id: z.number().int().positive(),
});

// ─── Spawn Zones ──────────────────────────────────────────────────────────────

const respawnTimeRegex = /^\d{2}:\d{2}:\d{2}$/;

export const createSpawnZoneSchema = z.object({
  zoneName: z.string().min(1).max(100),
  gameZoneId: z.number().int().positive().optional(),
  minSpawnX: z.number().default(0),
  minSpawnY: z.number().default(0),
  minSpawnZ: z.number().default(0),
  maxSpawnX: z.number().default(0),
  maxSpawnY: z.number().default(0),
  maxSpawnZ: z.number().default(0),
});

export const updateSpawnZoneSchema = createSpawnZoneSchema.partial().extend({
  spawnZoneId: z.number().int().positive(),
});

export const spawnZoneIdSchema = z.object({
  spawnZoneId: z.number().int().positive(),
});

// ─── Spawn Zone Mobs ──────────────────────────────────────────────────────────

export const createSpawnZoneMobSchema = z.object({
  spawnZoneId: z.number().int().positive(),
  mobId: z.number().int().positive(),
  spawnCount: z.number().int().min(1).default(1),
  respawnTime: z.string().regex(respawnTimeRegex, 'Format must be HH:MM:SS').default('00:05:00'),
});

export const updateSpawnZoneMobSchema = createSpawnZoneMobSchema.partial().extend({
  id: z.number().int().positive(),
});

export const spawnZoneMobIdSchema = z.object({
  id: z.number().int().positive(),
});

// ─── NPC Placements ───────────────────────────────────────────────────────────

export const createNpcPlacementSchema = z.object({
  npcId: z.number().int().positive(),
  zoneId: z.number().int().positive().optional(),
  x: z.number().default(0),
  y: z.number().default(0),
  z: z.number().default(0),
  rotZ: z.number().default(0),
});

export const updateNpcPlacementSchema = createNpcPlacementSchema.partial().extend({
  id: z.number().int().positive(),
});

export const npcPlacementIdSchema = z.object({
  id: z.number().int().positive(),
});

// Legacy aliases (for backwards compat with old router code)
/** @deprecated use createSpawnZoneSchema */
export const createZoneSpawnSchema = createSpawnZoneSchema;
/** @deprecated use updateSpawnZoneSchema */
export const updateZoneSpawnSchema = updateSpawnZoneSchema;
/** @deprecated use spawnZoneIdSchema */
export const zoneSpawnIdSchema = spawnZoneIdSchema;

export type CreateZoneInput = z.infer<typeof createZoneSchema>;
export type UpdateZoneInput = z.infer<typeof updateZoneSchema>;
export type CreateSpawnZoneInput = z.infer<typeof createSpawnZoneSchema>;
export type UpdateSpawnZoneInput = z.infer<typeof updateSpawnZoneSchema>;
export type CreateSpawnZoneMobInput = z.infer<typeof createSpawnZoneMobSchema>;
export type CreateNpcPlacementInput = z.infer<typeof createNpcPlacementSchema>;

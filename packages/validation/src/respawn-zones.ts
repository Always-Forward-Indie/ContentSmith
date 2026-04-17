import { z } from 'zod';

export const respawnZoneSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1).max(64),
  x: z.number().default(0),
  y: z.number().default(0),
  z: z.number().default(0),
  zoneId: z.number().int().positive().default(1),
  isDefault: z.boolean().default(false),
});

export const createRespawnZoneSchema = respawnZoneSchema.omit({ id: true });
export const updateRespawnZoneSchema = respawnZoneSchema.partial().required({ id: true });
export const respawnZoneIdSchema = z.object({ id: z.number().int().positive() });
export const respawnZoneListQuerySchema = z.object({
  search: z.string().optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
  zoneId: z.number().int().positive().optional(),
});

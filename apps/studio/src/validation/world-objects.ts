import { z } from 'zod';

export const worldObjectSchema = z.object({
  id: z.number().int().positive(),
  slug: z.string().min(1).max(100),
  nameKey: z.string().min(1).max(100),
  objectType: z.string().min(1).max(50),
  scope: z.string().max(30).default('per_player'),
  posX: z.number().default(0),
  posY: z.number().default(0),
  posZ: z.number().default(0),
  rotZ: z.number().default(0),
  zoneId: z.number().int().positive().nullable().optional(),
  requiredItemId: z.number().int().positive().nullable().optional(),
  interactionRadius: z.number().min(0).default(250),
  channelTimeSec: z.number().int().min(0).default(0),
  respawnSec: z.number().int().min(0).default(0),
  isActiveByDefault: z.boolean().default(true),
  minLevel: z.number().int().min(0).default(0),
  conditionGroup: z.unknown().nullable().optional(),
});

export const createWorldObjectSchema = worldObjectSchema.omit({ id: true });
export const updateWorldObjectSchema = worldObjectSchema.partial().required({ id: true });
export const worldObjectIdSchema = z.object({ id: z.number().int().positive() });
export const worldObjectListQuerySchema = z.object({
  search: z.string().optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
  zoneId: z.number().int().positive().optional(),
  objectType: z.string().optional(),
});

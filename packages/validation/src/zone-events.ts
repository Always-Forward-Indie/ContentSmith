import { z } from 'zod';

export const zoneEventTemplateSchema = z.object({
  id: z.number().int().positive(),
  slug: z.string().min(1).max(100),
  gameZoneId: z.number().int().positive().nullable().optional(),
  triggerType: z.string().max(50).default('manual'),
  durationSec: z.number().int().min(0).default(1200),
  lootMultiplier: z.number().min(0).default(1.0),
  spawnRateMultiplier: z.number().min(0).default(1.0),
  mobSpeedMultiplier: z.number().min(0).default(1.0),
  announceKey: z.string().max(120).nullable().optional(),
  intervalHours: z.number().int().min(0).default(0),
  randomChancePerHour: z.number().min(0).max(1).default(0),
  hasInvasionWave: z.boolean().default(false),
  invasionMobTemplateId: z.number().int().positive().nullable().optional(),
  invasionWaveCount: z.number().int().min(0).default(0),
  invasionChampionSlug: z.string().max(100).nullable().optional(),
});

export const createZoneEventTemplateSchema = zoneEventTemplateSchema.omit({ id: true });
export const updateZoneEventTemplateSchema = zoneEventTemplateSchema.partial().required({ id: true });
export const zoneEventTemplateIdSchema = z.object({ id: z.number().int().positive() });
export const zoneEventTemplateListQuerySchema = z.object({
  search: z.string().optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
  gameZoneId: z.number().int().positive().optional(),
});

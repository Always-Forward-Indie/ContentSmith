import { z } from 'zod';

export const timedChampionTemplateSchema = z.object({
  id: z.number().int().positive(),
  slug: z.string().min(1).max(60),
  zoneId: z.number().int().positive(),
  mobTemplateId: z.number().int().positive(),
  intervalHours: z.number().int().min(1).default(6),
  windowMinutes: z.number().int().min(1).default(15),
  announcementKey: z.string().max(120).nullable().optional(),
});

export const createTimedChampionTemplateSchema = timedChampionTemplateSchema.omit({ id: true });
export const updateTimedChampionTemplateSchema = timedChampionTemplateSchema.partial().required({ id: true });
export const timedChampionTemplateIdSchema = z.object({ id: z.number().int().positive() });
export const timedChampionTemplateListQuerySchema = z.object({
  search: z.string().optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});

import { z } from 'zod';

export const damageElementSchema = z.object({
  slug: z.string().min(1).max(64),
});
export const createDamageElementSchema = damageElementSchema;
export const damageElementListQuerySchema = z.object({
  search: z.string().optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});

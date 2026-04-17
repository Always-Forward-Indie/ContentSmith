import { z } from 'zod';

export const factionSchema = z.object({
  id: z.number().int().positive(),
  slug: z.string().min(1).max(60),
  name: z.string().min(1).max(120),
});

export const createFactionSchema = factionSchema.omit({ id: true });
export const updateFactionSchema = factionSchema.partial().required({ id: true });
export const factionIdSchema = z.object({ id: z.number().int().positive() });
export const factionListQuerySchema = z.object({
  search: z.string().optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});

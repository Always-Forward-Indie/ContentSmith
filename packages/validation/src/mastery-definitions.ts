import { z } from 'zod';

export const masteryDefinitionSchema = z.object({
  slug: z.string().min(1).max(60),
  name: z.string().min(1).max(120),
  weaponTypeSlug: z.string().max(60).nullable().optional(),
  maxValue: z.number().min(0).default(100),
});

export const createMasteryDefinitionSchema = masteryDefinitionSchema;
export const updateMasteryDefinitionSchema = masteryDefinitionSchema.partial().extend({ slug: z.string().min(1).max(60) });
export const masteryDefinitionListQuerySchema = z.object({
  search: z.string().optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});

import { z } from 'zod';

export const titleDefinitionSchema = z.object({
  id: z.number().int().positive(),
  slug: z.string().min(1).max(80),
  displayName: z.string().min(1).max(120),
  description: z.string().default(''),
  earnCondition: z.string().max(80).default(''),
  bonuses: z.array(z.unknown()).default([]),
  conditionParams: z.record(z.unknown()).default({}),
});

export const createTitleDefinitionSchema = titleDefinitionSchema.omit({ id: true });
export const updateTitleDefinitionSchema = titleDefinitionSchema.partial().required({ id: true });
export const titleDefinitionIdSchema = z.object({ id: z.number().int().positive() });
export const titleDefinitionListQuerySchema = z.object({
  search: z.string().optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});

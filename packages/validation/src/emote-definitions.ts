import { z } from 'zod';

export const emoteDefinitionSchema = z.object({
  id: z.number().int().positive(),
  slug: z.string().min(1).max(64),
  displayName: z.string().min(1).max(128),
  animationName: z.string().min(1).max(128),
  category: z.string().max(64).default('general'),
  isDefault: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
});

export const createEmoteDefinitionSchema = emoteDefinitionSchema.omit({ id: true });
export const updateEmoteDefinitionSchema = emoteDefinitionSchema.partial().required({ id: true });
export const emoteDefinitionIdSchema = z.object({ id: z.number().int().positive() });
export const emoteDefinitionListQuerySchema = z.object({
  search: z.string().optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});

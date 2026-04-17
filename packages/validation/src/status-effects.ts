import { z } from 'zod';

export const statusEffectCategoryEnum = ['buff', 'debuff', 'dot', 'hot', 'cc'] as const;
export const effectModifierTypeEnum = ['flat', 'percent', 'percent_all'] as const;

export const statusEffectSchema = z.object({
  id: z.number().int().positive(),
  slug: z.string().min(1).max(120),
  category: z.enum(statusEffectCategoryEnum),
  durationSec: z.number().int().min(0).nullable().optional(),
});

export const createStatusEffectSchema = statusEffectSchema.omit({ id: true });
export const updateStatusEffectSchema = statusEffectSchema.partial().required({ id: true });
export const statusEffectIdSchema = z.object({ id: z.number().int().positive() });
export const statusEffectListQuerySchema = z.object({
  search: z.string().optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});

export const statusEffectModifierSchema = z.object({
  id: z.number().int().positive(),
  statusEffectId: z.number().int().positive(),
  attributeId: z.number().int().positive().nullable().optional(),
  modifierType: z.enum(effectModifierTypeEnum),
  value: z.number(),
});
export const createStatusEffectModifierSchema = statusEffectModifierSchema.omit({ id: true });
export const updateStatusEffectModifierSchema = statusEffectModifierSchema.partial().required({ id: true });

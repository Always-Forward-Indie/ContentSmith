import { z } from 'zod';

// Схема для skill_scale_type
export const skillScaleTypeBaseSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  slug: z.string(),
});

export const createSkillScaleTypeSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  slug: z.string().min(1, 'Slug is required').max(255),
});

export const updateSkillScaleTypeSchema = createSkillScaleTypeSchema.partial();

// Схема для запросов списков
export const skillScaleTypeListQuerySchema = z.object({
  search: z.string().optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(10),
});

export const skillScaleTypeIdSchema = z.object({
  id: z.number().int().positive('Invalid skill scale type ID'),
});

// Type exports
export type SkillScaleTypeBaseSchema = z.infer<typeof skillScaleTypeBaseSchema>;
export type CreateSkillScaleTypeSchema = z.infer<typeof createSkillScaleTypeSchema>;
export type UpdateSkillScaleTypeSchema = z.infer<typeof updateSkillScaleTypeSchema>;
export type SkillScaleTypeListQuerySchema = z.infer<typeof skillScaleTypeListQuerySchema>;
export type SkillScaleTypeIdSchema = z.infer<typeof skillScaleTypeIdSchema>;
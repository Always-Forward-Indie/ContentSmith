import { z } from 'zod';

// Схема для skill_properties (справочник свойств навыков)
export const skillPropertyTypeBaseSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  slug: z.string(),
});

export const createSkillPropertyTypeSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  slug: z.string().min(1, 'Slug is required').max(255),
});

export const updateSkillPropertyTypeSchema = createSkillPropertyTypeSchema.partial();

// Схема для запросов списков
export const skillPropertyTypeListQuerySchema = z.object({
  search: z.string().optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(10),
});

export const skillPropertyTypeIdSchema = z.object({
  id: z.number().int().positive('Invalid skill property type ID'),
});

// Type exports
export type SkillPropertyTypeBaseSchema = z.infer<typeof skillPropertyTypeBaseSchema>;
export type CreateSkillPropertyTypeSchema = z.infer<typeof createSkillPropertyTypeSchema>;
export type UpdateSkillPropertyTypeSchema = z.infer<typeof updateSkillPropertyTypeSchema>;
export type SkillPropertyTypeListQuerySchema = z.infer<typeof skillPropertyTypeListQuerySchema>;
export type SkillPropertyTypeIdSchema = z.infer<typeof skillPropertyTypeIdSchema>;
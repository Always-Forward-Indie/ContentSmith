import { z } from 'zod';

// Схема для skill_school
export const skillSchoolBaseSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  slug: z.string(),
});

export const createSkillSchoolSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  slug: z.string().min(1, 'Slug is required').max(255),
});

export const updateSkillSchoolSchema = createSkillSchoolSchema.partial();

// Схема для запросов списков
export const skillSchoolListQuerySchema = z.object({
  search: z.string().optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(10),
});

export const skillSchoolIdSchema = z.object({
  id: z.number().int().positive('Invalid skill school ID'),
});

// Type exports
export type SkillSchoolBaseSchema = z.infer<typeof skillSchoolBaseSchema>;
export type CreateSkillSchoolSchema = z.infer<typeof createSkillSchoolSchema>;
export type UpdateSkillSchoolSchema = z.infer<typeof updateSkillSchoolSchema>;
export type SkillSchoolListQuerySchema = z.infer<typeof skillSchoolListQuerySchema>;
export type SkillSchoolIdSchema = z.infer<typeof skillSchoolIdSchema>;
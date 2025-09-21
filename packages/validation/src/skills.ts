import { z } from 'zod';
import { skillSchoolSchema, skillScaleTypeSchema } from './npc';

// Схемы для основных таблиц skill-related

// Используем схемы из npc.ts для skillSchool и skillScaleType

// Skills (основная таблица)
export const skillSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  scaleStatId: z.number(),
  schoolId: z.number(),
});

export const skillWithRelationsSchema = skillSchema.extend({
  skillSchool: skillSchoolSchema.optional(),
  skillScaleType: skillScaleTypeSchema.optional(),
});

export const createSkillSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  slug: z.string().min(1, 'Slug is required').max(255),
  scaleStatId: z.number().int().positive('Scale stat is required'),
  schoolId: z.number().int().positive('School is required'),
});

export const updateSkillSchema = createSkillSchema.partial();

// Skill Properties
export const skillPropertySchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
});

export const createSkillPropertySchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  slug: z.string().min(1, 'Slug is required').max(255),
});

export const updateSkillPropertySchema = createSkillPropertySchema.partial();

// Skill Properties Mapping
export const skillPropertyMappingSchema = z.object({
  id: z.number(),
  skillId: z.number(),
  skillLevel: z.number(),
  propertyId: z.number(),
  propertyValue: z.number(),
});

export const createSkillPropertyMappingSchema = z.object({
  skillId: z.number().int().positive(),
  skillLevel: z.number().int().min(1, 'Skill level must be at least 1'),
  propertyId: z.number().int().positive(),
  propertyValue: z.number().int(),
});

export const updateSkillPropertyMappingSchema = createSkillPropertyMappingSchema.partial();

// Target Type
export const targetTypeSchema = z.object({
  id: z.number(),
  slug: z.string(),
});

export const createTargetTypeSchema = z.object({
  slug: z.string().min(1, 'Slug is required').max(255),
});

export const updateTargetTypeSchema = createTargetTypeSchema.partial();

// Skill Effects Type
export const skillEffectsTypeSchema = z.object({
  id: z.number(),
  slug: z.string(),
});

export const createSkillEffectsTypeSchema = z.object({
  slug: z.string().min(1, 'Slug is required').max(255),
});

export const updateSkillEffectsTypeSchema = createSkillEffectsTypeSchema.partial();

// Skill Effects
export const skillEffectSchema = z.object({
  id: z.number(),
  slug: z.string(),
  effectTypeId: z.number(),
});

export const createSkillEffectSchema = z.object({
  slug: z.string().min(1, 'Slug is required').max(255),
  effectTypeId: z.number().int().positive('Effect type is required'),
});

export const updateSkillEffectSchema = createSkillEffectSchema.partial();

// Общие схемы для списков и запросов
export const skillListQuerySchema = z.object({
  search: z.string().optional(),
  schoolId: z.number().optional(),
  scaleStatId: z.number().optional(),
});

export const skillIdSchema = z.object({
  id: z.number().int().positive('Invalid skill ID'),
});

// Type exports
export type SkillSchema = z.infer<typeof skillSchema>;
export type SkillWithRelationsSchema = z.infer<typeof skillWithRelationsSchema>;
export type CreateSkillSchema = z.infer<typeof createSkillSchema>;
export type UpdateSkillSchema = z.infer<typeof updateSkillSchema>;

export type SkillPropertySchema = z.infer<typeof skillPropertySchema>;
export type CreateSkillPropertySchema = z.infer<typeof createSkillPropertySchema>;
export type UpdateSkillPropertySchema = z.infer<typeof updateSkillPropertySchema>;

export type SkillPropertyMappingSchema = z.infer<typeof skillPropertyMappingSchema>;
export type CreateSkillPropertyMappingSchema = z.infer<typeof createSkillPropertyMappingSchema>;
export type UpdateSkillPropertyMappingSchema = z.infer<typeof updateSkillPropertyMappingSchema>;

export type TargetTypeSchema = z.infer<typeof targetTypeSchema>;
export type CreateTargetTypeSchema = z.infer<typeof createTargetTypeSchema>;
export type UpdateTargetTypeSchema = z.infer<typeof updateTargetTypeSchema>;

export type SkillEffectsTypeSchema = z.infer<typeof skillEffectsTypeSchema>;
export type CreateSkillEffectsTypeSchema = z.infer<typeof createSkillEffectsTypeSchema>;
export type UpdateSkillEffectsTypeSchema = z.infer<typeof updateSkillEffectsTypeSchema>;

export type SkillEffectSchema = z.infer<typeof skillEffectSchema>;
export type CreateSkillEffectSchema = z.infer<typeof createSkillEffectSchema>;
export type UpdateSkillEffectSchema = z.infer<typeof updateSkillEffectSchema>;

export type SkillListQuerySchema = z.infer<typeof skillListQuerySchema>;
export type SkillIdSchema = z.infer<typeof skillIdSchema>;
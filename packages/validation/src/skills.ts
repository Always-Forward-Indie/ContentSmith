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
  animationName: z.string().nullable().optional(),
  isPassive: z.boolean().default(false),
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
  animationName: z.string().max(100).nullable().optional(),
  isPassive: z.boolean().default(false),
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
  propertyValue: z.number(),
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

// Skill Effect Instances
export const skillEffectInstanceSchema = z.object({
  id: z.number(),
  skillId: z.number(),
  orderIdx: z.number(),
  targetTypeId: z.number(),
});

export const createSkillEffectInstanceSchema = z.object({
  skillId: z.number().int().positive(),
  orderIdx: z.number().int().min(1).default(1),
  targetTypeId: z.number().int().positive(),
});

export const updateSkillEffectInstanceSchema = z.object({
  id: z.number().int().positive(),
  orderIdx: z.number().int().min(1).optional(),
  targetTypeId: z.number().int().positive().optional(),
});

// Skill Effects Mapping (per-level effect values)
export const skillEffectMappingSchema = z.object({
  id: z.number(),
  effectInstanceId: z.number(),
  effectId: z.number(),
  value: z.number(),
  level: z.number(),
  tickMs: z.number(),
  durationMs: z.number(),
  attributeId: z.number().nullable().optional(),
});

export const createSkillEffectMappingSchema = z.object({
  effectInstanceId: z.number().int().positive(),
  effectId: z.number().int().positive(),
  value: z.number(),
  level: z.number().int().min(1).default(1),
  tickMs: z.number().int().min(0).default(0),
  durationMs: z.number().int().min(0).default(0),
  attributeId: z.number().int().positive().nullable().optional(),
});

export const updateSkillEffectMappingSchema = z.object({
  id: z.number().int().positive(),
  effectId: z.number().int().positive().optional(),
  value: z.number().optional(),
  level: z.number().int().min(1).optional(),
  tickMs: z.number().int().min(0).optional(),
  durationMs: z.number().int().min(0).optional(),
  attributeId: z.number().int().positive().nullable().optional(),
});

// Общие схемы для списков и запросов
export const skillListQuerySchema = z.object({
  search: z.string().optional(),
  schoolId: z.number().optional(),
  scaleStatId: z.number().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
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

export type SkillEffectInstanceSchema = z.infer<typeof skillEffectInstanceSchema>;
export type CreateSkillEffectInstanceSchema = z.infer<typeof createSkillEffectInstanceSchema>;
export type UpdateSkillEffectInstanceSchema = z.infer<typeof updateSkillEffectInstanceSchema>;

export type SkillEffectMappingSchema = z.infer<typeof skillEffectMappingSchema>;
export type CreateSkillEffectMappingSchema = z.infer<typeof createSkillEffectMappingSchema>;
export type UpdateSkillEffectMappingSchema = z.infer<typeof updateSkillEffectMappingSchema>;

export type SkillListQuerySchema = z.infer<typeof skillListQuerySchema>;
export type SkillIdSchema = z.infer<typeof skillIdSchema>;
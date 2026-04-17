import { z } from 'zod';

// ─── Character Class ──────────────────────────────────────────────────────────

export const createClassSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
});

export const updateClassSchema = createClassSchema.partial().extend({
  id: z.number().int().positive(),
});

export const classIdSchema = z.object({
  id: z.number().int().positive(),
});

// ─── Class Stat Formula ───────────────────────────────────────────────────────

export const upsertStatFormulaSchema = z.object({
  classId: z.number().int().positive(),
  attributeId: z.number().int().positive(),
  baseValue: z.number().default(0),
  multiplier: z.number().default(0),
  exponent: z.number().default(1),
});

export const deleteStatFormulaSchema = z.object({
  classId: z.number().int().positive(),
  attributeId: z.number().int().positive(),
});

// ─── Class Skill Tree ─────────────────────────────────────────────────────────

export const addSkillToClassSchema = z.object({
  classId: z.number().int().positive(),
  skillId: z.number().int().positive(),
  requiredLevel: z.number().int().min(1).default(1),
  isDefault: z.boolean().default(false),
  prerequisiteSkillId: z.number().int().positive().nullable().optional(),
  skillPointCost: z.number().int().min(0).default(0),
  goldCost: z.number().int().min(0).default(0),
  maxLevel: z.number().int().min(1).default(1),
  requiresBook: z.boolean().default(false),
  skillBookItemId: z.number().int().positive().nullable().optional(),
});

export const updateClassSkillSchema = z.object({
  id: z.number().int().positive(),
  requiredLevel: z.number().int().min(1).optional(),
  isDefault: z.boolean().optional(),
  prerequisiteSkillId: z.number().int().positive().nullable().optional(),
  skillPointCost: z.number().int().min(0).optional(),
  goldCost: z.number().int().min(0).optional(),
  maxLevel: z.number().int().min(1).optional(),
  requiresBook: z.boolean().optional(),
  skillBookItemId: z.number().int().positive().nullable().optional(),
});

export const removeSkillFromClassSchema = z.object({
  id: z.number().int().positive(),
});

export type CreateClassInput = z.infer<typeof createClassSchema>;
export type UpdateClassInput = z.infer<typeof updateClassSchema>;
export type UpsertStatFormulaInput = z.infer<typeof upsertStatFormulaSchema>;
export type AddSkillToClassInput = z.infer<typeof addSkillToClassSchema>;
export type UpdateClassSkillInput = z.infer<typeof updateClassSkillSchema>;

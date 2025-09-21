import { z } from 'zod';

// Base NPC schemas
export const npcSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1).max(50),
  raceId: z.number().int().positive().default(1),
  level: z.number().int().positive(),
  currentHealth: z.number().int().positive().default(1),
  currentMana: z.number().int().positive().default(1),
  isDead: z.boolean().default(false),
  slug: z.string().max(50).nullable(),
  radius: z.number().int().positive().default(100),
  isInteractable: z.boolean().default(true),
  npcType: z.number().int().positive().default(1),
  dialogueId: z.number().int().positive().nullable(),
  questId: z.number().int().positive().nullable(),
});

export const createNpcSchema = npcSchema.omit({ id: true });
export const updateNpcSchema = npcSchema.partial().required({ id: true });

// Race schemas
export const raceSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1).max(50),
  slug: z.string().min(1),
});

export const createRaceSchema = raceSchema.omit({ id: true });
export const updateRaceSchema = raceSchema.partial().required({ id: true });

// NPC Type schemas
export const npcTypeSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1).max(50),
  slug: z.string().min(1).max(50),
});

export const createNpcTypeSchema = npcTypeSchema.omit({ id: true });
export const updateNpcTypeSchema = npcTypeSchema.partial().required({ id: true });

// NPC Position schemas
export const npcPositionSchema = z.object({
  id: z.number().int().nullable(),
  npcId: z.number().int().positive(),
  x: z.number().int().nullable(),
  y: z.number().int().nullable(),
  z: z.number().int().nullable(),
  rotZ: z.number().int().default(0),
});

export const createNpcPositionSchema = npcPositionSchema.omit({ id: true });
export const updateNpcPositionSchema = npcPositionSchema.partial().required({ npcId: true });

// Entity Attributes schemas
export const entityAttributesSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100),
});

export const createEntityAttributesSchema = entityAttributesSchema.omit({ id: true });
export const updateEntityAttributesSchema = entityAttributesSchema.partial().required({ id: true });

// NPC Attributes schemas
export const npcAttributesSchema = z.object({
  id: z.number().int().positive(),
  npcId: z.number().int().positive(),
  attributeId: z.number().int().positive(),
  value: z.number().int(),
});

export const createNpcAttributesSchema = npcAttributesSchema.omit({ id: true });
export const updateNpcAttributesSchema = npcAttributesSchema.partial().required({ id: true });

// Skills schemas
export const skillSchoolSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1).max(50),
  slug: z.string().min(1).max(50),
});

export const skillScaleTypeSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1).max(50),
  slug: z.string().min(1).max(50),
});

export const skillsSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1).max(50),
  slug: z.string().min(1).max(50),
  scaleStatId: z.number().int().positive().default(1),
  schoolId: z.number().int().positive().default(1),
});

export const npcSkillsSchema = z.object({
  id: z.number().int().positive(),
  npcId: z.number().int().positive(),
  skillId: z.number().int().positive(),
  currentLevel: z.number().int().positive().default(1),
});

export const createNpcSkillsSchema = npcSkillsSchema.omit({ id: true });
export const updateNpcSkillsSchema = npcSkillsSchema.partial().required({ id: true });

// Comprehensive NPC with relations
export const npcWithRelationsSchema = npcSchema.extend({
  race: raceSchema.optional(),
  npcType: npcTypeSchema.optional(),
  position: npcPositionSchema.optional(),
  attributes: z.array(npcAttributesSchema.extend({
    attribute: entityAttributesSchema.optional(),
  })).optional(),
  skills: z.array(npcSkillsSchema.extend({
    skill: skillsSchema.optional(),
  })).optional(),
});

// Query/Filter schemas
export const npcListQuerySchema = z.object({
  search: z.string().optional(),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
  raceId: z.number().int().positive().optional(),
  npcType: z.number().int().positive().optional(),
  level: z.number().int().positive().optional(),
  isInteractable: z.boolean().optional(),
  isDead: z.boolean().optional(),
});

// Export types
export type Npc = z.infer<typeof npcSchema>;
export type CreateNpc = z.infer<typeof createNpcSchema>;
export type UpdateNpc = z.infer<typeof updateNpcSchema>;
export type NpcWithRelations = z.infer<typeof npcWithRelationsSchema>;
export type NpcListQuery = z.infer<typeof npcListQuerySchema>;

export type Race = z.infer<typeof raceSchema>;
export type CreateRace = z.infer<typeof createRaceSchema>;
export type UpdateRace = z.infer<typeof updateRaceSchema>;

export type NpcType = z.infer<typeof npcTypeSchema>;
export type CreateNpcType = z.infer<typeof createNpcTypeSchema>;
export type UpdateNpcType = z.infer<typeof updateNpcTypeSchema>;

export type NpcPosition = z.infer<typeof npcPositionSchema>;
export type CreateNpcPosition = z.infer<typeof createNpcPositionSchema>;
export type UpdateNpcPosition = z.infer<typeof updateNpcPositionSchema>;

export type EntityAttributes = z.infer<typeof entityAttributesSchema>;
export type CreateEntityAttributes = z.infer<typeof createEntityAttributesSchema>;
export type UpdateEntityAttributes = z.infer<typeof updateEntityAttributesSchema>;

export type NpcAttributes = z.infer<typeof npcAttributesSchema>;
export type CreateNpcAttributes = z.infer<typeof createNpcAttributesSchema>;
export type UpdateNpcAttributes = z.infer<typeof updateNpcAttributesSchema>;

export type NpcSkills = z.infer<typeof npcSkillsSchema>;
export type CreateNpcSkills = z.infer<typeof createNpcSkillsSchema>;
export type UpdateNpcSkills = z.infer<typeof updateNpcSkillsSchema>;
import { z } from 'zod'
import { createTRPCRouter, devRequirePermission } from '../trpc'
import { db } from '../db'
import { toJsonb } from '../utils/json'
import { 
  npc, 
  race, 
  npcType, 
  npcPosition, 
  entityAttributes, 
  npcAttributes,
  skills,
  npcSkills,
  npcDialogue,
  dialogue,
} from '@contentsmith/database'
import { like, or, desc, eq, and, count, gte, lte, asc } from '@contentsmith/database'
import { 
  npcListQuerySchema, 
  createNpcSchema, 
  updateNpcSchema,
  createRaceSchema,
  updateRaceSchema,
  createNpcTypeSchema,
  updateNpcTypeSchema,
  createNpcPositionSchema,
  updateNpcPositionSchema,
  createEntityAttributesSchema,
  updateEntityAttributesSchema,
  createNpcAttributesSchema,
  updateNpcAttributesSchema,
  addNpcAttributeSchema,
  removeNpcAttributeSchema,
  addNpcSkillSchema,
  updateNpcSkillSchema,
  removeNpcSkillSchema
} from '@contentsmith/validation'

// В режиме разработки используем dev процедуры
const isDev = process.env.NODE_ENV === 'development'
const requirePerm = (permission: string) => 
  isDev ? devRequirePermission(permission) : devRequirePermission(permission)

export const npcRouter = createTRPCRouter({
  // ===== NPC CRUD =====
  
  // Get all NPCs with optional search and filters
  list: requirePerm('npc:read')
    .input(npcListQuerySchema)
    .query(async ({ input }) => {
      const { search, page, limit, raceId, npcType: npcTypeFilter, minLevel, maxLevel, isInteractable, isDead, sortBy, sortOrder } = input;
      const offset = (page - 1) * limit;

      const conditions = [];
      if (search) conditions.push(or(like(npc.name, `%${search}%`), like(npc.slug, `%${search}%`)));
      if (raceId) conditions.push(eq(npc.raceId, raceId));
      if (npcTypeFilter) conditions.push(eq(npc.npcType, npcTypeFilter));
      if (minLevel) conditions.push(gte(npc.level, minLevel));
      if (maxLevel) conditions.push(lte(npc.level, maxLevel));
      if (isInteractable !== undefined) conditions.push(eq(npc.isInteractable, isInteractable));
      if (isDead !== undefined) conditions.push(eq(npc.isDead, isDead));

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const [totalResult] = await db
        .select({ total: count() })
        .from(npc)
        .where(whereClause);
      const total = totalResult?.total ?? 0;

      const dir = sortOrder === 'asc' ? asc : desc;
      const orderByClause = (
        sortBy === 'name'  ? dir(npc.name) :
        sortBy === 'level' ? dir(npc.level) :
        dir(npc.id)
      );

      const npcs = await db.select({
        id: npc.id,
        name: npc.name,
        raceId: npc.raceId,
        level: npc.level,
        currentHealth: npc.currentHealth,
        currentMana: npc.currentMana,
        isDead: npc.isDead,
        slug: npc.slug,
        radius: npc.radius,
        isInteractable: npc.isInteractable,
        npcType: npc.npcType,
        raceName: race.name,
        npcTypeName: npcType.name,
      }).from(npc)
        .leftJoin(race, eq(npc.raceId, race.id))
        .leftJoin(npcType, eq(npc.npcType, npcType.id))
        .where(whereClause)
        .orderBy(orderByClause)
        .limit(limit)
        .offset(offset);

      return {
        data: npcs,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      };
    }),

  // Get NPC by ID with relations
  getById: requirePerm('npc:read')
    .input(z.number())
    .query(async ({ input }) => {
      const result = await db.select({
        id: npc.id,
        name: npc.name,
        raceId: npc.raceId,
        level: npc.level,
        currentHealth: npc.currentHealth,
        currentMana: npc.currentMana,
        isDead: npc.isDead,
        slug: npc.slug,
        radius: npc.radius,
        isInteractable: npc.isInteractable,
        npcType: npc.npcType,
        // Relations
        raceName: race.name,
        npcTypeName: npcType.name,
        positionX: npcPosition.x,
        positionY: npcPosition.y,
        positionZ: npcPosition.z,
        positionRotZ: npcPosition.rotZ,
      }).from(npc)
        .leftJoin(race, eq(npc.raceId, race.id))
        .leftJoin(npcType, eq(npc.npcType, npcType.id))
        .leftJoin(npcPosition, eq(npc.id, npcPosition.npcId))
        .where(eq(npc.id, input))

      if (result.length === 0) return null

      const npcData = result[0]

      // Get attributes
      const attributes = await db.select({
        id: npcAttributes.id,
        attributeId: npcAttributes.attributeId,
        value: npcAttributes.value,
        attributeName: entityAttributes.name,
        attributeSlug: entityAttributes.slug,
      }).from(npcAttributes)
        .leftJoin(entityAttributes, eq(npcAttributes.attributeId, entityAttributes.id))
        .where(eq(npcAttributes.npcId, input))

      // Get skills
      const npcSkillsData = await db.select({
        id: npcSkills.id,
        skillId: npcSkills.skillId,
        currentLevel: npcSkills.currentLevel,
        skillName: skills.name,
        skillSlug: skills.slug,
      }).from(npcSkills)
        .leftJoin(skills, eq(npcSkills.skillId, skills.id))
        .where(eq(npcSkills.npcId, input))

      // Get dialogues
      const npcDialoguesData = await db.select({
        npcId: npcDialogue.npcId,
        dialogueId: npcDialogue.dialogueId,
        priority: npcDialogue.priority,
        conditionGroup: npcDialogue.conditionGroup,
        dialogueSlug: dialogue.slug,
        dialogueVersion: dialogue.version,
      }).from(npcDialogue)
        .leftJoin(dialogue, eq(npcDialogue.dialogueId, dialogue.id))
        .where(eq(npcDialogue.npcId, input))

      return {
        ...npcData,
        attributes,
        skills: npcSkillsData,
        dialogues: npcDialoguesData,
      }
    }),

  // Get NPCs by IDs (for batch operations)
  getByIds: requirePerm('npc:read')
    .input(z.array(z.number()))
    .query(async ({ input }) => {
      if (input.length === 0) return []
      
      const result = await db.select().from(npc).where(
        or(...input.map(id => eq(npc.id, id)))
      )
      return result
    }),

  // Create new NPC
  create: requirePerm('npc:write')
    .input(createNpcSchema)
    .mutation(async ({ input }) => {
      const result = await db.insert(npc).values(input).returning()
      return result[0]
    }),

  // Update NPC
  update: requirePerm('npc:write')
    .input(updateNpcSchema)
    .mutation(async ({ input }) => {
      const { id, ...updateData } = input
      const result = await db.update(npc)
        .set(updateData)
        .where(eq(npc.id, id))
        .returning()
      
      if (result.length === 0) {
        throw new Error(`NPC with id ${id} not found`)
      }
      
      return result[0]
    }),

  // Delete NPC
  delete: requirePerm('npc:delete')
    .input(z.number())
    .mutation(async ({ input }) => {
      const result = await db.delete(npc).where(eq(npc.id, input)).returning()
      
      if (result.length === 0) {
        throw new Error(`NPC with id ${input} not found`)
      }
      
      return result[0]
    }),

  // ===== RACE CRUD =====
  
  // Get all races
  getRaces: requirePerm('npc:read')
    .query(async () => {
      return await db.select().from(race).orderBy(race.name)
    }),

  // Create race
  createRace: requirePerm('npc:write')
    .input(createRaceSchema)
    .mutation(async ({ input }) => {
      const result = await db.insert(race).values(input).returning()
      return result[0]
    }),

  // Update race
  updateRace: requirePerm('npc:write')
    .input(updateRaceSchema)
    .mutation(async ({ input }) => {
      const { id, ...updateData } = input
      const result = await db.update(race)
        .set(updateData)
        .where(eq(race.id, id))
        .returning()
      
      if (result.length === 0) {
        throw new Error(`Race with id ${id} not found`)
      }
      
      return result[0]
    }),

  // Delete race
  deleteRace: requirePerm('npc:delete')
    .input(z.number())
    .mutation(async ({ input }) => {
      const result = await db.delete(race).where(eq(race.id, input)).returning()
      
      if (result.length === 0) {
        throw new Error(`Race with id ${input} not found`)
      }
      
      return result[0]
    }),

  // ===== NPC TYPE CRUD =====
  
  // Get all NPC types
  getNpcTypes: requirePerm('npc:read')
    .query(async () => {
      return await db.select().from(npcType).orderBy(npcType.name)
    }),

  // Create NPC type
  createNpcType: requirePerm('npc:write')
    .input(createNpcTypeSchema)
    .mutation(async ({ input }) => {
      const result = await db.insert(npcType).values(input).returning()
      return result[0]
    }),

  // Update NPC type
  updateNpcType: requirePerm('npc:write')
    .input(updateNpcTypeSchema)
    .mutation(async ({ input }) => {
      const { id, ...updateData } = input
      const result = await db.update(npcType)
        .set(updateData)
        .where(eq(npcType.id, id))
        .returning()
      
      if (result.length === 0) {
        throw new Error(`NPC Type with id ${id} not found`)
      }
      
      return result[0]
    }),

  // Delete NPC type
  deleteNpcType: requirePerm('npc:delete')
    .input(z.number())
    .mutation(async ({ input }) => {
      const result = await db.delete(npcType).where(eq(npcType.id, input)).returning()
      
      if (result.length === 0) {
        throw new Error(`NPC Type with id ${input} not found`)
      }
      
      return result[0]
    }),

  // ===== NPC POSITION CRUD =====
  
  // Update NPC position
  updatePosition: requirePerm('npc:write')
    .input(updateNpcPositionSchema)
    .mutation(async ({ input }) => {
      const { npcId, ...positionData } = input
      
      // Try to update existing position first
      const existing = await db.select().from(npcPosition).where(eq(npcPosition.npcId, npcId))
      
      if (existing.length > 0) {
        const updateFields: { x?: number; y?: number; z?: number; rotZ?: number } = {}
        if (positionData.x != null) updateFields.x = positionData.x
        if (positionData.y != null) updateFields.y = positionData.y
        if (positionData.z != null) updateFields.z = positionData.z
        if (positionData.rotZ != null) updateFields.rotZ = positionData.rotZ
        const result = await db.update(npcPosition)
          .set(updateFields)
          .where(eq(npcPosition.npcId, npcId))
          .returning()
        return result[0]
      } else {
        // Create new position if doesn't exist
        const result = await db.insert(npcPosition).values({
          ...input,
          x: input.x ?? 0,
          y: input.y ?? 0,
          z: input.z ?? 0,
        }).returning()
        return result[0]
      }
    }),

  // ===== ENTITY ATTRIBUTES CRUD =====
  
  // Get all entity attributes
  getEntityAttributes: requirePerm('npc:read')
    .query(async () => {
      return await db.select().from(entityAttributes).orderBy(entityAttributes.name)
    }),

  // Create entity attribute
  createEntityAttribute: requirePerm('npc:write')
    .input(createEntityAttributesSchema)
    .mutation(async ({ input }) => {
      const result = await db.insert(entityAttributes).values(input).returning()
      return result[0]
    }),

  // Update entity attribute
  updateEntityAttribute: requirePerm('npc:write')
    .input(updateEntityAttributesSchema)
    .mutation(async ({ input }) => {
      const { id, ...updateData } = input
      const result = await db.update(entityAttributes)
        .set(updateData)
        .where(eq(entityAttributes.id, id))
        .returning()
      
      if (result.length === 0) {
        throw new Error(`Entity Attribute with id ${id} not found`)
      }
      
      return result[0]
    }),

  // Delete entity attribute
  deleteEntityAttribute: requirePerm('npc:delete')
    .input(z.number())
    .mutation(async ({ input }) => {
      const result = await db.delete(entityAttributes).where(eq(entityAttributes.id, input)).returning()
      
      if (result.length === 0) {
        throw new Error(`Entity Attribute with id ${input} not found`)
      }
      
      return result[0]
    }),

  // ===== NPC ATTRIBUTES CRUD =====
  
  // Set NPC attribute value
  setNpcAttribute: requirePerm('npc:write')
    .input(createNpcAttributesSchema)
    .mutation(async ({ input }) => {
      // Try to update existing attribute first
      const existing = await db.select().from(npcAttributes)
        .where(and(
          eq(npcAttributes.npcId, input.npcId),
          eq(npcAttributes.attributeId, input.attributeId)
        ))
      
      if (existing.length > 0) {
        const result = await db.update(npcAttributes)
          .set({ value: input.value })
          .where(and(
            eq(npcAttributes.npcId, input.npcId),
            eq(npcAttributes.attributeId, input.attributeId)
          ))
          .returning()
        return result[0]
      } else {
        // Create new attribute if doesn't exist
        const result = await db.insert(npcAttributes).values(input).returning()
        return result[0]
      }
    }),

  // Remove NPC attribute
  removeNpcAttribute: requirePerm('npc:delete')
    .input(z.object({
      npcId: z.number(),
      attributeId: z.number(),
    }))
    .mutation(async ({ input }) => {
      const result = await db.delete(npcAttributes)
        .where(and(
          eq(npcAttributes.npcId, input.npcId),
          eq(npcAttributes.attributeId, input.attributeId)
        ))
        .returning()
      
      if (result.length === 0) {
        throw new Error(`NPC Attribute not found`)
      }
      
      return result[0]
    }),

  // ===== NPC SKILLS CRUD =====
  
  // Add or update NPC skill
  setNpcSkill: requirePerm('npc:write')
    .input(addNpcSkillSchema)
    .mutation(async ({ input }) => {
      // Try to update existing skill first
      const existing = await db.select().from(npcSkills)
        .where(and(
          eq(npcSkills.npcId, input.npcId),
          eq(npcSkills.skillId, input.skillId)
        ))
      
      if (existing.length > 0) {
        const result = await db.update(npcSkills)
          .set({ currentLevel: input.currentLevel })
          .where(and(
            eq(npcSkills.npcId, input.npcId),
            eq(npcSkills.skillId, input.skillId)
          ))
          .returning()
        return result[0]
      } else {
        // Create new skill if doesn't exist
        const result = await db.insert(npcSkills).values(input).returning()
        return result[0]
      }
    }),

  // Remove NPC skill
  removeNpcSkill: requirePerm('npc:delete')
    .input(removeNpcSkillSchema)
    .mutation(async ({ input }) => {
      const result = await db.delete(npcSkills)
        .where(and(
          eq(npcSkills.npcId, input.npcId),
          eq(npcSkills.skillId, input.skillId)
        ))
        .returning()
      
      if (result.length === 0) {
        throw new Error(`NPC Skill not found`)
      }
      
      return result[0]
    }),

  // Get all available skills for dropdown
  getAvailableSkills: requirePerm('npc:read')
    .query(async () => {
      return await db.select().from(skills).orderBy(skills.name)
    }),

  // ===== NPC DIALOGUES =====

  // Get all dialogues linked to an NPC
  getNpcDialogues: requirePerm('npc:read')
    .input(z.number())
    .query(async ({ input }) => {
      return await db.select({
        npcId: npcDialogue.npcId,
        dialogueId: npcDialogue.dialogueId,
        priority: npcDialogue.priority,
        conditionGroup: npcDialogue.conditionGroup,
        dialogueSlug: dialogue.slug,
        dialogueVersion: dialogue.version,
      }).from(npcDialogue)
        .leftJoin(dialogue, eq(npcDialogue.dialogueId, dialogue.id))
        .where(eq(npcDialogue.npcId, input))
    }),

  // Get all dialogues available for linking
  getAvailableDialogues: requirePerm('npc:read')
    .query(async () => {
      return await db.select().from(dialogue).orderBy(dialogue.slug)
    }),

  // Add dialogue to NPC
  addNpcDialogue: requirePerm('npc:write')
    .input(z.object({
      npcId: z.number(),
      dialogueId: z.number(),
      priority: z.number().min(0).default(0),
      conditionGroup: z.any().nullable().optional(),
    }))
    .mutation(async ({ input }) => {
      const result = await db
        .insert(npcDialogue)
        .values({
          ...input,
          conditionGroup: toJsonb(input.conditionGroup),
        })
        .returning()
      return result[0]
    }),

  // Update NPC dialogue priority / condition
  updateNpcDialogue: requirePerm('npc:write')
    .input(z.object({
      npcId: z.number(),
      dialogueId: z.number(),
      priority: z.number().min(0).optional(),
      conditionGroup: z.any().nullable().optional(),
    }))
    .mutation(async ({ input }) => {
      const { npcId, dialogueId, ...updateData } = input
      const result = await db
        .update(npcDialogue)
        .set({
          ...updateData,
          conditionGroup: toJsonb(updateData.conditionGroup),
        })
        .where(and(
          eq(npcDialogue.npcId, npcId),
          eq(npcDialogue.dialogueId, dialogueId),
        ))
        .returning()

      if (result.length === 0) {
        throw new Error('NPC Dialogue link not found')
      }

      return result[0]
    }),

  // Remove dialogue from NPC
  removeNpcDialogue: requirePerm('npc:delete')
    .input(z.object({
      npcId: z.number(),
      dialogueId: z.number(),
    }))
    .mutation(async ({ input }) => {
      const result = await db
        .delete(npcDialogue)
        .where(and(
          eq(npcDialogue.npcId, input.npcId),
          eq(npcDialogue.dialogueId, input.dialogueId),
        ))
        .returning()

      if (result.length === 0) {
        throw new Error('NPC Dialogue link not found')
      }

      return result[0]
    }),
})
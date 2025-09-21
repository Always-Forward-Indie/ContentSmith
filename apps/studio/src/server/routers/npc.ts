import { z } from 'zod'
import { createTRPCRouter, devRequirePermission } from '../trpc'
import { db } from '../db'
import { 
  npc, 
  race, 
  npcType, 
  npcPosition, 
  entityAttributes, 
  npcAttributes,
  skills,
  npcSkills
} from '@contentsmith/database'
import { like, or, desc, eq, and } from '@contentsmith/database'
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
  updateNpcAttributesSchema
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
      const conditions = []

      if (input.search) {
        conditions.push(
          or(
            like(npc.name, `%${input.search}%`),
            like(npc.slug, `%${input.search}%`)
          )
        )
      }

      if (input.raceId) {
        conditions.push(eq(npc.raceId, input.raceId))
      }

      if (input.npcType) {
        conditions.push(eq(npc.npcType, input.npcType))
      }

      if (input.level) {
        conditions.push(eq(npc.level, input.level))
      }

      if (input.isInteractable !== undefined) {
        conditions.push(eq(npc.isInteractable, input.isInteractable))
      }

      if (input.isDead !== undefined) {
        conditions.push(eq(npc.isDead, input.isDead))
      }

      const baseQuery = db.select({
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
        dialogueId: npc.dialogueId,
        questId: npc.questId,
        raceName: race.name,
        npcTypeName: npcType.name,
      }).from(npc)
        .leftJoin(race, eq(npc.raceId, race.id))
        .leftJoin(npcType, eq(npc.npcType, npcType.id))

      let npcs
      if (conditions.length > 0) {
        npcs = await baseQuery
          .where(and(...conditions))
          .orderBy(desc(npc.id))
          .limit(input.limit)
          .offset(input.offset)
      } else {
        npcs = await baseQuery
          .orderBy(desc(npc.id))
          .limit(input.limit)
          .offset(input.offset)
      }

      return npcs
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
        dialogueId: npc.dialogueId,
        questId: npc.questId,
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

      return {
        ...npcData,
        attributes,
        skills: npcSkillsData,
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
        const result = await db.update(npcPosition)
          .set(positionData)
          .where(eq(npcPosition.npcId, npcId))
          .returning()
        return result[0]
      } else {
        // Create new position if doesn't exist
        const result = await db.insert(npcPosition).values(input).returning()
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
})
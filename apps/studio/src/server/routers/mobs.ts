import { z } from 'zod'
import { createTRPCRouter, devRequirePermission } from '../trpc'
import { db } from '../db'
import {
  mob,
  mobRace,
  mobRanks,
  mobPosition,
  mobStat,
  mobSkills,
  mobLootInfo,
  mobResistances,
  mobWeaknesses,
  entityAttributes,
  skills,
  items,
} from '@contentsmith/database'
import { like, or, desc, eq, and, count, sql, gte, lte, asc } from '@contentsmith/database'
import {
  mobListQuerySchema,
  createMobSchema,
  updateMobSchema,
  createMobRaceSchema,
  updateMobRaceSchema,
  updateMobPositionSchema,
  createMobStatSchema,
  addMobSkillSchema,
  removeMobSkillSchema,
  addMobLootSchema,
  updateMobLootSchema,
  removeMobLootSchema,
} from '@contentsmith/validation'

const requirePerm = (permission: string) => devRequirePermission(permission)

export const mobsRouter = createTRPCRouter({
  // ===== MOB CRUD =====

  list: requirePerm('mob:read')
    .input(mobListQuerySchema)
    .query(async ({ input }) => {
      const { search, page, limit, raceId, rankId, minLevel, maxLevel, isAggressive, isDead, sortBy, sortOrder } = input
      const offset = (page - 1) * limit

      const conditions = []
      if (search) conditions.push(or(like(mob.name, `%${search}%`), like(mob.slug, `%${search}%`)))
      if (raceId)      conditions.push(eq(mob.raceId, raceId))
      if (rankId)      conditions.push(eq(mob.rankId, rankId))
      if (minLevel)    conditions.push(gte(mob.level, minLevel))
      if (maxLevel)    conditions.push(lte(mob.level, maxLevel))
      if (isAggressive !== undefined) conditions.push(eq(mob.isAggressive, isAggressive))
      if (isDead !== undefined)       conditions.push(eq(mob.isDead, isDead))

      const dir = sortOrder === 'asc' ? asc : desc
      const orderByClause = (
        sortBy === 'name'     ? dir(mob.name) :
        sortBy === 'level'    ? dir(mob.level) :
        sortBy === 'rankMult' ? dir(mobRanks.mult) :
        dir(mob.id)
      )

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined

      const [totalResult] = await db
        .select({ total: count() })
        .from(mob)
        .where(whereClause)
      const total = totalResult?.total ?? 0

      const mobs = await db
        .select({
          id: mob.id,
          name: mob.name,
          slug: mob.slug,
          level: mob.level,
          raceId: mob.raceId,
          rankId: mob.rankId,
          spawnHealth: mob.spawnHealth,
          spawnMana: mob.spawnMana,
          baseXp: mob.baseXp,
          isAggressive: mob.isAggressive,
          isDead: mob.isDead,
          radius: mob.radius,
          raceName: mobRace.name,
          rankCode: mobRanks.code,
          rankMult: mobRanks.mult,
          spawnZoneName: sql<string | null>`(SELECT sz.zone_name FROM spawn_zones sz JOIN spawn_zone_mobs szm ON szm.spawn_zone_id = sz.zone_id WHERE szm.mob_id = mob.id ORDER BY sz.zone_id LIMIT 1)`,
        })
        .from(mob)
        .leftJoin(mobRace, eq(mob.raceId, mobRace.id))
        .leftJoin(mobRanks, eq(mob.rankId, mobRanks.rankId))
        .where(whereClause)
        .orderBy(orderByClause)
        .limit(limit)
        .offset(offset)

      return {
        data: mobs,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      }
    }),

  getById: requirePerm('mob:read')
    .input(z.number())
    .query(async ({ input }) => {
      const result = await db
        .select({
          id: mob.id,
          name: mob.name,
          slug: mob.slug,
          level: mob.level,
          raceId: mob.raceId,
          rankId: mob.rankId,
          spawnHealth: mob.spawnHealth,
          spawnMana: mob.spawnMana,
          baseXp: mob.baseXp,
          isAggressive: mob.isAggressive,
          isDead: mob.isDead,
          radius: mob.radius,
          aggroRange: mob.aggroRange,
          attackRange: mob.attackRange,
          attackCooldown: mob.attackCooldown,
          chaseMultiplier: mob.chaseMultiplier,
          patrolSpeed: mob.patrolSpeed,
          isSocial: mob.isSocial,
          chaseDuration: mob.chaseDuration,
          fleeHpThreshold: mob.fleeHpThreshold,
          aiArchetype: mob.aiArchetype,
          canEvolve: mob.canEvolve,
          isRare: mob.isRare,
          rareSpawnChance: mob.rareSpawnChance,
          rareSpawnCondition: mob.rareSpawnCondition,
          factionSlug: mob.factionSlug,
          repDeltaPerKill: mob.repDeltaPerKill,
          biomeSlug: mob.biomeSlug,
          mobTypeSlug: mob.mobTypeSlug,
          raceName: mobRace.name,
          rankCode: mobRanks.code,
          rankMult: mobRanks.mult,
          positionX: mobPosition.x,
          positionY: mobPosition.y,
          positionZ: mobPosition.z,
        })
        .from(mob)
        .leftJoin(mobRace, eq(mob.raceId, mobRace.id))
        .leftJoin(mobRanks, eq(mob.rankId, mobRanks.rankId))
        .leftJoin(mobPosition, eq(mob.id, mobPosition.mobId))
        .where(eq(mob.id, input))

      if (result.length === 0) return null

      const mobData = result[0]

      const attributes = await db
        .select({
          id: mobStat.id,
          attributeId: mobStat.attributeId,
          flatValue: mobStat.flatValue,
          multiplier: mobStat.multiplier,
          exponent: mobStat.exponent,
          attributeName: entityAttributes.name,
          attributeSlug: entityAttributes.slug,
        })
        .from(mobStat)
        .leftJoin(entityAttributes, eq(mobStat.attributeId, entityAttributes.id))
        .where(eq(mobStat.mobId, input))

      const mobSkillsData = await db
        .select({
          id: mobSkills.id,
          skillId: mobSkills.skillId,
          currentLevel: mobSkills.currentLevel,
          skillName: skills.name,
          skillSlug: skills.slug,
        })
        .from(mobSkills)
        .leftJoin(skills, eq(mobSkills.skillId, skills.id))
        .where(eq(mobSkills.mobId, input))

      const lootData = await db
        .select({
          id: mobLootInfo.id,
          mobId: mobLootInfo.mobId,
          itemId: mobLootInfo.itemId,
          dropChance: mobLootInfo.dropChance,
          isHarvestOnly: mobLootInfo.isHarvestOnly,
          minQuantity: mobLootInfo.minQuantity,
          maxQuantity: mobLootInfo.maxQuantity,
          lootTier: mobLootInfo.lootTier,
          itemName: items.name,
          itemSlug: items.slug,
        })
        .from(mobLootInfo)
        .leftJoin(items, eq(mobLootInfo.itemId, items.id))
        .where(eq(mobLootInfo.mobId, input))

      const resistancesData = await db
        .select({ elementSlug: mobResistances.elementSlug })
        .from(mobResistances)
        .where(eq(mobResistances.mobId, input))

      const weaknessesData = await db
        .select({ elementSlug: mobWeaknesses.elementSlug })
        .from(mobWeaknesses)
        .where(eq(mobWeaknesses.mobId, input))

      return {
        ...mobData,
        canEvolve: mobData.canEvolve,
        isRare: mobData.isRare,
        rareSpawnChance: mobData.rareSpawnChance,
        rareSpawnCondition: mobData.rareSpawnCondition,
        factionSlug: mobData.factionSlug,
        repDeltaPerKill: mobData.repDeltaPerKill,
        biomeSlug: mobData.biomeSlug,
        mobTypeSlug: mobData.mobTypeSlug,
        attributes,
        skills: mobSkillsData,
        loot: lootData,
        resistances: resistancesData.map(r => r.elementSlug),
        weaknesses: weaknessesData.map(w => w.elementSlug),
      }
    }),

  create: requirePerm('mob:write')
    .input(createMobSchema)
    .mutation(async ({ input }) => {
      const result = await db.insert(mob).values(input).returning()
      return result[0]
    }),

  update: requirePerm('mob:write')
    .input(updateMobSchema)
    .mutation(async ({ input }) => {
      const { id, ...updateData } = input
      const result = await db
        .update(mob)
        .set(updateData)
        .where(eq(mob.id, id))
        .returning()
      if (result.length === 0) throw new Error(`Mob with id ${id} not found`)
      return result[0]
    }),

  delete: requirePerm('mob:delete')
    .input(z.number())
    .mutation(async ({ input }) => {
      const result = await db.delete(mob).where(eq(mob.id, input)).returning()
      if (result.length === 0) throw new Error(`Mob with id ${input} not found`)
      return result[0]
    }),

  // ===== MOB RACES =====

  getMobRaces: requirePerm('mob:read')
    .query(async () => {
      return await db.select().from(mobRace).orderBy(mobRace.name)
    }),

  createMobRace: requirePerm('mob:write')
    .input(createMobRaceSchema)
    .mutation(async ({ input }) => {
      const result = await db.insert(mobRace).values(input).returning()
      return result[0]
    }),

  updateMobRace: requirePerm('mob:write')
    .input(updateMobRaceSchema)
    .mutation(async ({ input }) => {
      const { id, ...updateData } = input
      const result = await db.update(mobRace).set(updateData).where(eq(mobRace.id, id)).returning()
      if (result.length === 0) throw new Error(`Mob Race with id ${id} not found`)
      return result[0]
    }),

  deleteMobRace: requirePerm('mob:delete')
    .input(z.number())
    .mutation(async ({ input }) => {
      const result = await db.delete(mobRace).where(eq(mobRace.id, input)).returning()
      if (result.length === 0) throw new Error(`Mob Race with id ${input} not found`)
      return result[0]
    }),

  // ===== MOB RANKS (read-only from game DB perspective) =====

  getMobRanks: requirePerm('mob:read')
    .query(async () => {
      return await db.select().from(mobRanks).orderBy(mobRanks.rankId)
    }),

  // ===== MOB POSITION =====

  updatePosition: requirePerm('mob:write')
    .input(updateMobPositionSchema)
    .mutation(async ({ input }) => {
      const { mobId, ...positionData } = input
      const existing = await db.select().from(mobPosition).where(eq(mobPosition.mobId, mobId))

      if (existing.length > 0) {
        const updateFields: Partial<{ x: number; y: number; z: number }> = {}
        if (positionData.x != null) updateFields.x = positionData.x
        if (positionData.y != null) updateFields.y = positionData.y
        if (positionData.z != null) updateFields.z = positionData.z
        const result = await db
          .update(mobPosition)
          .set(updateFields)
          .where(eq(mobPosition.mobId, mobId))
          .returning()
        return result[0]
      } else {
        const result = await db
          .insert(mobPosition)
          .values({ mobId, x: input.x ?? 0, y: input.y ?? 0, z: input.z ?? 0 })
          .returning()
        return result[0]
      }
    }),

  deletePosition: requirePerm('mob:delete')
    .input(z.object({ mobId: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      await db.delete(mobPosition).where(eq(mobPosition.mobId, input.mobId))
      return { success: true }
    }),

  deletePosition: requirePerm('mob:delete')
    .input(z.object({ mobId: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      await db.delete(mobPosition).where(eq(mobPosition.mobId, input.mobId))
      return { success: true }
    }),

  // ===== MOB STAT (attributes with formula) =====

  setMobAttribute: requirePerm('mob:write')
    .input(createMobStatSchema)
    .mutation(async ({ input }) => {
      const existing = await db
        .select()
        .from(mobStat)
        .where(and(eq(mobStat.mobId, input.mobId), eq(mobStat.attributeId, input.attributeId)))

      if (existing.length > 0) {
        const result = await db
          .update(mobStat)
          .set({ flatValue: input.flatValue, multiplier: input.multiplier ?? null, exponent: input.exponent ?? null })
          .where(and(eq(mobStat.mobId, input.mobId), eq(mobStat.attributeId, input.attributeId)))
          .returning()
        return result[0]
      } else {
        const result = await db.insert(mobStat).values(input).returning()
        return result[0]
      }
    }),

  removeMobAttribute: requirePerm('mob:delete')
    .input(z.object({ mobId: z.number(), attributeId: z.number() }))
    .mutation(async ({ input }) => {
      const result = await db
        .delete(mobStat)
        .where(and(eq(mobStat.mobId, input.mobId), eq(mobStat.attributeId, input.attributeId)))
        .returning()
      if (result.length === 0) throw new Error('Mob Stat not found')
      return result[0]
    }),

  getEntityAttributes: requirePerm('mob:read')
    .query(async () => {
      return await db.select().from(entityAttributes).orderBy(entityAttributes.name)
    }),

  // ===== MOB SKILLS =====

  setMobSkill: requirePerm('mob:write')
    .input(addMobSkillSchema)
    .mutation(async ({ input }) => {
      const existing = await db
        .select()
        .from(mobSkills)
        .where(and(eq(mobSkills.mobId, input.mobId), eq(mobSkills.skillId, input.skillId)))

      if (existing.length > 0) {
        const result = await db
          .update(mobSkills)
          .set({ currentLevel: input.currentLevel })
          .where(and(eq(mobSkills.mobId, input.mobId), eq(mobSkills.skillId, input.skillId)))
          .returning()
        return result[0]
      } else {
        const result = await db.insert(mobSkills).values(input).returning()
        return result[0]
      }
    }),

  removeMobSkill: requirePerm('mob:delete')
    .input(removeMobSkillSchema)
    .mutation(async ({ input }) => {
      const result = await db
        .delete(mobSkills)
        .where(and(eq(mobSkills.mobId, input.mobId), eq(mobSkills.skillId, input.skillId)))
        .returning()
      if (result.length === 0) throw new Error('Mob Skill not found')
      return result[0]
    }),

  getAvailableSkills: requirePerm('mob:read')
    .query(async () => {
      return await db.select().from(skills).orderBy(skills.name)
    }),

  // ===== MOB LOOT (mob_loot_info) =====

  getLoot: requirePerm('mob:read')
    .input(z.number())
    .query(async ({ input }) => {
      return await db
        .select({
          id: mobLootInfo.id,
          mobId: mobLootInfo.mobId,
          itemId: mobLootInfo.itemId,
          dropChance: mobLootInfo.dropChance,
          isHarvestOnly: mobLootInfo.isHarvestOnly,
          minQuantity: mobLootInfo.minQuantity,
          maxQuantity: mobLootInfo.maxQuantity,
          itemName: items.name,
          itemSlug: items.slug,
        })
        .from(mobLootInfo)
        .leftJoin(items, eq(mobLootInfo.itemId, items.id))
        .where(eq(mobLootInfo.mobId, input))
    }),

  addLoot: requirePerm('mob:write')
    .input(addMobLootSchema)
    .mutation(async ({ input }) => {
      const result = await db.insert(mobLootInfo).values(input).returning()
      return result[0]
    }),

  updateLoot: requirePerm('mob:write')
    .input(updateMobLootSchema)
    .mutation(async ({ input }) => {
      const { id, ...updateData } = input
      const result = await db.update(mobLootInfo).set(updateData).where(eq(mobLootInfo.id, id)).returning()
      if (result.length === 0) throw new Error(`Mob Loot entry with id ${id} not found`)
      return result[0]
    }),

  removeLoot: requirePerm('mob:delete')
    .input(removeMobLootSchema)
    .mutation(async ({ input }) => {
      const result = await db
        .delete(mobLootInfo)
        .where(and(eq(mobLootInfo.mobId, input.mobId), eq(mobLootInfo.itemId, input.itemId)))
        .returning()
      if (result.length === 0) throw new Error('Mob Loot entry not found')
      return result[0]
    }),

  getAvailableItems: requirePerm('mob:read')
    .query(async () => {
      return await db
        .select({ id: items.id, name: items.name, slug: items.slug })
        .from(items)
        .orderBy(items.name)
    }),

  // ===== MOB RESISTANCES =====

  getResistances: requirePerm('mob:read')
    .input(z.number())
    .query(async ({ input }) => {
      return await db.select().from(mobResistances).where(eq(mobResistances.mobId, input))
    }),

  addResistance: requirePerm('mob:write')
    .input(z.object({ mobId: z.number().int().positive(), elementSlug: z.string().min(1).max(64) }))
    .mutation(async ({ input }) => {
      await db.insert(mobResistances).values(input).onConflictDoNothing()
      return { success: true }
    }),

  removeResistance: requirePerm('mob:delete')
    .input(z.object({ mobId: z.number().int().positive(), elementSlug: z.string() }))
    .mutation(async ({ input }) => {
      await db.delete(mobResistances)
        .where(and(eq(mobResistances.mobId, input.mobId), eq(mobResistances.elementSlug, input.elementSlug)))
      return { success: true }
    }),

  // ===== MOB WEAKNESSES =====

  getWeaknesses: requirePerm('mob:read')
    .input(z.number())
    .query(async ({ input }) => {
      return await db.select().from(mobWeaknesses).where(eq(mobWeaknesses.mobId, input))
    }),

  addWeakness: requirePerm('mob:write')
    .input(z.object({ mobId: z.number().int().positive(), elementSlug: z.string().min(1).max(64) }))
    .mutation(async ({ input }) => {
      await db.insert(mobWeaknesses).values(input).onConflictDoNothing()
      return { success: true }
    }),

  removeWeakness: requirePerm('mob:delete')
    .input(z.object({ mobId: z.number().int().positive(), elementSlug: z.string() }))
    .mutation(async ({ input }) => {
      await db.delete(mobWeaknesses)
        .where(and(eq(mobWeaknesses.mobId, input.mobId), eq(mobWeaknesses.elementSlug, input.elementSlug)))
      return { success: true }
    }),
})

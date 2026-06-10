import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../trpc';
import { db } from '../db';
import {
  skills,
  skillSchool,
  skillScaleType,
  passiveSkillModifiers,
  skillProperties,
  skillPropertiesMapping,
  targetType,
  skillDamageFormulas,
  skillDamageTypes,
  skillEffectInstances,
  skillEffectsMapping,
  entityAttributes,
} from '@contentsmith/database';
import { and, eq, like, count, asc, inArray } from '@contentsmith/database';
import {
  skillListQuerySchema,
  skillIdSchema,
  createSkillSchema,
  updateSkillSchema,
  createSkillPropertyMappingSchema,
  createSkillEffectInstanceSchema,
  updateSkillEffectInstanceSchema,
  createSkillEffectMappingSchema,
} from '@contentsmith/validation';

export const skillsRouter = createTRPCRouter({
  // Получить список скилов с поиском и фильтрацией
  list: publicProcedure
    .input(skillListQuerySchema)
    .query(async ({ input }) => {
      const { search, schoolId, scaleStatId, page, limit } = input;
      const offset = (page - 1) * limit;

      const conditions = [];
      if (search) conditions.push(like(skills.name, `%${search}%`));
      if (schoolId) conditions.push(eq(skills.schoolId, schoolId));
      if (scaleStatId) conditions.push(eq(skills.scaleStatId, scaleStatId));
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const [totalResult] = await db
        .select({ total: count() })
        .from(skills)
        .where(whereClause);
      const total = totalResult?.total ?? 0;

      const skillsList = await db
        .select({
          id: skills.id,
          name: skills.name,
          slug: skills.slug,
          scaleStatId: skills.scaleStatId,
          schoolId: skills.schoolId,
          skillSchool: { id: skillSchool.id, name: skillSchool.name, slug: skillSchool.slug },
          skillScaleType: { id: skillScaleType.id, name: skillScaleType.name, slug: skillScaleType.slug },
        })
        .from(skills)
        .leftJoin(skillSchool, eq(skills.schoolId, skillSchool.id))
        .leftJoin(skillScaleType, eq(skills.scaleStatId, skillScaleType.id))
        .where(whereClause)
        .orderBy(skills.name)
        .limit(limit)
        .offset(offset);

      return {
        data: skillsList,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      };
    }),

  // Получить скил по slug
  getBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      const [result] = await db
        .select({ id: skills.id, name: skills.name, slug: skills.slug })
        .from(skills)
        .where(eq(skills.slug, input.slug))
        .limit(1);
      return result ?? null;
    }),

  // Получить скил по ID
  getById: publicProcedure
    .input(skillIdSchema)
    .query(async ({ input }) => {
      const { id } = input;

      const skill = await db
        .select({
          id: skills.id,
          name: skills.name,
          slug: skills.slug,
          scaleStatId: skills.scaleStatId,
          schoolId: skills.schoolId,
          isPassive: skills.isPassive,
          animationName: skills.animationName,
          skillSchool: {
            id: skillSchool.id,
            name: skillSchool.name,
            slug: skillSchool.slug,
          },
          skillScaleType: {
            id: skillScaleType.id,
            name: skillScaleType.name,
            slug: skillScaleType.slug,
          },
        })
        .from(skills)
        .leftJoin(skillSchool, eq(skills.schoolId, skillSchool.id))
        .leftJoin(skillScaleType, eq(skills.scaleStatId, skillScaleType.id))
        .where(eq(skills.id, id))
        .limit(1);

      if (!skill.length) {
        throw new Error('Skill not found');
      }

      return skill[0];
    }),

  // Создать новый скил
  create: publicProcedure
    .input(createSkillSchema)
    .mutation(async ({ input }) => {
      const result = await db
        .insert(skills)
        .values(input)
        .returning();

      return result[0];
    }),

  // Обновить скил
  update: publicProcedure
    .input(updateSkillSchema.extend({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const { id, ...updateData } = input;

      const result = await db
        .update(skills)
        .set(updateData)
        .where(eq(skills.id, id))
        .returning();

      if (!result.length) {
        throw new Error('Skill not found');
      }

      return result[0];
    }),

  // Удалить скил
  delete: publicProcedure
    .input(skillIdSchema)
    .mutation(async ({ input }) => {
      const { id } = input;

      const result = await db
        .delete(skills)
        .where(eq(skills.id, id))
        .returning();

      if (!result.length) {
        throw new Error('Skill not found');
      }

      return { success: true, deletedId: id };
    }),

  // Получить список школ скилов для селектов
  getSchools: publicProcedure
    .query(async () => {
      return await db
        .select({
          id: skillSchool.id,
          name: skillSchool.name,
          slug: skillSchool.slug,
        })
        .from(skillSchool)
        .orderBy(skillSchool.name);
    }),

  // Получить список типов масштабирования для селектов
  getScaleTypes: publicProcedure
    .query(async () => {
      return await db
        .select({
          id: skillScaleType.id,
          name: skillScaleType.name,
          slug: skillScaleType.slug,
        })
        .from(skillScaleType)
        .orderBy(skillScaleType.name);
    }),

  // ===== PASSIVE SKILL MODIFIERS =====

  getPassiveModifiers: publicProcedure
    .input(z.number().int().positive())
    .query(async ({ input }) => {
      return await db.select().from(passiveSkillModifiers).where(eq(passiveSkillModifiers.skillId, input))
    }),

  addPassiveModifier: publicProcedure
    .input(z.object({
      skillId: z.number().int().positive(),
      attributeSlug: z.string().min(1),
      modifierType: z.string().default('flat'),
      value: z.number(),
    }))
    .mutation(async ({ input }) => {
      const [result] = await db.insert(passiveSkillModifiers).values({ ...input, value: String(input.value) }).returning()
      return result
    }),

  updatePassiveModifier: publicProcedure
    .input(z.object({
      id: z.number().int().positive(),
      attributeSlug: z.string().optional(),
      modifierType: z.string().optional(),
      value: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, value, ...data } = input
      const updateData = value !== undefined ? { ...data, value: String(value) } : data
      const [result] = await db.update(passiveSkillModifiers).set(updateData).where(eq(passiveSkillModifiers.id, id)).returning()
      if (!result) throw new Error('Passive modifier not found')
      return result
    }),

  removePassiveModifier: publicProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      await db.delete(passiveSkillModifiers).where(eq(passiveSkillModifiers.id, input.id))
      return { success: true }
    }),

  // ===== LOOKUP DATA FOR EDITOR =====

  getProperties: publicProcedure
    .query(async () => {
      return await db.select().from(skillProperties).orderBy(skillProperties.id)
    }),

  getTargetTypes: publicProcedure
    .query(async () => {
      return await db.select().from(targetType).orderBy(targetType.id)
    }),

  getDamageFormulas: publicProcedure
    .query(async () => {
      return await db
        .select({
          id: skillDamageFormulas.id,
          slug: skillDamageFormulas.slug,
          effectTypeId: skillDamageFormulas.effectTypeId,
          effectTypeSlug: skillDamageTypes.slug,
        })
        .from(skillDamageFormulas)
        .leftJoin(skillDamageTypes, eq(skillDamageFormulas.effectTypeId, skillDamageTypes.id))
        .orderBy(skillDamageFormulas.id)
    }),

  getEntityAttributes: publicProcedure
    .query(async () => {
      return await db.select().from(entityAttributes).orderBy(entityAttributes.id)
    }),

  // ===== SKILL PROPERTY MAPPINGS =====

  getPropertyMappings: publicProcedure
    .input(z.number().int().positive())
    .query(async ({ input: skillId }) => {
      return await db
        .select({
          id: skillPropertiesMapping.id,
          skillId: skillPropertiesMapping.skillId,
          skillLevel: skillPropertiesMapping.skillLevel,
          propertyId: skillPropertiesMapping.propertyId,
          propertyValue: skillPropertiesMapping.propertyValue,
          propertySlug: skillProperties.slug,
          propertyName: skillProperties.name,
        })
        .from(skillPropertiesMapping)
        .leftJoin(skillProperties, eq(skillPropertiesMapping.propertyId, skillProperties.id))
        .where(eq(skillPropertiesMapping.skillId, skillId))
        .orderBy(skillPropertiesMapping.skillLevel, asc(skillPropertiesMapping.propertyId))
    }),

  upsertPropertyMapping: publicProcedure
    .input(createSkillPropertyMappingSchema)
    .mutation(async ({ input }) => {
      const existing = await db
        .select()
        .from(skillPropertiesMapping)
        .where(
          and(
            eq(skillPropertiesMapping.skillId, input.skillId),
            eq(skillPropertiesMapping.skillLevel, input.skillLevel),
            eq(skillPropertiesMapping.propertyId, input.propertyId),
          ),
        )
        .limit(1)

      if (existing.length > 0) {
        const [result] = await db
          .update(skillPropertiesMapping)
          .set({ propertyValue: input.propertyValue })
          .where(eq(skillPropertiesMapping.id, existing[0].id))
          .returning()
        return result
      }

      const [result] = await db
        .insert(skillPropertiesMapping)
        .values(input)
        .returning()
      return result
    }),

  deletePropertyMapping: publicProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      await db.delete(skillPropertiesMapping).where(eq(skillPropertiesMapping.id, input.id))
      return { success: true }
    }),

  // ===== SKILL EFFECT INSTANCES =====

  getEffectInstances: publicProcedure
    .input(z.number().int().positive())
    .query(async ({ input: skillId }) => {
      const instances = await db
        .select({
          id: skillEffectInstances.id,
          skillId: skillEffectInstances.skillId,
          orderIdx: skillEffectInstances.orderIdx,
          targetTypeId: skillEffectInstances.targetTypeId,
          targetTypeSlug: targetType.slug,
        })
        .from(skillEffectInstances)
        .leftJoin(targetType, eq(skillEffectInstances.targetTypeId, targetType.id))
        .where(eq(skillEffectInstances.skillId, skillId))
        .orderBy(skillEffectInstances.orderIdx)

      if (instances.length === 0) return []

      const instanceIds = instances.map((i) => i.id)
      const mappings = await db
        .select({
          id: skillEffectsMapping.id,
          effectInstanceId: skillEffectsMapping.effectInstanceId,
          effectId: skillEffectsMapping.effectId,
          value: skillEffectsMapping.value,
          level: skillEffectsMapping.level,
          tickMs: skillEffectsMapping.tickMs,
          durationMs: skillEffectsMapping.durationMs,
          attributeId: skillEffectsMapping.attributeId,
          formulaSlug: skillDamageFormulas.slug,
          attributeSlug: entityAttributes.slug,
        })
        .from(skillEffectsMapping)
        .leftJoin(skillDamageFormulas, eq(skillEffectsMapping.effectId, skillDamageFormulas.id))
        .leftJoin(entityAttributes, eq(skillEffectsMapping.attributeId, entityAttributes.id))
        .where(inArray(skillEffectsMapping.effectInstanceId, instanceIds))
        .orderBy(skillEffectsMapping.level, asc(skillEffectsMapping.effectId))

      return instances.map((inst) => ({
        ...inst,
        mappings: mappings.filter((m) => m.effectInstanceId === inst.id),
      }))
    }),

  createEffectInstance: publicProcedure
    .input(createSkillEffectInstanceSchema)
    .mutation(async ({ input }) => {
      const [result] = await db
        .insert(skillEffectInstances)
        .values(input)
        .returning()
      return result
    }),

  updateEffectInstance: publicProcedure
    .input(updateSkillEffectInstanceSchema)
    .mutation(async ({ input }) => {
      const { id, ...data } = input
      const [result] = await db
        .update(skillEffectInstances)
        .set(data)
        .where(eq(skillEffectInstances.id, id))
        .returning()
      if (!result) throw new Error('Effect instance not found')
      return result
    }),

  deleteEffectInstance: publicProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      await db.delete(skillEffectsMapping).where(eq(skillEffectsMapping.effectInstanceId, input.id))
      await db.delete(skillEffectInstances).where(eq(skillEffectInstances.id, input.id))
      return { success: true }
    }),

  // ===== SKILL EFFECT MAPPINGS =====

  upsertEffectMapping: publicProcedure
    .input(createSkillEffectMappingSchema)
    .mutation(async ({ input }) => {
      const existing = await db
        .select()
        .from(skillEffectsMapping)
        .where(
          and(
            eq(skillEffectsMapping.effectInstanceId, input.effectInstanceId),
            eq(skillEffectsMapping.level, input.level),
            eq(skillEffectsMapping.effectId, input.effectId),
          ),
        )
        .limit(1)

      const values = {
        effectInstanceId: input.effectInstanceId,
        effectId: input.effectId,
        value: input.value,
        level: input.level,
        tickMs: input.tickMs,
        durationMs: input.durationMs,
        attributeId: input.attributeId ?? null,
      }

      if (existing.length > 0) {
        const [result] = await db
          .update(skillEffectsMapping)
          .set(values)
          .where(eq(skillEffectsMapping.id, existing[0].id))
          .returning()
        return result
      }

      const [result] = await db
        .insert(skillEffectsMapping)
        .values(values)
        .returning()
      return result
    }),

  deleteEffectMapping: publicProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      await db.delete(skillEffectsMapping).where(eq(skillEffectsMapping.id, input.id))
      return { success: true }
    }),
});
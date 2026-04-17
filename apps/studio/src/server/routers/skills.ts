import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../trpc';
import { db } from '../db';
import { skills, skillSchool, skillScaleType, passiveSkillModifiers } from '@contentsmith/database';
import { and, eq, like, count } from '@contentsmith/database';
import {
  skillListQuerySchema,
  skillIdSchema,
  createSkillSchema,
  updateSkillSchema,
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
});
import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../trpc';
import { db } from '../db';
import { skillEffectsType } from '@contentsmith/database';
import { and, eq, like } from '@contentsmith/database';
import {
  skillEffectsTypeSchema,
  createSkillEffectsTypeSchema,
  updateSkillEffectsTypeSchema,
} from '@contentsmith/validation';

// Создаем схемы для запросов (которых нет в skills.ts)
const skillEffectsTypeListQuerySchema = z.object({
  search: z.string().optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(10),
});

const skillEffectsTypeIdSchema = z.object({
  id: z.number().int().positive('Invalid skill effects type ID'),
});

export const skillEffectsTypeRouter = createTRPCRouter({
  // Получить список типов эффектов с поиском
  list: publicProcedure
    .input(skillEffectsTypeListQuerySchema)
    .query(async ({ input }) => {
      const { search } = input;

      // Создаем условия для WHERE
      const conditions = [];
      
      if (search) {
        conditions.push(like(skillEffectsType.slug, `%${search}%`));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Получаем типы эффектов навыков
      const skillEffectsTypes = await db
        .select({
          id: skillEffectsType.id,
          slug: skillEffectsType.slug,
        })
        .from(skillEffectsType)
        .where(whereClause)
        .orderBy(skillEffectsType.slug);

      return skillEffectsTypes;
    }),

  // Получить тип эффекта по ID
  getById: publicProcedure
    .input(skillEffectsTypeIdSchema)
    .query(async ({ input }) => {
      const { id } = input;

      const skillEffectsTypeRecord = await db
        .select({
          id: skillEffectsType.id,
          slug: skillEffectsType.slug,
        })
        .from(skillEffectsType)
        .where(eq(skillEffectsType.id, id))
        .limit(1);

      if (!skillEffectsTypeRecord.length) {
        throw new Error('Skill effects type not found');
      }

      return skillEffectsTypeRecord[0];
    }),

  // Создать новый тип эффекта
  create: publicProcedure
    .input(createSkillEffectsTypeSchema)
    .mutation(async ({ input }) => {
      const result = await db
        .insert(skillEffectsType)
        .values(input)
        .returning();

      return result[0];
    }),

  // Обновить тип эффекта
  update: publicProcedure
    .input(updateSkillEffectsTypeSchema.extend({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const { id, ...updateData } = input;

      const result = await db
        .update(skillEffectsType)
        .set(updateData)
        .where(eq(skillEffectsType.id, id))
        .returning();

      if (!result.length) {
        throw new Error('Skill effects type not found');
      }

      return result[0];
    }),

  // Удалить тип эффекта
  delete: publicProcedure
    .input(skillEffectsTypeIdSchema)
    .mutation(async ({ input }) => {
      const { id } = input;

      const result = await db
        .delete(skillEffectsType)
        .where(eq(skillEffectsType.id, id))
        .returning();

      if (!result.length) {
        throw new Error('Skill effects type not found');
      }

      return { success: true, deletedId: id };
    }),
});
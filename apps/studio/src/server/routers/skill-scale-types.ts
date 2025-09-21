import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../trpc';
import { db } from '../db';
import { skillScaleType } from '@contentsmith/database';
import { and, eq, like } from '@contentsmith/database';
import {
  skillScaleTypeListQuerySchema,
  skillScaleTypeIdSchema,
  createSkillScaleTypeSchema,
  updateSkillScaleTypeSchema,
} from '@contentsmith/validation/src/skill-scale-types';

export const skillScaleTypesRouter = createTRPCRouter({
  // Получить список типов масштабирования с поиском
  list: publicProcedure
    .input(skillScaleTypeListQuerySchema)
    .query(async ({ input }) => {
      const { search } = input;

      // Создаем условия для WHERE
      const conditions = [];
      
      if (search) {
        conditions.push(like(skillScaleType.name, `%${search}%`));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Получаем типы масштабирования
      const skillScaleTypes = await db
        .select({
          id: skillScaleType.id,
          name: skillScaleType.name,
          slug: skillScaleType.slug,
        })
        .from(skillScaleType)
        .where(whereClause)
        .orderBy(skillScaleType.name);

      return skillScaleTypes;
    }),

  // Получить тип масштабирования по ID
  getById: publicProcedure
    .input(skillScaleTypeIdSchema)
    .query(async ({ input }) => {
      const { id } = input;

      const skillScaleTypeRecord = await db
        .select({
          id: skillScaleType.id,
          name: skillScaleType.name,
          slug: skillScaleType.slug,
        })
        .from(skillScaleType)
        .where(eq(skillScaleType.id, id))
        .limit(1);

      if (!skillScaleTypeRecord.length) {
        throw new Error('Skill scale type not found');
      }

      return skillScaleTypeRecord[0];
    }),

  // Создать новый тип масштабирования
  create: publicProcedure
    .input(createSkillScaleTypeSchema)
    .mutation(async ({ input }) => {
      const result = await db
        .insert(skillScaleType)
        .values(input)
        .returning();

      return result[0];
    }),

  // Обновить тип масштабирования
  update: publicProcedure
    .input(updateSkillScaleTypeSchema.extend({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const { id, ...updateData } = input;

      const result = await db
        .update(skillScaleType)
        .set(updateData)
        .where(eq(skillScaleType.id, id))
        .returning();

      if (!result.length) {
        throw new Error('Skill scale type not found');
      }

      return result[0];
    }),

  // Удалить тип масштабирования
  delete: publicProcedure
    .input(skillScaleTypeIdSchema)
    .mutation(async ({ input }) => {
      const { id } = input;

      const result = await db
        .delete(skillScaleType)
        .where(eq(skillScaleType.id, id))
        .returning();

      if (!result.length) {
        throw new Error('Skill scale type not found');
      }

      return { success: true, deletedId: id };
    }),
});
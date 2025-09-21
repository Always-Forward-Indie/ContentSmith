import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../trpc';
import { db } from '../db';
import { skillProperties } from '@contentsmith/database';
import { and, eq, like } from '@contentsmith/database';
import {
  skillPropertyTypeListQuerySchema,
  skillPropertyTypeIdSchema,
  createSkillPropertyTypeSchema,
  updateSkillPropertyTypeSchema,
} from '@contentsmith/validation/src/skill-properties';

export const skillPropertiesRouter = createTRPCRouter({
  // Получить список типов свойств с поиском
  list: publicProcedure
    .input(skillPropertyTypeListQuerySchema)
    .query(async ({ input }) => {
      const { search } = input;

      // Создаем условия для WHERE
      const conditions = [];
      
      if (search) {
        conditions.push(like(skillProperties.name, `%${search}%`));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Получаем типы свойств навыков
      const skillPropertyTypes = await db
        .select({
          id: skillProperties.id,
          name: skillProperties.name,
          slug: skillProperties.slug,
        })
        .from(skillProperties)
        .where(whereClause)
        .orderBy(skillProperties.name);

      return skillPropertyTypes;
    }),

  // Получить тип свойства по ID
  getById: publicProcedure
    .input(skillPropertyTypeIdSchema)
    .query(async ({ input }) => {
      const { id } = input;

      const skillPropertyType = await db
        .select({
          id: skillProperties.id,
          name: skillProperties.name,
          slug: skillProperties.slug,
        })
        .from(skillProperties)
        .where(eq(skillProperties.id, id))
        .limit(1);

      if (!skillPropertyType.length) {
        throw new Error('Skill property type not found');
      }

      return skillPropertyType[0];
    }),

  // Создать новый тип свойства
  create: publicProcedure
    .input(createSkillPropertyTypeSchema)
    .mutation(async ({ input }) => {
      const result = await db
        .insert(skillProperties)
        .values(input)
        .returning();

      return result[0];
    }),

  // Обновить тип свойства
  update: publicProcedure
    .input(updateSkillPropertyTypeSchema.extend({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const { id, ...updateData } = input;

      const result = await db
        .update(skillProperties)
        .set(updateData)
        .where(eq(skillProperties.id, id))
        .returning();

      if (!result.length) {
        throw new Error('Skill property type not found');
      }

      return result[0];
    }),

  // Удалить тип свойства
  delete: publicProcedure
    .input(skillPropertyTypeIdSchema)
    .mutation(async ({ input }) => {
      const { id } = input;

      const result = await db
        .delete(skillProperties)
        .where(eq(skillProperties.id, id))
        .returning();

      if (!result.length) {
        throw new Error('Skill property type not found');
      }

      return { success: true, deletedId: id };
    }),
});
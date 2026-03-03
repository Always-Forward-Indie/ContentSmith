import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../trpc';
import { db } from '../db';
import { skillSchool } from '@contentsmith/database';
import { and, eq, like, count } from '@contentsmith/database';
import {
  skillSchoolListQuerySchema,
  skillSchoolIdSchema,
  createSkillSchoolSchema,
  updateSkillSchoolSchema,
} from '@contentsmith/validation';

export const skillSchoolsRouter = createTRPCRouter({
  // Получить список школ скилов с поиском
  list: publicProcedure
    .input(skillSchoolListQuerySchema)
    .query(async ({ input }) => {
      const { search, page, pageSize } = input;
      const offset = (page - 1) * pageSize;

      const conditions = [];
      if (search) conditions.push(like(skillSchool.name, `%${search}%`));
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const [totalResult] = await db
        .select({ total: count() })
        .from(skillSchool)
        .where(whereClause);
      const total = totalResult?.total ?? 0;

      const skillSchools = await db
        .select({ id: skillSchool.id, name: skillSchool.name, slug: skillSchool.slug })
        .from(skillSchool)
        .where(whereClause)
        .orderBy(skillSchool.name)
        .limit(pageSize)
        .offset(offset);

      return {
        data: skillSchools,
        pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
      };
    }),

  // Получить школу скилов по ID
  getById: publicProcedure
    .input(skillSchoolIdSchema)
    .query(async ({ input }) => {
      const { id } = input;

      const skillSchoolRecord = await db
        .select({
          id: skillSchool.id,
          name: skillSchool.name,
          slug: skillSchool.slug,
        })
        .from(skillSchool)
        .where(eq(skillSchool.id, id))
        .limit(1);

      if (!skillSchoolRecord.length) {
        throw new Error('Skill school not found');
      }

      return skillSchoolRecord[0];
    }),

  // Создать новую школу скилов
  create: publicProcedure
    .input(createSkillSchoolSchema)
    .mutation(async ({ input }) => {
      const result = await db
        .insert(skillSchool)
        .values(input)
        .returning();

      return result[0];
    }),

  // Обновить школу скилов
  update: publicProcedure
    .input(updateSkillSchoolSchema.extend({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const { id, ...updateData } = input;

      const result = await db
        .update(skillSchool)
        .set(updateData)
        .where(eq(skillSchool.id, id))
        .returning();

      if (!result.length) {
        throw new Error('Skill school not found');
      }

      return result[0];
    }),

  // Удалить школу скилов
  delete: publicProcedure
    .input(skillSchoolIdSchema)
    .mutation(async ({ input }) => {
      const { id } = input;

      const result = await db
        .delete(skillSchool)
        .where(eq(skillSchool.id, id))
        .returning();

      if (!result.length) {
        throw new Error('Skill school not found');
      }

      return { success: true, deletedId: id };
    }),
});
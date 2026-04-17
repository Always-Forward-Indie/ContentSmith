import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../trpc';
import { db } from '../db';
import { skillDamageTypes } from '@contentsmith/database';
import { and, eq, like, count } from '@contentsmith/database';
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
      const { search, page, pageSize } = input;
      const offset = (page - 1) * pageSize;

      const conditions = [];
      if (search) conditions.push(like(skillDamageTypes.slug, `%${search}%`));
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const [totalResult] = await db
        .select({ total: count() })
        .from(skillDamageTypes)
        .where(whereClause);
      const total = totalResult?.total ?? 0;

      const skillEffectsTypes = await db
        .select({ id: skillDamageTypes.id, slug: skillDamageTypes.slug })
        .from(skillDamageTypes)
        .where(whereClause)
        .orderBy(skillDamageTypes.slug)
        .limit(pageSize)
        .offset(offset);

      return {
        data: skillEffectsTypes,
        pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
      };
    }),

  // Получить тип эффекта по ID
  getById: publicProcedure
    .input(skillEffectsTypeIdSchema)
    .query(async ({ input }) => {
      const { id } = input;

      const skillEffectsTypeRecord = await db
        .select({
          id: skillDamageTypes.id,
          slug: skillDamageTypes.slug,
        })
        .from(skillDamageTypes)
        .where(eq(skillDamageTypes.id, id))
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
        .insert(skillDamageTypes)
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
        .update(skillDamageTypes)
        .set(updateData)
        .where(eq(skillDamageTypes.id, id))
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
        .delete(skillDamageTypes)
        .where(eq(skillDamageTypes.id, id))
        .returning();

      if (!result.length) {
        throw new Error('Skill effects type not found');
      }

      return { success: true, deletedId: id };
    }),
});
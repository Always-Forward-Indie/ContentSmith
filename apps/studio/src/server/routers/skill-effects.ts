import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../trpc';
import { db } from '../db';
import { skillDamageFormulas, skillDamageTypes } from '@contentsmith/database';
import { eq, like, or, desc, asc, and, count } from '@contentsmith/database';
import {
  skillEffectSchema,
  createSkillEffectSchema,
  updateSkillEffectSchema,
} from '@contentsmith/validation';

const skillEffectListQuerySchema = z.object({
  search: z.string().optional(),
  effectTypeId: z.number().optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});

const skillEffectIdSchema = z.object({
  id: z.number().int().positive('Invalid skill effect ID'),
});

export const skillEffectRouter = createTRPCRouter({
  // Получить список эффектов навыков с поиском и фильтрацией
  list: publicProcedure
    .input(skillEffectListQuerySchema)
    .query(async ({ input }) => {
      const { search, effectTypeId, page, pageSize } = input;
      const offset = (page - 1) * pageSize;

      const conditions = [];
      if (search) {
        conditions.push(
          or(
            like(skillDamageFormulas.slug, `%${search}%`),
            like(skillDamageTypes.slug, `%${search}%`)
          )
        );
      }
      if (effectTypeId) conditions.push(eq(skillDamageFormulas.effectTypeId, effectTypeId));
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const [totalResult] = await db
        .select({ total: count() })
        .from(skillDamageFormulas)
        .leftJoin(skillDamageTypes, eq(skillDamageFormulas.effectTypeId, skillDamageTypes.id))
        .where(whereClause);
      const total = totalResult?.total ?? 0;

      const results = await db
        .select({
          id: skillDamageFormulas.id,
          slug: skillDamageFormulas.slug,
          effectTypeId: skillDamageFormulas.effectTypeId,
          effectType: { id: skillDamageTypes.id, slug: skillDamageTypes.slug },
        })
        .from(skillDamageFormulas)
        .leftJoin(skillDamageTypes, eq(skillDamageFormulas.effectTypeId, skillDamageTypes.id))
        .where(whereClause)
        .orderBy(skillDamageFormulas.slug)
        .limit(pageSize)
        .offset(offset);

      return {
        data: results,
        pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
      };
    }),

  // Получить эффект навыка по ID
  getById: publicProcedure
    .input(skillEffectIdSchema)
    .query(async ({ input }) => {
      const skillDamageFormula = await db
        .select({
          id: skillDamageFormulas.id,
          slug: skillDamageFormulas.slug,
          effectTypeId: skillDamageFormulas.effectTypeId,
          effectType: {
            id: skillDamageTypes.id,
            slug: skillDamageTypes.slug,
          },
        })
        .from(skillDamageFormulas)
        .leftJoin(skillDamageTypes, eq(skillDamageFormulas.effectTypeId, skillDamageTypes.id))
        .where(eq(skillDamageFormulas.id, input.id))
        .limit(1);

      if (skillDamageFormula.length === 0) {
        throw new Error('Skill effect not found');
      }

      return skillDamageFormula[0];
    }),

  // Создать новый эффект навыка
  create: publicProcedure
    .input(createSkillEffectSchema)
    .mutation(async ({ input }) => {
      // Проверяем, что тип эффекта существует
      const effectType = await db
        .select()
        .from(skillDamageTypes)
        .where(eq(skillDamageTypes.id, input.effectTypeId))
        .limit(1);

      if (effectType.length === 0) {
        throw new Error('Effect type not found');
      }

      // Проверяем уникальность slug
      const existingSkillEffect = await db
        .select()
        .from(skillDamageFormulas)
        .where(eq(skillDamageFormulas.slug, input.slug))
        .limit(1);

      if (existingSkillEffect.length > 0) {
        throw new Error('Skill effect with this slug already exists');
      }

      const result = await db
        .insert(skillDamageFormulas)
        .values({
          slug: input.slug,
          effectTypeId: input.effectTypeId,
        })
        .returning();

      return result[0];
    }),

  // Обновить эффект навыка
  update: publicProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        ...updateSkillEffectSchema.shape,
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...updateData } = input;

      // Проверяем, что эффект навыка существует
      const existingSkillEffect = await db
        .select()
        .from(skillDamageFormulas)
        .where(eq(skillDamageFormulas.id, id))
        .limit(1);

      if (existingSkillEffect.length === 0) {
        throw new Error('Skill effect not found');
      }

      // Если обновляется effectTypeId, проверяем что он существует
      if (updateData.effectTypeId) {
        const effectType = await db
          .select()
          .from(skillDamageTypes)
          .where(eq(skillDamageTypes.id, updateData.effectTypeId))
          .limit(1);

        if (effectType.length === 0) {
          throw new Error('Effect type not found');
        }
      }

      // Если обновляется slug, проверяем уникальность
      if (updateData.slug) {
        const duplicateSkillEffect = await db
          .select()
          .from(skillDamageFormulas)
          .where(eq(skillDamageFormulas.slug, updateData.slug))
          .limit(1);

        if (duplicateSkillEffect.length > 0 && duplicateSkillEffect[0].id !== id) {
          throw new Error('Skill effect with this slug already exists');
        }
      }

      const result = await db
        .update(skillDamageFormulas)
        .set(updateData)
        .where(eq(skillDamageFormulas.id, id))
        .returning();

      return result[0];
    }),

  // Удалить эффект навыка
  delete: publicProcedure
    .input(skillEffectIdSchema)
    .mutation(async ({ input }) => {
      // Проверяем, что эффект навыка существует
      const existingSkillEffect = await db
        .select()
        .from(skillDamageFormulas)
        .where(eq(skillDamageFormulas.id, input.id))
        .limit(1);

      if (existingSkillEffect.length === 0) {
        throw new Error('Skill effect not found');
      }

      // TODO: Проверить, не используется ли этот эффект в других таблицах
      // Например, в skill_effects_mapping

      await db.delete(skillDamageFormulas).where(eq(skillDamageFormulas.id, input.id));

      return { success: true };
    }),
});
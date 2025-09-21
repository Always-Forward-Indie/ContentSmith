import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../trpc';
import { db } from '../db';
import { skillEffects, skillEffectsType } from '@contentsmith/database';
import { eq, like, or, desc, asc, and } from '@contentsmith/database';
import {
  skillEffectSchema,
  createSkillEffectSchema,
  updateSkillEffectSchema,
} from '@contentsmith/validation';

const skillEffectListQuerySchema = z.object({
  search: z.string().optional(),
  effectTypeId: z.number().optional(),
});

const skillEffectIdSchema = z.object({
  id: z.number().int().positive('Invalid skill effect ID'),
});

export const skillEffectRouter = createTRPCRouter({
  // Получить список эффектов навыков с поиском и фильтрацией
  list: publicProcedure
    .input(skillEffectListQuerySchema)
    .query(async ({ input }) => {
      const { search, effectTypeId } = input;

      // Создаем условия для WHERE
      const conditions = [];

      if (search) {
        conditions.push(
          or(
            like(skillEffects.slug, `%${search}%`),
            like(skillEffectsType.slug, `%${search}%`)
          )
        );
      }

      if (effectTypeId) {
        conditions.push(eq(skillEffects.effectTypeId, effectTypeId));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Получаем эффекты навыков
      const results = await db
        .select({
          id: skillEffects.id,
          slug: skillEffects.slug,
          effectTypeId: skillEffects.effectTypeId,
          effectType: {
            id: skillEffectsType.id,
            slug: skillEffectsType.slug,
          },
        })
        .from(skillEffects)
        .leftJoin(skillEffectsType, eq(skillEffects.effectTypeId, skillEffectsType.id))
        .where(whereClause)
        .orderBy(skillEffects.slug);

      return results;
    }),

  // Получить эффект навыка по ID
  getById: publicProcedure
    .input(skillEffectIdSchema)
    .query(async ({ input }) => {
      const skillEffect = await db
        .select({
          id: skillEffects.id,
          slug: skillEffects.slug,
          effectTypeId: skillEffects.effectTypeId,
          effectType: {
            id: skillEffectsType.id,
            slug: skillEffectsType.slug,
          },
        })
        .from(skillEffects)
        .leftJoin(skillEffectsType, eq(skillEffects.effectTypeId, skillEffectsType.id))
        .where(eq(skillEffects.id, input.id))
        .limit(1);

      if (skillEffect.length === 0) {
        throw new Error('Skill effect not found');
      }

      return skillEffect[0];
    }),

  // Создать новый эффект навыка
  create: publicProcedure
    .input(createSkillEffectSchema)
    .mutation(async ({ input }) => {
      // Проверяем, что тип эффекта существует
      const effectType = await db
        .select()
        .from(skillEffectsType)
        .where(eq(skillEffectsType.id, input.effectTypeId))
        .limit(1);

      if (effectType.length === 0) {
        throw new Error('Effect type not found');
      }

      // Проверяем уникальность slug
      const existingSkillEffect = await db
        .select()
        .from(skillEffects)
        .where(eq(skillEffects.slug, input.slug))
        .limit(1);

      if (existingSkillEffect.length > 0) {
        throw new Error('Skill effect with this slug already exists');
      }

      const result = await db
        .insert(skillEffects)
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
        .from(skillEffects)
        .where(eq(skillEffects.id, id))
        .limit(1);

      if (existingSkillEffect.length === 0) {
        throw new Error('Skill effect not found');
      }

      // Если обновляется effectTypeId, проверяем что он существует
      if (updateData.effectTypeId) {
        const effectType = await db
          .select()
          .from(skillEffectsType)
          .where(eq(skillEffectsType.id, updateData.effectTypeId))
          .limit(1);

        if (effectType.length === 0) {
          throw new Error('Effect type not found');
        }
      }

      // Если обновляется slug, проверяем уникальность
      if (updateData.slug) {
        const duplicateSkillEffect = await db
          .select()
          .from(skillEffects)
          .where(eq(skillEffects.slug, updateData.slug))
          .limit(1);

        if (duplicateSkillEffect.length > 0 && duplicateSkillEffect[0].id !== id) {
          throw new Error('Skill effect with this slug already exists');
        }
      }

      const result = await db
        .update(skillEffects)
        .set(updateData)
        .where(eq(skillEffects.id, id))
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
        .from(skillEffects)
        .where(eq(skillEffects.id, input.id))
        .limit(1);

      if (existingSkillEffect.length === 0) {
        throw new Error('Skill effect not found');
      }

      // TODO: Проверить, не используется ли этот эффект в других таблицах
      // Например, в skill_effects_mapping

      await db.delete(skillEffects).where(eq(skillEffects.id, input.id));

      return { success: true };
    }),
});
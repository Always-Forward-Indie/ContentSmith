import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../trpc';
import { db } from '../db';
import { statusEffects, statusEffectModifiers, entityAttributes } from '@contentsmith/database';
import { eq, like, count } from '@contentsmith/database';
import {
  statusEffectListQuerySchema,
  statusEffectIdSchema,
  createStatusEffectSchema,
  updateStatusEffectSchema,
  createStatusEffectModifierSchema,
  updateStatusEffectModifierSchema,
} from '@contentsmith/validation';

export const statusEffectsRouter = createTRPCRouter({
  list: publicProcedure
    .input(statusEffectListQuerySchema)
    .query(async ({ input }) => {
      const { search, page, pageSize } = input;
      const offset = (page - 1) * pageSize;
      const whereClause = search ? like(statusEffects.slug, `%${search}%`) : undefined;
      const [total] = await db.select({ total: count() }).from(statusEffects).where(whereClause);
      const data = await db.select().from(statusEffects).where(whereClause).orderBy(statusEffects.slug).limit(pageSize).offset(offset);
      return { data, pagination: { page, pageSize, total: total.total, totalPages: Math.ceil(total.total / pageSize) } };
    }),

  getById: publicProcedure
    .input(statusEffectIdSchema)
    .query(async ({ input }) => {
      const [effect] = await db.select().from(statusEffects).where(eq(statusEffects.id, input.id));
      if (!effect) throw new Error('Status effect not found');
      const modifiers = await db
        .select({
          id: statusEffectModifiers.id,
          statusEffectId: statusEffectModifiers.statusEffectId,
          attributeId: statusEffectModifiers.attributeId,
          modifierType: statusEffectModifiers.modifierType,
          value: statusEffectModifiers.value,
          attributeName: entityAttributes.name,
        })
        .from(statusEffectModifiers)
        .leftJoin(entityAttributes, eq(statusEffectModifiers.attributeId, entityAttributes.id))
        .where(eq(statusEffectModifiers.statusEffectId, input.id));
      return { ...effect, modifiers };
    }),

  create: publicProcedure
    .input(createStatusEffectSchema)
    .mutation(async ({ input }) => {
      const [result] = await db.insert(statusEffects).values(input).returning();
      return result;
    }),

  update: publicProcedure
    .input(updateStatusEffectSchema)
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      const [result] = await db.update(statusEffects).set(data).where(eq(statusEffects.id, id)).returning();
      if (!result) throw new Error('Status effect not found');
      return result;
    }),

  delete: publicProcedure
    .input(statusEffectIdSchema)
    .mutation(async ({ input }) => {
      await db.delete(statusEffects).where(eq(statusEffects.id, input.id));
      return { success: true };
    }),

  // ─── Modifiers ──────────────────────────────────────────────────────────────

  addModifier: publicProcedure
    .input(createStatusEffectModifierSchema)
    .mutation(async ({ input }) => {
      const [result] = await db.insert(statusEffectModifiers).values({ ...input, value: String(input.value) }).returning();
      return result;
    }),

  updateModifier: publicProcedure
    .input(updateStatusEffectModifierSchema)
    .mutation(async ({ input }) => {
      const { id, value, ...data } = input;
      const updateData = value !== undefined ? { ...data, value: String(value) } : data;
      const [result] = await db.update(statusEffectModifiers).set(updateData).where(eq(statusEffectModifiers.id, id)).returning();
      if (!result) throw new Error('Modifier not found');
      return result;
    }),

  removeModifier: publicProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      await db.delete(statusEffectModifiers).where(eq(statusEffectModifiers.id, input.id));
      return { success: true };
    }),
});

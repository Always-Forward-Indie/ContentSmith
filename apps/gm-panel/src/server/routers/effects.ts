import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { createTRPCRouter, publicProcedure } from '../trpc';
import { playerActiveEffect, statusEffects } from '../schema';
import { logGmAction } from '../utils/gmLog';

export const effectsRouter = createTRPCRouter({
  list: publicProcedure
    .input(z.object({ characterId: z.number() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select({
          id: playerActiveEffect.id,
          statusEffectId: playerActiveEffect.statusEffectId,
          effectSlug: statusEffects.slug,
          effectCategory: statusEffects.category,
          sourceType: playerActiveEffect.sourceType,
          sourceId: playerActiveEffect.sourceId,
          value: playerActiveEffect.value,
          appliedAt: playerActiveEffect.appliedAt,
          expiresAt: playerActiveEffect.expiresAt,
          attributeId: playerActiveEffect.attributeId,
          tickMs: playerActiveEffect.tickMs,
          groupId: playerActiveEffect.groupId,
        })
        .from(playerActiveEffect)
        .leftJoin(statusEffects, eq(statusEffects.id, playerActiveEffect.statusEffectId))
        .where(eq(playerActiveEffect.playerId, input.characterId))
        .orderBy(playerActiveEffect.appliedAt);
    }),

  removeEffect: publicProcedure
    .input(z.object({ effectInstanceId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const old = await ctx.db.select({ playerId: playerActiveEffect.playerId, statusEffectId: playerActiveEffect.statusEffectId }).from(playerActiveEffect).where(eq(playerActiveEffect.id, input.effectInstanceId)).then(r => r[0]);
      await ctx.db
        .delete(playerActiveEffect)
        .where(eq(playerActiveEffect.id, input.effectInstanceId));
      await logGmAction({ actionType: 'remove_effect', targetType: 'character', targetId: old?.playerId ?? 0, oldValue: { statusEffectId: old?.statusEffectId }, gmUserId: null });
      return { success: true };
    }),

  clearAll: publicProcedure
    .input(z.object({ characterId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(playerActiveEffect)
        .where(eq(playerActiveEffect.playerId, input.characterId));
      await logGmAction({ actionType: 'clear_effects', targetType: 'character', targetId: input.characterId, gmUserId: null });
      return { success: true };
    }),

  // Список всех статус-эффектов для выбора
  allEffects: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.select({ id: statusEffects.id, slug: statusEffects.slug, category: statusEffects.category, durationSec: statusEffects.durationSec }).from(statusEffects).orderBy(statusEffects.slug);
  }),

  // Добавить эффект
  addEffect: publicProcedure
    .input(z.object({
      characterId: z.number(),
      statusEffectId: z.number(),
      sourceType: z.string().default('gm'),
      value: z.number().default(0),
      expiresInSeconds: z.number().positive().nullable().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const now = new Date();
      const expiresAt = input.expiresInSeconds
        ? new Date(now.getTime() + input.expiresInSeconds * 1000)
        : null;
      await ctx.db.insert(playerActiveEffect).values({
        playerId: input.characterId,
        statusEffectId: input.statusEffectId,
        sourceType: input.sourceType,
        value: String(input.value),
        appliedAt: now,
        expiresAt,
      });
      await logGmAction({ actionType: 'add_effect', targetType: 'character', targetId: input.characterId, newValue: { statusEffectId: input.statusEffectId, sourceType: input.sourceType, value: input.value, expiresInSeconds: input.expiresInSeconds }, gmUserId: null });
      return { success: true };
    }),
});

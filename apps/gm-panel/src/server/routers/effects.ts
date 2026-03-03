import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { createTRPCRouter, publicProcedure } from '../trpc';
import { playerActiveEffect, skillEffects } from '../schema';

export const effectsRouter = createTRPCRouter({
  list: publicProcedure
    .input(z.object({ characterId: z.number() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select({
          id: playerActiveEffect.id,
          effectId: playerActiveEffect.effectId,
          effectSlug: skillEffects.slug,
          sourceType: playerActiveEffect.sourceType,
          sourceId: playerActiveEffect.sourceId,
          value: playerActiveEffect.value,
          appliedAt: playerActiveEffect.appliedAt,
          expiresAt: playerActiveEffect.expiresAt,
        })
        .from(playerActiveEffect)
        .leftJoin(skillEffects, eq(skillEffects.id, playerActiveEffect.effectId))
        .where(eq(playerActiveEffect.playerId, input.characterId))
        .orderBy(playerActiveEffect.appliedAt);
    }),

  removeEffect: publicProcedure
    .input(z.object({ effectInstanceId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(playerActiveEffect)
        .where(eq(playerActiveEffect.id, input.effectInstanceId));
      return { success: true };
    }),

  clearAll: publicProcedure
    .input(z.object({ characterId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(playerActiveEffect)
        .where(eq(playerActiveEffect.playerId, input.characterId));
      return { success: true };
    }),

  // Список всех эффектов для выбора
  allEffects: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.select({ id: skillEffects.id, slug: skillEffects.slug }).from(skillEffects).orderBy(skillEffects.slug);
  }),

  // Добавить эффект
  addEffect: publicProcedure
    .input(z.object({
      characterId: z.number(),
      effectId: z.number(),
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
        effectId: input.effectId,
        sourceType: input.sourceType,
        value: String(input.value),
        appliedAt: now,
        expiresAt,
      });
      return { success: true };
    }),
});

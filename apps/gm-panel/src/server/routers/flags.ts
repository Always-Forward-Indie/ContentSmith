import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { createTRPCRouter, publicProcedure } from '../trpc';
import { playerFlag } from '../schema';
import { logGmAction } from '../utils/gmLog';

export const flagsRouter = createTRPCRouter({
  list: publicProcedure
    .input(z.object({ characterId: z.number() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(playerFlag)
        .where(eq(playerFlag.playerId, input.characterId))
        .orderBy(playerFlag.flagKey);
    }),

  setFlag: publicProcedure
    .input(z.object({
      characterId: z.number(),
      flagKey: z.string().min(1),
      intValue: z.number().nullable().optional(),
      boolValue: z.boolean().nullable().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db
        .select({ flagKey: playerFlag.flagKey })
        .from(playerFlag)
        .where(and(
          eq(playerFlag.playerId, input.characterId),
          eq(playerFlag.flagKey, input.flagKey),
        ))
        .then(r => r[0]);

      if (existing) {
        await ctx.db
          .update(playerFlag)
          .set({
            intValue: input.intValue ?? null,
            boolValue: input.boolValue ?? null,
          })
          .where(and(
            eq(playerFlag.playerId, input.characterId),
            eq(playerFlag.flagKey, input.flagKey),
          ));
      } else {
        await ctx.db.insert(playerFlag).values({
          playerId: input.characterId,
          flagKey: input.flagKey,
          intValue: input.intValue ?? null,
          boolValue: input.boolValue ?? null,
        });
      }
      await logGmAction({ actionType: 'set_flag', targetType: 'character', targetId: input.characterId, newValue: { flagKey: input.flagKey, intValue: input.intValue, boolValue: input.boolValue }, gmUserId: null });
      return { success: true };
    }),

  deleteFlag: publicProcedure
    .input(z.object({ characterId: z.number(), flagKey: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(playerFlag)
        .where(and(
          eq(playerFlag.playerId, input.characterId),
          eq(playerFlag.flagKey, input.flagKey),
        ));
      await logGmAction({ actionType: 'delete_flag', targetType: 'character', targetId: input.characterId, oldValue: { flagKey: input.flagKey }, gmUserId: null });
      return { success: true };
    }),
});

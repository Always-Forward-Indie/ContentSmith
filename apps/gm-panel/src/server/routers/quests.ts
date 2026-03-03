import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { createTRPCRouter, publicProcedure } from '../trpc';
import { playerQuest, quest } from '../schema';
import { logGmAction } from '../utils/gmLog';

export const questsRouter = createTRPCRouter({
  list: publicProcedure
    .input(z.object({ characterId: z.number() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select({
          playerId: playerQuest.playerId,
          questId: playerQuest.questId,
          questSlug: quest.slug,
          clientQuestKey: quest.clientQuestKey,
          state: playerQuest.state,
          currentStep: playerQuest.currentStep,
          progress: playerQuest.progress,
          updatedAt: playerQuest.updatedAt,
        })
        .from(playerQuest)
        .leftJoin(quest, eq(quest.id, playerQuest.questId))
        .where(eq(playerQuest.playerId, input.characterId))
        .orderBy(playerQuest.updatedAt);
    }),

  // Список всех квестов для выбора (assign)
  allQuests: publicProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select({ id: quest.id, slug: quest.slug, clientQuestKey: quest.clientQuestKey })
      .from(quest)
      .orderBy(quest.slug);
  }),

  // Назначить квест персонажу
  assignQuest: publicProcedure
    .input(z.object({
      characterId: z.number(),
      questId: z.number(),
      state: z.enum(['offered', 'active', 'completed', 'turned_in', 'failed']).default('active'),
    }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db
        .select({ playerId: playerQuest.playerId })
        .from(playerQuest)
        .where(and(eq(playerQuest.playerId, input.characterId), eq(playerQuest.questId, input.questId)))
        .then(r => r[0]);
      if (existing) {
        await ctx.db
          .update(playerQuest)
          .set({ state: input.state, updatedAt: new Date() })
          .where(and(eq(playerQuest.playerId, input.characterId), eq(playerQuest.questId, input.questId)));
      } else {
        await ctx.db.insert(playerQuest).values({
          playerId: input.characterId,
          questId: input.questId,
          state: input.state,
          currentStep: 0,
          updatedAt: new Date(),
        });
      }
      await logGmAction({ actionType: 'assign_quest', targetType: 'character', targetId: input.characterId, newValue: { questId: input.questId, state: input.state }, gmUserId: null });
      return { success: true };
    }),

  // Изменить состояние квеста
  setState: publicProcedure
    .input(z.object({
      characterId: z.number(),
      questId: z.number(),
      state: z.enum(['offered', 'active', 'completed', 'turned_in', 'failed']),
    }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(playerQuest)
        .set({ state: input.state, updatedAt: new Date() })
        .where(and(eq(playerQuest.playerId, input.characterId), eq(playerQuest.questId, input.questId)));
      await logGmAction({ actionType: 'set_quest_state', targetType: 'character', targetId: input.characterId, newValue: { questId: input.questId, state: input.state }, gmUserId: null });
      return { success: true };
    }),

  // Изменить шаг квеста
  setStep: publicProcedure
    .input(z.object({
      characterId: z.number(),
      questId: z.number(),
      step: z.number().min(0),
    }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(playerQuest)
        .set({ currentStep: input.step, updatedAt: new Date() })
        .where(and(eq(playerQuest.playerId, input.characterId), eq(playerQuest.questId, input.questId)));
      await logGmAction({ actionType: 'set_quest_step', targetType: 'character', targetId: input.characterId, newValue: { questId: input.questId, step: input.step }, gmUserId: null });
      return { success: true };
    }),

  // Сбросить один квест по questId
  resetQuest: publicProcedure
    .input(z.object({ characterId: z.number(), questId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(playerQuest)
        .where(and(eq(playerQuest.playerId, input.characterId), eq(playerQuest.questId, input.questId)));
      await logGmAction({ actionType: 'reset_quest', targetType: 'character', targetId: input.characterId, oldValue: { questId: input.questId }, gmUserId: null });
      return { success: true };
    }),

  // Завершить квест
  completeQuest: publicProcedure
    .input(z.object({ characterId: z.number(), questId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(playerQuest)
        .set({ state: 'completed', updatedAt: new Date() })
        .where(and(eq(playerQuest.playerId, input.characterId), eq(playerQuest.questId, input.questId)));
      await logGmAction({ actionType: 'complete_quest', targetType: 'character', targetId: input.characterId, newValue: { questId: input.questId, state: 'completed' }, gmUserId: null });
      return { success: true };
    }),
});

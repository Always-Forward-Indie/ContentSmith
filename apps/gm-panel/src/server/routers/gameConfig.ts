import { z } from 'zod';
import { eq, ilike, and } from 'drizzle-orm';
import { createTRPCRouter, publicProcedure } from '../trpc';
import { gameConfig } from '../schema';
import { logGmAction } from '../utils/gmLog';

export const gameConfigRouter = createTRPCRouter({
  // Список всех конфигов с фильтрацией по группе/ключу
  list: publicProcedure
    .input(z.object({ search: z.string().optional() }).default({}))
    .query(async ({ ctx, input }) => {
      const { search } = input;
      const where = search ? ilike(gameConfig.key, `%${search}%`) : undefined;
      return ctx.db
        .select()
        .from(gameConfig)
        .where(where)
        .orderBy(gameConfig.key);
    }),

  // Получить один конфиг по ключу
  byKey: publicProcedure
    .input(z.object({ key: z.string() }))
    .query(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select()
        .from(gameConfig)
        .where(eq(gameConfig.key, input.key));
      return row ?? null;
    }),

  // Обновить значение конфига
  update: publicProcedure
    .input(z.object({
      key: z.string().min(1),
      value: z.string().min(0),
      gmUserId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [old] = await ctx.db
        .select({ value: gameConfig.value })
        .from(gameConfig)
        .where(eq(gameConfig.key, input.key));

      if (!old) throw new Error(`Конфиг с ключом "${input.key}" не найден`);

      await ctx.db
        .update(gameConfig)
        .set({ value: input.value, updatedAt: new Date() })
        .where(eq(gameConfig.key, input.key));

      await logGmAction({
        actionType: 'update_game_config',
        targetType: 'game_config',
        targetId: null,
        oldValue: { key: input.key, value: old.value },
        newValue: { key: input.key, value: input.value },
        gmUserId: input.gmUserId ?? null,
      });

      return { success: true };
    }),

  // Пакетное обновление нескольких конфигов (один запрос)
  batchUpdate: publicProcedure
    .input(z.object({
      updates: z.array(z.object({ key: z.string(), value: z.string() })).min(1),
      gmUserId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const keys = input.updates.map(u => u.key);
      const oldRows = await ctx.db
        .select({ key: gameConfig.key, value: gameConfig.value })
        .from(gameConfig)
        .where(
          // Drizzle doesn't have native inArray in older versions — use OR chain
          keys.length === 1
            ? eq(gameConfig.key, keys[0]!)
            : and(...keys.map(k => eq(gameConfig.key, k))),
        );
      const oldMap = Object.fromEntries(oldRows.map(r => [r.key, r.value]));

      for (const { key, value } of input.updates) {
        await ctx.db
          .update(gameConfig)
          .set({ value, updatedAt: new Date() })
          .where(eq(gameConfig.key, key));
      }

      await logGmAction({
        actionType: 'batch_update_game_config',
        targetType: 'game_config',
        targetId: null,
        oldValue: oldMap,
        newValue: Object.fromEntries(input.updates.map(u => [u.key, u.value])),
        gmUserId: input.gmUserId ?? null,
      });

      return { success: true };
    }),
});

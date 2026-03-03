import { z } from 'zod';
import { eq, desc, count, sum } from 'drizzle-orm';
import { createTRPCRouter, publicProcedure } from '../trpc';
import { currencyTransactions } from '../schema';
import { logGmAction } from '../utils/gmLog';

const PAGE_SIZE = 30;

export const transactionsRouter = createTRPCRouter({
  // История транзакций персонажа
  list: publicProcedure
    .input(z.object({
      characterId: z.number(),
      page: z.number().int().min(1).default(1),
    }))
    .query(async ({ ctx, input }) => {
      const offset = (input.page - 1) * PAGE_SIZE;

      const [totalRow] = await ctx.db
        .select({ total: count() })
        .from(currencyTransactions)
        .where(eq(currencyTransactions.characterId, input.characterId));

      const rows = await ctx.db
        .select()
        .from(currencyTransactions)
        .where(eq(currencyTransactions.characterId, input.characterId))
        .orderBy(desc(currencyTransactions.createdAt))
        .limit(PAGE_SIZE)
        .offset(offset);

      return {
        data: rows,
        pagination: {
          page: input.page,
          pageSize: PAGE_SIZE,
          total: totalRow?.total ?? 0,
          totalPages: Math.max(1, Math.ceil((totalRow?.total ?? 0) / PAGE_SIZE)),
        },
      };
    }),

  // Баланс (сумма всех транзакций)
  balance: publicProcedure
    .input(z.object({ characterId: z.number() }))
    .query(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select({ balance: sum(currencyTransactions.amount) })
        .from(currencyTransactions)
        .where(eq(currencyTransactions.characterId, input.characterId));
      return { balance: Number(row?.balance ?? 0) };
    }),

  // GM: выдать / забрать валюту
  grant: publicProcedure
    .input(z.object({
      characterId: z.number(),
      amount: z.number().int().refine(v => v !== 0, 'Сумма не может быть 0'),
      reason: z.string().min(1).max(50).default('gm_grant'),
      gmUserId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.insert(currencyTransactions).values({
        characterId: input.characterId,
        amount: input.amount,
        reasonType: input.reason,
        sourceId: null,
      });

      await logGmAction({
        actionType: input.amount > 0 ? 'grant_currency' : 'remove_currency',
        targetType: 'character',
        targetId: input.characterId,
        newValue: { amount: input.amount, reason: input.reason },
        gmUserId: input.gmUserId ?? null,
      });

      return { success: true };
    }),
});

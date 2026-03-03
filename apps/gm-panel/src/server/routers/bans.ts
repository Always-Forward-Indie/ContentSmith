import { z } from 'zod';
import { eq, and, desc, count } from 'drizzle-orm';
import { createTRPCRouter, publicProcedure } from '../trpc';
import { userBans, users } from '../schema';
import { logGmAction } from '../utils/gmLog';

const bannedByUser = {
  id: users.id,
  login: users.login,
};

export const bansRouter = createTRPCRouter({
  // Статус бана аккаунта (активный)
  getStatus: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ ctx, input }) => {
      const ban = await ctx.db
        .select()
        .from(userBans)
        .where(and(eq(userBans.userId, input.userId), eq(userBans.isActive, true)))
        .orderBy(desc(userBans.createdAt))
        .limit(1)
        .then(r => r[0] ?? null);
      return ban;
    }),

  // История банов аккаунта
  history: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select({
          id: userBans.id,
          reason: userBans.reason,
          createdAt: userBans.createdAt,
          expiresAt: userBans.expiresAt,
          isActive: userBans.isActive,
          bannedByLogin: users.login,
        })
        .from(userBans)
        .leftJoin(users, eq(users.id, userBans.bannedByUserId))
        .where(eq(userBans.userId, input.userId))
        .orderBy(desc(userBans.createdAt));
    }),

  // Забанить аккаунт
  ban: publicProcedure
    .input(z.object({
      userId: z.number(),
      reason: z.string().min(1).max(500),
      expiresAt: z.string().optional(), // ISO date string, undefined = permanent
      gmUserId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Деактивируем предыдущие активные баны
      await ctx.db
        .update(userBans)
        .set({ isActive: false })
        .where(and(eq(userBans.userId, input.userId), eq(userBans.isActive, true)));

      await ctx.db.insert(userBans).values({
        userId: input.userId,
        bannedByUserId: input.gmUserId ?? null,
        reason: input.reason,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
        isActive: true,
      });

      // Деактивировать сессии
      await ctx.db
        .update(users)
        .set({ isActive: false })
        .where(eq(users.id, input.userId));

      await logGmAction({
        actionType: 'ban_user',
        targetType: 'user',
        targetId: input.userId,
        newValue: { reason: input.reason, expiresAt: input.expiresAt ?? null },
        gmUserId: input.gmUserId ?? null,
      });

      return { success: true };
    }),

  // Разбанить аккаунт
  unban: publicProcedure
    .input(z.object({
      userId: z.number(),
      gmUserId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(userBans)
        .set({ isActive: false })
        .where(and(eq(userBans.userId, input.userId), eq(userBans.isActive, true)));

      await ctx.db
        .update(users)
        .set({ isActive: true })
        .where(eq(users.id, input.userId));

      await logGmAction({
        actionType: 'unban_user',
        targetType: 'user',
        targetId: input.userId,
        gmUserId: input.gmUserId ?? null,
      });

      return { success: true };
    }),

  // Количество активных банов (для badge)
  activeCount: publicProcedure.query(async ({ ctx }) => {
    const [row] = await ctx.db
      .select({ count: count() })
      .from(userBans)
      .where(eq(userBans.isActive, true));
    return row?.count ?? 0;
  }),
});

import { z } from 'zod';
import { eq, desc, and, isNull } from 'drizzle-orm';
import { createTRPCRouter, publicProcedure } from '../trpc';
import { userSessions, users } from '../schema';
import { logGmAction } from '../utils/gmLog';

export const sessionsRouter = createTRPCRouter({
  // Активные сессии пользователя
  listByUser: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select({
          id: userSessions.id,
          ip: userSessions.ip,
          userAgent: userSessions.userAgent,
          createdAt: userSessions.createdAt,
          expiresAt: userSessions.expiresAt,
          revokedAt: userSessions.revokedAt,
        })
        .from(userSessions)
        .where(and(eq(userSessions.userId, input.userId), isNull(userSessions.revokedAt)))
        .orderBy(desc(userSessions.createdAt))
        .limit(20);
    }),

  // Отозвать одну сессию
  revoke: publicProcedure
    .input(z.object({
      sessionId: z.number(),
      gmUserId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [session] = await ctx.db
        .select({ userId: userSessions.userId })
        .from(userSessions)
        .where(eq(userSessions.id, input.sessionId));

      await ctx.db
        .update(userSessions)
        .set({ revokedAt: new Date() })
        .where(eq(userSessions.id, input.sessionId));

      await logGmAction({
        actionType: 'revoke_session',
        targetType: 'user_session',
        targetId: input.sessionId,
        newValue: { userId: session?.userId },
        gmUserId: input.gmUserId ?? null,
      });

      return { success: true };
    }),

  // Отозвать все сессии пользователя (кик со всех устройств)
  revokeAll: publicProcedure
    .input(z.object({
      userId: z.number(),
      gmUserId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(userSessions)
        .set({ revokedAt: new Date() })
        .where(and(eq(userSessions.userId, input.userId), isNull(userSessions.revokedAt)));

      await logGmAction({
        actionType: 'revoke_all_sessions',
        targetType: 'user',
        targetId: input.userId,
        gmUserId: input.gmUserId ?? null,
      });

      return { success: true };
    }),
});

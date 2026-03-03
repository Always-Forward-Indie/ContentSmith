import { z } from 'zod';
import { eq, desc, ilike, and, count } from 'drizzle-orm';
import { createTRPCRouter, publicProcedure } from '../trpc';
import { gmActionLog, users } from '../schema';

const PAGE_SIZE = 50;

export const gmLogRouter = createTRPCRouter({
  list: publicProcedure
    .input(z.object({
      page: z.number().int().min(1).default(1),
      actionType: z.string().optional(),
      targetType: z.string().optional(),
      gmUserId: z.number().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const { page, actionType, targetType, gmUserId } = input;
      const offset = (page - 1) * PAGE_SIZE;

      const conditions = [];
      if (actionType) conditions.push(ilike(gmActionLog.actionType, `%${actionType}%`));
      if (targetType) conditions.push(eq(gmActionLog.targetType, targetType));
      if (gmUserId) conditions.push(eq(gmActionLog.gmUserId, gmUserId));

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const [totalRow] = await ctx.db
        .select({ total: count() })
        .from(gmActionLog)
        .where(where);

      const rows = await ctx.db
        .select({
          id: gmActionLog.id,
          actionType: gmActionLog.actionType,
          targetType: gmActionLog.targetType,
          targetId: gmActionLog.targetId,
          oldValue: gmActionLog.oldValue,
          newValue: gmActionLog.newValue,
          createdAt: gmActionLog.createdAt,
          gmLogin: users.login,
        })
        .from(gmActionLog)
        .leftJoin(users, eq(users.id, gmActionLog.gmUserId))
        .where(where)
        .orderBy(desc(gmActionLog.createdAt))
        .limit(PAGE_SIZE)
        .offset(offset);

      return {
        data: rows,
        pagination: {
          page,
          pageSize: PAGE_SIZE,
          total: totalRow?.total ?? 0,
          totalPages: Math.max(1, Math.ceil((totalRow?.total ?? 0) / PAGE_SIZE)),
        },
      };
    }),

  // Уникальные типы действий для фильтра
  actionTypes: publicProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db
      .selectDistinct({ actionType: gmActionLog.actionType })
      .from(gmActionLog)
      .orderBy(gmActionLog.actionType);
    return rows.map(r => r.actionType);
  }),
});

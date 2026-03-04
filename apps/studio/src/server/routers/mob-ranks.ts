import { z } from 'zod';
import { eq, like, count } from '@contentsmith/database';
import { db } from '../db';
import { mobRanks } from '@contentsmith/database';
import { createTRPCRouter, publicProcedure } from '../trpc';

export const mobRanksRouter = createTRPCRouter({
  list: publicProcedure
    .input(z.object({
      search: z.string().optional(),
      page: z.number().int().min(1).default(1),
      pageSize: z.number().int().min(1).max(100).default(20),
    }))
    .query(async ({ input }) => {
      const { search, page, pageSize } = input;
      const offset = (page - 1) * pageSize;
      const whereClause = search ? like(mobRanks.code, `%${search}%`) : undefined;
      const [{ total }] = await db.select({ total: count() }).from(mobRanks).where(whereClause);
      const data = await db.select().from(mobRanks).where(whereClause).orderBy(mobRanks.rankId).limit(pageSize).offset(offset);
      return { data, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } };
    }),

  create: publicProcedure
    .input(z.object({ rankId: z.number().int().min(0), code: z.string().min(1), mult: z.number().default(1) }))
    .mutation(async ({ input }) => {
      const rows = await db.insert(mobRanks).values(input).returning();
      return rows[0];
    }),

  update: publicProcedure
    .input(z.object({ rankId: z.number().int(), code: z.string().min(1).optional(), mult: z.number().optional() }))
    .mutation(async ({ input }) => {
      const { rankId, ...rest } = input;
      await db.update(mobRanks).set(rest).where(eq(mobRanks.rankId, rankId));
      return { success: true };
    }),

  delete: publicProcedure
    .input(z.object({ rankId: z.number().int() }))
    .mutation(async ({ input }) => {
      await db.delete(mobRanks).where(eq(mobRanks.rankId, input.rankId));
      return { success: true };
    }),
});

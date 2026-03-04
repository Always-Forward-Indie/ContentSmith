import { z } from 'zod';
import { eq, like, or, count } from '@contentsmith/database';
import { db } from '../db';
import { mobRace } from '@contentsmith/database';
import { createTRPCRouter, publicProcedure } from '../trpc';

export const mobRaceRouter = createTRPCRouter({
  list: publicProcedure
    .input(z.object({
      search: z.string().optional(),
      page: z.number().int().min(1).default(1),
      pageSize: z.number().int().min(1).max(100).default(20),
    }))
    .query(async ({ input }) => {
      const { search, page, pageSize } = input;
      const offset = (page - 1) * pageSize;
      const whereClause = search ? like(mobRace.name, `%${search}%`) : undefined;
      const [{ total }] = await db.select({ total: count() }).from(mobRace).where(whereClause);
      const data = await db.select().from(mobRace).where(whereClause).orderBy(mobRace.name).limit(pageSize).offset(offset);
      return { data, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } };
    }),

  create: publicProcedure
    .input(z.object({ name: z.string().min(1).max(50) }))
    .mutation(async ({ input }) => {
      const rows = await db.insert(mobRace).values({ name: input.name }).returning();
      return rows[0];
    }),

  update: publicProcedure
    .input(z.object({ id: z.number().int().positive(), name: z.string().min(1).max(50) }))
    .mutation(async ({ input }) => {
      await db.update(mobRace).set({ name: input.name }).where(eq(mobRace.id, input.id));
      return { success: true };
    }),

  delete: publicProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      await db.delete(mobRace).where(eq(mobRace.id, input.id));
      return { success: true };
    }),
});

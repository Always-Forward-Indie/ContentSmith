import { z } from 'zod';
import { eq, like, count } from '@contentsmith/database';
import { db } from '../db';
import { targetType } from '@contentsmith/database';
import { createTRPCRouter, publicProcedure } from '../trpc';

export const targetTypeRouter = createTRPCRouter({
  list: publicProcedure
    .input(z.object({
      search: z.string().optional(),
      page: z.number().int().min(1).default(1),
      pageSize: z.number().int().min(1).max(100).default(20),
    }))
    .query(async ({ input }) => {
      const { search, page, pageSize } = input;
      const offset = (page - 1) * pageSize;
      const whereClause = search ? like(targetType.slug, `%${search}%`) : undefined;
      const [{ total }] = await db.select({ total: count() }).from(targetType).where(whereClause);
      const data = await db.select().from(targetType).where(whereClause).orderBy(targetType.slug).limit(pageSize).offset(offset);
      return { data, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } };
    }),

  create: publicProcedure
    .input(z.object({ slug: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const rows = await db.insert(targetType).values({ slug: input.slug }).returning();
      return rows[0];
    }),

  update: publicProcedure
    .input(z.object({ id: z.number().int().positive(), slug: z.string().min(1) }))
    .mutation(async ({ input }) => {
      await db.update(targetType).set({ slug: input.slug }).where(eq(targetType.id, input.id));
      return { success: true };
    }),

  delete: publicProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      await db.delete(targetType).where(eq(targetType.id, input.id));
      return { success: true };
    }),
});

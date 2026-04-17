import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../trpc';
import { db } from '../db';
import { damageElements } from '@contentsmith/database';
import { eq, like, count } from '@contentsmith/database';
import { damageElementListQuerySchema, createDamageElementSchema } from '@contentsmith/validation';

export const damageElementsRouter = createTRPCRouter({
  list: publicProcedure
    .input(damageElementListQuerySchema)
    .query(async ({ input }) => {
      const { search, page, pageSize } = input;
      const offset = (page - 1) * pageSize;
      const whereClause = search ? like(damageElements.slug, `%${search}%`) : undefined;
      const [total] = await db.select({ total: count() }).from(damageElements).where(whereClause);
      const data = await db.select().from(damageElements).where(whereClause).orderBy(damageElements.slug).limit(pageSize).offset(offset);
      return { data, pagination: { page, pageSize, total: total.total, totalPages: Math.ceil(total.total / pageSize) } };
    }),

  create: publicProcedure
    .input(createDamageElementSchema)
    .mutation(async ({ input }) => {
      const [result] = await db.insert(damageElements).values(input).returning();
      return result;
    }),

  delete: publicProcedure
    .input(z.object({ slug: z.string() }))
    .mutation(async ({ input }) => {
      await db.delete(damageElements).where(eq(damageElements.slug, input.slug));
      return { success: true };
    }),
});

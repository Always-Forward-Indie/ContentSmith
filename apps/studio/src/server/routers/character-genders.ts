import { z } from 'zod';
import { eq, like, or, count } from '@contentsmith/database';
import { db } from '../db';
import { characterGenders } from '@contentsmith/database';
import { createTRPCRouter, publicProcedure } from '../trpc';

export const characterGendersRouter = createTRPCRouter({
  list: publicProcedure
    .input(z.object({
      search: z.string().optional(),
      page: z.number().int().min(1).default(1),
      pageSize: z.number().int().min(1).max(100).default(20),
    }))
    .query(async ({ input }) => {
      const { search, page, pageSize } = input;
      const offset = (page - 1) * pageSize;
      const whereClause = search
        ? or(like(characterGenders.name, `%${search}%`), like(characterGenders.label, `%${search}%`))
        : undefined;
      const [{ total }] = await db.select({ total: count() }).from(characterGenders).where(whereClause);
      const data = await db.select().from(characterGenders).where(whereClause).orderBy(characterGenders.id).limit(pageSize).offset(offset);
      return { data, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } };
    }),

  create: publicProcedure
    .input(z.object({ id: z.number().int().min(0), name: z.string().min(1).max(50), label: z.string().min(1).max(50) }))
    .mutation(async ({ input }) => {
      const rows = await db.insert(characterGenders).values(input).returning();
      return rows[0];
    }),

  update: publicProcedure
    .input(z.object({ id: z.number().int(), name: z.string().min(1).max(50).optional(), label: z.string().min(1).max(50).optional() }))
    .mutation(async ({ input }) => {
      const { id, ...rest } = input;
      await db.update(characterGenders).set(rest).where(eq(characterGenders.id, id));
      return { success: true };
    }),

  delete: publicProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      await db.delete(characterGenders).where(eq(characterGenders.id, input.id));
      return { success: true };
    }),
});

import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../trpc';
import { db } from '../db';
import { factions } from '@contentsmith/database';
import { eq, like, count, and } from '@contentsmith/database';
import {
  factionListQuerySchema,
  factionIdSchema,
  createFactionSchema,
  updateFactionSchema,
} from '@contentsmith/validation';

export const factionsRouter = createTRPCRouter({
  list: publicProcedure
    .input(factionListQuerySchema)
    .query(async ({ input }) => {
      const { search, page, pageSize } = input;
      const offset = (page - 1) * pageSize;
      const whereClause = search ? like(factions.name, `%${search}%`) : undefined;
      const [total] = await db.select({ total: count() }).from(factions).where(whereClause);
      const data = await db.select().from(factions).where(whereClause).orderBy(factions.name).limit(pageSize).offset(offset);
      return { data, pagination: { page, pageSize, total: total.total, totalPages: Math.ceil(total.total / pageSize) } };
    }),

  getById: publicProcedure
    .input(factionIdSchema)
    .query(async ({ input }) => {
      const [result] = await db.select().from(factions).where(eq(factions.id, input.id));
      if (!result) throw new Error('Faction not found');
      return result;
    }),

  getBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      const [result] = await db.select().from(factions).where(eq(factions.slug, input.slug)).limit(1);
      return result ?? null;
    }),

  create: publicProcedure
    .input(createFactionSchema)
    .mutation(async ({ input }) => {
      const [result] = await db.insert(factions).values(input).returning();
      return result;
    }),

  update: publicProcedure
    .input(updateFactionSchema)
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      const [result] = await db.update(factions).set(data).where(eq(factions.id, id)).returning();
      if (!result) throw new Error('Faction not found');
      return result;
    }),

  delete: publicProcedure
    .input(factionIdSchema)
    .mutation(async ({ input }) => {
      await db.delete(factions).where(eq(factions.id, input.id));
      return { success: true };
    }),
});

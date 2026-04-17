import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../trpc';
import { db } from '../db';
import { masteryDefinitions } from '@contentsmith/database';
import { eq, like, count } from '@contentsmith/database';
import {
  masteryDefinitionListQuerySchema,
  createMasteryDefinitionSchema,
  updateMasteryDefinitionSchema,
} from '@contentsmith/validation';

export const masteryDefinitionsRouter = createTRPCRouter({
  list: publicProcedure
    .input(masteryDefinitionListQuerySchema)
    .query(async ({ input }) => {
      const { search, page, pageSize } = input;
      const offset = (page - 1) * pageSize;
      const whereClause = search ? like(masteryDefinitions.name, `%${search}%`) : undefined;
      const [total] = await db.select({ total: count() }).from(masteryDefinitions).where(whereClause);
      const data = await db.select().from(masteryDefinitions).where(whereClause).orderBy(masteryDefinitions.slug).limit(pageSize).offset(offset);
      return { data, pagination: { page, pageSize, total: total.total, totalPages: Math.ceil(total.total / pageSize) } };
    }),

  getBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      const [result] = await db.select().from(masteryDefinitions).where(eq(masteryDefinitions.slug, input.slug));
      if (!result) throw new Error('Mastery not found');
      return result;
    }),

  create: publicProcedure
    .input(createMasteryDefinitionSchema)
    .mutation(async ({ input }) => {
      const [result] = await db.insert(masteryDefinitions).values(input).returning();
      return result;
    }),

  update: publicProcedure
    .input(updateMasteryDefinitionSchema)
    .mutation(async ({ input }) => {
      const { slug, ...data } = input;
      const [result] = await db.update(masteryDefinitions).set(data).where(eq(masteryDefinitions.slug, slug)).returning();
      if (!result) throw new Error('Mastery not found');
      return result;
    }),

  delete: publicProcedure
    .input(z.object({ slug: z.string() }))
    .mutation(async ({ input }) => {
      await db.delete(masteryDefinitions).where(eq(masteryDefinitions.slug, input.slug));
      return { success: true };
    }),
});

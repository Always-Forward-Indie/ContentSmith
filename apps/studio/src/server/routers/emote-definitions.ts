import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../trpc';
import { db } from '../db';
import { emoteDefinitions } from '@contentsmith/database';
import { eq, like, count, asc } from '@contentsmith/database';
import {
  emoteDefinitionListQuerySchema,
  emoteDefinitionIdSchema,
  createEmoteDefinitionSchema,
  updateEmoteDefinitionSchema,
} from '@contentsmith/validation';

export const emoteDefinitionsRouter = createTRPCRouter({
  list: publicProcedure
    .input(emoteDefinitionListQuerySchema)
    .query(async ({ input }) => {
      const { search, page, pageSize } = input;
      const offset = (page - 1) * pageSize;
      const whereClause = search ? like(emoteDefinitions.displayName, `%${search}%`) : undefined;
      const [total] = await db.select({ total: count() }).from(emoteDefinitions).where(whereClause);
      const data = await db.select().from(emoteDefinitions).where(whereClause).orderBy(asc(emoteDefinitions.sortOrder), asc(emoteDefinitions.slug)).limit(pageSize).offset(offset);
      return { data, pagination: { page, pageSize, total: total.total, totalPages: Math.ceil(total.total / pageSize) } };
    }),

  getById: publicProcedure
    .input(emoteDefinitionIdSchema)
    .query(async ({ input }) => {
      const [result] = await db.select().from(emoteDefinitions).where(eq(emoteDefinitions.id, input.id));
      if (!result) throw new Error('Emote not found');
      return result;
    }),

  create: publicProcedure
    .input(createEmoteDefinitionSchema)
    .mutation(async ({ input }) => {
      const [result] = await db.insert(emoteDefinitions).values(input).returning();
      return result;
    }),

  update: publicProcedure
    .input(updateEmoteDefinitionSchema)
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      const [result] = await db.update(emoteDefinitions).set(data).where(eq(emoteDefinitions.id, id)).returning();
      if (!result) throw new Error('Emote not found');
      return result;
    }),

  delete: publicProcedure
    .input(emoteDefinitionIdSchema)
    .mutation(async ({ input }) => {
      await db.delete(emoteDefinitions).where(eq(emoteDefinitions.id, input.id));
      return { success: true };
    }),
});

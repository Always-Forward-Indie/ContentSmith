import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../trpc';
import { db } from '../db';
import { titleDefinitions } from '@contentsmith/database';
import { eq, like, count } from '@contentsmith/database';
import {
  titleDefinitionListQuerySchema,
  titleDefinitionIdSchema,
  createTitleDefinitionSchema,
  updateTitleDefinitionSchema,
} from '@contentsmith/validation';

export const titleDefinitionsRouter = createTRPCRouter({
  list: publicProcedure
    .input(titleDefinitionListQuerySchema)
    .query(async ({ input }) => {
      const { search, page, pageSize } = input;
      const offset = (page - 1) * pageSize;
      const whereClause = search ? like(titleDefinitions.displayName, `%${search}%`) : undefined;
      const [total] = await db.select({ total: count() }).from(titleDefinitions).where(whereClause);
      const data = await db.select().from(titleDefinitions).where(whereClause).orderBy(titleDefinitions.slug).limit(pageSize).offset(offset);
      return { data, pagination: { page, pageSize, total: total.total, totalPages: Math.ceil(total.total / pageSize) } };
    }),

  getById: publicProcedure
    .input(titleDefinitionIdSchema)
    .query(async ({ input }) => {
      const [result] = await db.select().from(titleDefinitions).where(eq(titleDefinitions.id, input.id));
      if (!result) throw new Error('Title not found');
      return result;
    }),

  create: publicProcedure
    .input(createTitleDefinitionSchema)
    .mutation(async ({ input }) => {
      const [result] = await db.insert(titleDefinitions).values({
        ...input,
        bonuses: input.bonuses as unknown[],
        conditionParams: input.conditionParams as Record<string, unknown>,
      }).returning();
      return result;
    }),

  update: publicProcedure
    .input(updateTitleDefinitionSchema)
    .mutation(async ({ input }) => {
      const { id, bonuses, conditionParams, ...data } = input;
      const updateData: Record<string, unknown> = { ...data };
      if (bonuses !== undefined) updateData.bonuses = bonuses;
      if (conditionParams !== undefined) updateData.conditionParams = conditionParams;
      const [result] = await db.update(titleDefinitions).set(updateData).where(eq(titleDefinitions.id, id)).returning();
      if (!result) throw new Error('Title not found');
      return result;
    }),

  delete: publicProcedure
    .input(titleDefinitionIdSchema)
    .mutation(async ({ input }) => {
      await db.delete(titleDefinitions).where(eq(titleDefinitions.id, input.id));
      return { success: true };
    }),
});

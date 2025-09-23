import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../trpc';
import { itemTypes, eq, desc, asc, ilike, count, sql } from '@contentsmith/database';
import { db } from '../db';
import {
  createItemTypesSchema,
  updateItemTypesSchema,
  getItemTypesByIdSchema,
  deleteItemTypesSchema,
  listItemTypesSchema,
} from '@contentsmith/validation';

export const itemTypesRouter = createTRPCRouter({
  // List item types with pagination and search
  list: publicProcedure
    .input(listItemTypesSchema)
    .query(async ({ input }) => {
      const { search, page, limit, sortBy, sortOrder } = input;
      const offset = (page - 1) * limit;

      // Build search condition
      const searchCondition = search
        ? ilike(itemTypes.name, `%${search}%`)
        : undefined;

      // Build sort condition
      const sortColumn = sortBy === 'id' ? itemTypes.id :
                        sortBy === 'name' ? itemTypes.name :
                        itemTypes.slug;
      const sortCondition = sortOrder === 'desc' ? desc(sortColumn) : asc(sortColumn);

      // Get total count
      const [totalResult] = await db
        .select({ count: count() })
        .from(itemTypes)
        .where(searchCondition);

      const total = totalResult?.count || 0;

      // Get paginated results
      const results = await db
        .select()
        .from(itemTypes)
        .where(searchCondition)
        .orderBy(sortCondition)
        .limit(limit)
        .offset(offset);

      return {
        data: results,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    }),

  // Get item type by ID
  getById: publicProcedure
    .input(getItemTypesByIdSchema)
    .query(async ({ input }) => {
      const [result] = await db
        .select()
        .from(itemTypes)
        .where(eq(itemTypes.id, input.id))
        .limit(1);

      if (!result) {
        throw new Error('Item type not found');
      }

      return result;
    }),

  // Create new item type
  create: publicProcedure
    .input(createItemTypesSchema)
    .mutation(async ({ input }) => {
      const [result] = await db
        .insert(itemTypes)
        .values(input)
        .returning();

      return result;
    }),

  // Update item type
  update: publicProcedure
    .input(updateItemTypesSchema)
    .mutation(async ({ input }) => {
      const { id, ...updateData } = input;

      const [result] = await db
        .update(itemTypes)
        .set(updateData)
        .where(eq(itemTypes.id, id))
        .returning();

      if (!result) {
        throw new Error('Item type not found');
      }

      return result;
    }),

  // Delete item type
  delete: publicProcedure
    .input(deleteItemTypesSchema)
    .mutation(async ({ input }) => {
      const [result] = await db
        .delete(itemTypes)
        .where(eq(itemTypes.id, input.id))
        .returning();

      if (!result) {
        throw new Error('Item type not found');
      }

      return result;
    }),
});
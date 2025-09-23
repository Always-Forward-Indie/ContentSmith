import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../trpc';
import { itemAttributes, eq, desc, asc, like, and, sql } from '@contentsmith/database';
import { 
  createItemAttributeSchema, 
  updateItemAttributeSchema, 
  itemAttributeIdSchema
} from '@contentsmith/validation';
import { db } from '../db';

const itemAttributesListQuerySchema = z.object({
  search: z.string().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(50),
  sortBy: z.enum(['name', 'slug']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export const itemAttributesRouter = createTRPCRouter({
  list: publicProcedure
    .input(itemAttributesListQuerySchema)
    .query(async ({ input }) => {
      const { search, page, limit, sortBy, sortOrder } = input;
      const offset = (page - 1) * limit;

      // Build where conditions
      const whereConditions = [];
      if (search) {
        whereConditions.push(like(itemAttributes.name, `%${search}%`));
      }
      const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

      // Build order by
      let orderBy;
      if (sortBy === 'name') {
        orderBy = sortOrder === 'desc' ? desc(itemAttributes.name) : asc(itemAttributes.name);
      } else if (sortBy === 'slug') {
        orderBy = sortOrder === 'desc' ? desc(itemAttributes.slug) : asc(itemAttributes.slug);
      } else {
        orderBy = asc(itemAttributes.name); // default
      }

      // Get total count
      const [totalResult] = await db
        .select({ total: sql<number>`count(*)` })
        .from(itemAttributes)
        .where(whereClause);
      
      const total = totalResult?.total ?? 0;

      // Get paginated data
      const data = await db
        .select()
        .from(itemAttributes)
        .where(whereClause)
        .orderBy(orderBy)
        .limit(limit)
        .offset(offset);

      return {
        data,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    }),

  getById: publicProcedure
    .input(itemAttributeIdSchema)
    .query(async ({ input }) => {
      const [itemAttribute] = await db
        .select()
        .from(itemAttributes)
        .where(eq(itemAttributes.id, input.id));

      if (!itemAttribute) {
        throw new Error('Item attribute not found');
      }

      return itemAttribute;
    }),

  create: publicProcedure
    .input(createItemAttributeSchema)
    .mutation(async ({ input }) => {
      const [newItemAttribute] = await db
        .insert(itemAttributes)
        .values(input)
        .returning();

      return newItemAttribute;
    }),

  update: publicProcedure
    .input(z.intersection(itemAttributeIdSchema, updateItemAttributeSchema))
    .mutation(async ({ input }) => {
      const { id, ...updateData } = input;

      const [updatedItemAttribute] = await db
        .update(itemAttributes)
        .set(updateData)
        .where(eq(itemAttributes.id, id))
        .returning();

      if (!updatedItemAttribute) {
        throw new Error('Item attribute not found');
      }

      return updatedItemAttribute;
    }),

  delete: publicProcedure
    .input(itemAttributeIdSchema)
    .mutation(async ({ input }) => {
      const [deletedItemAttribute] = await db
        .delete(itemAttributes)
        .where(eq(itemAttributes.id, input.id))
        .returning();

      if (!deletedItemAttribute) {
        throw new Error('Item attribute not found');
      }

      return deletedItemAttribute;
    }),
});
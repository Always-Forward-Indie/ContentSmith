import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../trpc';
import { entityAttributes, eq, desc, asc, like, and, sql } from '@contentsmith/database';
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

      const whereConditions = [];
      if (search) {
        whereConditions.push(like(entityAttributes.name, `%${search}%`));
      }
      const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

      let orderBy;
      if (sortBy === 'name') {
        orderBy = sortOrder === 'desc' ? desc(entityAttributes.name) : asc(entityAttributes.name);
      } else if (sortBy === 'slug') {
        orderBy = sortOrder === 'desc' ? desc(entityAttributes.slug) : asc(entityAttributes.slug);
      } else {
        orderBy = asc(entityAttributes.name);
      }

      const [totalResult] = await db
        .select({ total: sql<number>`count(*)` })
        .from(entityAttributes)
        .where(whereClause);
      
      const total = totalResult?.total ?? 0;

      const data = await db
        .select()
        .from(entityAttributes)
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
      const [attr] = await db
        .select()
        .from(entityAttributes)
        .where(eq(entityAttributes.id, input.id));

      if (!attr) {
        throw new Error('Attribute not found');
      }

      return attr;
    }),

  create: publicProcedure
    .input(createItemAttributeSchema)
    .mutation(async ({ input }) => {
      const [newAttr] = await db
        .insert(entityAttributes)
        .values(input)
        .returning();

      return newAttr;
    }),

  update: publicProcedure
    .input(z.intersection(itemAttributeIdSchema, updateItemAttributeSchema))
    .mutation(async ({ input }) => {
      const { id, ...updateData } = input;

      const [updatedAttr] = await db
        .update(entityAttributes)
        .set(updateData)
        .where(eq(entityAttributes.id, id))
        .returning();

      if (!updatedAttr) {
        throw new Error('Attribute not found');
      }

      return updatedAttr;
    }),

  delete: publicProcedure
    .input(itemAttributeIdSchema)
    .mutation(async ({ input }) => {
      const [deletedAttr] = await db
        .delete(entityAttributes)
        .where(eq(entityAttributes.id, input.id))
        .returning();

      if (!deletedAttr) {
        throw new Error('Attribute not found');
      }

      return deletedAttr;
    }),
});
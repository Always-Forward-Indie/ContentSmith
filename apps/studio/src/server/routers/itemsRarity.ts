import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../trpc';
import { itemsRarity, eq, desc, asc, like, and, sql } from '@contentsmith/database';
import { db } from '../db';

// Temporary schemas until they are added to validation package
const createItemsRaritySchema = z.object({
  name: z.string().min(1).max(30),
  colorHex: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color'),
  slug: z.string().min(1).max(30).optional(),
});

const updateItemsRaritySchema = createItemsRaritySchema.partial();

const itemsRarityIdSchema = z.object({
  id: z.number().int().positive(),
});

const itemsRarityListQuerySchema = z.object({
  search: z.string().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(50),
  sortBy: z.enum(['name', 'slug', 'colorHex']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export const itemsRarityRouter = createTRPCRouter({
  list: publicProcedure
    .input(itemsRarityListQuerySchema)
    .query(async ({ input }) => {
      const { search, page, limit, sortBy, sortOrder } = input;
      const offset = (page - 1) * limit;

      // Build where conditions
      const whereConditions = [];
      if (search) {
        whereConditions.push(like(itemsRarity.name, `%${search}%`));
      }
      const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

      // Build order by
      let orderBy;
      if (sortBy === 'name') {
        orderBy = sortOrder === 'desc' ? desc(itemsRarity.name) : asc(itemsRarity.name);
      } else if (sortBy === 'slug') {
        orderBy = sortOrder === 'desc' ? desc(itemsRarity.slug) : asc(itemsRarity.slug);
      } else if (sortBy === 'colorHex') {
        orderBy = sortOrder === 'desc' ? desc(itemsRarity.colorHex) : asc(itemsRarity.colorHex);
      } else {
        orderBy = asc(itemsRarity.name); // default
      }

      // Get total count
      const [totalResult] = await db
        .select({ total: sql<number>`count(*)` })
        .from(itemsRarity)
        .where(whereClause);
      
      const total = totalResult?.total ?? 0;

      // Get paginated data
      const data = await db
        .select()
        .from(itemsRarity)
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
    .input(itemsRarityIdSchema)
    .query(async ({ input }) => {
      const [rarity] = await db
        .select()
        .from(itemsRarity)
        .where(eq(itemsRarity.id, input.id));

      if (!rarity) {
        throw new Error('Items rarity not found');
      }

      return rarity;
    }),

  create: publicProcedure
    .input(createItemsRaritySchema)
    .mutation(async ({ input }) => {
      const [newRarity] = await db
        .insert(itemsRarity)
        .values(input)
        .returning();

      return newRarity;
    }),

  update: publicProcedure
    .input(z.intersection(itemsRarityIdSchema, updateItemsRaritySchema))
    .mutation(async ({ input }) => {
      const { id, ...updateData } = input;

      const [updatedRarity] = await db
        .update(itemsRarity)
        .set(updateData)
        .where(eq(itemsRarity.id, id))
        .returning();

      if (!updatedRarity) {
        throw new Error('Items rarity not found');
      }

      return updatedRarity;
    }),

  delete: publicProcedure
    .input(itemsRarityIdSchema)
    .mutation(async ({ input }) => {
      const [deletedRarity] = await db
        .delete(itemsRarity)
        .where(eq(itemsRarity.id, input.id))
        .returning();

      if (!deletedRarity) {
        throw new Error('Items rarity not found');
      }

      return deletedRarity;
    }),
});
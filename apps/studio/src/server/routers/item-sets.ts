import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../trpc';
import { db } from '../db';
import { itemSets, itemSetMembers, itemSetBonuses, items, entityAttributes } from '@contentsmith/database';
import { eq, like, count } from '@contentsmith/database';
import {
  itemSetListQuerySchema,
  itemSetIdSchema,
  createItemSetSchema,
  updateItemSetSchema,
  addItemToSetSchema,
  removeItemFromSetSchema,
  createItemSetBonusSchema,
  updateItemSetBonusSchema,
} from '@contentsmith/validation';

export const itemSetsRouter = createTRPCRouter({
  list: publicProcedure
    .input(itemSetListQuerySchema)
    .query(async ({ input }) => {
      const { search, page, pageSize } = input;
      const offset = (page - 1) * pageSize;
      const whereClause = search ? like(itemSets.name, `%${search}%`) : undefined;
      const [total] = await db.select({ total: count() }).from(itemSets).where(whereClause);
      const data = await db.select().from(itemSets).where(whereClause).orderBy(itemSets.name).limit(pageSize).offset(offset);
      return { data, pagination: { page, pageSize, total: total.total, totalPages: Math.ceil(total.total / pageSize) } };
    }),

  getById: publicProcedure
    .input(itemSetIdSchema)
    .query(async ({ input }) => {
      const [set] = await db.select().from(itemSets).where(eq(itemSets.id, input.id));
      if (!set) throw new Error('Item set not found');
      const members = await db
        .select({ itemId: itemSetMembers.itemId, itemName: items.name, itemSlug: items.slug })
        .from(itemSetMembers)
        .leftJoin(items, eq(itemSetMembers.itemId, items.id))
        .where(eq(itemSetMembers.setId, input.id));
      const bonuses = await db
        .select({
          id: itemSetBonuses.id,
          piecesRequired: itemSetBonuses.piecesRequired,
          attributeId: itemSetBonuses.attributeId,
          bonusValue: itemSetBonuses.bonusValue,
          attributeName: entityAttributes.name,
        })
        .from(itemSetBonuses)
        .leftJoin(entityAttributes, eq(itemSetBonuses.attributeId, entityAttributes.id))
        .where(eq(itemSetBonuses.setId, input.id))
        .orderBy(itemSetBonuses.piecesRequired);
      return { ...set, members, bonuses };
    }),

  create: publicProcedure
    .input(createItemSetSchema)
    .mutation(async ({ input }) => {
      const [result] = await db.insert(itemSets).values(input).returning();
      return result;
    }),

  update: publicProcedure
    .input(updateItemSetSchema)
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      const [result] = await db.update(itemSets).set(data).where(eq(itemSets.id, id)).returning();
      if (!result) throw new Error('Item set not found');
      return result;
    }),

  delete: publicProcedure
    .input(itemSetIdSchema)
    .mutation(async ({ input }) => {
      await db.delete(itemSets).where(eq(itemSets.id, input.id));
      return { success: true };
    }),

  addItem: publicProcedure
    .input(addItemToSetSchema)
    .mutation(async ({ input }) => {
      await db.insert(itemSetMembers).values(input).onConflictDoNothing();
      return { success: true };
    }),

  removeItem: publicProcedure
    .input(removeItemFromSetSchema)
    .mutation(async ({ input }) => {
      const { setId, itemId } = input;
      await db.delete(itemSetMembers).where(eq(itemSetMembers.setId, setId));
      return { success: true };
    }),

  addBonus: publicProcedure
    .input(createItemSetBonusSchema)
    .mutation(async ({ input }) => {
      const [result] = await db.insert(itemSetBonuses).values(input).returning();
      return result;
    }),

  updateBonus: publicProcedure
    .input(updateItemSetBonusSchema)
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      const [result] = await db.update(itemSetBonuses).set(data).where(eq(itemSetBonuses.id, id)).returning();
      if (!result) throw new Error('Bonus not found');
      return result;
    }),

  removeBonus: publicProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      await db.delete(itemSetBonuses).where(eq(itemSetBonuses.id, input.id));
      return { success: true };
    }),
});

import { createTRPCRouter, publicProcedure } from '../trpc';
import { db } from '../db';
import { equipSlot, eq, desc, asc, ilike, count } from '@contentsmith/database';
import {
  createEquipSlotSchema,
  updateEquipSlotSchema,
  getEquipSlotByIdSchema,
  deleteEquipSlotSchema,
  listEquipSlotsSchema,
} from '@contentsmith/validation';

export const equipSlotsRouter = createTRPCRouter({
  list: publicProcedure
    .input(listEquipSlotsSchema)
    .query(async ({ input }) => {
      const { search, page, limit, sortBy, sortOrder } = input;
      const offset = (page - 1) * limit;

      const searchCondition = search
        ? ilike(equipSlot.name, `%${search}%`)
        : undefined;

      const sortColumn =
        sortBy === 'id' ? equipSlot.id :
        sortBy === 'name' ? equipSlot.name :
        equipSlot.slug;
      const sortCondition = sortOrder === 'desc' ? desc(sortColumn) : asc(sortColumn);

      const [totalResult] = await db
        .select({ count: count() })
        .from(equipSlot)
        .where(searchCondition);

      const results = await db
        .select()
        .from(equipSlot)
        .where(searchCondition)
        .orderBy(sortCondition)
        .limit(limit)
        .offset(offset);

      return {
        data: results,
        pagination: {
          page,
          limit,
          total: totalResult?.count ?? 0,
          pages: Math.ceil((totalResult?.count ?? 0) / limit),
        },
      };
    }),

  // Simple list without pagination (for selects in forms)
  all: publicProcedure.query(async () => {
    return db.select().from(equipSlot).orderBy(asc(equipSlot.id));
  }),

  getById: publicProcedure
    .input(getEquipSlotByIdSchema)
    .query(async ({ input }) => {
      const [result] = await db
        .select()
        .from(equipSlot)
        .where(eq(equipSlot.id, input.id))
        .limit(1);

      if (!result) throw new Error('Equip slot not found');
      return result;
    }),

  create: publicProcedure
    .input(createEquipSlotSchema)
    .mutation(async ({ input }) => {
      const [result] = await db.insert(equipSlot).values(input).returning();
      return result;
    }),

  update: publicProcedure
    .input(updateEquipSlotSchema)
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      const [result] = await db
        .update(equipSlot)
        .set(data)
        .where(eq(equipSlot.id, id))
        .returning();

      if (!result) throw new Error('Equip slot not found');
      return result;
    }),

  delete: publicProcedure
    .input(deleteEquipSlotSchema)
    .mutation(async ({ input }) => {
      const [result] = await db
        .delete(equipSlot)
        .where(eq(equipSlot.id, input.id))
        .returning();

      if (!result) throw new Error('Equip slot not found');
      return result;
    }),
});

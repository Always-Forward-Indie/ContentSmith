import { z } from 'zod';
import { eq, like, or, and, count } from '@contentsmith/database';
import { db } from '../db';
import { vendorNpc, vendorInventory, npc, items } from '@contentsmith/database';
import { createTRPCRouter, publicProcedure } from '../trpc';
import {
  createVendorSchema, updateVendorSchema, vendorIdSchema,
  addVendorItemSchema, updateVendorItemSchema, removeVendorItemSchema,
} from '@contentsmith/validation';

export const vendorsRouter = createTRPCRouter({
  // ─── Vendor NPCs ────────────────────────────────────────────────────────────

  list: publicProcedure
    .input(z.object({
      search: z.string().optional(),
      page: z.number().int().min(1).default(1),
      pageSize: z.number().int().min(1).max(100).default(20),
    }))
    .query(async ({ input }) => {
      const { search, page, pageSize } = input;
      const offset = (page - 1) * pageSize;
      const whereClause = search
        ? or(like(npc.name, `%${search}%`), like(npc.slug, `%${search}%`))
        : undefined;
      const [{ total }] = await db.select({ total: count() }).from(vendorNpc).leftJoin(npc, eq(npc.id, vendorNpc.npcId)).where(whereClause);
      const data = await db
        .select({ id: vendorNpc.id, npcId: vendorNpc.npcId, npcName: npc.name, npcSlug: npc.slug, markupPct: vendorNpc.markupPct })
        .from(vendorNpc)
        .leftJoin(npc, eq(npc.id, vendorNpc.npcId))
        .where(whereClause)
        .orderBy(npc.name)
        .limit(pageSize)
        .offset(offset);
      return { data, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } };
    }),

  getById: publicProcedure.input(vendorIdSchema).query(async ({ input }) => {
    const rows = await db
      .select({
        id: vendorNpc.id,
        npcId: vendorNpc.npcId,
        npcName: npc.name,
        npcSlug: npc.slug,
        markupPct: vendorNpc.markupPct,
      })
      .from(vendorNpc)
      .leftJoin(npc, eq(npc.id, vendorNpc.npcId))
      .where(eq(vendorNpc.id, input.id))
      .limit(1);
    if (!rows[0]) throw new Error('Vendor not found');
    return rows[0];
  }),

  create: publicProcedure.input(createVendorSchema).mutation(async ({ input }) => {
    const rows = await db.insert(vendorNpc).values(input).returning();
    return rows[0];
  }),

  update: publicProcedure.input(updateVendorSchema).mutation(async ({ input }) => {
    const { id, ...rest } = input;
    const rows = await db.update(vendorNpc).set(rest).where(eq(vendorNpc.id, id)).returning();
    if (!rows[0]) throw new Error('Vendor not found');
    return rows[0];
  }),

  delete: publicProcedure.input(vendorIdSchema).mutation(async ({ input }) => {
    await db.delete(vendorNpc).where(eq(vendorNpc.id, input.id));
    return { success: true };
  }),

  // ─── Vendor Inventory ───────────────────────────────────────────────────────

  listInventory: publicProcedure.input(vendorIdSchema).query(async ({ input }) => {
    return db
      .select({
        id: vendorInventory.id,
        vendorNpcId: vendorInventory.vendorNpcId,
        itemId: vendorInventory.itemId,
        itemName: items.name,
        itemSlug: items.slug,
        stockCount: vendorInventory.stockCount,
        priceOverride: vendorInventory.priceOverride,
      })
      .from(vendorInventory)
      .leftJoin(items, eq(items.id, vendorInventory.itemId))
      .where(eq(vendorInventory.vendorNpcId, input.id))
      .orderBy(items.name);
  }),

  allNpcs: publicProcedure.query(async () => {
    return db.select({ id: npc.id, name: npc.name, slug: npc.slug }).from(npc).orderBy(npc.name);
  }),

  allItems: publicProcedure.query(async () => {
    return db.select({ id: items.id, name: items.name, slug: items.slug }).from(items).orderBy(items.name);
  }),

  addItem: publicProcedure.input(addVendorItemSchema).mutation(async ({ input }) => {
    const rows = await db.insert(vendorInventory).values(input).returning();
    return rows[0];
  }),

  updateItem: publicProcedure.input(updateVendorItemSchema).mutation(async ({ input }) => {
    const { id, ...rest } = input;
    await db.update(vendorInventory).set(rest).where(eq(vendorInventory.id, id));
    return { success: true };
  }),

  removeItem: publicProcedure.input(removeVendorItemSchema).mutation(async ({ input }) => {
    await db.delete(vendorInventory).where(eq(vendorInventory.id, input.id));
    return { success: true };
  }),
});

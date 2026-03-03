import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { createTRPCRouter, publicProcedure } from '../trpc';
import { playerInventory, items } from '../schema';
import { logGmAction } from '../utils/gmLog';

export const inventoryRouter = createTRPCRouter({
  list: publicProcedure
    .input(z.object({ characterId: z.number() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select({
          id: playerInventory.id,
          itemId: playerInventory.itemId,
          itemName: items.name,
          itemSlug: items.slug,
          description: items.description,
          quantity: playerInventory.quantity,
        })
        .from(playerInventory)
        .leftJoin(items, eq(items.id, playerInventory.itemId))
        .where(eq(playerInventory.characterId, input.characterId))
        .orderBy(items.name);
    }),

  giveItem: publicProcedure
    .input(z.object({
      characterId: z.number(),
      itemId: z.number(),
      quantity: z.number().min(1).default(1),
    }))
    .mutation(async ({ ctx, input }) => {
      // Проверяем, есть ли уже этот предмет в инвентаре
      const existing = await ctx.db
        .select({ id: playerInventory.id, quantity: playerInventory.quantity, itemId: playerInventory.itemId })
        .from(playerInventory)
        .where(eq(playerInventory.characterId, input.characterId))
        .then(rows => rows.find(r => Number(r.itemId) === input.itemId));

      if (existing) {
        await ctx.db
          .update(playerInventory)
          .set({ quantity: (existing.quantity ?? 1) + input.quantity })
          .where(eq(playerInventory.id, existing.id!));
      } else {
        await ctx.db.insert(playerInventory).values({
          characterId: input.characterId,
          itemId: input.itemId,
          quantity: input.quantity,
        });
      }
      await logGmAction({ actionType: 'give_item', targetType: 'character', targetId: input.characterId, newValue: { itemId: input.itemId, quantity: input.quantity }, gmUserId: null });
      return { success: true };
    }),

  removeItem: publicProcedure
    .input(z.object({ inventoryId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const old = await ctx.db.select({ characterId: playerInventory.characterId, itemId: playerInventory.itemId, quantity: playerInventory.quantity }).from(playerInventory).where(eq(playerInventory.id, input.inventoryId)).then(r => r[0]);
      await ctx.db
        .delete(playerInventory)
        .where(eq(playerInventory.id, input.inventoryId));
      await logGmAction({ actionType: 'remove_item', targetType: 'character', targetId: old?.characterId ?? 0, oldValue: { itemId: old?.itemId, quantity: old?.quantity }, gmUserId: null });
      return { success: true };
    }),

  // Выдать конкретный предмет по inventoryId — уменьшить количество или удалить
  updateQuantity: publicProcedure
    .input(z.object({ inventoryId: z.number(), quantity: z.number().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const old = await ctx.db.select({ characterId: playerInventory.characterId, itemId: playerInventory.itemId, quantity: playerInventory.quantity }).from(playerInventory).where(eq(playerInventory.id, input.inventoryId)).then(r => r[0]);
      await ctx.db
        .update(playerInventory)
        .set({ quantity: input.quantity })
        .where(eq(playerInventory.id, input.inventoryId));
      await logGmAction({ actionType: 'update_item_quantity', targetType: 'character', targetId: old?.characterId ?? 0, oldValue: { itemId: old?.itemId, quantity: old?.quantity }, newValue: { quantity: input.quantity }, gmUserId: null });
      return { success: true };
    }),

  // Список всех предметов для поиска
  allItems: publicProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select({ id: items.id, name: items.name, slug: items.slug })
      .from(items)
      .orderBy(items.name);
  }),
});

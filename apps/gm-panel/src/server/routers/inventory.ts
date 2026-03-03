import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { createTRPCRouter, publicProcedure } from '../trpc';
import { playerInventory, items } from '../schema';

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
      return { success: true };
    }),

  removeItem: publicProcedure
    .input(z.object({ inventoryId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(playerInventory)
        .where(eq(playerInventory.id, input.inventoryId));
      return { success: true };
    }),

  // Выдать конкретный предмет по inventoryId — уменьшить количество или удалить
  updateQuantity: publicProcedure
    .input(z.object({ inventoryId: z.number(), quantity: z.number().min(1) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(playerInventory)
        .set({ quantity: input.quantity })
        .where(eq(playerInventory.id, input.inventoryId));
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

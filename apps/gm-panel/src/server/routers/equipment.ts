import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../trpc';
import { and, eq } from 'drizzle-orm';
import { characterEquipment, playerInventory, items, equipSlots } from '../schema';
import { logGmAction } from '../utils/gmLog';

export const equipmentRouter = createTRPCRouter({
  // Список слотов экипировки
  allSlots: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.select({ id: equipSlots.id, name: equipSlots.name }).from(equipSlots).orderBy(equipSlots.id);
  }),

  // Надеть предмет из инвентаря в слот (один предмет на слот)
  equip: publicProcedure
    .input(z.object({
      characterId: z.number(),
      inventoryItemId: z.number(),
      equipSlotId: z.number(),
      gmUserId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Проверить, что предмет принадлежит этому персонажу
      const invItem = await ctx.db
        .select({ id: playerInventory.id, itemId: playerInventory.itemId })
        .from(playerInventory)
        .where(and(eq(playerInventory.id, input.inventoryItemId), eq(playerInventory.characterId, input.characterId)))
        .then(r => r[0]);
      if (!invItem) throw new Error('Предмет не найден в инвентаре персонажа');

      // Снять то, что уже надето в этот слот (если есть)
      const existing = await ctx.db
        .select({ id: characterEquipment.id })
        .from(characterEquipment)
        .where(and(eq(characterEquipment.characterId, input.characterId), eq(characterEquipment.equipSlotId, input.equipSlotId)))
        .then(r => r[0]);
      if (existing) {
        await ctx.db.delete(characterEquipment).where(eq(characterEquipment.id, existing.id));
      }

      await ctx.db.insert(characterEquipment).values({
        characterId: input.characterId,
        inventoryItemId: input.inventoryItemId,
        equipSlotId: input.equipSlotId,
      });

      const [item] = await ctx.db
        .select({ name: items.name })
        .from(items)
        .leftJoin(playerInventory, eq(playerInventory.itemId, items.id))
        .where(eq(playerInventory.id, input.inventoryItemId));

      await logGmAction({
        actionType: 'equip_item',
        targetType: 'character',
        targetId: input.characterId,
        newValue: { equipSlotId: input.equipSlotId, itemName: item?.name, inventoryItemId: input.inventoryItemId, replaced: !!existing },
        gmUserId: input.gmUserId ?? null,
      });

      return { success: true };
    }),

  // Всё одето на персонаже
  list: publicProcedure
    .input(z.object({ characterId: z.number() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select({
          id: characterEquipment.id,
          equipSlotId: characterEquipment.equipSlotId,
          inventoryItemId: characterEquipment.inventoryItemId,
          equippedAt: characterEquipment.equippedAt,
          itemId: playerInventory.itemId,
          itemName: items.name,
          itemSlug: items.slug,
          quantity: playerInventory.quantity,
          durabilityCurrent: playerInventory.durabilityCurrent,
        })
        .from(characterEquipment)
        .leftJoin(playerInventory, eq(playerInventory.id, characterEquipment.inventoryItemId))
        .leftJoin(items, eq(items.id, playerInventory.itemId))
        .where(eq(characterEquipment.characterId, input.characterId))
        .orderBy(characterEquipment.equipSlotId);
    }),

  // Снять предмет с конкретного слота
  unequip: publicProcedure
    .input(z.object({
      equipmentId: z.number(),
      characterId: z.number(),
      gmUserId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select({ itemName: items.name, equipSlotId: characterEquipment.equipSlotId })
        .from(characterEquipment)
        .leftJoin(playerInventory, eq(playerInventory.id, characterEquipment.inventoryItemId))
        .leftJoin(items, eq(items.id, playerInventory.itemId))
        .where(eq(characterEquipment.id, input.equipmentId));

      await ctx.db
        .delete(characterEquipment)
        .where(eq(characterEquipment.id, input.equipmentId));

      await logGmAction({
        actionType: 'unequip_item',
        targetType: 'character',
        targetId: input.characterId,
        oldValue: { equipSlotId: row?.equipSlotId, itemName: row?.itemName },
        gmUserId: input.gmUserId ?? null,
      });

      return { success: true };
    }),

  // Снять всю экипировку
  unequipAll: publicProcedure
    .input(z.object({
      characterId: z.number(),
      gmUserId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(characterEquipment)
        .where(eq(characterEquipment.characterId, input.characterId));

      await logGmAction({
        actionType: 'unequip_all',
        targetType: 'character',
        targetId: input.characterId,
        gmUserId: input.gmUserId ?? null,
      });

      return { success: true };
    }),
});

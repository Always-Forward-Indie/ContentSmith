import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { createTRPCRouter, publicProcedure } from '../trpc';
import { characterPermanentModifiers, entityAttributes } from '../schema';
import { logGmAction } from '../utils/gmLog';

export const attributesRouter = createTRPCRouter({
  list: publicProcedure
    .input(z.object({ characterId: z.number() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select({
          id: characterPermanentModifiers.id,
          attributeId: characterPermanentModifiers.attributeId,
          attributeName: entityAttributes.name,
          attributeSlug: entityAttributes.slug,
          value: characterPermanentModifiers.value,
          sourceType: characterPermanentModifiers.sourceType,
          sourceId: characterPermanentModifiers.sourceId,
        })
        .from(characterPermanentModifiers)
        .leftJoin(entityAttributes, eq(entityAttributes.id, characterPermanentModifiers.attributeId))
        .where(eq(characterPermanentModifiers.characterId, input.characterId))
        .orderBy(entityAttributes.name);
    }),

  // Справочник всех атрибутов (для добавления)
  allAttributes: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.select({ id: entityAttributes.id, name: entityAttributes.name, slug: entityAttributes.slug }).from(entityAttributes).orderBy(entityAttributes.name);
  }),

  setValue: publicProcedure
    .input(z.object({
      characterId: z.number(),
      attributeId: z.number(),
      value: z.number(),
      sourceType: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const updates: { value: string; sourceType?: string } = { value: String(input.value) };
      if (input.sourceType) updates.sourceType = input.sourceType;
      await ctx.db
        .update(characterPermanentModifiers)
        .set(updates)
        .where(and(
          eq(characterPermanentModifiers.characterId, input.characterId),
          eq(characterPermanentModifiers.attributeId, input.attributeId),
        ));
      await logGmAction({ actionType: 'set_attribute', targetType: 'character', targetId: input.characterId, newValue: { attributeId: input.attributeId, value: input.value, sourceType: input.sourceType }, gmUserId: null });
      return { success: true };
    }),

  // Добавить атрибут персонажу (если ещё нет)
  addAttribute: publicProcedure
    .input(z.object({
      characterId: z.number(),
      attributeId: z.number(),
      value: z.number().default(0),
      sourceType: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.insert(characterPermanentModifiers).values({
        characterId: input.characterId,
        attributeId: input.attributeId,
        value: String(input.value),
        sourceType: input.sourceType ?? 'gm',
      }).onConflictDoNothing();
      await logGmAction({ actionType: 'add_attribute', targetType: 'character', targetId: input.characterId, newValue: { attributeId: input.attributeId, value: input.value, sourceType: input.sourceType ?? 'gm' }, gmUserId: null });
      return { success: true };
    }),

  // Удалить атрибут персонажа
  deleteAttribute: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const old = await ctx.db.select({ characterId: characterPermanentModifiers.characterId, attributeId: characterPermanentModifiers.attributeId, value: characterPermanentModifiers.value }).from(characterPermanentModifiers).where(eq(characterPermanentModifiers.id, input.id)).then(r => r[0]);
      await ctx.db.delete(characterPermanentModifiers).where(eq(characterPermanentModifiers.id, input.id));
      await logGmAction({ actionType: 'delete_attribute', targetType: 'character', targetId: old?.characterId ?? 0, oldValue: { attributeId: old?.attributeId, value: old?.value }, gmUserId: null });
      return { success: true };
    }),
});

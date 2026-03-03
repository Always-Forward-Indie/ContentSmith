import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { createTRPCRouter, publicProcedure } from '../trpc';
import { characterAttributes, entityAttributes } from '../schema';

export const attributesRouter = createTRPCRouter({
  list: publicProcedure
    .input(z.object({ characterId: z.number() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select({
          id: characterAttributes.id,
          attributeId: characterAttributes.attributeId,
          attributeName: entityAttributes.name,
          attributeSlug: entityAttributes.slug,
          value: characterAttributes.value,
        })
        .from(characterAttributes)
        .leftJoin(entityAttributes, eq(entityAttributes.id, characterAttributes.attributeId))
        .where(eq(characterAttributes.characterId, input.characterId))
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
    }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(characterAttributes)
        .set({ value: String(input.value) })
        .where(and(
          eq(characterAttributes.characterId, input.characterId),
          eq(characterAttributes.attributeId, input.attributeId),
        ));
      return { success: true };
    }),

  // Добавить атрибут персонажу (если ещё нет)
  addAttribute: publicProcedure
    .input(z.object({
      characterId: z.number(),
      attributeId: z.number(),
      value: z.number().default(0),
    }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.insert(characterAttributes).values({
        characterId: input.characterId,
        attributeId: input.attributeId,
        value: String(input.value),
      }).onConflictDoNothing();
      return { success: true };
    }),

  // Удалить атрибут персонажа
  deleteAttribute: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(characterAttributes).where(eq(characterAttributes.id, input.id));
      return { success: true };
    }),
});

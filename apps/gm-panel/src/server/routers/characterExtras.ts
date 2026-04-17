import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { createTRPCRouter, publicProcedure } from '../trpc';
import {
  characterTitles,
  characterReputation,
  characterPity,
  characterBestiary,
  characterEmotes,
  characterSkillMastery,
  characterSkillBar,
} from '../schema';
import { logGmAction } from '../utils/gmLog';

export const characterExtrasRouter = createTRPCRouter({
  // ─── Titles ──────────────────────────────────────────────
  listTitles: publicProcedure
    .input(z.object({ characterId: z.number() }))
    .query(({ ctx, input }) =>
      ctx.db
        .select()
        .from(characterTitles)
        .where(eq(characterTitles.characterId, input.characterId))
        .orderBy(characterTitles.titleSlug),
    ),

  grantTitle: publicProcedure
    .input(z.object({ characterId: z.number(), titleSlug: z.string().min(1).max(80) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .insert(characterTitles)
        .values({ characterId: input.characterId, titleSlug: input.titleSlug })
        .onConflictDoNothing();
      await logGmAction({
        actionType: 'grant_title',
        targetType: 'character',
        targetId: input.characterId,
        newValue: { titleSlug: input.titleSlug },
        gmUserId: null,
      });
      return { success: true };
    }),

  revokeTitle: publicProcedure
    .input(z.object({ characterId: z.number(), titleSlug: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(characterTitles)
        .where(and(
          eq(characterTitles.characterId, input.characterId),
          eq(characterTitles.titleSlug, input.titleSlug),
        ));
      await logGmAction({
        actionType: 'revoke_title',
        targetType: 'character',
        targetId: input.characterId,
        oldValue: { titleSlug: input.titleSlug },
        gmUserId: null,
      });
      return { success: true };
    }),

  setTitleEquipped: publicProcedure
    .input(z.object({ characterId: z.number(), titleSlug: z.string(), equipped: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      // Unequip all first if equipping
      if (input.equipped) {
        await ctx.db
          .update(characterTitles)
          .set({ equipped: false })
          .where(eq(characterTitles.characterId, input.characterId));
      }
      await ctx.db
        .update(characterTitles)
        .set({ equipped: input.equipped })
        .where(and(
          eq(characterTitles.characterId, input.characterId),
          eq(characterTitles.titleSlug, input.titleSlug),
        ));
      return { success: true };
    }),

  // ─── Reputation ──────────────────────────────────────────
  listReputation: publicProcedure
    .input(z.object({ characterId: z.number() }))
    .query(({ ctx, input }) =>
      ctx.db
        .select()
        .from(characterReputation)
        .where(eq(characterReputation.characterId, input.characterId))
        .orderBy(characterReputation.factionSlug),
    ),

  setReputation: publicProcedure
    .input(z.object({ characterId: z.number(), factionSlug: z.string().min(1).max(60), value: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db
        .select({ value: characterReputation.value })
        .from(characterReputation)
        .where(and(
          eq(characterReputation.characterId, input.characterId),
          eq(characterReputation.factionSlug, input.factionSlug),
        ))
        .then(r => r[0]);

      if (existing) {
        await ctx.db
          .update(characterReputation)
          .set({ value: input.value })
          .where(and(
            eq(characterReputation.characterId, input.characterId),
            eq(characterReputation.factionSlug, input.factionSlug),
          ));
      } else {
        await ctx.db.insert(characterReputation).values({
          characterId: input.characterId,
          factionSlug: input.factionSlug,
          value: input.value,
        });
      }

      await logGmAction({
        actionType: 'set_reputation',
        targetType: 'character',
        targetId: input.characterId,
        oldValue: { factionSlug: input.factionSlug, value: existing?.value },
        newValue: { factionSlug: input.factionSlug, value: input.value },
        gmUserId: null,
      });
      return { success: true };
    }),

  resetReputation: publicProcedure
    .input(z.object({ characterId: z.number(), factionSlug: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(characterReputation)
        .where(and(
          eq(characterReputation.characterId, input.characterId),
          eq(characterReputation.factionSlug, input.factionSlug),
        ));
      await logGmAction({
        actionType: 'reset_reputation',
        targetType: 'character',
        targetId: input.characterId,
        oldValue: { factionSlug: input.factionSlug },
        gmUserId: null,
      });
      return { success: true };
    }),

  // ─── Pity (read-only) ────────────────────────────────────
  listPity: publicProcedure
    .input(z.object({ characterId: z.number() }))
    .query(({ ctx, input }) =>
      ctx.db
        .select()
        .from(characterPity)
        .where(eq(characterPity.characterId, input.characterId))
        .orderBy(characterPity.itemId),
    ),

  resetPity: publicProcedure
    .input(z.object({ characterId: z.number(), itemId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(characterPity)
        .set({ killCount: 0 })
        .where(and(
          eq(characterPity.characterId, input.characterId),
          eq(characterPity.itemId, input.itemId),
        ));
      await logGmAction({
        actionType: 'reset_pity',
        targetType: 'character',
        targetId: input.characterId,
        oldValue: { itemId: input.itemId },
        gmUserId: null,
      });
      return { success: true };
    }),

  // ─── Bestiary (read-only) ────────────────────────────────
  listBestiary: publicProcedure
    .input(z.object({ characterId: z.number() }))
    .query(({ ctx, input }) =>
      ctx.db
        .select()
        .from(characterBestiary)
        .where(eq(characterBestiary.characterId, input.characterId))
        .orderBy(characterBestiary.mobTemplateId),
    ),

  // ─── Emotes ──────────────────────────────────────────────
  listEmotes: publicProcedure
    .input(z.object({ characterId: z.number() }))
    .query(({ ctx, input }) =>
      ctx.db
        .select()
        .from(characterEmotes)
        .where(eq(characterEmotes.characterId, input.characterId))
        .orderBy(characterEmotes.emoteSlug),
    ),

  grantEmote: publicProcedure
    .input(z.object({ characterId: z.number(), emoteSlug: z.string().min(1).max(64) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .insert(characterEmotes)
        .values({ characterId: input.characterId, emoteSlug: input.emoteSlug })
        .onConflictDoNothing();
      await logGmAction({
        actionType: 'grant_emote',
        targetType: 'character',
        targetId: input.characterId,
        newValue: { emoteSlug: input.emoteSlug },
        gmUserId: null,
      });
      return { success: true };
    }),

  revokeEmote: publicProcedure
    .input(z.object({ characterId: z.number(), emoteSlug: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(characterEmotes)
        .where(and(
          eq(characterEmotes.characterId, input.characterId),
          eq(characterEmotes.emoteSlug, input.emoteSlug),
        ));
      await logGmAction({
        actionType: 'revoke_emote',
        targetType: 'character',
        targetId: input.characterId,
        oldValue: { emoteSlug: input.emoteSlug },
        gmUserId: null,
      });
      return { success: true };
    }),

  // ─── Skill Mastery ───────────────────────────────────────
  listMastery: publicProcedure
    .input(z.object({ characterId: z.number() }))
    .query(({ ctx, input }) =>
      ctx.db
        .select()
        .from(characterSkillMastery)
        .where(eq(characterSkillMastery.characterId, input.characterId))
        .orderBy(characterSkillMastery.masterySlug),
    ),

  setMastery: publicProcedure
    .input(z.object({ characterId: z.number(), masterySlug: z.string().min(1).max(60), value: z.number().min(0).max(200) }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db
        .select({ value: characterSkillMastery.value })
        .from(characterSkillMastery)
        .where(and(
          eq(characterSkillMastery.characterId, input.characterId),
          eq(characterSkillMastery.masterySlug, input.masterySlug),
        ))
        .then(r => r[0]);

      if (existing) {
        await ctx.db
          .update(characterSkillMastery)
          .set({ value: input.value })
          .where(and(
            eq(characterSkillMastery.characterId, input.characterId),
            eq(characterSkillMastery.masterySlug, input.masterySlug),
          ));
      } else {
        await ctx.db.insert(characterSkillMastery).values({
          characterId: input.characterId,
          masterySlug: input.masterySlug,
          value: input.value,
        });
      }

      await logGmAction({
        actionType: 'set_mastery',
        targetType: 'character',
        targetId: input.characterId,
        oldValue: { masterySlug: input.masterySlug, value: existing?.value },
        newValue: { masterySlug: input.masterySlug, value: input.value },
        gmUserId: null,
      });
      return { success: true };
    }),

  // ─── Skill Bar (read-only) ───────────────────────────────
  listSkillBar: publicProcedure
    .input(z.object({ characterId: z.number() }))
    .query(({ ctx, input }) =>
      ctx.db
        .select()
        .from(characterSkillBar)
        .where(eq(characterSkillBar.characterId, input.characterId))
        .orderBy(characterSkillBar.slotIndex),
    ),
});

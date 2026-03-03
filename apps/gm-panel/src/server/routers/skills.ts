import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { createTRPCRouter, publicProcedure } from '../trpc';
import { characterSkills, skills } from '../schema';
import { logGmAction } from '../utils/gmLog';

export const skillsRouter = createTRPCRouter({
  // Список скилов персонажа
  list: publicProcedure
    .input(z.object({ characterId: z.number() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select({
          id: characterSkills.id,
          skillId: characterSkills.skillId,
          skillName: skills.name,
          skillSlug: skills.slug,
          currentLevel: characterSkills.currentLevel,
        })
        .from(characterSkills)
        .leftJoin(skills, eq(skills.id, characterSkills.skillId))
        .where(eq(characterSkills.characterId, input.characterId))
        .orderBy(skills.name);
    }),

  // Справочник всех скилов
  allSkills: publicProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select({ id: skills.id, name: skills.name, slug: skills.slug })
      .from(skills)
      .orderBy(skills.name);
  }),

  // Добавить скил персонажу (или обновить уровень если уже есть)
  addSkill: publicProcedure
    .input(z.object({
      characterId: z.number(),
      skillId: z.number(),
      level: z.number().min(1).default(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db
        .select({ id: characterSkills.id })
        .from(characterSkills)
        .where(and(
          eq(characterSkills.characterId, input.characterId),
          eq(characterSkills.skillId, input.skillId),
        ))
        .then(r => r[0]);

      if (existing) {
        await ctx.db
          .update(characterSkills)
          .set({ currentLevel: input.level })
          .where(eq(characterSkills.id, existing.id));
      } else {
        await ctx.db.insert(characterSkills).values({
          characterId: input.characterId,
          skillId: input.skillId,
          currentLevel: input.level,
        });
      }
      await logGmAction({ actionType: 'add_skill', targetType: 'character', targetId: input.characterId, newValue: { skillId: input.skillId, level: input.level }, gmUserId: null });
      return { success: true };
    }),

  // Изменить уровень скила
  setLevel: publicProcedure
    .input(z.object({
      characterSkillId: z.number(),
      level: z.number().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const old = await ctx.db.select({ characterId: characterSkills.characterId, skillId: characterSkills.skillId, currentLevel: characterSkills.currentLevel }).from(characterSkills).where(eq(characterSkills.id, input.characterSkillId)).then(r => r[0]);
      await ctx.db
        .update(characterSkills)
        .set({ currentLevel: input.level })
        .where(eq(characterSkills.id, input.characterSkillId));
      await logGmAction({ actionType: 'set_skill_level', targetType: 'character', targetId: old?.characterId ?? 0, oldValue: { skillId: old?.skillId, level: old?.currentLevel }, newValue: { level: input.level }, gmUserId: null });
      return { success: true };
    }),

  // Удалить скил у персонажа
  removeSkill: publicProcedure
    .input(z.object({ characterSkillId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const old = await ctx.db.select({ characterId: characterSkills.characterId, skillId: characterSkills.skillId }).from(characterSkills).where(eq(characterSkills.id, input.characterSkillId)).then(r => r[0]);
      await ctx.db.delete(characterSkills).where(eq(characterSkills.id, input.characterSkillId));
      await logGmAction({ actionType: 'remove_skill', targetType: 'character', targetId: old?.characterId ?? 0, oldValue: { skillId: old?.skillId }, gmUserId: null });
      return { success: true };
    }),
});

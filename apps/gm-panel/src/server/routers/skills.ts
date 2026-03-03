import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { createTRPCRouter, publicProcedure } from '../trpc';
import { characterSkills, skills } from '../schema';

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
      return { success: true };
    }),

  // Изменить уровень скила
  setLevel: publicProcedure
    .input(z.object({
      characterSkillId: z.number(),
      level: z.number().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(characterSkills)
        .set({ currentLevel: input.level })
        .where(eq(characterSkills.id, input.characterSkillId));
      return { success: true };
    }),

  // Удалить скил у персонажа
  removeSkill: publicProcedure
    .input(z.object({ characterSkillId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(characterSkills).where(eq(characterSkills.id, input.characterSkillId));
      return { success: true };
    }),
});

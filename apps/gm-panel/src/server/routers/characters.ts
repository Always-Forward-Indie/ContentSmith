import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { createTRPCRouter, publicProcedure } from '../trpc';
import { characters, characterClass, race, expForLevel, characterAttributes, entityAttributes, characterSkills, users } from '../schema';
import { logGmAction } from '../utils/gmLog';

export const charactersRouter = createTRPCRouter({
  // Полная карточка персонажа
  byId: publicProcedure
    .input(z.object({ characterId: z.number() }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db
        .select({
          id: characters.id,
          name: characters.name,
          ownerId: characters.ownerId,
          ownerLogin: users.login,
          classId: characters.classId,
          className: characterClass.name,
          raceId: characters.raceId,
          raceName: race.name,
          level: characters.level,
          experiencePoints: characters.experiencePoints,
          currentHealth: characters.currentHealth,
          currentMana: characters.currentMana,
          isDead: characters.isDead,
          gender: characters.gender,
          freeSkillPoints: characters.freeSkillPoints,
          playTimeSec: characters.playTimeSec,
          accountSlot: characters.accountSlot,
          createdAt: characters.createdAt,
          lastOnlineAt: characters.lastOnlineAt,
        })
        .from(characters)
        .leftJoin(characterClass, eq(characterClass.id, characters.classId))
        .leftJoin(race, eq(race.id, characters.raceId))
        .leftJoin(users, eq(users.id, characters.ownerId))
        .where(eq(characters.id, input.characterId));
      return rows[0] ?? null;
    }),

  // Воскресить персонажа (is_dead = false, HP/MP = текущий уровень × 10)
  revive: publicProcedure
    .input(z.object({ characterId: z.number(), gmUserId: z.number().optional() }))
    .mutation(async ({ ctx, input }) => {
      const char = await ctx.db
        .select({ level: characters.level })
        .from(characters)
        .where(eq(characters.id, input.characterId))
        .then(r => r[0]);
      if (!char) throw new Error('Character not found');
      const baseHp = char.level * 10;
      await ctx.db
        .update(characters)
        .set({ isDead: false, currentHealth: baseHp, currentMana: baseHp })
        .where(eq(characters.id, input.characterId));
      await logGmAction({ actionType: 'revive_character', targetType: 'character', targetId: input.characterId, gmUserId: input.gmUserId ?? null });
      return { success: true };
    }),

  // Изменить уровень (пересчитывает experience_points по exp_for_level)
  setLevel: publicProcedure
    .input(z.object({ characterId: z.number(), level: z.number().min(1), gmUserId: z.number().optional() }))
    .mutation(async ({ ctx, input }) => {
      const expRow = await ctx.db
        .select({ experiencePoints: expForLevel.experiencePoints })
        .from(expForLevel)
        .where(eq(expForLevel.level, input.level))
        .then(r => r[0]);

      const experiencePoints = expRow?.experiencePoints ?? 0;

      await ctx.db
        .update(characters)
        .set({ level: input.level, experiencePoints })
        .where(eq(characters.id, input.characterId));
      await logGmAction({ actionType: 'set_character_level', targetType: 'character', targetId: input.characterId, newValue: { level: input.level, experiencePoints }, gmUserId: input.gmUserId ?? null });
      return { success: true, experiencePoints };
    }),

  // Создать персонажа для аккаунта
  create: publicProcedure
    .input(z.object({
      ownerId: z.number(),
      name: z.string().min(1).max(20),
      classId: z.number(),
      raceId: z.number(),
      level: z.number().min(1).default(1),
      gmUserId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const expRow = await ctx.db
        .select({ experiencePoints: expForLevel.experiencePoints })
        .from(expForLevel)
        .where(eq(expForLevel.level, input.level))
        .then(r => r[0]);
      const experiencePoints = expRow?.experiencePoints ?? 0;
      const hp = input.level * 10;
      const [created] = await ctx.db
        .insert(characters)
        .values({
          name: input.name,
          ownerId: input.ownerId,
          classId: input.classId,
          raceId: input.raceId,
          level: input.level,
          experiencePoints,
          currentHealth: hp,
          currentMana: hp,
          isDead: false,
          radius: 100,
        })
        .returning({ id: characters.id });

      // Инициализировать все атрибуты значением 1
      const allAttrs = await ctx.db.select({ id: entityAttributes.id }).from(entityAttributes);
      if (allAttrs.length > 0) {
        await ctx.db.insert(characterAttributes).values(
          allAttrs.map(a => ({ characterId: created!.id, attributeId: a.id, value: '1' }))
        );
      }

      await logGmAction({ actionType: 'create_character', targetType: 'character', targetId: created!.id, newValue: { name: input.name, ownerId: input.ownerId, classId: input.classId, raceId: input.raceId, level: input.level }, gmUserId: input.gmUserId ?? null });
      return { success: true, characterId: created!.id };
    }),

  // Обновить поля персонажа
  update: publicProcedure
    .input(z.object({
      characterId: z.number(),
      name: z.string().min(1).max(20).optional(),
      classId: z.number().optional(),
      raceId: z.number().optional(),
      level: z.number().min(1).optional(),
      experiencePoints: z.number().min(0).optional(),
      currentHealth: z.number().min(0).optional(),
      currentMana: z.number().min(0).optional(),
      isDead: z.boolean().optional(),
      freeSkillPoints: z.number().min(0).optional(),
      gender: z.number().min(0).max(2).optional(),
      ownerId: z.number().optional(),
      gmUserId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { characterId, level, experiencePoints, ownerId, gmUserId, ...fields } = input;
      const patch = Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined));

      if (level !== undefined) {
        const expRow = await ctx.db
          .select({ experiencePoints: expForLevel.experiencePoints })
          .from(expForLevel)
          .where(eq(expForLevel.level, level))
          .then(r => r[0]);
        patch.level = level;
        // Явно заданный опыт имеет приоритет над автоматическим
        patch.experiencePoints = experiencePoints ?? expRow?.experiencePoints ?? 0;
      } else if (experiencePoints !== undefined) {
        patch.experiencePoints = experiencePoints;
      }

      if (ownerId !== undefined) {
        const owner = await ctx.db.select({ id: users.id }).from(users).where(eq(users.id, ownerId)).then(r => r[0]);
        if (!owner) throw new Error(`Аккаунт с ID ${ownerId} не найден`);
        patch.ownerId = ownerId;
      }

      if (Object.keys(patch).length === 0) return { success: true };
      const [old] = await ctx.db.select().from(characters).where(eq(characters.id, characterId));
      await ctx.db.update(characters).set(patch).where(eq(characters.id, characterId));
      const oldValue = Object.fromEntries(Object.keys(patch).map(k => [k, (old as Record<string, unknown>)?.[k]]));
      await logGmAction({ actionType: 'update_character', targetType: 'character', targetId: characterId, oldValue, newValue: patch, gmUserId: gmUserId ?? null });
      return { success: true };
    }),

  // Удалить персонажа
  delete: publicProcedure
    .input(z.object({ characterId: z.number(), gmUserId: z.number().optional() }))
    .mutation(async ({ ctx, input }) => {
      const [old] = await ctx.db.select({ name: characters.name }).from(characters).where(eq(characters.id, input.characterId));
      await ctx.db.delete(characters).where(eq(characters.id, input.characterId));
      await logGmAction({ actionType: 'delete_character', targetType: 'character', targetId: input.characterId, oldValue: { name: old?.name }, gmUserId: input.gmUserId ?? null });
      return { success: true };
    }),
});

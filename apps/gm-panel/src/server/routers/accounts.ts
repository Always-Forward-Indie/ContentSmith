import { z } from 'zod';
import { eq, ilike, or, and, isNotNull, isNull, count, gt, inArray, SQL, sql } from 'drizzle-orm';
import { createTRPCRouter, gmProcedure } from '../trpc';
import { users, characters, characterClass, race, userRoles, characterGenders, characterCurrentState, userSessions, userBans, characterPermanentModifiers, characterSkills, playerInventory, characterEquipment, playerQuest, playerFlag, playerActiveEffect, characterTitles, characterReputation, characterPity, characterBestiary, characterEmotes, characterSkillMastery, characterSkillBar, currencyTransactions, gameAnalytics, characterPosition } from '../schema';
import { logGmAction } from '../utils/gmLog';

const PAGE_SIZE = 20;

export const accountsRouter = createTRPCRouter({
  // Справочник ролей пользователей
  allRoles: gmProcedure.query(async ({ ctx }) => {
    return ctx.db.select().from(userRoles).orderBy(userRoles.id);
  }),

  // Справочник пола персонажа
  allGenders: gmProcedure.query(async ({ ctx }) => {
    return ctx.db.select().from(characterGenders).orderBy(characterGenders.id);
  }),

  // Справочник классов персонажа
  allClasses: gmProcedure.query(async ({ ctx }) => {
    return ctx.db.select({ id: characterClass.id, name: characterClass.name }).from(characterClass).orderBy(characterClass.name);
  }),

  // Справочник рас
  allRaces: gmProcedure.query(async ({ ctx }) => {
    return ctx.db.select({ id: race.id, name: race.name, slug: race.slug }).from(race).orderBy(race.name);
  }),

  // Список аккаунтов с пагинацией и фильтрами
  list: gmProcedure
    .input(z.object({
      page: z.number().int().min(1).default(1),
      pageSize: z.number().int().min(1).max(100).default(PAGE_SIZE),
      search: z.string().optional(),
      hasCharacter: z.enum(['all', 'yes', 'no']).default('all'),
    }))
    .query(async ({ ctx, input }) => {
      const { page, pageSize, search, hasCharacter } = input;
      const offset = (page - 1) * pageSize;

      const whereConditions: SQL[] = [];
      if (search) whereConditions.push(ilike(users.login, `%${search}%`));
      const where = whereConditions.length > 0 ? and(...whereConditions) : undefined;

      let having: SQL | undefined;
      if (hasCharacter === 'yes') having = gt(count(characters.id), 0);
      if (hasCharacter === 'no') having = eq(count(characters.id), 0);

      // Count total by running grouped query without pagination
      const allMatching = await ctx.db
        .select({ userId: users.id })
        .from(users)
        .leftJoin(characters, eq(characters.ownerId, users.id))
        .where(where)
        .groupBy(users.id)
        .having(having);
      const total = allMatching.length;

      const rows = await ctx.db
        .select({
          userId: users.id,
          login: users.login,
          lastLogin: users.lastLogin,
          role: users.role,
          isActive: users.isActive,
          createdAt: users.createdAt,
          characterCount: count(characters.id),
        })
        .from(users)
        .leftJoin(characters, eq(characters.ownerId, users.id))
        .where(where)
        .groupBy(users.id, users.login, users.lastLogin, users.role, users.isActive, users.createdAt)
        .having(having)
        .orderBy(users.id)
        .limit(pageSize)
        .offset(offset);

      return {
        data: rows,
        pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
      };
    }),

  // Список персонажей с пагинацией и фильтрами
  listCharacters: gmProcedure
    .input(z.object({
      page: z.number().int().min(1).default(1),
      pageSize: z.number().int().min(1).max(100).default(PAGE_SIZE),
      search: z.string().optional(),
      classId: z.number().optional(),
      raceId: z.number().optional(),
      status: z.enum(['all', 'alive', 'dead']).default('all'),
    }))
    .query(async ({ ctx, input }) => {
      const { page, pageSize, search, classId, raceId, status } = input;
      const offset = (page - 1) * pageSize;

      const conditions: SQL[] = [isNotNull(characters.id)];
      if (search) conditions.push(or(
        ilike(characters.name, `%${search}%`),
        ilike(users.login, `%${search}%`),
        ilike(characterClass.name, `%${search}%`),
        ilike(race.name, `%${search}%`),
      )!);
      if (classId !== undefined) conditions.push(eq(characters.classId, classId));
      if (raceId !== undefined) conditions.push(eq(characters.raceId, raceId));
      if (status === 'alive') conditions.push(eq(characterCurrentState.isDead, false));
      if (status === 'dead') conditions.push(eq(characterCurrentState.isDead, true));

      const where = and(...conditions);

      const [totalRow] = await ctx.db
        .select({ total: count() })
        .from(users)
        .leftJoin(characters, eq(characters.ownerId, users.id))
        .leftJoin(characterClass, eq(characterClass.id, characters.classId))
        .leftJoin(race, eq(race.id, characters.raceId))
        .leftJoin(characterCurrentState, eq(characterCurrentState.characterId, characters.id))
        .where(where);
      const total = totalRow?.total ?? 0;

      const rows = await ctx.db
        .select({
          userId: users.id,
          login: users.login,
          characterId: characters.id,
          characterName: characters.name,
          level: characters.level,
          classId: characters.classId,
          className: characterClass.name,
          raceId: characters.raceId,
          raceName: race.name,
          isDead: characterCurrentState.isDead,
          isOnline: characters.isOnline,
          createdAt: characters.createdAt,
          lastOnlineAt: characters.lastOnlineAt,
        })
        .from(users)
        .leftJoin(characters, eq(characters.ownerId, users.id))
        .leftJoin(characterClass, eq(characterClass.id, characters.classId))
        .leftJoin(race, eq(race.id, characters.raceId))
        .leftJoin(characterCurrentState, eq(characterCurrentState.characterId, characters.id))
        .where(where)
        .orderBy(characters.id)
        .limit(pageSize)
        .offset(offset);

      return {
        data: rows,
        pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
      };
    }),

  // Один аккаунт по userId
  byId: gmProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db
        .select({
          userId: users.id,
          login: users.login,
          lastLogin: users.lastLogin,
          role: users.role,
          isActive: users.isActive,
          createdAt: users.createdAt,
          email: users.email,
          characterId: characters.id,
          characterName: characters.name,
          level: characters.level,
          className: characterClass.name,
          raceName: race.name,
          isDead: characterCurrentState.isDead,
          experiencePoints: characters.experiencePoints,
          currentHealth: characterCurrentState.currentHealth,
          currentMana: characterCurrentState.currentMana,
        })
        .from(users)
        .leftJoin(characters, eq(characters.ownerId, users.id))
        .leftJoin(characterClass, eq(characterClass.id, characters.classId))
        .leftJoin(race, eq(race.id, characters.raceId))
        .leftJoin(characterCurrentState, eq(characterCurrentState.characterId, characters.id))
        .where(eq(users.id, input.userId));
      return rows[0] ?? null;
    }),

  // Кик: инвалидировать session_key
  kick: gmProcedure
    .input(z.object({ userId: z.number(), gmUserId: z.number().optional() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(userSessions)
        .set({ revokedAt: new Date() })
        .where(and(eq(userSessions.userId, input.userId), isNull(userSessions.revokedAt)));
      await logGmAction({ actionType: 'kick_user', targetType: 'user', targetId: input.userId, gmUserId: input.gmUserId ?? null });
      return { success: true };
    }),

  // Изменить роль (0=player, 1=gm, 2=admin)
  setRole: gmProcedure
    .input(z.object({
      userId: z.number(),
      role: z.number().int().min(0).max(2),
      gmUserId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [old] = await ctx.db.select({ role: users.role }).from(users).where(eq(users.id, input.userId));
      await ctx.db.update(users).set({ role: input.role }).where(eq(users.id, input.userId));
      await logGmAction({
        actionType: 'set_role', targetType: 'user', targetId: input.userId,
        oldValue: { role: old?.role }, newValue: { role: input.role },
        gmUserId: input.gmUserId ?? null,
      });
      return { success: true };
    }),

  // Активировать / деактивировать аккаунт
  setActive: gmProcedure
    .input(z.object({
      userId: z.number(),
      isActive: z.boolean(),
      gmUserId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.update(users).set({ isActive: input.isActive }).where(eq(users.id, input.userId));
      await logGmAction({
        actionType: input.isActive ? 'activate_user' : 'deactivate_user',
        targetType: 'user', targetId: input.userId,
        newValue: { isActive: input.isActive }, gmUserId: input.gmUserId ?? null,
      });
      return { success: true };
    }),

  // Создать аккаунт
  create: gmProcedure
    .input(z.object({
      login: z.string().min(3).max(50),
      password: z.string().min(1).max(100),
      gmUserId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [created] = await ctx.db
        .insert(users)
        .values({
          login: input.login,
          password: input.password,
          lastLogin: new Date(),
        })
        .returning({ id: users.id });
      await logGmAction({ actionType: 'create_user', targetType: 'user', targetId: created!.id, newValue: { login: input.login }, gmUserId: input.gmUserId ?? null });
      return { success: true, userId: created!.id };
    }),

  // Обновить логин / пароль
  update: gmProcedure
    .input(z.object({
      userId: z.number(),
      login: z.string().min(3).max(50).optional(),
      password: z.string().min(1).max(100).optional(),
      gmUserId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const patch: Record<string, unknown> = {};
      if (input.login)    patch.login    = input.login;
      if (input.password) patch.password = input.password;
      if (Object.keys(patch).length === 0) return { success: true };
      await ctx.db.update(users).set(patch).where(eq(users.id, input.userId));
      const changed = { ...(input.login ? { login: input.login } : {}), ...(input.password ? { password: '***' } : {}) };
      await logGmAction({ actionType: 'update_user', targetType: 'user', targetId: input.userId, newValue: changed, gmUserId: input.gmUserId ?? null });
      return { success: true };
    }),

  // Удалить аккаунт (каскадно удалит персонажей)
  delete: gmProcedure
    .input(z.object({ userId: z.number(), gmUserId: z.number().optional() }))
    .mutation(async ({ ctx, input }) => {
      const [old] = await ctx.db.select({ login: users.login }).from(users).where(eq(users.id, input.userId));
      await ctx.db.delete(users).where(eq(users.id, input.userId));
      await logGmAction({ actionType: 'delete_user', targetType: 'user', targetId: input.userId, oldValue: { login: old?.login }, gmUserId: input.gmUserId ?? null });
      return { success: true };
    }),

  // Удалить аккаунт вместе со всеми персонажами и их данными (явная очистка)
  deleteWithCharacters: gmProcedure
    .input(z.object({ userId: z.number(), gmUserId: z.number().optional() }))
    .mutation(async ({ ctx, input }) => {
      const { userId } = input;
      const [user] = await ctx.db.select({ login: users.login }).from(users).where(eq(users.id, userId));
      if (!user) throw new Error('Account not found');

      const chars = await ctx.db.select({ id: characters.id }).from(characters).where(eq(characters.ownerId, userId));
      const charIds = chars.map((c) => c.id);

      await ctx.db.transaction(async (tx) => {
        if (charIds.length > 0) {
          await tx.delete(characterPermanentModifiers).where(inArray(characterPermanentModifiers.characterId, charIds));
          await tx.delete(characterSkills).where(inArray(characterSkills.characterId, charIds));
          await tx.delete(playerInventory).where(inArray(playerInventory.characterId, charIds));
          await tx.delete(characterEquipment).where(inArray(characterEquipment.characterId, charIds));
          await tx.delete(playerQuest).where(inArray(playerQuest.playerId, charIds));
          await tx.delete(playerFlag).where(inArray(playerFlag.playerId, charIds));
          await tx.delete(playerActiveEffect).where(inArray(playerActiveEffect.playerId, charIds));
          await tx.delete(characterTitles).where(inArray(characterTitles.characterId, charIds));
          await tx.delete(characterReputation).where(inArray(characterReputation.characterId, charIds));
          await tx.delete(characterPity).where(inArray(characterPity.characterId, charIds));
          await tx.delete(characterBestiary).where(inArray(characterBestiary.characterId, charIds));
          await tx.delete(characterEmotes).where(inArray(characterEmotes.characterId, charIds));
          await tx.delete(characterSkillMastery).where(inArray(characterSkillMastery.characterId, charIds));
          await tx.delete(characterSkillBar).where(inArray(characterSkillBar.characterId, charIds));
          await tx.delete(currencyTransactions).where(inArray(currencyTransactions.characterId, charIds));
          await tx.delete(gameAnalytics).where(inArray(gameAnalytics.characterId, charIds));
          await tx.delete(characterCurrentState).where(inArray(characterCurrentState.characterId, charIds));
          await tx.delete(characterPosition).where(inArray(characterPosition.characterId, charIds));
          await tx.delete(characters).where(eq(characters.ownerId, userId));
        }
        await tx.delete(userSessions).where(eq(userSessions.userId, userId));
        await tx.delete(userBans).where(eq(userBans.userId, userId));
        await tx.delete(users).where(eq(users.id, userId));
      });

      await logGmAction({ actionType: 'delete_user_with_characters', targetType: 'user', targetId: userId, oldValue: { login: user.login, charactersDeleted: charIds.length }, gmUserId: input.gmUserId ?? null });
      return { success: true, charactersDeleted: charIds.length };
    }),

  // Полная очистка аккаунта (все персонажи очищаются, сессии и баны удаляются)
  wipe: gmProcedure
    .input(z.object({ userId: z.number(), gmUserId: z.number().optional() }))
    .mutation(async ({ ctx, input }) => {
      const { userId } = input;
      const [user] = await ctx.db.select({ login: users.login }).from(users).where(eq(users.id, userId));
      if (!user) throw new Error('Account not found');

      const chars = await ctx.db.select({ id: characters.id, level: characters.level, bindZoneId: characters.bindZoneId, bindX: characters.bindX, bindY: characters.bindY, bindZ: characters.bindZ }).from(characters).where(eq(characters.ownerId, userId));
      const charIds = chars.map((c) => c.id);

      await ctx.db.transaction(async (tx) => {
        if (charIds.length > 0) {
          await tx.delete(characterPermanentModifiers).where(inArray(characterPermanentModifiers.characterId, charIds));
          await tx.delete(characterSkills).where(inArray(characterSkills.characterId, charIds));
          await tx.delete(playerInventory).where(inArray(playerInventory.characterId, charIds));
          await tx.delete(characterEquipment).where(inArray(characterEquipment.characterId, charIds));
          await tx.delete(playerQuest).where(inArray(playerQuest.playerId, charIds));
          await tx.delete(playerFlag).where(inArray(playerFlag.playerId, charIds));
          await tx.delete(playerActiveEffect).where(inArray(playerActiveEffect.playerId, charIds));
          await tx.delete(characterTitles).where(inArray(characterTitles.characterId, charIds));
          await tx.delete(characterReputation).where(inArray(characterReputation.characterId, charIds));
          await tx.delete(characterPity).where(inArray(characterPity.characterId, charIds));
          await tx.delete(characterBestiary).where(inArray(characterBestiary.characterId, charIds));
          await tx.delete(characterEmotes).where(inArray(characterEmotes.characterId, charIds));
          await tx.delete(characterSkillMastery).where(inArray(characterSkillMastery.characterId, charIds));
          await tx.delete(characterSkillBar).where(inArray(characterSkillBar.characterId, charIds));
          await tx.delete(currencyTransactions).where(inArray(currencyTransactions.characterId, charIds));
          await tx.delete(gameAnalytics).where(inArray(gameAnalytics.characterId, charIds));

          for (const char of chars) {
            const hp = char.level * 10;
            await tx
              .insert(characterCurrentState)
              .values({ characterId: char.id, currentHealth: hp, currentMana: hp, isDead: false })
              .onConflictDoUpdate({
                target: characterCurrentState.characterId,
                set: { currentHealth: hp, currentMana: hp, isDead: false, updatedAt: new Date() },
              });
            if (char.bindZoneId != null && char.bindX != null && char.bindY != null && char.bindZ != null) {
              await tx
                .update(characterPosition)
                .set({ zoneId: char.bindZoneId, x: char.bindX, y: char.bindY, z: char.bindZ })
                .where(eq(characterPosition.characterId, char.id));
            }
          }
        }
        await tx.update(userSessions).set({ revokedAt: new Date() }).where(and(eq(userSessions.userId, userId), isNull(userSessions.revokedAt)));
        await tx.delete(userBans).where(eq(userBans.userId, userId));
      });

      await logGmAction({ actionType: 'wipe_account', targetType: 'user', targetId: userId, oldValue: { login: user.login, charactersWiped: charIds.length }, gmUserId: input.gmUserId ?? null });
      return { success: true, charactersWiped: charIds.length };
    }),

  // Массовая очистка ВСЕХ аккаунтов (все персонажи + данные + сессии + баны)
  wipeAll: gmProcedure
    .input(z.object({ gmUserId: z.number().optional() }).default({}))
    .mutation(async ({ ctx, input }) => {
      const [totalUsers] = await ctx.db.select({ v: sql<number>`COUNT(*)::int`.as('v') }).from(users);
      const userCount = totalUsers?.v ?? 0;

      await ctx.db.transaction(async (tx) => {
        await tx.delete(characterPermanentModifiers);
        await tx.delete(characterSkills);
        await tx.delete(playerInventory);
        await tx.delete(characterEquipment);
        await tx.delete(playerQuest);
        await tx.delete(playerFlag);
        await tx.delete(playerActiveEffect);
        await tx.delete(characterTitles);
        await tx.delete(characterReputation);
        await tx.delete(characterPity);
        await tx.delete(characterBestiary);
        await tx.delete(characterEmotes);
        await tx.delete(characterSkillMastery);
        await tx.delete(characterSkillBar);
        await tx.delete(currencyTransactions);
        await tx.delete(gameAnalytics);

        // Reset character_current_state for all characters
        await tx.execute(sql`
          INSERT INTO character_current_state (character_id, current_health, current_mana, is_dead, updated_at)
          SELECT c.id, c.level * 10, c.level * 10, false, now()
          FROM characters c
          ON CONFLICT (character_id) DO UPDATE
          SET current_health = EXCLUDED.current_health,
              current_mana   = EXCLUDED.current_mana,
              is_dead        = EXCLUDED.is_dead,
              updated_at     = EXCLUDED.updated_at
        `);

        await tx.update(userSessions).set({ revokedAt: new Date() }).where(isNull(userSessions.revokedAt));
        await tx.delete(userBans);
      });

      await logGmAction({ actionType: 'wipe_all_accounts', targetType: 'all', oldValue: { totalUsers: userCount }, gmUserId: input.gmUserId ?? null });
      return { success: true, totalUsers: userCount };
    }),
});

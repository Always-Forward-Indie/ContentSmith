import { z } from 'zod';
import { eq, ilike, or, and, isNotNull, isNull, count, gt, SQL } from 'drizzle-orm';
import { createTRPCRouter, publicProcedure } from '../trpc';
import { users, characters, characterClass, race, userRoles, characterGenders, characterCurrentState, userSessions } from '../schema';
import { logGmAction } from '../utils/gmLog';

const PAGE_SIZE = 20;

export const accountsRouter = createTRPCRouter({
  // Справочник ролей пользователей
  allRoles: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.select().from(userRoles).orderBy(userRoles.id);
  }),

  // Справочник пола персонажа
  allGenders: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.select().from(characterGenders).orderBy(characterGenders.id);
  }),

  // Справочник классов персонажа
  allClasses: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.select({ id: characterClass.id, name: characterClass.name }).from(characterClass).orderBy(characterClass.name);
  }),

  // Справочник рас
  allRaces: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.select({ id: race.id, name: race.name, slug: race.slug }).from(race).orderBy(race.name);
  }),

  // Список аккаунтов с пагинацией и фильтрами
  list: publicProcedure
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
  listCharacters: publicProcedure
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
  byId: publicProcedure
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
  kick: publicProcedure
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
  setRole: publicProcedure
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
  setActive: publicProcedure
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
  create: publicProcedure
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
  update: publicProcedure
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
  delete: publicProcedure
    .input(z.object({ userId: z.number(), gmUserId: z.number().optional() }))
    .mutation(async ({ ctx, input }) => {
      const [old] = await ctx.db.select({ login: users.login }).from(users).where(eq(users.id, input.userId));
      await ctx.db.delete(users).where(eq(users.id, input.userId));
      await logGmAction({ actionType: 'delete_user', targetType: 'user', targetId: input.userId, oldValue: { login: old?.login }, gmUserId: input.gmUserId ?? null });
      return { success: true };
    }),
});

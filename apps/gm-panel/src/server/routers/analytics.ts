import { eq, isNull, desc, sql, gte, and } from 'drizzle-orm';
import { createTRPCRouter, gmProcedure } from '../trpc';
import {
  users,
  userBans,
  userSessions,
  characters,
  characterClass,
  race,
  playerQuest,
  characterPosition,
  zones,
  currencyTransactions,
} from '../schema';

export const analyticsRouter = createTRPCRouter({
  // ─── Сводная статистика ───────────────────────────────────────────────────
  overview: gmProcedure.query(async ({ ctx }) => {
    const [
      [totalUsersRow],
      [totalCharsRow],
      [activeBansRow],
      [activeSessionsRow],
      [questTracksRow],
      [loginLast24hRow],
    ] = await Promise.all([
      ctx.db
        .select({ v: sql<number>`COUNT(*)::int`.as('v') })
        .from(users),
      ctx.db
        .select({ v: sql<number>`COUNT(*)::int`.as('v') })
        .from(characters)
        .where(isNull(characters.deletedAt)),
      ctx.db
        .select({ v: sql<number>`COUNT(*)::int`.as('v') })
        .from(userBans)
        .where(eq(userBans.isActive, true)),
      ctx.db
        .select({ v: sql<number>`COUNT(*)::int`.as('v') })
        .from(userSessions)
        .where(
          and(
            isNull(userSessions.revokedAt),
            sql`${userSessions.expiresAt} > now()`,
          ),
        ),
      ctx.db
        .select({ v: sql<number>`COUNT(*)::int`.as('v') })
        .from(playerQuest),
      ctx.db
        .select({ v: sql<number>`COUNT(DISTINCT ${userSessions.userId})::int`.as('v') })
        .from(userSessions)
        .where(sql`${userSessions.createdAt} > NOW() - INTERVAL '24 hours'`),
    ]);

    return {
      totalUsers: totalUsersRow?.v ?? 0,
      totalCharacters: totalCharsRow?.v ?? 0,
      activeBans: activeBansRow?.v ?? 0,
      activeSessions: activeSessionsRow?.v ?? 0,
      totalQuestTracks: questTracksRow?.v ?? 0,
      loginLast24h: loginLast24hRow?.v ?? 0,
    };
  }),

  // ─── Распределение по уровням ─────────────────────────────────────────────
  levelDistribution: gmProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select({
        level: characters.level,
        count: sql<number>`COUNT(*)::int`.as('count'),
      })
      .from(characters)
      .where(isNull(characters.deletedAt))
      .groupBy(characters.level)
      .orderBy(characters.level);
  }),

  // ─── Популярность классов ─────────────────────────────────────────────────
  classDistribution: gmProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select({
        className: characterClass.name,
        count: sql<number>`COUNT(*)::int`.as('count'),
      })
      .from(characters)
      .leftJoin(characterClass, eq(characterClass.id, characters.classId))
      .where(isNull(characters.deletedAt))
      .groupBy(characterClass.name)
      .orderBy(sql`COUNT(*) DESC`);
  }),

  // ─── Популярность рас ─────────────────────────────────────────────────────
  raceDistribution: gmProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select({
        raceName: race.name,
        count: sql<number>`COUNT(*)::int`.as('count'),
      })
      .from(characters)
      .leftJoin(race, eq(race.id, characters.raceId))
      .where(isNull(characters.deletedAt))
      .groupBy(race.name)
      .orderBy(sql`COUNT(*) DESC`);
  }),

  // ─── Статусы квестов ──────────────────────────────────────────────────────
  questStateStats: gmProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select({
        state: playerQuest.state,
        count: sql<number>`COUNT(*)::int`.as('count'),
      })
      .from(playerQuest)
      .groupBy(playerQuest.state)
      .orderBy(sql`COUNT(*) DESC`);
  }),

  // ─── Топ персонажей по времени в игре ────────────────────────────────────
  topCharacters: gmProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select({
        id: characters.id,
        name: characters.name,
        level: characters.level,
        className: characterClass.name,
        raceName: race.name,
        playTimeSec: characters.playTimeSec,
        lastOnlineAt: characters.lastOnlineAt,
      })
      .from(characters)
      .leftJoin(characterClass, eq(characterClass.id, characters.classId))
      .leftJoin(race, eq(race.id, characters.raceId))
      .where(isNull(characters.deletedAt))
      .orderBy(desc(characters.playTimeSec))
      .limit(10);
  }),

  // ─── Население зон (текущие позиции) ─────────────────────────────────────
  zonePopulation: gmProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select({
        zoneId: zones.id,
        zoneName: zones.name,
        zoneSlug: zones.slug,
        isPvp: zones.isPvp,
        isSafeZone: zones.isSafeZone,
        minLevel: zones.minLevel,
        maxLevel: zones.maxLevel,
        count: sql<number>`COUNT(${characterPosition.characterId})::int`.as('count'),
      })
      .from(zones)
      .leftJoin(characterPosition, eq(characterPosition.zoneId, zones.id))
      .groupBy(
        zones.id,
        zones.name,
        zones.slug,
        zones.isPvp,
        zones.isSafeZone,
        zones.minLevel,
        zones.maxLevel,
      )
      .orderBy(sql`COUNT(${characterPosition.characterId}) DESC`);
  }),

  // ─── Регистрации за последние 30 дней ────────────────────────────────────
  registrationsByDay: gmProcedure.query(async ({ ctx }) => {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    return ctx.db
      .select({
        date: sql<string>`to_char(${users.createdAt}, 'YYYY-MM-DD')`.as('date'),
        count: sql<number>`COUNT(*)::int`.as('count'),
      })
      .from(users)
      .where(gte(users.createdAt, since))
      .groupBy(sql`to_char(${users.createdAt}, 'YYYY-MM-DD')`)
      .orderBy(sql`to_char(${users.createdAt}, 'YYYY-MM-DD')`);
  }),

  // ─── Поток валюты за последние 14 дней ───────────────────────────────────
  currencyFlowByDay: gmProcedure.query(async ({ ctx }) => {
    const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    return ctx.db
      .select({
        date: sql<string>`to_char(${currencyTransactions.createdAt}, 'YYYY-MM-DD')`.as('date'),
        income: sql<number>`COALESCE(SUM(CASE WHEN ${currencyTransactions.amount} > 0 THEN ${currencyTransactions.amount}::bigint ELSE 0 END), 0)::bigint`.as('income'),
        spending: sql<number>`COALESCE(SUM(CASE WHEN ${currencyTransactions.amount} < 0 THEN ABS(${currencyTransactions.amount}::bigint) ELSE 0 END), 0)::bigint`.as('spending'),
      })
      .from(currencyTransactions)
      .where(gte(currencyTransactions.createdAt, since))
      .groupBy(sql`to_char(${currencyTransactions.createdAt}, 'YYYY-MM-DD')`)
      .orderBy(sql`to_char(${currencyTransactions.createdAt}, 'YYYY-MM-DD')`);
  }),
});

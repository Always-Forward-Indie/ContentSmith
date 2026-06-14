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
  gameAnalytics,
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
      [onlineRow],
      [mauRow],
      [wauRow],
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
      ctx.db
        .select({ v: sql<number>`COUNT(*)::int`.as('v') })
        .from(characters)
        .where(and(isNull(characters.deletedAt), eq(characters.isOnline, true))),
      ctx.db
        .select({ v: sql<number>`COUNT(DISTINCT ${gameAnalytics.characterId})::int`.as('v') })
        .from(gameAnalytics)
        .where(
          and(
            eq(gameAnalytics.eventType, 'session_start'),
            sql`${gameAnalytics.characterId} IS NOT NULL`,
            sql`${gameAnalytics.createdAt} > NOW() - INTERVAL '30 days'`,
          ),
        ),
      ctx.db
        .select({ v: sql<number>`COUNT(DISTINCT ${gameAnalytics.characterId})::int`.as('v') })
        .from(gameAnalytics)
        .where(
          and(
            eq(gameAnalytics.eventType, 'session_start'),
            sql`${gameAnalytics.characterId} IS NOT NULL`,
            sql`${gameAnalytics.createdAt} > NOW() - INTERVAL '7 days'`,
          ),
        ),
    ]);

    return {
      totalUsers: totalUsersRow?.v ?? 0,
      totalCharacters: totalCharsRow?.v ?? 0,
      activeBans: activeBansRow?.v ?? 0,
      activeSessions: activeSessionsRow?.v ?? 0,
      totalQuestTracks: questTracksRow?.v ?? 0,
      loginLast24h: loginLast24hRow?.v ?? 0,
      onlinePlayers: onlineRow?.v ?? 0,
      mau: mauRow?.v ?? 0,
      wau: wauRow?.v ?? 0,
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
        totalPlayTimeSec: characters.totalPlayTimeSec,
        lastOnlineAt: characters.lastOnlineAt,
      })
      .from(characters)
      .leftJoin(characterClass, eq(characterClass.id, characters.classId))
      .leftJoin(race, eq(race.id, characters.raceId))
      .where(isNull(characters.deletedAt))
      .orderBy(desc(characters.totalPlayTimeSec))
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

  // ─── Поток валюты за последние 14 дней (из game_analytics gold_change) ────
  currencyFlowByDay: gmProcedure.query(async ({ ctx }) => {
    const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const rows = await ctx.db.execute(sql`
      SELECT
        to_char(created_at, 'YYYY-MM-DD')                                     AS date,
        COALESCE(SUM(CASE WHEN (payload->>'delta')::bigint > 0
                          THEN (payload->>'delta')::bigint ELSE 0 END), 0)   AS income,
        COALESCE(SUM(CASE WHEN (payload->>'delta')::bigint < 0
                          THEN ABS((payload->>'delta')::bigint) ELSE 0 END), 0) AS spending
      FROM   game_analytics
      WHERE  event_type = 'gold_change'
        AND  created_at >= ${since}
        AND  payload->>'delta' IS NOT NULL
      GROUP  BY to_char(created_at, 'YYYY-MM-DD')
      ORDER  BY date
    `);
    return rows.map((r) => ({
      date: String(r.date),
      income: Number(r.income),
      spending: Number(r.spending),
    }));
  }),

  // ─── Онлайн по часам (из session_start / session_end) ──────────────────────
  onlineTimeline: gmProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db.execute(sql`
      WITH sessions AS (
        SELECT
          s.character_id,
          s.created_at AS started_at,
          e.created_at AS ended_at
        FROM   game_analytics s
        JOIN   game_analytics e
               ON e.session_id = s.session_id
              AND e.event_type = 'session_end'
        WHERE  s.event_type = 'session_start'
          AND  s.created_at >= NOW() - INTERVAL '7 days'
          AND  EXTRACT(EPOCH FROM (e.created_at - s.created_at)) < 86400
      ),
      hours AS (
        SELECT generate_series(
          date_trunc('hour', NOW()) - INTERVAL '7 days',
          date_trunc('hour', NOW()),
          INTERVAL '1 hour'
        ) AS hour
      )
      SELECT
        h.hour,
        COUNT(DISTINCT s.character_id)::int AS online
      FROM   hours h
      LEFT   JOIN sessions s
             ON  s.started_at <= h.hour + INTERVAL '1 hour'
             AND s.ended_at  >= h.hour
      GROUP  BY h.hour
      ORDER  BY h.hour
    `);
    return rows.map((r) => ({
      hour: (r.hour as Date).toISOString(),
      online: Number(r.online),
    }));
  }),
});

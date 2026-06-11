import { z } from 'zod';
import { eq, desc, and, sql, gte } from 'drizzle-orm';
import { createTRPCRouter, gmProcedure } from '../trpc';
import { gameAnalytics, zones, characters, users } from '../schema';

const PAGE_SIZE = 50;

// ─── Input helpers ────────────────────────────────────────────────────────────

const daysInput = z.object({
  days: z.number().int().min(1).max(365).default(30),
}).default({});

function sinceDate(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

// ─── Router ───────────────────────────────────────────────────────────────────

export const gameAnalyticsRouter = createTRPCRouter({
  // ─── KPIs ──────────────────────────────────────────────────────────────────
  overview: gmProcedure
    .input(daysInput)
    .query(async ({ ctx, input }) => {
      const since = sinceDate(input.days);

      const rows = await ctx.db
        .select({
          eventType: gameAnalytics.eventType,
          count: sql<number>`COUNT(*)::int`.as('count'),
        })
        .from(gameAnalytics)
        .where(gte(gameAnalytics.createdAt, since))
        .groupBy(gameAnalytics.eventType);

      const byType = Object.fromEntries(rows.map((r) => [r.eventType, r.count]));

      const [sessionsRow] = await ctx.db
        .select({ v: sql<number>`COUNT(DISTINCT ${gameAnalytics.sessionId})::int`.as('v') })
        .from(gameAnalytics)
        .where(
          and(
            gte(gameAnalytics.createdAt, since),
            eq(gameAnalytics.eventType, 'session_start'),
          ),
        );

      return {
        totalEvents:       rows.reduce((s, r) => s + r.count, 0),
        sessions:          sessionsRow?.v ?? 0,
        deaths:            byType['player_death']  ?? 0,
        mobKills:          byType['mob_killed']    ?? 0,
        levelUps:          byType['level_up']      ?? 0,
        questAccepts:      byType['quest_accept']  ?? 0,
        questCompletes:    byType['quest_complete'] ?? 0,
        questAbandons:     byType['quest_abandon'] ?? 0,
        itemsAcquired:     byType['item_acquired'] ?? 0,
        goldChanges:       byType['gold_change']   ?? 0,
        byType,
      };
    }),

  // ─── Daily event count for sparkline / timeline ────────────────────────────
  timeline: gmProcedure
    .input(
      z.object({
        days: z.number().int().min(1).max(365).default(30),
        eventType: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const since = sinceDate(input.days);

      const conditions = input.eventType
        ? and(gte(gameAnalytics.createdAt, since), eq(gameAnalytics.eventType, input.eventType))
        : gte(gameAnalytics.createdAt, since);

      return ctx.db
        .select({
          date:  sql<string>`to_char(${gameAnalytics.createdAt}, 'YYYY-MM-DD')`.as('date'),
          count: sql<number>`COUNT(*)::int`.as('count'),
        })
        .from(gameAnalytics)
        .where(conditions)
        .groupBy(sql`to_char(${gameAnalytics.createdAt}, 'YYYY-MM-DD')`)
        .orderBy(sql`to_char(${gameAnalytics.createdAt}, 'YYYY-MM-DD')`);
    }),

  // ─── Session duration stats (join session_start ↔ session_end by session_id) ─
  sessionStats: gmProcedure
    .input(daysInput)
    .query(async ({ ctx, input }) => {
      const since = sinceDate(input.days);
      const [row] = await ctx.db.execute(sql`
        SELECT
          COUNT(*)::int                                                         AS total,
          AVG(EXTRACT(EPOCH FROM (e.created_at - s.created_at)))::int          AS avg_sec,
          PERCENTILE_CONT(0.5) WITHIN GROUP (
            ORDER BY EXTRACT(EPOCH FROM (e.created_at - s.created_at))
          )::int                                                                AS median_sec,
          PERCENTILE_CONT(0.9) WITHIN GROUP (
            ORDER BY EXTRACT(EPOCH FROM (e.created_at - s.created_at))
          )::int                                                                AS p90_sec,
          MAX(EXTRACT(EPOCH FROM (e.created_at - s.created_at)))::int          AS max_sec
        FROM   game_analytics s
        JOIN   game_analytics e
               ON  e.session_id   = s.session_id
               AND e.event_type   = 'session_end'
        WHERE  s.event_type       = 'session_start'
          AND  s.created_at      >= ${since}
          AND  EXTRACT(EPOCH FROM (e.created_at - s.created_at)) BETWEEN 10 AND 86400
      `);

      return {
        total:     Number(row?.total     ?? 0),
        avgSec:    Number(row?.avg_sec   ?? 0),
        medianSec: Number(row?.median_sec ?? 0),
        p90Sec:    Number(row?.p90_sec   ?? 0),
        maxSec:    Number(row?.max_sec   ?? 0),
      };
    }),

  // ─── Deaths by zone ────────────────────────────────────────────────────────
  deathsByZone: gmProcedure
    .input(daysInput)
    .query(async ({ ctx, input }) => {
      const since = sinceDate(input.days);
      return ctx.db
        .select({
          zoneId:   gameAnalytics.zoneId,
          zoneName: zones.name,
          count:    sql<number>`COUNT(*)::int`.as('count'),
        })
        .from(gameAnalytics)
        .leftJoin(zones, eq(zones.id, gameAnalytics.zoneId))
        .where(
          and(
            gte(gameAnalytics.createdAt, since),
            eq(gameAnalytics.eventType, 'player_death'),
          ),
        )
        .groupBy(gameAnalytics.zoneId, zones.name)
        .orderBy(sql`COUNT(*) DESC`)
        .limit(20);
    }),

  // ─── Deaths by level ───────────────────────────────────────────────────────
  deathsByLevel: gmProcedure
    .input(daysInput)
    .query(async ({ ctx, input }) => {
      const since = sinceDate(input.days);
      return ctx.db
        .select({
          level: gameAnalytics.level,
          count: sql<number>`COUNT(*)::int`.as('count'),
        })
        .from(gameAnalytics)
        .where(
          and(
            gte(gameAnalytics.createdAt, since),
            eq(gameAnalytics.eventType, 'player_death'),
          ),
        )
        .groupBy(gameAnalytics.level)
        .orderBy(gameAnalytics.level);
    }),

  // ─── Quest funnel ──────────────────────────────────────────────────────────
  questFunnel: gmProcedure
    .input(daysInput)
    .query(async ({ ctx, input }) => {
      const since = sinceDate(input.days);
      const rows = await ctx.db.execute(sql`
        SELECT
          payload->>'questSlug'                                             AS quest_slug,
          COUNT(*) FILTER (WHERE event_type = 'quest_accept')::int         AS accept,
          COUNT(*) FILTER (WHERE event_type = 'quest_complete')::int       AS complete,
          COUNT(*) FILTER (WHERE event_type = 'quest_abandon')::int        AS abandon
        FROM   game_analytics
        WHERE  event_type IN ('quest_accept', 'quest_complete', 'quest_abandon')
          AND  created_at >= ${since}
        GROUP  BY payload->>'questSlug'
        ORDER  BY accept DESC
        LIMIT  25
      `);
      return rows.map((r) => ({
        questSlug: String(r.quest_slug ?? '—'),
        accept:    Number(r.accept   ?? 0),
        complete:  Number(r.complete ?? 0),
        abandon:   Number(r.abandon  ?? 0),
      }));
    }),

  // ─── Level-up distribution ─────────────────────────────────────────────────
  levelUpDistribution: gmProcedure
    .input(daysInput)
    .query(async ({ ctx, input }) => {
      const since = sinceDate(input.days);
      return ctx.db
        .select({
          level: gameAnalytics.level,
          count: sql<number>`COUNT(*)::int`.as('count'),
        })
        .from(gameAnalytics)
        .where(
          and(
            gte(gameAnalytics.createdAt, since),
            eq(gameAnalytics.eventType, 'level_up'),
          ),
        )
        .groupBy(gameAnalytics.level)
        .orderBy(gameAnalytics.level);
    }),

  // ─── Top mobs killed ───────────────────────────────────────────────────────
  topMobsKilled: gmProcedure
    .input(daysInput)
    .query(async ({ ctx, input }) => {
      const since = sinceDate(input.days);
      const rows = await ctx.db.execute(sql`
        SELECT
          payload->>'mobSlug'   AS mob_slug,
          (payload->>'mobLevel')::int AS mob_level,
          COUNT(*)::int         AS count
        FROM   game_analytics
        WHERE  event_type = 'mob_killed'
          AND  created_at >= ${since}
          AND  payload->>'mobSlug' IS NOT NULL
        GROUP  BY payload->>'mobSlug', (payload->>'mobLevel')::int
        ORDER  BY count DESC
        LIMIT  25
      `);
      return rows.map((r) => ({
        mobSlug:  String(r.mob_slug ?? '—'),
        mobLevel: Number(r.mob_level ?? 0),
        count:    Number(r.count    ?? 0),
      }));
    }),

  // ─── Items acquired – top by slug ─────────────────────────────────────────
  topItemsAcquired: gmProcedure
    .input(daysInput)
    .query(async ({ ctx, input }) => {
      const since = sinceDate(input.days);
      const rows = await ctx.db.execute(sql`
        SELECT
          payload->>'itemSlug'           AS item_slug,
          SUM((payload->>'quantity')::int)::int AS total_qty,
          COUNT(*)::int                  AS event_count
        FROM   game_analytics
        WHERE  event_type = 'item_acquired'
          AND  created_at >= ${since}
          AND  payload->>'itemSlug' IS NOT NULL
        GROUP  BY payload->>'itemSlug'
        ORDER  BY total_qty DESC
        LIMIT  25
      `);
      return rows.map((r) => ({
        itemSlug:   String(r.item_slug    ?? '—'),
        totalQty:   Number(r.total_qty   ?? 0),
        eventCount: Number(r.event_count ?? 0),
      }));
    }),

  // ─── Items by acquisition source ──────────────────────────────────────────
  itemsBySource: gmProcedure
    .input(daysInput)
    .query(async ({ ctx, input }) => {
      const since = sinceDate(input.days);
      const rows = await ctx.db.execute(sql`
        SELECT
          payload->>'source'            AS source,
          COUNT(*)::int                 AS event_count,
          SUM((payload->>'quantity')::int)::int AS total_qty
        FROM   game_analytics
        WHERE  event_type = 'item_acquired'
          AND  created_at >= ${since}
        GROUP  BY payload->>'source'
        ORDER  BY total_qty DESC
      `);
      return rows.map((r) => ({
        source:     String(r.source      ?? 'unknown'),
        eventCount: Number(r.event_count ?? 0),
        totalQty:   Number(r.total_qty   ?? 0),
      }));
    }),

  // ─── Gold flow by source ───────────────────────────────────────────────────
  goldBySource: gmProcedure
    .input(daysInput)
    .query(async ({ ctx, input }) => {
      const since = sinceDate(input.days);
      const rows = await ctx.db.execute(sql`
        SELECT
          payload->>'source'                AS source,
          COUNT(*)::int                     AS count,
          SUM((payload->>'delta')::bigint)  AS net_delta,
          SUM(
            CASE WHEN (payload->>'delta')::bigint > 0
                 THEN (payload->>'delta')::bigint ELSE 0 END
          )                                 AS income,
          SUM(
            CASE WHEN (payload->>'delta')::bigint < 0
                 THEN ABS((payload->>'delta')::bigint) ELSE 0 END
          )                                 AS spending
        FROM   game_analytics
        WHERE  event_type = 'gold_change'
          AND  created_at >= ${since}
          AND  payload->>'delta' IS NOT NULL
        GROUP  BY payload->>'source'
        ORDER  BY count DESC
      `);
      return rows.map((r) => ({
        source:   String(r.source   ?? 'unknown'),
        count:    Number(r.count    ?? 0),
        netDelta: Number(r.net_delta ?? 0),
        income:   Number(r.income   ?? 0),
        spending: Number(r.spending ?? 0),
      }));
    }),

  // ─── Activity Punch Card (hour × day-of-week heatmap) ─────────────────────
  activityPunchCard: gmProcedure
    .input(daysInput)
    .query(async ({ ctx, input }) => {
      const since = sinceDate(input.days);
      const rows = await ctx.db.execute(sql`
        SELECT
          EXTRACT(DOW  FROM created_at)::int  AS dow,
          EXTRACT(HOUR FROM created_at)::int  AS hour,
          COUNT(*)::int                       AS count
        FROM   game_analytics
        WHERE  created_at >= ${since}
        GROUP  BY dow, hour
        ORDER  BY dow, hour
      `);
      return rows.map((r) => ({
        dow:   Number(r.dow),
        hour:  Number(r.hour),
        count: Number(r.count),
      }));
    }),

  // ─── Daily Active Users ────────────────────────────────────────────────────
  dau: gmProcedure
    .input(daysInput)
    .query(async ({ ctx, input }) => {
      const since = sinceDate(input.days);
      const rows = await ctx.db.execute(sql`
        SELECT
          to_char(created_at, 'YYYY-MM-DD') AS date,
          COUNT(DISTINCT character_id)::int  AS dau
        FROM   game_analytics
        WHERE  event_type   = 'session_start'
          AND  created_at  >= ${since}
          AND  character_id IS NOT NULL
        GROUP  BY to_char(created_at, 'YYYY-MM-DD')
        ORDER  BY date
      `);
      return rows.map((r) => ({
        date: String(r.date),
        dau:  Number(r.dau),
      }));
    }),

  // ─── Session duration histogram ────────────────────────────────────────────
  sessionHistogram: gmProcedure
    .input(daysInput)
    .query(async ({ ctx, input }) => {
      const since = sinceDate(input.days);
      const rows = await ctx.db.execute(sql`
        WITH durations AS (
          SELECT EXTRACT(EPOCH FROM (e.created_at - s.created_at)) AS sec
          FROM   game_analytics s
          JOIN   game_analytics e
                 ON  e.session_id = s.session_id
                 AND e.event_type = 'session_end'
          WHERE  s.event_type = 'session_start'
            AND  s.created_at >= ${since}
            AND  EXTRACT(EPOCH FROM (e.created_at - s.created_at)) BETWEEN 10 AND 86400
        )
        SELECT
          CASE
            WHEN sec < 300   THEN '< 5 мин'
            WHEN sec < 900   THEN '5–15 мин'
            WHEN sec < 1800  THEN '15–30 мин'
            WHEN sec < 3600  THEN '30–60 мин'
            WHEN sec < 7200  THEN '1–2 ч'
            ELSE                  '> 2 ч'
          END AS bucket,
          CASE
            WHEN sec < 300   THEN 1
            WHEN sec < 900   THEN 2
            WHEN sec < 1800  THEN 3
            WHEN sec < 3600  THEN 4
            WHEN sec < 7200  THEN 5
            ELSE                  6
          END AS sort_order,
          COUNT(*)::int AS count
        FROM durations
        GROUP BY bucket, sort_order
        ORDER BY sort_order
      `);
      return rows.map((r) => ({
        bucket: String(r.bucket),
        count:  Number(r.count),
      }));
    }),

  // ─── Retention cohort (D1 / D3 / D7 / D30) ────────────────────────────────
  retentionCohort: gmProcedure
    .input(z.object({ weeks: z.number().int().min(1).max(12).default(8) }).default({}))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db.execute(sql`
        WITH cohorts AS (
          SELECT
            DATE_TRUNC('week', u.created_at)::date AS cohort_week,
            u.id                                   AS user_id
          FROM   users u
          WHERE  u.created_at >= NOW() - (${input.weeks} || ' weeks')::interval
        ),
        activity AS (
          SELECT DISTINCT
            c.user_id,
            DATE(ga.created_at) AS activity_date
          FROM   game_analytics ga
          JOIN   characters c ON c.id = ga.character_id
          WHERE  ga.event_type = 'session_start'
            AND  c.user_id IS NOT NULL
        )
        SELECT
          co.cohort_week,
          COUNT(DISTINCT co.user_id)::int                                      AS cohort_size,
          COUNT(DISTINCT CASE WHEN a.activity_date = co.cohort_week + 1  THEN co.user_id END)::int AS d1,
          COUNT(DISTINCT CASE WHEN a.activity_date = co.cohort_week + 3  THEN co.user_id END)::int AS d3,
          COUNT(DISTINCT CASE WHEN a.activity_date = co.cohort_week + 7  THEN co.user_id END)::int AS d7,
          COUNT(DISTINCT CASE WHEN a.activity_date = co.cohort_week + 30 THEN co.user_id END)::int AS d30
        FROM   cohorts co
        LEFT   JOIN activity a ON a.user_id = co.user_id
        GROUP  BY co.cohort_week
        ORDER  BY co.cohort_week DESC
        LIMIT  ${input.weeks}
      `);
      return rows.map((r) => ({
        cohortWeek:  String(r.cohort_week).slice(0, 10),
        cohortSize:  Number(r.cohort_size),
        d1:          Number(r.d1),
        d3:          Number(r.d3),
        d7:          Number(r.d7),
        d30:         Number(r.d30),
      }));
    }),

  // ─── Progression bottleneck (median time per level transition) ─────────────
  progressionBottleneck: gmProcedure
    .input(daysInput)
    .query(async ({ ctx, input }) => {
      const since = sinceDate(input.days);
      const rows = await ctx.db.execute(sql`
        WITH level_ups AS (
          SELECT
            character_id,
            level                                                               AS new_level,
            created_at,
            LAG(created_at) OVER (PARTITION BY character_id ORDER BY created_at) AS prev_at
          FROM   game_analytics
          WHERE  event_type    = 'level_up'
            AND  created_at   >= ${since}
            AND  character_id IS NOT NULL
        )
        SELECT
          new_level                                                             AS level,
          COUNT(*)::int                                                         AS sample_count,
          PERCENTILE_CONT(0.5) WITHIN GROUP (
            ORDER BY EXTRACT(EPOCH FROM (created_at - prev_at))
          )::int                                                                AS median_sec,
          AVG(EXTRACT(EPOCH FROM (created_at - prev_at)))::int                 AS avg_sec
        FROM   level_ups
        WHERE  prev_at IS NOT NULL
          AND  EXTRACT(EPOCH FROM (created_at - prev_at)) BETWEEN 60 AND 604800
        GROUP  BY new_level
        ORDER  BY new_level
      `);
      return rows.map((r) => ({
        level:       Number(r.level),
        sampleCount: Number(r.sample_count),
        medianSec:   Number(r.median_sec),
        avgSec:      Number(r.avg_sec),
      }));
    }),

  // ─── Raw event feed (paginated) ────────────────────────────────────────────
  recentEvents: gmProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(PAGE_SIZE),
        eventType: z.string().optional(),
        characterId: z.number().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const offset = (input.page - 1) * input.pageSize;

      const conditions = [
        input.eventType   ? eq(gameAnalytics.eventType, input.eventType) : undefined,
        input.characterId ? eq(gameAnalytics.characterId, input.characterId) : undefined,
      ].filter(Boolean) as ReturnType<typeof eq>[];

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const [totalRow] = await ctx.db
        .select({ total: sql<number>`COUNT(*)::int`.as('total') })
        .from(gameAnalytics)
        .where(where);

      const rows = await ctx.db
        .select({
          id:          gameAnalytics.id,
          eventType:   gameAnalytics.eventType,
          characterId: gameAnalytics.characterId,
          characterName: characters.name,
          sessionId:   gameAnalytics.sessionId,
          level:       gameAnalytics.level,
          zoneId:      gameAnalytics.zoneId,
          zoneName:    zones.name,
          payload:     gameAnalytics.payload,
          createdAt:   gameAnalytics.createdAt,
        })
        .from(gameAnalytics)
        .leftJoin(characters, eq(characters.id, gameAnalytics.characterId))
        .leftJoin(zones, eq(zones.id, gameAnalytics.zoneId))
        .where(where)
        .orderBy(desc(gameAnalytics.createdAt))
        .limit(input.pageSize)
        .offset(offset);

      return {
        data: rows,
        pagination: {
          page: input.page,
          pageSize: input.pageSize,
          total: totalRow?.total ?? 0,
          totalPages: Math.max(1, Math.ceil((totalRow?.total ?? 0) / input.pageSize)),
        },
      };
    }),
});

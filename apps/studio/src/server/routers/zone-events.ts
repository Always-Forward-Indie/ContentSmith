import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../trpc';
import { db } from '../db';
import { zoneEventTemplates, zones, mob } from '@contentsmith/database';
import { eq, like, count, and } from '@contentsmith/database';
import {
  zoneEventTemplateListQuerySchema,
  zoneEventTemplateIdSchema,
  createZoneEventTemplateSchema,
  updateZoneEventTemplateSchema,
} from '@contentsmith/validation';

export const zoneEventsRouter = createTRPCRouter({
  list: publicProcedure
    .input(zoneEventTemplateListQuerySchema)
    .query(async ({ input }) => {
      const { search, page, pageSize, gameZoneId } = input;
      const offset = (page - 1) * pageSize;
      const conditions = [];
      if (search) conditions.push(like(zoneEventTemplates.slug, `%${search}%`));
      if (gameZoneId) conditions.push(eq(zoneEventTemplates.gameZoneId, gameZoneId));
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
      const [total] = await db.select({ total: count() }).from(zoneEventTemplates).where(whereClause);
      const data = await db
        .select({
          id: zoneEventTemplates.id,
          slug: zoneEventTemplates.slug,
          triggerType: zoneEventTemplates.triggerType,
          durationSec: zoneEventTemplates.durationSec,
          gameZoneId: zoneEventTemplates.gameZoneId,
          zoneName: zones.name,
        })
        .from(zoneEventTemplates)
        .leftJoin(zones, eq(zoneEventTemplates.gameZoneId, zones.id))
        .where(whereClause)
        .orderBy(zoneEventTemplates.slug)
        .limit(pageSize)
        .offset(offset);
      return { data, pagination: { page, pageSize, total: total.total, totalPages: Math.ceil(total.total / pageSize) } };
    }),

  getById: publicProcedure
    .input(zoneEventTemplateIdSchema)
    .query(async ({ input }) => {
      const [result] = await db
        .select({
          id: zoneEventTemplates.id,
          slug: zoneEventTemplates.slug,
          gameZoneId: zoneEventTemplates.gameZoneId,
          triggerType: zoneEventTemplates.triggerType,
          durationSec: zoneEventTemplates.durationSec,
          lootMultiplier: zoneEventTemplates.lootMultiplier,
          spawnRateMultiplier: zoneEventTemplates.spawnRateMultiplier,
          mobSpeedMultiplier: zoneEventTemplates.mobSpeedMultiplier,
          announceKey: zoneEventTemplates.announceKey,
          intervalHours: zoneEventTemplates.intervalHours,
          randomChancePerHour: zoneEventTemplates.randomChancePerHour,
          hasInvasionWave: zoneEventTemplates.hasInvasionWave,
          invasionMobTemplateId: zoneEventTemplates.invasionMobTemplateId,
          invasionWaveCount: zoneEventTemplates.invasionWaveCount,
          invasionChampionSlug: zoneEventTemplates.invasionChampionSlug,
          zoneName: zones.name,
        })
        .from(zoneEventTemplates)
        .leftJoin(zones, eq(zoneEventTemplates.gameZoneId, zones.id))
        .where(eq(zoneEventTemplates.id, input.id));
      if (!result) throw new Error('Zone event not found');
      return result;
    }),

  create: publicProcedure
    .input(createZoneEventTemplateSchema)
    .mutation(async ({ input }) => {
      const [result] = await db.insert(zoneEventTemplates).values(input).returning();
      return result;
    }),

  update: publicProcedure
    .input(updateZoneEventTemplateSchema)
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      const [result] = await db.update(zoneEventTemplates).set(data).where(eq(zoneEventTemplates.id, id)).returning();
      if (!result) throw new Error('Zone event not found');
      return result;
    }),

  delete: publicProcedure
    .input(zoneEventTemplateIdSchema)
    .mutation(async ({ input }) => {
      await db.delete(zoneEventTemplates).where(eq(zoneEventTemplates.id, input.id));
      return { success: true };
    }),
});

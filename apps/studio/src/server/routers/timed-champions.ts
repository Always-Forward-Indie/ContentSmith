import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../trpc';
import { db } from '../db';
import { timedChampionTemplates, zones, mob } from '@contentsmith/database';
import { eq, like, count } from '@contentsmith/database';
import {
  timedChampionTemplateListQuerySchema,
  timedChampionTemplateIdSchema,
  createTimedChampionTemplateSchema,
  updateTimedChampionTemplateSchema,
} from '@contentsmith/validation';

export const timedChampionsRouter = createTRPCRouter({
  list: publicProcedure
    .input(timedChampionTemplateListQuerySchema)
    .query(async ({ input }) => {
      const { search, page, pageSize } = input;
      const offset = (page - 1) * pageSize;
      const whereClause = search ? like(timedChampionTemplates.slug, `%${search}%`) : undefined;
      const [total] = await db.select({ total: count() }).from(timedChampionTemplates).where(whereClause);
      const data = await db
        .select({
          id: timedChampionTemplates.id,
          slug: timedChampionTemplates.slug,
          zoneId: timedChampionTemplates.zoneId,
          mobTemplateId: timedChampionTemplates.mobTemplateId,
          intervalHours: timedChampionTemplates.intervalHours,
          windowMinutes: timedChampionTemplates.windowMinutes,
          zoneName: zones.name,
          mobName: mob.name,
        })
        .from(timedChampionTemplates)
        .leftJoin(zones, eq(timedChampionTemplates.zoneId, zones.id))
        .leftJoin(mob, eq(timedChampionTemplates.mobTemplateId, mob.id))
        .where(whereClause)
        .orderBy(timedChampionTemplates.slug)
        .limit(pageSize)
        .offset(offset);
      return { data, pagination: { page, pageSize, total: total.total, totalPages: Math.ceil(total.total / pageSize) } };
    }),

  getById: publicProcedure
    .input(timedChampionTemplateIdSchema)
    .query(async ({ input }) => {
      const [result] = await db
        .select({
          id: timedChampionTemplates.id,
          slug: timedChampionTemplates.slug,
          zoneId: timedChampionTemplates.zoneId,
          mobTemplateId: timedChampionTemplates.mobTemplateId,
          intervalHours: timedChampionTemplates.intervalHours,
          windowMinutes: timedChampionTemplates.windowMinutes,
          announcementKey: timedChampionTemplates.announcementKey,
          zoneName: zones.name,
          mobName: mob.name,
        })
        .from(timedChampionTemplates)
        .leftJoin(zones, eq(timedChampionTemplates.zoneId, zones.id))
        .leftJoin(mob, eq(timedChampionTemplates.mobTemplateId, mob.id))
        .where(eq(timedChampionTemplates.id, input.id));
      if (!result) throw new Error('Timed champion not found');
      return result;
    }),

  create: publicProcedure
    .input(createTimedChampionTemplateSchema)
    .mutation(async ({ input }) => {
      const [result] = await db.insert(timedChampionTemplates).values(input).returning();
      return result;
    }),

  update: publicProcedure
    .input(updateTimedChampionTemplateSchema)
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      const [result] = await db.update(timedChampionTemplates).set(data).where(eq(timedChampionTemplates.id, id)).returning();
      if (!result) throw new Error('Timed champion not found');
      return result;
    }),

  delete: publicProcedure
    .input(timedChampionTemplateIdSchema)
    .mutation(async ({ input }) => {
      await db.delete(timedChampionTemplates).where(eq(timedChampionTemplates.id, input.id));
      return { success: true };
    }),
});

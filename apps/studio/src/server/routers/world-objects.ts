import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../trpc';
import { db } from '../db';
import { worldObjects, zones, items } from '@contentsmith/database';
import { eq, like, count, and } from '@contentsmith/database';
import {
  worldObjectListQuerySchema,
  worldObjectIdSchema,
  createWorldObjectSchema,
  updateWorldObjectSchema,
} from '@contentsmith/validation';

export const worldObjectsRouter = createTRPCRouter({
  list: publicProcedure
    .input(worldObjectListQuerySchema)
    .query(async ({ input }) => {
      const { search, page, pageSize, zoneId, objectType } = input;
      const offset = (page - 1) * pageSize;
      const conditions = [];
      if (search) conditions.push(like(worldObjects.slug, `%${search}%`));
      if (zoneId) conditions.push(eq(worldObjects.zoneId, zoneId));
      if (objectType) conditions.push(eq(worldObjects.objectType, objectType));
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
      const [total] = await db.select({ total: count() }).from(worldObjects).where(whereClause);
      const data = await db
        .select({
          id: worldObjects.id,
          slug: worldObjects.slug,
          nameKey: worldObjects.nameKey,
          objectType: worldObjects.objectType,
          scope: worldObjects.scope,
          zoneId: worldObjects.zoneId,
          isActiveByDefault: worldObjects.isActiveByDefault,
          zoneName: zones.name,
        })
        .from(worldObjects)
        .leftJoin(zones, eq(worldObjects.zoneId, zones.id))
        .where(whereClause)
        .orderBy(worldObjects.slug)
        .limit(pageSize)
        .offset(offset);
      return { data, pagination: { page, pageSize, total: total.total, totalPages: Math.ceil(total.total / pageSize) } };
    }),

  getById: publicProcedure
    .input(worldObjectIdSchema)
    .query(async ({ input }) => {
      const [result] = await db
        .select({
          id: worldObjects.id,
          slug: worldObjects.slug,
          nameKey: worldObjects.nameKey,
          objectType: worldObjects.objectType,
          scope: worldObjects.scope,
          posX: worldObjects.posX,
          posY: worldObjects.posY,
          posZ: worldObjects.posZ,
          rotZ: worldObjects.rotZ,
          zoneId: worldObjects.zoneId,
          requiredItemId: worldObjects.requiredItemId,
          interactionRadius: worldObjects.interactionRadius,
          channelTimeSec: worldObjects.channelTimeSec,
          respawnSec: worldObjects.respawnSec,
          isActiveByDefault: worldObjects.isActiveByDefault,
          minLevel: worldObjects.minLevel,
          conditionGroup: worldObjects.conditionGroup,
          zoneName: zones.name,
          requiredItemName: items.name,
        })
        .from(worldObjects)
        .leftJoin(zones, eq(worldObjects.zoneId, zones.id))
        .leftJoin(items, eq(worldObjects.requiredItemId, items.id))
        .where(eq(worldObjects.id, input.id));
      if (!result) throw new Error('World object not found');
      return result;
    }),

  create: publicProcedure
    .input(createWorldObjectSchema)
    .mutation(async ({ input }) => {
      const [result] = await db.insert(worldObjects).values(input).returning();
      return result;
    }),

  update: publicProcedure
    .input(updateWorldObjectSchema)
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      const [result] = await db.update(worldObjects).set(data).where(eq(worldObjects.id, id)).returning();
      if (!result) throw new Error('World object not found');
      return result;
    }),

  delete: publicProcedure
    .input(worldObjectIdSchema)
    .mutation(async ({ input }) => {
      await db.delete(worldObjects).where(eq(worldObjects.id, input.id));
      return { success: true };
    }),
});

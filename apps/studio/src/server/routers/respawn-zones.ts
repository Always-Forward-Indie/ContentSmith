import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../trpc';
import { db } from '../db';
import { respawnZones, zones } from '@contentsmith/database';
import { eq, like, count, and } from '@contentsmith/database';
import {
  respawnZoneListQuerySchema,
  respawnZoneIdSchema,
  createRespawnZoneSchema,
  updateRespawnZoneSchema,
} from '@contentsmith/validation';

export const respawnZonesRouter = createTRPCRouter({
  list: publicProcedure
    .input(respawnZoneListQuerySchema)
    .query(async ({ input }) => {
      const { search, page, pageSize, zoneId } = input;
      const offset = (page - 1) * pageSize;
      const conditions = [];
      if (search) conditions.push(like(respawnZones.name, `%${search}%`));
      if (zoneId) conditions.push(eq(respawnZones.zoneId, zoneId));
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
      const [total] = await db.select({ total: count() }).from(respawnZones).where(whereClause);
      const data = await db
        .select({
          id: respawnZones.id,
          name: respawnZones.name,
          x: respawnZones.x,
          y: respawnZones.y,
          z: respawnZones.z,
          zoneId: respawnZones.zoneId,
          isDefault: respawnZones.isDefault,
          zoneName: zones.name,
        })
        .from(respawnZones)
        .leftJoin(zones, eq(respawnZones.zoneId, zones.id))
        .where(whereClause)
        .orderBy(respawnZones.name)
        .limit(pageSize)
        .offset(offset);
      return { data, pagination: { page, pageSize, total: total.total, totalPages: Math.ceil(total.total / pageSize) } };
    }),

  getById: publicProcedure
    .input(respawnZoneIdSchema)
    .query(async ({ input }) => {
      const [result] = await db
        .select({
          id: respawnZones.id,
          name: respawnZones.name,
          x: respawnZones.x,
          y: respawnZones.y,
          z: respawnZones.z,
          zoneId: respawnZones.zoneId,
          isDefault: respawnZones.isDefault,
          zoneName: zones.name,
        })
        .from(respawnZones)
        .leftJoin(zones, eq(respawnZones.zoneId, zones.id))
        .where(eq(respawnZones.id, input.id));
      if (!result) throw new Error('Respawn zone not found');
      return result;
    }),

  create: publicProcedure
    .input(createRespawnZoneSchema)
    .mutation(async ({ input }) => {
      const [result] = await db.insert(respawnZones).values(input).returning();
      return result;
    }),

  update: publicProcedure
    .input(updateRespawnZoneSchema)
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      const [result] = await db.update(respawnZones).set(data).where(eq(respawnZones.id, id)).returning();
      if (!result) throw new Error('Respawn zone not found');
      return result;
    }),

  delete: publicProcedure
    .input(respawnZoneIdSchema)
    .mutation(async ({ input }) => {
      await db.delete(respawnZones).where(eq(respawnZones.id, input.id));
      return { success: true };
    }),
});

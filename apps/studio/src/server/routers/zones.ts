import { z } from 'zod';
import { eq, like, or, count, asc, and } from '@contentsmith/database';
import { db } from '../db';
import { zones, spawnZones, spawnZoneMobs, npcPlacements, mob, npc } from '@contentsmith/database';
import { createTRPCRouter, publicProcedure } from '../trpc';
import {
  createZoneSchema, updateZoneSchema, zoneIdSchema,
  createSpawnZoneSchema, updateSpawnZoneSchema, spawnZoneIdSchema,
  createSpawnZoneMobSchema, updateSpawnZoneMobSchema, spawnZoneMobIdSchema,
  createNpcPlacementSchema, updateNpcPlacementSchema, npcPlacementIdSchema,
} from '@contentsmith/validation';

export const zonesRouter = createTRPCRouter({
  // ─── Zones ──────────────────────────────────────────────────────────────────

  list: publicProcedure
    .input(z.object({
      search: z.string().optional(),
      page: z.number().int().min(1).default(1),
      pageSize: z.number().int().min(1).max(100).default(20),
    }))
    .query(async ({ input }) => {
      const { search, page, pageSize } = input;
      const offset = (page - 1) * pageSize;
      const whereClause = search
        ? or(like(zones.name, `%${search}%`), like(zones.slug, `%${search}%`))
        : undefined;
      const [{ total }] = await db.select({ total: count() }).from(zones).where(whereClause);
      const data = await db.select().from(zones).where(whereClause).orderBy(zones.name).limit(pageSize).offset(offset);
      return { data, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } };
    }),

  getById: publicProcedure.input(zoneIdSchema).query(async ({ input }) => {
    const rows = await db.select().from(zones).where(eq(zones.id, input.id)).limit(1);
    if (!rows[0]) throw new Error('Zone not found');
    return rows[0];
  }),

  create: publicProcedure.input(createZoneSchema).mutation(async ({ input }) => {
    const rows = await db.insert(zones).values(input).returning();
    return rows[0];
  }),

  update: publicProcedure.input(updateZoneSchema).mutation(async ({ input }) => {
    const { id, ...rest } = input;
    const rows = await db.update(zones).set(rest).where(eq(zones.id, id)).returning();
    if (!rows[0]) throw new Error('Zone not found');
    return rows[0];
  }),

  delete: publicProcedure.input(zoneIdSchema).mutation(async ({ input }) => {
    await db.delete(zones).where(eq(zones.id, input.id));
    return { success: true };
  }),

  // ─── Spawn Zones ────────────────────────────────────────────────────────────

  listSpawnZones: publicProcedure
    .input(z.object({
      search: z.string().optional(),
      gameZoneId: z.number().int().positive().optional(),
      page: z.number().int().min(1).default(1),
      pageSize: z.number().int().min(1).max(100).default(20),
    }))
    .query(async ({ input }) => {
      const { search, gameZoneId, page, pageSize } = input;
      const offset = (page - 1) * pageSize;
      const whereClause = and(
        search ? like(spawnZones.zoneName, `%${search}%`) : undefined,
        gameZoneId ? eq(spawnZones.gameZoneId, gameZoneId) : undefined,
      );
      const [{ total }] = await db.select({ total: count() }).from(spawnZones).where(whereClause);
      const data = await db
        .select({
          spawnZoneId: spawnZones.zoneId,
          zoneName: spawnZones.zoneName,
          gameZoneId: spawnZones.gameZoneId,
          gameZoneName: zones.name,
          minSpawnX: spawnZones.minSpawnX,
          minSpawnY: spawnZones.minSpawnY,
          minSpawnZ: spawnZones.minSpawnZ,
          maxSpawnX: spawnZones.maxSpawnX,
          maxSpawnY: spawnZones.maxSpawnY,
          maxSpawnZ: spawnZones.maxSpawnZ,
        })
        .from(spawnZones)
        .leftJoin(zones, eq(spawnZones.gameZoneId, zones.id))
        .where(whereClause)
        .orderBy(asc(spawnZones.zoneName))
        .limit(pageSize)
        .offset(offset);
      return { data, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } };
    }),

  getSpawnZoneById: publicProcedure
    .input(z.number().int().positive())
    .query(async ({ input }) => {
      const rows = await db
        .select({
          spawnZoneId: spawnZones.zoneId,
          zoneName: spawnZones.zoneName,
          gameZoneId: spawnZones.gameZoneId,
          gameZoneName: zones.name,
          minSpawnX: spawnZones.minSpawnX,
          minSpawnY: spawnZones.minSpawnY,
          minSpawnZ: spawnZones.minSpawnZ,
          maxSpawnX: spawnZones.maxSpawnX,
          maxSpawnY: spawnZones.maxSpawnY,
          maxSpawnZ: spawnZones.maxSpawnZ,
        })
        .from(spawnZones)
        .leftJoin(zones, eq(spawnZones.gameZoneId, zones.id))
        .where(eq(spawnZones.zoneId, input))
        .limit(1);
      if (!rows[0]) throw new Error('Spawn zone not found');
      return rows[0];
    }),

  createSpawnZone: publicProcedure.input(createSpawnZoneSchema).mutation(async ({ input }) => {
    const rows = await db.insert(spawnZones).values(input).returning();
    return rows[0];
  }),

  updateSpawnZone: publicProcedure.input(updateSpawnZoneSchema).mutation(async ({ input }) => {
    const { spawnZoneId, ...rest } = input;
    const rows = await db.update(spawnZones).set(rest).where(eq(spawnZones.zoneId, spawnZoneId)).returning();
    if (!rows[0]) throw new Error('Spawn zone not found');
    return rows[0];
  }),

  deleteSpawnZone: publicProcedure.input(spawnZoneIdSchema).mutation(async ({ input }) => {
    await db.delete(spawnZones).where(eq(spawnZones.zoneId, input.spawnZoneId));
    return { success: true };
  }),

  // ─── Spawn Zone Mobs ────────────────────────────────────────────────────────

  listSpawnZoneMobs: publicProcedure
    .input(z.number().int().positive())
    .query(async ({ input }) => {
      return db
        .select({
          id: spawnZoneMobs.id,
          spawnZoneId: spawnZoneMobs.spawnZoneId,
          mobId: spawnZoneMobs.mobId,
          mobName: mob.name,
          mobLevel: mob.level,
          spawnCount: spawnZoneMobs.spawnCount,
          respawnTime: spawnZoneMobs.respawnTime,
        })
        .from(spawnZoneMobs)
        .leftJoin(mob, eq(spawnZoneMobs.mobId, mob.id))
        .where(eq(spawnZoneMobs.spawnZoneId, input))
        .orderBy(asc(mob.name));
    }),

  addSpawnZoneMob: publicProcedure.input(createSpawnZoneMobSchema).mutation(async ({ input }) => {
    const rows = await db.insert(spawnZoneMobs).values(input).returning();
    return rows[0];
  }),

  updateSpawnZoneMob: publicProcedure.input(updateSpawnZoneMobSchema).mutation(async ({ input }) => {
    const { id, ...rest } = input;
    const rows = await db.update(spawnZoneMobs).set(rest).where(eq(spawnZoneMobs.id, id)).returning();
    if (!rows[0]) throw new Error('Spawn zone mob entry not found');
    return rows[0];
  }),

  removeSpawnZoneMob: publicProcedure.input(spawnZoneMobIdSchema).mutation(async ({ input }) => {
    await db.delete(spawnZoneMobs).where(eq(spawnZoneMobs.id, input.id));
    return { success: true };
  }),

  allMobs: publicProcedure.query(async () => {
    return db.select({ id: mob.id, name: mob.name, level: mob.level }).from(mob).orderBy(mob.name);
  }),

  listSpawnZonesByMob: publicProcedure
    .input(z.number().int().positive())
    .query(async ({ input: mobId }) => {
      return db
        .select({
          id: spawnZoneMobs.id,
          spawnZoneId: spawnZoneMobs.spawnZoneId,
          zoneName: spawnZones.zoneName,
          gameZoneId: spawnZones.gameZoneId,
          spawnCount: spawnZoneMobs.spawnCount,
          respawnTime: spawnZoneMobs.respawnTime,
        })
        .from(spawnZoneMobs)
        .leftJoin(spawnZones, eq(spawnZoneMobs.spawnZoneId, spawnZones.zoneId))
        .where(eq(spawnZoneMobs.mobId, mobId))
        .orderBy(asc(spawnZones.zoneName));
    }),

  // ─── NPC Placements ─────────────────────────────────────────────────────────

  listNpcPlacements: publicProcedure
    .input(z.object({
      npcId: z.number().int().positive().optional(),
      zoneId: z.number().int().positive().optional(),
    }))
    .query(async ({ input }) => {
      const whereClause = and(
        input.npcId ? eq(npcPlacements.npcId, input.npcId) : undefined,
        input.zoneId ? eq(npcPlacements.zoneId, input.zoneId) : undefined,
      );
      return db
        .select({
          id: npcPlacements.id,
          npcId: npcPlacements.npcId,
          npcName: npc.name,
          zoneId: npcPlacements.zoneId,
          zoneName: zones.name,
          x: npcPlacements.x,
          y: npcPlacements.y,
          z: npcPlacements.z,
          rotZ: npcPlacements.rotZ,
        })
        .from(npcPlacements)
        .leftJoin(npc, eq(npcPlacements.npcId, npc.id))
        .leftJoin(zones, eq(npcPlacements.zoneId, zones.id))
        .where(whereClause)
        .orderBy(asc(npc.name));
    }),

  createNpcPlacement: publicProcedure.input(createNpcPlacementSchema).mutation(async ({ input }) => {
    const rows = await db.insert(npcPlacements).values(input).returning();
    return rows[0];
  }),

  updateNpcPlacement: publicProcedure.input(updateNpcPlacementSchema).mutation(async ({ input }) => {
    const { id, ...rest } = input;
    const rows = await db.update(npcPlacements).set(rest).where(eq(npcPlacements.id, id)).returning();
    if (!rows[0]) throw new Error('NPC placement not found');
    return rows[0];
  }),

  deleteNpcPlacement: publicProcedure.input(npcPlacementIdSchema).mutation(async ({ input }) => {
    await db.delete(npcPlacements).where(eq(npcPlacements.id, input.id));
    return { success: true };
  }),
});

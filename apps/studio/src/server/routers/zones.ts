import { z } from 'zod';
import { eq, like, or, count, asc, and, sql } from '@contentsmith/database';
import { db } from '../db';
import { zones, spawnZones, spawnZoneMobs, classSpawnZones, npcPlacements, mobPosition, worldObjects, respawnZones, mob, npc, npcType, characterClass } from '@contentsmith/database';
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
    const { centerX, centerY, shapeType = 'RECT', minX = 0, maxX = 0, minY = 0, maxY = 0, ...rest } = input;
    const cx = shapeType === 'RECT' ? (minX + maxX) / 2 : (centerX ?? 0);
    const cy = shapeType === 'RECT' ? (minY + maxY) / 2 : (centerY ?? 0);
    const rows = await db.insert(zones).values({ ...rest, shapeType, minX, maxX, minY, maxY, centerX: cx, centerY: cy }).returning();
    return rows[0];
  }),

  update: publicProcedure.input(updateZoneSchema).mutation(async ({ input }) => {
    const { id, centerX, centerY, ...rest } = input;
    const shapeType = rest.shapeType;
    let cx = centerX;
    let cy = centerY;
    // Auto-compute center for RECT shapes when not explicitly provided
    if (shapeType === 'RECT' || (!shapeType && centerX === undefined)) {
      if (rest.minX !== undefined && rest.maxX !== undefined) cx = (rest.minX + rest.maxX) / 2;
      if (rest.minY !== undefined && rest.maxY !== undefined) cy = (rest.minY + rest.maxY) / 2;
    }
    const rows = await db.update(zones).set({ ...rest, ...(cx !== undefined ? { centerX: cx } : {}), ...(cy !== undefined ? { centerY: cy } : {}) }).where(eq(zones.id, id)).returning();
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
          exclusionGameZoneId: spawnZones.exclusionGameZoneId,
          minSpawnX: spawnZones.minSpawnX,
          minSpawnY: spawnZones.minSpawnY,
          minSpawnZ: spawnZones.minSpawnZ,
          maxSpawnX: spawnZones.maxSpawnX,
          maxSpawnY: spawnZones.maxSpawnY,
          maxSpawnZ: spawnZones.maxSpawnZ,
          shapeType: spawnZones.shapeType,
          centerX: spawnZones.centerX,
          centerY: spawnZones.centerY,
          innerRadius: spawnZones.innerRadius,
          outerRadius: spawnZones.outerRadius,
          mobCount: sql<number>`COALESCE((SELECT COUNT(*)::int FROM spawn_zone_mobs WHERE spawn_zone_mobs.spawn_zone_id = ${spawnZones.zoneId}), 0)`,
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
          exclusionGameZoneId: spawnZones.exclusionGameZoneId,
          minSpawnX: spawnZones.minSpawnX,
          minSpawnY: spawnZones.minSpawnY,
          minSpawnZ: spawnZones.minSpawnZ,
          maxSpawnX: spawnZones.maxSpawnX,
          maxSpawnY: spawnZones.maxSpawnY,
          maxSpawnZ: spawnZones.maxSpawnZ,
          shapeType: spawnZones.shapeType,
          centerX: spawnZones.centerX,
          centerY: spawnZones.centerY,
          innerRadius: spawnZones.innerRadius,
          outerRadius: spawnZones.outerRadius,
          mobCount: sql<number>`COALESCE((SELECT COUNT(*)::int FROM spawn_zone_mobs WHERE spawn_zone_mobs.spawn_zone_id = ${spawnZones.zoneId}), 0)`,
        })
        .from(spawnZones)
        .leftJoin(zones, eq(spawnZones.gameZoneId, zones.id))
        .where(eq(spawnZones.zoneId, input))
        .limit(1);
      if (!rows[0]) throw new Error('Spawn zone not found');
      return rows[0];
    }),

  createSpawnZone: publicProcedure.input(createSpawnZoneSchema).mutation(async ({ input }) => {
    const { shapeType = 'RECT', minSpawnX = 0, maxSpawnX = 0, minSpawnY = 0, maxSpawnY = 0, ...rest } = input;
    const cx = shapeType === 'RECT' ? (minSpawnX + maxSpawnX) / 2 : (rest.centerX ?? 0);
    const cy = shapeType === 'RECT' ? (minSpawnY + maxSpawnY) / 2 : (rest.centerY ?? 0);
    const rows = await db.insert(spawnZones).values({ ...rest, shapeType, minSpawnX, maxSpawnX, minSpawnY, maxSpawnY, centerX: cx, centerY: cy }).returning();
    return rows[0];
  }),

  updateSpawnZone: publicProcedure.input(updateSpawnZoneSchema).mutation(async ({ input }) => {
    const { spawnZoneId, centerX, centerY, ...rest } = input;
    const shapeType = rest.shapeType;
    let cx = centerX;
    let cy = centerY;
    if (shapeType === 'RECT' || (!shapeType && centerX === undefined)) {
      if (rest.minSpawnX !== undefined && rest.maxSpawnX !== undefined) cx = (rest.minSpawnX + rest.maxSpawnX) / 2;
      if (rest.minSpawnY !== undefined && rest.maxSpawnY !== undefined) cy = (rest.minSpawnY + rest.maxSpawnY) / 2;
    }
    const rows = await db.update(spawnZones).set({ ...rest, ...(cx !== undefined ? { centerX: cx } : {}), ...(cy !== undefined ? { centerY: cy } : {}) }).where(eq(spawnZones.zoneId, spawnZoneId)).returning();
    if (!rows[0]) throw new Error('Spawn zone not found');
    return rows[0];
  }),

  deleteSpawnZone: publicProcedure.input(spawnZoneIdSchema).mutation(async ({ input }) => {
    await db.delete(spawnZones).where(eq(spawnZones.zoneId, input.spawnZoneId));
    return { success: true };
  }),

  // ─── Class Spawn Zones ──────────────────────────────────────────────────────

  listClassSpawnZones: publicProcedure
    .input(z.object({
      search: z.string().optional(),
      classId: z.number().int().positive().optional(),
      page: z.number().int().min(1).default(1),
      pageSize: z.number().int().min(1).max(100).default(20),
    }))
    .query(async ({ input }) => {
      const { search, classId, page, pageSize } = input;
      const offset = (page - 1) * pageSize;
      const whereClause = and(
        classId ? eq(classSpawnZones.classId, classId) : undefined,
      );
      const [{ total }] = await db.select({ total: count() }).from(classSpawnZones).where(whereClause);
      const data = await db
        .select({
          id: classSpawnZones.id,
          classId: classSpawnZones.classId,
          className: characterClass.name,
          zoneId: classSpawnZones.zoneId,
          minX: classSpawnZones.minX,
          maxX: classSpawnZones.maxX,
          minY: classSpawnZones.minY,
          maxY: classSpawnZones.maxY,
          minZ: classSpawnZones.minZ,
          maxZ: classSpawnZones.maxZ,
          shapeType: classSpawnZones.shapeType,
          centerX: classSpawnZones.centerX,
          centerY: classSpawnZones.centerY,
          innerRadius: classSpawnZones.innerRadius,
          outerRadius: classSpawnZones.outerRadius,
        })
        .from(classSpawnZones)
        .leftJoin(characterClass, eq(classSpawnZones.classId, characterClass.id))
        .where(whereClause)
        .orderBy(asc(characterClass.name))
        .limit(pageSize)
        .offset(offset);
      return { data, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } };
    }),

  createClassSpawnZone: publicProcedure
    .input(z.object({
      classId: z.number().int().positive(),
      zoneId: z.number().int().positive().nullable().optional(),
      minX: z.number().default(0), maxX: z.number().default(0),
      minY: z.number().default(0), maxY: z.number().default(0),
      minZ: z.number().default(0), maxZ: z.number().default(0),
      shapeType: z.enum(['RECT', 'CIRCLE', 'ANNULUS']).default('RECT'),
      centerX: z.number().default(0), centerY: z.number().default(0),
      innerRadius: z.number().min(0).default(0),
      outerRadius: z.number().min(0).default(0),
    }))
    .mutation(async ({ input }) => {
      const { shapeType = 'RECT', minX = 0, maxX = 0, minY = 0, maxY = 0, ...rest } = input;
      const cx = shapeType === 'RECT' ? (minX + maxX) / 2 : (rest.centerX ?? 0);
      const cy = shapeType === 'RECT' ? (minY + maxY) / 2 : (rest.centerY ?? 0);
      const rows = await db.insert(classSpawnZones).values({ ...rest, shapeType, minX, maxX, minY, maxY, centerX: cx, centerY: cy }).returning();
      return rows[0];
    }),

  updateClassSpawnZone: publicProcedure
    .input(z.object({
      id: z.number().int().positive(),
      classId: z.number().int().positive().optional(),
      zoneId: z.number().int().positive().nullable().optional(),
      minX: z.number().optional(), maxX: z.number().optional(),
      minY: z.number().optional(), maxY: z.number().optional(),
      minZ: z.number().optional(), maxZ: z.number().optional(),
      shapeType: z.enum(['RECT', 'CIRCLE', 'ANNULUS']).optional(),
      centerX: z.number().optional(), centerY: z.number().optional(),
      innerRadius: z.number().optional(), outerRadius: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, centerX, centerY, ...rest } = input;
      const shapeType = rest.shapeType;
      let cx = centerX, cy = centerY;
      if (shapeType === 'RECT' || (!shapeType && centerX === undefined)) {
        if (rest.minX !== undefined && rest.maxX !== undefined) cx = (rest.minX + rest.maxX) / 2;
        if (rest.minY !== undefined && rest.maxY !== undefined) cy = (rest.minY + rest.maxY) / 2;
      }
      const rows = await db.update(classSpawnZones).set({ ...rest, ...(cx !== undefined ? { centerX: cx } : {}), ...(cy !== undefined ? { centerY: cy } : {}) }).where(eq(classSpawnZones.id, id)).returning();
      if (!rows[0]) throw new Error('Class spawn zone not found');
      return rows[0];
    }),

  deleteClassSpawnZone: publicProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      await db.delete(classSpawnZones).where(eq(classSpawnZones.id, input.id));
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

  // ─── World Map Data (ALL zones + ALL entities) ──────────────────────────────

  getAllMapData: publicProcedure.query(async () => {
    const [
      allZones,
      npcRows,
      spawnZoneRows,
      worldObjectRows,
      respawnZoneRows,
      classSpawnZoneRows,
      mobPositionRows,
    ] = await Promise.all([
      db.select().from(zones).orderBy(asc(zones.name)),

      db.select({
        id: npcPlacements.id,
        npcId: npcPlacements.npcId,
        npcName: npc.name,
        npcLevel: npc.level,
        npcTypeName: npcType.name,
        factionSlug: npc.factionSlug,
        isInteractable: npc.isInteractable,
        zoneId: npcPlacements.zoneId,
        x: npcPlacements.x,
        y: npcPlacements.y,
        z: npcPlacements.z,
        rotZ: npcPlacements.rotZ,
      })
        .from(npcPlacements)
        .leftJoin(npc, eq(npcPlacements.npcId, npc.id))
        .leftJoin(npcType, eq(npc.npcType, npcType.id)),

      db.select({
        spawnZoneId: spawnZones.zoneId,
        zoneName: spawnZones.zoneName,
        gameZoneId: spawnZones.gameZoneId,
        exclusionGameZoneId: spawnZones.exclusionGameZoneId,
        minSpawnX: spawnZones.minSpawnX,
        minSpawnY: spawnZones.minSpawnY,
        minSpawnZ: spawnZones.minSpawnZ,
        maxSpawnX: spawnZones.maxSpawnX,
        maxSpawnY: spawnZones.maxSpawnY,
        maxSpawnZ: spawnZones.maxSpawnZ,
        shapeType: spawnZones.shapeType,
        centerX: spawnZones.centerX,
        centerY: spawnZones.centerY,
        innerRadius: spawnZones.innerRadius,
        outerRadius: spawnZones.outerRadius,
      })
        .from(spawnZones),

      db.select({
        id: worldObjects.id,
        slug: worldObjects.slug,
        nameKey: worldObjects.nameKey,
        objectType: worldObjects.objectType,
        zoneId: worldObjects.zoneId,
        posX: worldObjects.posX,
        posY: worldObjects.posY,
        posZ: worldObjects.posZ,
        rotZ: worldObjects.rotZ,
      })
        .from(worldObjects),

      db.select({
        id: respawnZones.id,
        name: respawnZones.name,
        zoneId: respawnZones.zoneId,
        x: respawnZones.x,
        y: respawnZones.y,
        z: respawnZones.z,
        isDefault: respawnZones.isDefault,
        minX: respawnZones.minX,
        maxX: respawnZones.maxX,
        minY: respawnZones.minY,
        maxY: respawnZones.maxY,
        minZ: respawnZones.minZ,
        maxZ: respawnZones.maxZ,
        shapeType: respawnZones.shapeType,
        centerX: respawnZones.centerX,
        centerY: respawnZones.centerY,
        innerRadius: respawnZones.innerRadius,
        outerRadius: respawnZones.outerRadius,
      })
        .from(respawnZones),

      db.select({
        id: classSpawnZones.id,
        classId: classSpawnZones.classId,
        className: characterClass.name,
        zoneId: classSpawnZones.zoneId,
        minX: classSpawnZones.minX,
        maxX: classSpawnZones.maxX,
        minY: classSpawnZones.minY,
        maxY: classSpawnZones.maxY,
        minZ: classSpawnZones.minZ,
        maxZ: classSpawnZones.maxZ,
        shapeType: classSpawnZones.shapeType,
        centerX: classSpawnZones.centerX,
        centerY: classSpawnZones.centerY,
        innerRadius: classSpawnZones.innerRadius,
        outerRadius: classSpawnZones.outerRadius,
      })
        .from(classSpawnZones)
        .leftJoin(characterClass, eq(classSpawnZones.classId, characterClass.id)),

      db.select({
        id: mobPosition.id,
        mobId: mobPosition.mobId,
        mobName: mob.name,
        mobLevel: mob.level,
        zoneId: mobPosition.zoneId,
        x: mobPosition.x,
        y: mobPosition.y,
        z: mobPosition.z,
        rotZ: mobPosition.rotZ,
      })
        .from(mobPosition)
        .leftJoin(mob, eq(mobPosition.mobId, mob.id)),
    ]);

    return {
      zones: allZones,
      npcPlacements: npcRows,
      spawnZones: spawnZoneRows,
      classSpawnZones: classSpawnZoneRows,
      worldObjects: worldObjectRows,
      respawnZones: respawnZoneRows,
      mobPositions: mobPositionRows,
    };
  }),
});

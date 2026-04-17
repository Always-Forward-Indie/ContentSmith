// Shared types for the World Map Editor

export type EntityLayer = 'zones' | 'npc' | 'spawnZone' | 'worldObject' | 'respawn' | 'mob';

export type MapTool = 'select' | 'addNpc' | 'addSpawnZone' | 'addWorldObject' | 'addRespawn' | 'addZone';

/** Extra fields supplied when creating a new zone from the map canvas */
export interface ZoneExtra {
  slug: string;
  minLevel: number;
  maxLevel: number;
  isPvp: boolean;
  isSafeZone: boolean;
}

/** Fields editable in the zone detail panel (bounds are edited via canvas drag) */
export interface ZoneMetaUpdate {
  name: string;
  slug: string;
  minLevel: number;
  maxLevel: number;
  isPvp: boolean;
  isSafeZone: boolean;
}

// ─── Zone from DB ────────────────────────────────────────────────────────────

export interface ZoneRecord {
  id: number;
  slug: string;
  name: string;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  isPvp: boolean;
  isSafeZone: boolean;
  minLevel: number;
  maxLevel: number;
}

// ─── Entity shapes coming from getAllMapData ───────────────────────────────────

export interface NpcPlacement {
  id: number;
  npcId: number;
  npcName: string | null;
  zoneId: number | null;
  x: number;
  y: number;
  z: number;
  rotZ: number;
}

export interface SpawnZoneRect {
  spawnZoneId: number;
  zoneName: string;
  gameZoneId: number | null;
  minSpawnX: number;
  minSpawnY: number;
  maxSpawnX: number;
  maxSpawnY: number;
}

export interface WorldObjectPin {
  id: number;
  slug: string;
  nameKey: string;
  objectType: string;
  zoneId: number | null;
  posX: number;
  posY: number;
  posZ: number;
  rotZ: number;
}

export interface RespawnPin {
  id: number;
  name: string;
  zoneId: number;
  x: number;
  y: number;
  z: number;
  isDefault: boolean;
}

export interface MobPositionPin {
  id: number;
  mobId: number;
  mobName: string | null;
  mobLevel: number | null;
  zoneId: number | null;
  x: number;
  y: number;
  z: number;
  rotZ: number;
}

// ─── Selection ────────────────────────────────────────────────────────────────

export type SelectedEntity =
  | { type: 'zone';        data: ZoneRecord }
  | { type: 'npc';         data: NpcPlacement }
  | { type: 'spawnZone';   data: SpawnZoneRect }
  | { type: 'worldObject'; data: WorldObjectPin }
  | { type: 'respawn';     data: RespawnPin }
  | { type: 'mob';         data: MobPositionPin };

// ─── World bounds ─────────────────────────────────────────────────────────────

export interface WorldBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

/** Compute world bounds as union of all zone bounds. Falls back to a default. */
export function computeWorldBounds(
  zones: ZoneRecord[],
  override: Partial<WorldBounds> | null = null,
): WorldBounds {
  const withBounds = zones.filter(
    (z) => z.maxX !== z.minX && z.maxY !== z.minY,
  );

  let bounds: WorldBounds;
  if (withBounds.length === 0) {
    bounds = { minX: -5000, maxX: 5000, minY: -5000, maxY: 5000 };
  } else {
    bounds = {
      minX: Math.min(...withBounds.map((z) => z.minX)),
      maxX: Math.max(...withBounds.map((z) => z.maxX)),
      minY: Math.min(...withBounds.map((z) => z.minY)),
      maxY: Math.max(...withBounds.map((z) => z.maxY)),
    };
    // Add 5% padding so zones don't touch the edge
    const padX = (bounds.maxX - bounds.minX) * 0.05;
    const padY = (bounds.maxY - bounds.minY) * 0.05;
    bounds = {
      minX: bounds.minX - padX,
      maxX: bounds.maxX + padX,
      minY: bounds.minY - padY,
      maxY: bounds.maxY + padY,
    };
  }

  // Apply manual overrides from config
  if (override) {
    if (override.minX != null) bounds.minX = override.minX;
    if (override.maxX != null) bounds.maxX = override.maxX;
    if (override.minY != null) bounds.minY = override.minY;
    if (override.maxY != null) bounds.maxY = override.maxY;
  }

  return bounds;
}

// ─── Coordinate helpers ───────────────────────────────────────────────────────

/** World coords → [0..1] normalised (flipY for Unity-style Y axis) */
export function worldToNorm(
  wx: number,
  wy: number,
  b: WorldBounds,
  flipY = false,
): [number, number] {
  const rx = b.maxX - b.minX || 1;
  const ry = b.maxY - b.minY || 1;
  return [
    (wx - b.minX) / rx,
    flipY ? 1 - (wy - b.minY) / ry : (wy - b.minY) / ry,
  ];
}

/** [0..1] normalised → world coords */
export function normToWorld(
  nx: number,
  ny: number,
  b: WorldBounds,
  flipY = false,
): [number, number] {
  const rx = b.maxX - b.minX || 1;
  const ry = b.maxY - b.minY || 1;
  return [
    b.minX + nx * rx,
    flipY ? b.minY + (1 - ny) * ry : b.minY + ny * ry,
  ];
}

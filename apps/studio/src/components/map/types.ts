// Shared types for the World Map Editor

export type EntityLayer = 'zones' | 'npc' | 'spawnZone' | 'classSpawnZone' | 'worldObject' | 'respawn' | 'mob';

export type MapTool = 'select' | 'addNpc' | 'addSpawnZone' | 'addClassSpawnZone' | 'addWorldObject' | 'addRespawn' | 'addZone';

export type SpawnZoneShape = 'RECT' | 'CIRCLE' | 'ANNULUS';

/** Extra fields supplied when creating a new zone from the map canvas */
export interface ZoneExtra {
  slug: string;
  minLevel: number;
  maxLevel: number;
  isPvp: boolean;
  isSafeZone: boolean;
  // Optional shape fields (also used for addSpawnZone)
  shapeType?: SpawnZoneShape;
  centerX?: number;
  centerY?: number;
  innerRadius?: number;
  outerRadius?: number;
  // Spawn zone extra fields
  gameZoneId?: number;
  exclusionGameZoneId?: number;
  minSpawnZ?: number;
  maxSpawnZ?: number;
}

/** Fields editable in the zone detail panel (bounds are edited via canvas drag) */
export interface ZoneMetaUpdate {
  name: string;
  slug: string;
  minLevel: number;
  maxLevel: number;
  isPvp: boolean;
  isSafeZone: boolean;
  shapeType?: SpawnZoneShape;
  centerX?: number;
  centerY?: number;
  innerRadius?: number;
  outerRadius?: number;
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
  shapeType: SpawnZoneShape;
  centerX: number;
  centerY: number;
  innerRadius: number;
  outerRadius: number;
}

// ─── Entity shapes coming from getAllMapData ───────────────────────────────────

export interface NpcPlacement {
  id: number;
  npcId: number;
  npcName: string | null;
  npcLevel: number | null;
  npcTypeName: string | null;
  factionSlug: string | null;
  isInteractable: boolean | null;
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
  exclusionGameZoneId: number | null;
  minSpawnX: number;
  minSpawnY: number;
  minSpawnZ: number;
  maxSpawnX: number;
  maxSpawnY: number;
  maxSpawnZ: number;
  shapeType: SpawnZoneShape;
  centerX: number;
  centerY: number;
  innerRadius: number;
  outerRadius: number;
}

export interface ClassSpawnZonePin {
  id: number;
  classId: number;
  className: string | null;
  zoneId: number | null;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
  shapeType: SpawnZoneShape;
  centerX: number;
  centerY: number;
  innerRadius: number;
  outerRadius: number;
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
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
  shapeType: SpawnZoneShape;
  centerX: number;
  centerY: number;
  innerRadius: number;
  outerRadius: number;
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
  | { type: 'classSpawnZone'; data: ClassSpawnZonePin }
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
    (z) => {
      if (z.shapeType === 'CIRCLE' || z.shapeType === 'ANNULUS') return z.outerRadius > 0;
      return z.maxX !== z.minX && z.maxY !== z.minY;
    },
  );

  let bounds: WorldBounds;
  if (withBounds.length === 0) {
    bounds = { minX: -5000, maxX: 5000, minY: -5000, maxY: 5000 };
  } else {
    bounds = {
      minX: Math.min(...withBounds.map((z) => z.shapeType !== 'RECT' ? z.centerX - z.outerRadius : z.minX)),
      maxX: Math.max(...withBounds.map((z) => z.shapeType !== 'RECT' ? z.centerX + z.outerRadius : z.maxX)),
      minY: Math.min(...withBounds.map((z) => z.shapeType !== 'RECT' ? z.centerY - z.outerRadius : z.minY)),
      maxY: Math.max(...withBounds.map((z) => z.shapeType !== 'RECT' ? z.centerY + z.outerRadius : z.maxY)),
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

// ─── Axis config ─────────────────────────────────────────────────────────────

/**
 * Describes how UE world axes map onto image pixel axes.
 *
 * Each value encodes sign + world axis:
 *   '+X' → image axis increases with World X+
 *   '-X' → image axis increases with World X−
 *   '+Y' → image axis increases with World Y+
 *   '-Y' → image axis increases with World Y−
 *
 * UE top-down export (Pitch=-90): imageXAxis='+Y', imageYAxis='-X'
 * Standard 2-D (no rotation):    imageXAxis='+X', imageYAxis='+Y'
 */
export type ImageAxis = '+X' | '-X' | '+Y' | '-Y';

export interface AxisConfig {
  imageXAxis: ImageAxis;
  imageYAxis: ImageAxis;
}

export const DEFAULT_AXIS_CONFIG: AxisConfig = {
  imageXAxis: '+X',
  imageYAxis: '+Y',
};

// ─── Coordinate helpers ───────────────────────────────────────────────────────

function singleAxisNorm(
  axis: ImageAxis,
  wx: number,
  wy: number,
  b: WorldBounds,
): number {
  const rx = b.maxX - b.minX || 1;
  const ry = b.maxY - b.minY || 1;
  switch (axis) {
    case '+X': return (wx - b.minX) / rx;
    case '-X': return (b.maxX - wx) / rx;
    case '+Y': return (wy - b.minY) / ry;
    case '-Y': return (b.maxY - wy) / ry;
  }
}

/** World coords → [0..1] normalised pixel position */
export function worldToNorm(
  wx: number,
  wy: number,
  b: WorldBounds,
  axis: AxisConfig = DEFAULT_AXIS_CONFIG,
): [number, number] {
  return [
    singleAxisNorm(axis.imageXAxis, wx, wy, b),
    singleAxisNorm(axis.imageYAxis, wx, wy, b),
  ];
}

/** [0..1] normalised pixel position → world coords */
export function normToWorld(
  nx: number,
  ny: number,
  b: WorldBounds,
  axis: AxisConfig = DEFAULT_AXIS_CONFIG,
): [number, number] {
  const rx = b.maxX - b.minX || 1;
  const ry = b.maxY - b.minY || 1;
  let wx = 0, wy = 0;
  // imageXAxis tells which world coord is driven by the horizontal pixel axis
  switch (axis.imageXAxis) {
    case '+X': wx = b.minX + nx * rx; break;
    case '-X': wx = b.maxX - nx * rx; break;
    case '+Y': wy = b.minY + nx * ry; break;
    case '-Y': wy = b.maxY - nx * ry; break;
  }
  // imageYAxis tells which world coord is driven by the vertical pixel axis
  switch (axis.imageYAxis) {
    case '+X': wx = b.minX + ny * rx; break;
    case '-X': wx = b.maxX - ny * rx; break;
    case '+Y': wy = b.minY + ny * ry; break;
    case '-Y': wy = b.maxY - ny * ry; break;
  }
  return [wx, wy];
}

/**
 * World map configuration stored in <appRoot>/config/world-map.json
 *
 * imageUrl  - path to the uploaded map image served from /public
 * worldMinX / worldMaxX / worldMinY / worldMaxY
 *   - manual override for world bounds when zone bounds don't cover the full map.
 *     If null, bounds are computed automatically from all zones.
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

export interface MapConfig {
  imageUrl: string | null;
  worldMinX: number | null;
  worldMaxX: number | null;
  worldMinY: number | null;
  worldMaxY: number | null;
}

const CONFIG_DIR  = join(process.cwd(), 'config');
const CONFIG_PATH = join(CONFIG_DIR, 'world-map.json');

const DEFAULT_CONFIG: MapConfig = {
  imageUrl:  null,
  worldMinX: null,
  worldMaxX: null,
  worldMinY: null,
  worldMaxY: null,
};

export async function readMapConfig(): Promise<MapConfig> {
  try {
    const raw = await readFile(CONFIG_PATH, 'utf-8');
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) } as MapConfig;
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export async function writeMapConfig(config: MapConfig): Promise<void> {
  await mkdir(CONFIG_DIR, { recursive: true });
  await writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
}

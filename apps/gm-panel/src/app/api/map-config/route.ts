import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

const CONFIG_DIR = join(process.cwd(), 'config');
const CONFIG_PATH = join(CONFIG_DIR, 'map.json');

const DEFAULT_CONFIG = {
  imageUrl: '',
  worldMinX: -42210,
  worldMaxX: 41610,
  worldMinY: -41910,
  worldMaxY: 41910,
  unitsPerPixel: 20.4638671875,
  imageXAxis: '+Y',
  imageYAxis: '-X',
};

async function readConfig() {
  try {
    const raw = await readFile(CONFIG_PATH, 'utf-8');
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

async function writeConfig(config: Record<string, unknown>) {
  await mkdir(CONFIG_DIR, { recursive: true });
  await writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
}

export async function GET() {
  try {
    const config = await readConfig();
    return NextResponse.json(config);
  } catch (err) {
    return NextResponse.json({ error: 'Failed to read config' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const current = await readConfig();
    const merged = { ...current, ...body };
    await writeConfig(merged);
    return NextResponse.json(merged);
  } catch {
    return NextResponse.json({ error: 'Failed to write config' }, { status: 500 });
  }
}

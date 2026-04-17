import { NextRequest, NextResponse } from 'next/server';
import { readMapConfig, writeMapConfig, type MapConfig } from '@/lib/map-config';

export async function GET() {
  const config = await readMapConfig();
  return NextResponse.json(config);
}

export async function POST(req: NextRequest) {
  let body: Partial<MapConfig>;
  try {
    body = await req.json() as Partial<MapConfig>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const current = await readMapConfig();
  const next: MapConfig = {
    imageUrl:  body.imageUrl  !== undefined ? body.imageUrl  : current.imageUrl,
    worldMinX: body.worldMinX !== undefined ? body.worldMinX : current.worldMinX,
    worldMaxX: body.worldMaxX !== undefined ? body.worldMaxX : current.worldMaxX,
    worldMinY: body.worldMinY !== undefined ? body.worldMinY : current.worldMinY,
    worldMaxY: body.worldMaxY !== undefined ? body.worldMaxY : current.worldMaxY,
  };

  await writeMapConfig(next);
  return NextResponse.json(next);
}

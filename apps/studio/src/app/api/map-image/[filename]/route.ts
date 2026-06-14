import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

const UPLOAD_DIR = process.env.MAP_UPLOAD_DIR || join(process.cwd(), 'public', 'uploads', 'maps');

const MIME_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
};

function getContentType(filename: string): string {
  const ext = filename.toLowerCase().match(/\.[a-z]+$/)?.[0] ?? '';
  return MIME_TYPES[ext] ?? 'application/octet-stream';
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { filename: string } },
) {
  const filename = params.filename;

  if (!filename || filename.includes('..') || filename.includes('/')) {
    return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
  }

  const filePath = join(UPLOAD_DIR, filename);

  if (!existsSync(filePath)) {
    console.error(`[studio:map-image] File not found: ${filePath}`);
    return NextResponse.json({ error: 'Map image not found' }, { status: 404 });
  }

  try {
    const buffer = await readFile(filePath);
    const contentType = getContentType(filename);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (err) {
    console.error(`[studio:map-image] Failed to read ${filePath}:`, err);
    return NextResponse.json({ error: 'Failed to read map image' }, { status: 500 });
  }
}

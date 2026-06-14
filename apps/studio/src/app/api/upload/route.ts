import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join, extname } from 'path';
import { randomUUID } from 'crypto';
import { readMapConfig, writeMapConfig } from '@/lib/map-config';

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const MAX_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

export async function POST(req: NextRequest) {
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid multipart form data' }, { status: 400 });
  }

  const raw = formData.get('file');
  // `File` global is unavailable in Node.js RSC runtime; `File extends Blob` and Blob IS global.
  if (!raw || !(raw instanceof Blob)) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }
  // Next.js FormData yields File-shaped Blobs (name + type + size + arrayBuffer).
  const file = raw as Blob & { name: string };

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: 'Only JPEG, PNG, WebP and GIF images are allowed' },
      { status: 415 },
    );
  }

  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json(
      { error: `File exceeds the 50 MB limit (got ${(file.size / 1024 / 1024).toFixed(1)} MB)` },
      { status: 413 },
    );
  }

  const ext = extname(file.name).toLowerCase() || '.bin';
  const filename = `${randomUUID()}${ext}`;

  const uploadDir = process.env.MAP_UPLOAD_DIR || join(process.cwd(), 'public', 'uploads', 'maps');
  await mkdir(uploadDir, { recursive: true });

  const bytes = await file.arrayBuffer();
  const filePath = join(uploadDir, filename);
  await writeFile(filePath, Buffer.from(bytes));

  console.log(`[studio:upload] Saved image to ${filePath}`);

  const url = `/api/map-image/${filename}`;

  // Persist the new image URL to the map config
  const config = await readMapConfig();
  await writeMapConfig({ ...config, imageUrl: url });

  return NextResponse.json({ url }, { status: 201 });
}

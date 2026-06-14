import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir, readFile } from 'fs/promises';
import { join, extname } from 'path';
import { randomUUID } from 'crypto';

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const MAX_SIZE_BYTES = 50 * 1024 * 1024;

const UPLOAD_DIR = process.env.MAP_UPLOAD_DIR || join(process.cwd(), 'public', 'uploads', 'map');
const CONFIG_DIR = join(process.cwd(), 'config');
const CONFIG_PATH = join(CONFIG_DIR, 'map.json');

async function readConfig(): Promise<Record<string, unknown>> {
  try {
    const raw = await readFile(CONFIG_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function writeConfig(config: Record<string, unknown>) {
  await mkdir(CONFIG_DIR, { recursive: true });
  await writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
}

export async function POST(req: NextRequest) {
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid multipart form data' }, { status: 400 });
  }

  const raw = formData.get('file');
  if (!raw || !(raw instanceof Blob)) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }
  const file = raw as Blob & { name: string };

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: 'Only JPEG, PNG, WebP and GIF images are allowed' }, { status: 415 });
  }

  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: `File exceeds the 50 MB limit` }, { status: 413 });
  }

  const ext = extname(file.name).toLowerCase() || '.png';
  const filename = `${randomUUID()}${ext}`;

  await mkdir(UPLOAD_DIR, { recursive: true });

  const bytes = await file.arrayBuffer();
  const filePath = join(UPLOAD_DIR, filename);
  await writeFile(filePath, Buffer.from(bytes));

  console.log(`[upload-map] Saved image to ${filePath}`);

  const url = `/api/map-image/${filename}`;

  const config = await readConfig();
  await writeConfig({ ...config, imageUrl: url });

  return NextResponse.json({ url }, { status: 201 });
}

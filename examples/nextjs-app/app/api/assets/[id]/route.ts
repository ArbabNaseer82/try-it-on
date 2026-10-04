import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { NextResponse } from 'next/server';

const ALLOWED = /^[a-z0-9-]+$/;

/**
 * Mock merchant API: returns a TryOnIt manifest by product id. Relative file paths are
 * rewritten to absolute public URLs, like a real API would return CDN URLs.
 */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!ALLOWED.test(id)) return NextResponse.json({ error: 'invalid id' }, { status: 400 });
  try {
    const raw = await readFile(join(process.cwd(), 'public', 'assets', `${id}.json`), 'utf8');
    const manifest = JSON.parse(raw) as Record<string, unknown>;
    for (const key of ['model', 'image', 'thumbnail']) {
      const value = manifest[key];
      if (typeof value === 'string' && !value.startsWith('/') && !value.includes('://')) {
        manifest[key] = `/assets/${value}`;
      }
    }
    return NextResponse.json(manifest, { headers: { 'cache-control': 'public, max-age=60' } });
  } catch {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }
}

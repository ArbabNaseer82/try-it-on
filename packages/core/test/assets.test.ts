import { describe, expect, it, vi } from 'vitest';
import {
  AssetCache,
  ErrorCode,
  TryOnError,
  applyVariant,
  createAbortError,
  defaultAssetCache,
  findVariant,
  getAssetRequirements,
  getCachedAsset,
  isAbortError,
  mergeRequirements,
  rebaseAssetUrls,
  resolveAsset,
  resolveUrl,
  validateManifest,
  type Fetcher,
  type GlassesAsset,
} from '../src';

const glasses: GlassesAsset = {
  version: 1,
  id: 'aviator',
  type: 'glasses',
  model: 'aviator.glb',
  thumbnail: 'thumbs/aviator.svg',
  variants: [{ id: 'gold', overrides: { model: './gold.glb' } }],
};

const jsonFetcher = (body: unknown, status = 200): Fetcher =>
  vi.fn(async () => ({ ok: status < 400, status, json: async () => body }));

describe('resolveUrl', () => {
  it.each([
    ['a.glb', 'https://cdn.x/assets/m.json', 'https://cdn.x/assets/a.glb'],
    ['./a.glb', 'https://cdn.x/assets/m.json', 'https://cdn.x/assets/a.glb'],
    ['../a.glb', 'https://cdn.x/assets/m.json', 'https://cdn.x/a.glb'],
    ['../../../a.glb', 'https://cdn.x/assets/m.json', 'https://cdn.x/a.glb'],
    ['/a.glb', 'https://cdn.x/assets/m.json', 'https://cdn.x/a.glb'],
    ['//other.x/a.glb', 'https://cdn.x/assets/m.json', 'https://other.x/a.glb'],
    ['https://y/a.glb', 'https://cdn.x/assets/m.json', 'https://y/a.glb'],
    ['a.glb?v=1', '/assets/m.json', '/assets/a.glb?v=1'],
    ['a.glb', '/assets/m.json', '/assets/a.glb'],
    ['a.glb', 'assets/m.json', 'assets/a.glb'],
    ['?v=2', '/assets/m.json', '/assets/m.json?v=2'],
    ['./', '/assets/m.json', '/assets/'],
    ['..', '/assets/sub/m.json', '/assets/'],
    ['a.glb', undefined, 'a.glb'],
    ['//cdn/a', 'relative/base', '//cdn/a'],
  ])('resolveUrl(%s, %s)', (rel, base, expected) => {
    expect(resolveUrl(rel, base)).toBe(expected);
  });
});

describe('resolveAsset', () => {
  it('validates inline objects and caches by id', async () => {
    const cache = new AssetCache<ReturnType<typeof validateManifest>>();
    const asset = await resolveAsset(glasses, { cache });
    expect(asset.id).toBe('aviator');
    expect(getCachedAsset('aviator', cache)).toBe(asset);
  });

  it('fetches URLs, rebases relative urls and caches by URL', async () => {
    const fetch = jsonFetcher(glasses);
    const cache = new AssetCache<ReturnType<typeof validateManifest>>();
    const asset = await resolveAsset('/assets/aviator.json', { fetch, cache });
    if (asset.type !== 'glasses') throw new Error('narrowing');
    expect(asset.model).toBe('/assets/aviator.glb');
    expect(asset.thumbnail).toBe('/assets/thumbs/aviator.svg');
    expect(asset.variants?.[0]?.overrides?.model).toBe('/assets/gold.glb');
    await resolveAsset('/assets/aviator.json', { fetch, cache });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('uses baseUrl for relative manifest urls', async () => {
    const fetch = jsonFetcher(glasses);
    const asset = await resolveAsset('aviator.json', {
      fetch,
      baseUrl: 'https://shop.x/p/1',
      cache: null,
    });
    expect(fetch).toHaveBeenCalledWith('https://shop.x/p/aviator.json', undefined);
    if (asset.type !== 'glasses') throw new Error('narrowing');
    expect(asset.model).toBe('https://shop.x/p/aviator.glb');
  });

  it('wraps HTTP and network errors as ASSET_LOAD_FAILED', async () => {
    await expect(
      resolveAsset('/x.json', { fetch: jsonFetcher({}, 404), cache: null }),
    ).rejects.toMatchObject({
      code: ErrorCode.ASSET_LOAD_FAILED,
    });
    const broken: Fetcher = async () => {
      throw new Error('offline');
    };
    await expect(resolveAsset('/x.json', { fetch: broken, cache: null })).rejects.toMatchObject({
      code: ErrorCode.ASSET_LOAD_FAILED,
    });
  });

  it('throws ASSET_INVALID for invalid JSON content', async () => {
    await expect(
      resolveAsset('/x.json', { fetch: jsonFetcher({ id: 1 }), cache: null }),
    ).rejects.toBeInstanceOf(TryOnError);
  });

  it('supports async loader functions with rebasing', async () => {
    const loader = vi.fn(async () => glasses);
    const asset = await resolveAsset(loader, { cache: null, baseUrl: 'https://api.x/assets/' });
    if (asset.type !== 'glasses') throw new Error('narrowing');
    expect(asset.model).toBe('https://api.x/assets/aviator.glb');
    const plain = await resolveAsset(() => glasses, { cache: null });
    expect(plain.id).toBe('aviator');
    await expect(
      resolveAsset(
        async () => {
          throw new Error('api down');
        },
        { cache: null },
      ),
    ).rejects.toMatchObject({ code: ErrorCode.ASSET_LOAD_FAILED });
  });

  it('aborts in flight requests', async () => {
    const controller = new AbortController();
    const never: Fetcher = () => new Promise(() => {});
    const pending = resolveAsset('/slow.json', {
      fetch: never,
      signal: controller.signal,
      cache: null,
    });
    controller.abort();
    await expect(pending).rejects.toSatisfy(isAbortError);
    await expect(resolveAsset(glasses, { signal: controller.signal })).rejects.toSatisfy(
      isAbortError,
    );
    const loader = () => new Promise<unknown>(() => {});
    const c2 = new AbortController();
    const p2 = resolveAsset(loader, { signal: c2.signal, cache: null });
    c2.abort('switched');
    await expect(p2).rejects.toSatisfy(isAbortError);
  });

  it('fails clearly without a fetch implementation', async () => {
    const original = globalThis.fetch;
    // @ts-expect-error simulate a runtime without fetch
    delete globalThis.fetch;
    try {
      await expect(resolveAsset('/a.json', { cache: null })).rejects.toMatchObject({
        code: ErrorCode.ASSET_LOAD_FAILED,
      });
    } finally {
      globalThis.fetch = original;
    }
  });

  it('uses the shared default cache', async () => {
    await resolveAsset({ ...glasses, id: 'shared' });
    expect(defaultAssetCache.get('id:shared')?.id).toBe('shared');
  });
});

describe('abort helpers', () => {
  it('creates abort errors', () => {
    expect(createAbortError().name).toBe('AbortError');
    expect(createAbortError('x').message).toBe('x');
    const e = new Error('custom');
    expect(createAbortError(e)).toBe(e);
    expect(isAbortError(new Error('x'))).toBe(false);
  });
});

describe('rebaseAssetUrls', () => {
  it('ignores non objects', () => {
    expect(rebaseAssetUrls('x', '/a')).toBe('x');
    expect(rebaseAssetUrls({ variants: [null, { id: 'a' }] }, '/a/b.json')).toEqual({
      variants: [null, { id: 'a' }],
    });
  });
});

describe('AssetCache', () => {
  it('evicts least recently used entries', () => {
    const cache = new AssetCache<number>(2);
    cache.set('a', 1);
    cache.set('b', 2);
    cache.get('a');
    cache.set('c', 3);
    expect(cache.has('b')).toBe(false);
    expect(cache.has('a')).toBe(true);
    expect(cache.size).toBe(2);
    expect(cache.delete('a')).toBe(true);
    cache.clear();
    expect(cache.size).toBe(0);
  });
});

describe('requirements', () => {
  it('maps asset types to trackers and renderers', () => {
    expect(getAssetRequirements({ type: 'makeup.lips' })).toEqual({
      trackers: ['face'],
      renderers: ['makeup'],
      needs3D: false,
      experimental: false,
    });
    expect(getAssetRequirements({ type: 'glasses' }).needs3D).toBe(true);
    expect(getAssetRequirements({ type: 'watch' }).trackers).toEqual(['hand']);
    expect(getAssetRequirements({ type: 'hair.color' }).trackers).toEqual(['segmenter']);
    expect(getAssetRequirements({ type: 'clothing.top' })).toMatchObject({
      trackers: ['pose'],
      experimental: true,
    });
    const merged = mergeRequirements([
      getAssetRequirements({ type: 'makeup.lips' }),
      getAssetRequirements({ type: 'ring' }),
    ]);
    expect(merged.trackers.sort()).toEqual(['face', 'hand']);
    expect(merged.needs3D).toBe(true);
  });
});

describe('variants', () => {
  it('applies overrides of the selected or default variant', () => {
    const asset = validateManifest({
      version: 1,
      id: 'l',
      type: 'makeup.lips',
      color: '#111',
      variants: [
        { id: 'a', overrides: { color: '#aaa' } },
        { id: 'b', overrides: { color: '#bbb' } },
        { id: 'c' },
      ],
      defaultVariantId: 'b',
    });
    expect(findVariant(asset, 'a')?.id).toBe('a');
    expect(findVariant(asset, 'missing')?.id).toBe('b');
    expect((applyVariant(asset, 'a') as { color: string }).color).toBe('#aaa');
    expect(applyVariant(asset, 'c')).toBe(asset);
    const plain = validateManifest({ version: 1, id: 'p', type: 'makeup.lips', color: '#111' });
    expect(findVariant(plain)).toBeUndefined();
  });
});

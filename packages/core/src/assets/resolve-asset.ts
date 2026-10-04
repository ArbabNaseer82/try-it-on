import type { AbortSignalLike, AssetManifest, AssetSource } from '../domain/asset.types';
import { ErrorCode, TryOnError, isTryOnError } from '../domain/errors';
import { validateManifest } from '../validation/manifest.schema';
import { AssetCache } from './asset-cache';
import { resolveUrl } from './url';

/** Minimal fetch response shape needed by the resolver. */
export interface FetchResponseLike {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}

/** Injectable fetch, so core works in browsers, Node and React Native. */
export type Fetcher = (
  url: string,
  init?: { signal?: AbortSignalLike },
) => Promise<FetchResponseLike>;

export interface ResolveAssetOptions {
  /** Cancels in flight requests, for example when the shopper switches products quickly. */
  signal?: AbortSignalLike;
  /** Custom fetch implementation. Defaults to `globalThis.fetch`. */
  fetch?: Fetcher;
  /** Base URL for relative manifest URLs (for example `location.href`). */
  baseUrl?: string;
  /** Cache instance. Pass `null` to disable caching. Defaults to a shared LRU. */
  cache?: AssetCache<AssetManifest> | null;
  /** Receives non fatal validation notes, such as stripped unknown keys. */
  warn?: (message: string) => void;
}

/** Shared LRU used when no cache is passed. */
export const defaultAssetCache = new AssetCache<AssetManifest>(64);

/** Creates an error that looks like a DOM `AbortError`. */
export function createAbortError(reason?: unknown): Error {
  if (reason instanceof Error) return reason;
  const error = new Error(typeof reason === 'string' ? reason : 'The operation was aborted.');
  error.name = 'AbortError';
  return error;
}

/** True for errors produced by an aborted signal. */
export function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

function throwIfAborted(signal?: AbortSignalLike): void {
  if (signal?.aborted) throw createAbortError(signal.reason);
}

function getGlobalFetch(): Fetcher | undefined {
  const candidate = (globalThis as { fetch?: unknown }).fetch;
  return typeof candidate === 'function' ? (candidate.bind(globalThis) as Fetcher) : undefined;
}

const URL_FIELDS = ['model', 'image', 'thumbnail'] as const;

function rebase(value: Record<string, unknown>, base: string): Record<string, unknown> {
  const out: Record<string, unknown> = { ...value };
  for (const field of URL_FIELDS) {
    const v = out[field];
    if (typeof v === 'string') out[field] = resolveUrl(v, base);
  }
  return out;
}

/** Resolves relative `model`, `image` and `thumbnail` URLs (including variants) against a base. */
export function rebaseAssetUrls(raw: unknown, base: string): unknown {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return raw;
  const out = rebase(raw as Record<string, unknown>, base);
  if (Array.isArray(out.variants)) {
    out.variants = out.variants.map((variant: unknown) => {
      if (typeof variant !== 'object' || variant === null) return variant;
      const v = rebase(variant as Record<string, unknown>, base);
      if (typeof v.overrides === 'object' && v.overrides !== null) {
        v.overrides = rebase(v.overrides as Record<string, unknown>, base);
      }
      return v;
    });
  }
  return out;
}

async function race<T>(promise: Promise<T>, signal?: AbortSignalLike): Promise<T> {
  if (!signal?.addEventListener) return promise;
  throwIfAborted(signal);
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(createAbortError(signal.reason));
    signal.addEventListener?.('abort', onAbort, { once: true });
    promise.then(
      (value) => {
        signal.removeEventListener?.('abort', onAbort);
        resolve(value);
      },
      (error: unknown) => {
        signal.removeEventListener?.('abort', onAbort);
        reject(error);
      },
    );
  });
}

/**
 * Turns any asset source into a validated manifest.
 *
 * - Manifest object: validated directly.
 * - URL string: fetched as JSON, relative asset URLs resolved against the manifest URL.
 * - Function: called with the abort signal (use it for merchant APIs), result validated.
 *
 * Results are cached by asset id and by URL. Throws `TryOnError` with `ASSET_INVALID` or
 * `ASSET_LOAD_FAILED`, or an `AbortError` when the signal fires.
 */
export async function resolveAsset(
  source: AssetSource,
  options: ResolveAssetOptions = {},
): Promise<AssetManifest> {
  const { signal, warn } = options;
  const cache = options.cache === undefined ? defaultAssetCache : options.cache;
  throwIfAborted(signal);

  if (typeof source === 'string') {
    const url = resolveUrl(source, options.baseUrl);
    const cached = cache?.get(`url:${url}`);
    if (cached) return cached;
    const fetcher = options.fetch ?? getGlobalFetch();
    if (!fetcher) {
      throw new TryOnError(ErrorCode.ASSET_LOAD_FAILED, 'No fetch implementation available.');
    }
    let raw: unknown;
    try {
      const response = await race(fetcher(url, signal ? { signal } : undefined), signal);
      if (!response.ok) {
        throw new TryOnError(
          ErrorCode.ASSET_LOAD_FAILED,
          `Failed to load asset manifest "${url}" (HTTP ${response.status}).`,
        );
      }
      raw = await race(response.json(), signal);
    } catch (error) {
      if (isAbortError(error) || isTryOnError(error)) throw error;
      throw new TryOnError(ErrorCode.ASSET_LOAD_FAILED, `Failed to load asset manifest "${url}".`, {
        cause: error,
      });
    }
    throwIfAborted(signal);
    const manifest = validateManifest(rebaseAssetUrls(raw, url), warn ? { warn } : undefined);
    cache?.set(`url:${url}`, manifest);
    cache?.set(`id:${manifest.id}`, manifest);
    return manifest;
  }

  if (typeof source === 'function') {
    let raw: unknown;
    try {
      raw = await race(Promise.resolve(source(signal)), signal);
    } catch (error) {
      if (isAbortError(error) || isTryOnError(error)) throw error;
      throw new TryOnError(ErrorCode.ASSET_LOAD_FAILED, 'Asset loader function failed.', {
        cause: error,
      });
    }
    throwIfAborted(signal);
    const base = options.baseUrl;
    const manifest = validateManifest(
      base ? rebaseAssetUrls(raw, base) : raw,
      warn ? { warn } : undefined,
    );
    cache?.set(`id:${manifest.id}`, manifest);
    return manifest;
  }

  const manifest = validateManifest(source, warn ? { warn } : undefined);
  cache?.set(`id:${manifest.id}`, manifest);
  return manifest;
}

/** Returns a cached manifest by id, if it was resolved before. */
export function getCachedAsset(
  id: string,
  cache: AssetCache<AssetManifest> = defaultAssetCache,
): AssetManifest | undefined {
  return cache.get(`id:${id}`);
}

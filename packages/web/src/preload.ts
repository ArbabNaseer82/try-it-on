import {
  getAssetRequirements,
  mergeRequirements,
  resolveAsset,
  type AssetManifest,
  type AssetSource,
  type Fetcher,
  type TrackerKind,
} from '@tryonit/core';
import { DEFAULT_WASM_BASE_URL, getModelUrl } from './config';
import { fetchModel } from './trackers/model-cache';
import { getVisionRuntime } from './trackers/vision-runtime';

export interface PreloadOptions {
  modelBaseUrl?: string;
  models?: Partial<Record<TrackerKind, string>>;
  wasmBaseUrl?: string;
  fetch?: Fetcher;
}

const done = new Set<string>();

/**
 * Warms everything an asset needs in the background: the MediaPipe runtime, model files,
 * renderer chunks, three.js (3D only) and product files. Best effort, never throws.
 * Use it on hover or when a product card scrolls into view.
 */
export async function preloadTryOn(
  sources: AssetSource | AssetSource[],
  options: PreloadOptions = {},
): Promise<void> {
  if (typeof window === 'undefined') return;
  const list = Array.isArray(sources) ? sources : [sources];
  const assets = (
    await Promise.all(
      list.map((source) =>
        resolveAsset(source, {
          ...(options.fetch ? { fetch: options.fetch } : {}),
          baseUrl: location.href,
        }).catch(() => null),
      ),
    )
  ).filter((a): a is AssetManifest => a !== null);
  if (assets.length === 0) return;
  const req = mergeRequirements(assets.map(getAssetRequirements));
  const tasks: Promise<unknown>[] = [];
  const once = (key: string, task: () => Promise<unknown>) => {
    if (done.has(key)) return;
    done.add(key);
    tasks.push(task().catch(() => done.delete(key)));
  };
  if (req.trackers.length > 0) {
    once(`wasm:${options.wasmBaseUrl ?? ''}`, () =>
      getVisionRuntime(options.wasmBaseUrl ?? DEFAULT_WASM_BASE_URL),
    );
    for (const kind of req.trackers) {
      const url = getModelUrl(kind, options);
      once(`model:${url}`, () => fetchModel(url));
    }
  }
  if (req.renderers.some((r) => r !== 'three'))
    once('chunk:gl', () => import('./renderers/gl-renderers'));
  if (req.needs3D) once('chunk:three', () => import('./renderers/three/three-renderer'));
  for (const asset of assets) {
    const file = 'model' in asset ? asset.model : 'image' in asset ? asset.image : null;
    if (file) once(`file:${file}`, () => fetch(file).then((r) => r.arrayBuffer()));
  }
  await Promise.all(tasks);
}

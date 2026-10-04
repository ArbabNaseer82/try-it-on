import type { AssetManifest, AssetType, RendererKind, TrackerKind } from '../domain/asset.types';

export interface AssetRequirements {
  trackers: TrackerKind[];
  renderers: RendererKind[];
  /** True when three.js must be loaded. */
  needs3D: boolean;
  /** True for features labeled experimental (clothing). */
  experimental: boolean;
}

const TABLE: Record<AssetType, { trackers: TrackerKind[]; renderers: RendererKind[] }> = {
  'makeup.lips': { trackers: ['face'], renderers: ['makeup'] },
  'makeup.blush': { trackers: ['face'], renderers: ['makeup'] },
  'makeup.eyeshadow': { trackers: ['face'], renderers: ['makeup'] },
  'makeup.eyeliner': { trackers: ['face'], renderers: ['makeup'] },
  'makeup.brows': { trackers: ['face'], renderers: ['makeup'] },
  'makeup.foundation': { trackers: ['face'], renderers: ['makeup'] },
  'makeup.look': { trackers: ['face'], renderers: ['makeup'] },
  'hair.color': { trackers: ['segmenter'], renderers: ['hair'] },
  glasses: { trackers: ['face'], renderers: ['three'] },
  hat: { trackers: ['face'], renderers: ['three'] },
  earrings: { trackers: ['face'], renderers: ['three'] },
  'face.overlay2d': { trackers: ['face'], renderers: ['overlay2d'] },
  watch: { trackers: ['hand'], renderers: ['three'] },
  ring: { trackers: ['hand'], renderers: ['three'] },
  'clothing.top': { trackers: ['pose'], renderers: ['overlay2d'] },
};

/** Which trackers and renderers an asset needs. The engine loads nothing else. */
export function getAssetRequirements(asset: Pick<AssetManifest, 'type'>): AssetRequirements {
  const entry = TABLE[asset.type];
  return {
    trackers: [...entry.trackers],
    renderers: [...entry.renderers],
    needs3D: entry.renderers.includes('three'),
    experimental: asset.type === 'clothing.top',
  };
}

/** Union of requirements for several assets (for example when preloading a product list). */
export function mergeRequirements(list: readonly AssetRequirements[]): AssetRequirements {
  const trackers = new Set<TrackerKind>();
  const renderers = new Set<RendererKind>();
  for (const r of list) {
    r.trackers.forEach((t) => trackers.add(t));
    r.renderers.forEach((t) => renderers.add(t));
  }
  return {
    trackers: [...trackers],
    renderers: [...renderers],
    needs3D: renderers.has('three'),
    experimental: list.some((r) => r.experimental),
  };
}

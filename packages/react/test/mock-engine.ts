import { vi } from 'vitest';
import { createSessionStore, type SessionStore, type TryOnEngine } from '@tryonit/web';

export type MockEngine = TryOnEngine & { store: SessionStore };

/** Engine double backed by the real session store, so UI reacts to real state changes. */
export function createMockEngine(): MockEngine {
  const store = createSessionStore();
  const element = document.createElement('div');
  const engine = {
    store,
    element,
    attach: vi.fn((container: HTMLElement | null) => {
      if (container) container.append(element);
      else element.remove();
    }),
    start: vi.fn(async () => {
      store.actions.transition('checking');
      store.actions.transition('requesting-camera');
      store.actions.transition('loading-models');
      store.actions.transition('ready');
      store.actions.transition('running');
      store.actions.setCamera({ source: 'camera' });
    }),
    startFromImage: vi.fn(async () => undefined),
    stop: vi.fn(() => {
      store.actions.transition('idle');
    }),
    setAsset: vi.fn(async (asset: unknown) => {
      if (asset && typeof asset === 'object') store.actions.setAsset(asset as never);
      return asset as never;
    }),
    setVariant: vi.fn(async (id: string) => store.actions.setVariant(id)),
    setIntensity: vi.fn((v: number) => store.actions.setIntensity(v)),
    switchCamera: vi.fn(async () => undefined),
    capture: vi.fn(async () => new Blob(['x'], { type: 'image/png' })),
    pause: vi.fn(),
    resume: vi.fn(),
    setDebug: vi.fn(),
    setCompare: vi.fn(),
    destroy: vi.fn(),
    on: vi.fn(() => () => undefined),
    off: vi.fn(),
    getLatestResults: vi.fn(() => ({
      timestamp: 0,
      face: null,
      hand: null,
      pose: null,
      hairMask: null,
    })),
  } satisfies TryOnEngine;
  return engine;
}

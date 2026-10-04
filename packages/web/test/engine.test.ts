import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ErrorCode } from '@tryonit/core';
import { createTryOnEngine } from '../src';
import { installBrowserMocks, trackListeners, type MockCamera } from './browser-mocks';

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

describe('engine lifecycle (mock camera)', () => {
  let camera: MockCamera;
  beforeEach(() => {
    camera = installBrowserMocks();
  });
  afterEach(() => camera.restore());

  it('starts, reaches running, pauses, resumes, stops and destroys cleanly', async () => {
    const container = document.createElement('div');
    document.body.append(container);
    const engine = createTryOnEngine({ container });
    const statuses: string[] = [];
    engine.on('statusChange', ({ status }) => statuses.push(status));
    await engine.start();
    expect(engine.store.getState().status).toBe('running');
    expect(statuses).toEqual([
      'checking',
      'requesting-camera',
      'loading-models',
      'ready',
      'running',
    ]);
    expect(container.querySelector('video')).not.toBeNull();
    expect(engine.store.getState().camera).toEqual({
      facing: 'user',
      source: 'camera',
      mirrored: true,
    });
    engine.pause();
    expect(engine.store.getState().status).toBe('paused');
    engine.resume();
    expect(engine.store.getState().status).toBe('running');
    engine.stop();
    expect(engine.store.getState().status).toBe('idle');
    expect(camera.tracks.every((t) => t.stop.mock.calls.length > 0)).toBe(true);
    await engine.start();
    engine.destroy();
    expect(engine.store.getState().status).toBe('destroyed');
    expect(camera.tracks.every((t) => t.readyState === 'ended')).toBe(true);
    expect(container.children.length).toBe(0);
    await expect(engine.start()).rejects.toThrow();
  });

  it('auto pauses when the page is hidden', async () => {
    const engine = createTryOnEngine();
    await engine.start();
    const state = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    document.dispatchEvent(new Event('visibilitychange'));
    expect(engine.store.getState().status).toBe('paused');
    state.mockReturnValue('visible');
    document.dispatchEvent(new Event('visibilitychange'));
    expect(engine.store.getState().status).toBe('running');
    state.mockRestore();
    engine.destroy();
  });

  it('does not leak tracks or listeners over 20 create/destroy cycles', async () => {
    const listeners = trackListeners();
    const before = listeners.count();
    for (let i = 0; i < 20; i++) {
      const engine = createTryOnEngine({ container: document.body });
      await engine.start();
      engine.destroy();
    }
    expect(camera.tracks.length).toBe(20);
    expect(camera.tracks.every((t) => t.readyState === 'ended')).toBe(true);
    expect(listeners.count()).toBe(before);
    expect(document.querySelectorAll('video').length).toBe(0);
    listeners.restore();
  });

  it('reports invalid assets without killing the camera session', async () => {
    const engine = createTryOnEngine();
    await engine.start();
    const errors: string[] = [];
    engine.on('error', (e) => errors.push(e.code));
    await expect(
      engine.setAsset({ version: 1, id: 'x', type: 'nope' } as never),
    ).rejects.toMatchObject({
      code: ErrorCode.ASSET_INVALID,
    });
    expect(errors).toEqual([ErrorCode.ASSET_INVALID]);
    expect(engine.store.getState().status).toBe('running');
    expect(engine.store.getState().error?.code).toBe(ErrorCode.ASSET_INVALID);
    engine.destroy();
  });

  it('stores assets set before start without loading any module', async () => {
    const engine = createTryOnEngine();
    const asset = await engine.setAsset({
      version: 1,
      id: 'lips',
      type: 'makeup.lips',
      color: '#f00',
      variants: [{ id: 'a' }],
    });
    expect(asset?.id).toBe('lips');
    await flush();
    expect(engine.store.getState().asset?.id).toBe('lips');
    expect(engine.store.getState().variantId).toBe('a');
    expect(engine.store.getState().modules).toEqual([]);
    await engine.setAsset(null);
    expect(engine.store.getState().asset).toBeNull();
    engine.setIntensity(0.3);
    expect(engine.store.getState().intensity).toBe(0.3);
    engine.destroy();
  });

  it('cancels a previous setAsset when a new one starts', async () => {
    const engine = createTryOnEngine();
    const slow = engine.setAsset(() => new Promise(() => {}));
    const fast = engine.setAsset({ version: 1, id: 'b', type: 'makeup.lips', color: '#f00' });
    await expect(slow).resolves.toBeNull();
    await expect(fast).resolves.toMatchObject({ id: 'b' });
    engine.destroy();
  });
});

describe('engine errors', () => {
  it('maps camera denial to CAMERA_DENIED and keeps the photo fallback available', async () => {
    const camera = installBrowserMocks({ denyCamera: true });
    const engine = createTryOnEngine();
    const onError = vi.fn();
    engine.on('error', onError);
    await expect(engine.start()).rejects.toMatchObject({ code: ErrorCode.CAMERA_DENIED });
    const state = engine.store.getState();
    expect(state.status).toBe('error');
    expect(state.error?.canUsePhotoFallback).toBe(true);
    expect(onError).toHaveBeenCalledTimes(1);
    engine.destroy();
    camera.restore();
  });

  it('fails with WEBGL_UNSUPPORTED when WebGL2 is missing', async () => {
    const engine = createTryOnEngine();
    await expect(engine.start()).rejects.toMatchObject({ code: ErrorCode.WEBGL_UNSUPPORTED });
    engine.destroy();
  });
});

describe('StrictMode style start, stop, start', () => {
  it('cancels the first start and ends with exactly one live camera', async () => {
    const camera = installBrowserMocks();
    const engine = createTryOnEngine();
    const first = engine.start();
    engine.stop();
    const second = engine.start();
    await Promise.all([first, second]);
    expect(engine.store.getState().status).toBe('running');
    const live = camera.tracks.filter((t) => t.readyState === 'live');
    expect(live.length).toBe(1);
    engine.destroy();
    expect(camera.tracks.every((t) => t.readyState === 'ended')).toBe(true);
    camera.restore();
  });
});

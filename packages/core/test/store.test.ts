import { describe, expect, it, vi } from 'vitest';
import {
  SESSION_TRANSITIONS,
  TryOnError,
  canTransition,
  createSessionStore,
  createStore,
  shallowEqual,
  subscribeSelector,
  validateManifest,
  type SessionStatus,
} from '../src';

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

describe('createStore', () => {
  it('updates immediately and batches notifications per microtask', async () => {
    const store = createStore({ a: 1, b: 1 });
    const listener = vi.fn();
    store.subscribe(listener);
    store.setState({ a: 2 });
    store.setState((prev) => ({ b: prev.b + 1 }));
    expect(store.getState()).toEqual({ a: 2, b: 2 });
    expect(listener).not.toHaveBeenCalled();
    await flush();
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith({ a: 2, b: 2 }, { a: 1, b: 1 });
  });

  it('skips no op updates and supports unsubscribe and destroy', async () => {
    const store = createStore({ a: 1 });
    const listener = vi.fn();
    const off = store.subscribe(listener);
    const before = store.getState();
    store.setState({ a: 1 });
    expect(store.getState()).toBe(before);
    await flush();
    expect(listener).not.toHaveBeenCalled();
    off();
    store.setState({ a: 2 });
    await flush();
    expect(listener).not.toHaveBeenCalled();
    store.destroy();
    store.setState({ a: 3 });
    expect(store.getState().a).toBe(2);
    expect(typeof store.subscribe(listener)).toBe('function');
  });

  it('does not notify when state returns to the last notified value object', async () => {
    const store = createStore({ a: 1 });
    const listener = vi.fn();
    store.subscribe(listener);
    store.setState({ a: 2 });
    store.destroy();
    await flush();
    expect(listener).not.toHaveBeenCalled();
  });
});

describe('selectors', () => {
  it('shallowEqual', () => {
    expect(shallowEqual({ a: 1 }, { a: 1 })).toBe(true);
    expect(shallowEqual({ a: 1 }, { a: 2 })).toBe(false);
    expect(shallowEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
    expect(shallowEqual([1, 2], [1, 2])).toBe(true);
    expect(shallowEqual([1], { 0: 1 })).toBe(false);
    expect(shallowEqual(null, {})).toBe(false);
    expect(shallowEqual(1, 1)).toBe(true);
    expect(shallowEqual({ a: 1 }, { b: 1 })).toBe(false);
  });

  it('subscribeSelector only fires on slice change', async () => {
    const store = createStore({ a: 1, b: 1 });
    const listener = vi.fn();
    subscribeSelector(store, (s) => s.a, listener);
    store.setState({ b: 2 });
    await flush();
    expect(listener).not.toHaveBeenCalled();
    store.setState({ a: 5 });
    await flush();
    expect(listener).toHaveBeenCalledWith(5, 1);
  });
});

describe('session FSM', () => {
  const all = Object.keys(SESSION_TRANSITIONS) as SessionStatus[];

  it.each(all)('transitions from %s follow the table', (from) => {
    for (const to of all) {
      const store = createSessionStore({ initial: { status: from } });
      const ok = store.actions.transition(to);
      const expected = from === to || SESSION_TRANSITIONS[from].includes(to);
      expect(ok, `${from} -> ${to}`).toBe(expected);
      expect(store.getState().status).toBe(expected ? to : from);
      expect(canTransition(from, to)).toBe(SESSION_TRANSITIONS[from].includes(to));
    }
  });

  it('follows the happy path and reports invalid transitions', () => {
    const onInvalid = vi.fn();
    const store = createSessionStore({ onInvalidTransition: onInvalid });
    for (const step of [
      'checking',
      'requesting-camera',
      'loading-models',
      'ready',
      'running',
      'paused',
      'running',
    ] as const) {
      expect(store.actions.transition(step)).toBe(true);
    }
    expect(store.actions.transition('checking')).toBe(false);
    expect(onInvalid).toHaveBeenCalledWith('running', 'checking');
    store.actions.transition('destroyed');
    expect(store.actions.transition('idle')).toBe(false);
  });

  it('fail sets error, leaving error clears it', () => {
    const store = createSessionStore();
    store.actions.transition('checking');
    store.actions.fail(new TryOnError('CAMERA_DENIED', 'denied'));
    expect(store.getState().status).toBe('error');
    expect(store.getState().error?.code).toBe('CAMERA_DENIED');
    store.actions.transition('checking');
    expect(store.getState().error).toBeNull();
    store.actions.transition('destroyed');
    store.actions.fail(new TryOnError('UNKNOWN', 'x'));
    expect(store.getState().status).toBe('destroyed');
  });

  it('asset, variant, intensity, camera, tracking, perf and modules actions', () => {
    const store = createSessionStore();
    const asset = validateManifest({
      version: 1,
      id: 'l',
      type: 'makeup.lips',
      color: '#f00',
      variants: [{ id: 'a' }, { id: 'b' }],
      defaultVariantId: 'b',
    });
    store.actions.setAsset(asset);
    expect(store.getState().variantId).toBe('b');
    store.actions.setAsset(asset, 'a');
    expect(store.getState().variantId).toBe('a');
    store.actions.setAsset(null);
    expect(store.getState().variantId).toBeNull();
    store.actions.setVariant('x');
    expect(store.getState().variantId).toBe('x');
    store.actions.setIntensity(2);
    expect(store.getState().intensity).toBe(1);
    store.actions.setIntensity(-1);
    expect(store.getState().intensity).toBe(0);
    store.actions.setCamera({ facing: 'environment' });
    expect(store.getState().camera).toEqual({
      facing: 'environment',
      source: null,
      mirrored: true,
    });
    const tracking = store.getState().tracking;
    store.actions.setTracking({ faceVisible: false });
    expect(store.getState().tracking).toBe(tracking);
    store.actions.setTracking({ faceVisible: true });
    expect(store.getState().tracking.faceVisible).toBe(true);
    store.actions.setPerf({ fps: 30 });
    expect(store.getState().perf.fps).toBe(30);
    store.actions.addModule('face');
    store.actions.addModule('face');
    expect(store.getState().modules).toEqual(['face']);
    store.actions.setError(new TryOnError('ASSET_INVALID', 'bad'));
    expect(store.getState().error?.code).toBe('ASSET_INVALID');
    store.actions.setError(null);
    expect(store.getState().error).toBeNull();
    store.actions.setAssetLoading(true);
    expect(store.getState().assetLoading).toBe(true);
  });
});

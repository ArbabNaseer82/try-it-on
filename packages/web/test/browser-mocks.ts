import { vi } from 'vitest';
import { resetCapabilitiesCache } from '../src/engine/capabilities';

export interface MockCamera {
  tracks: { stop: ReturnType<typeof vi.fn>; readyState: string }[];
  getUserMedia: ReturnType<typeof vi.fn>;
  restore(): void;
}

/**
 * Minimal browser shims for jsdom: a fake camera (MediaStream with stoppable tracks), a video
 * element that reports a 640x480 frame, a WebGL2 probe and a secure context.
 */
export function installBrowserMocks(options: { denyCamera?: boolean } = {}): MockCamera {
  const tracks: MockCamera['tracks'] = [];
  const getUserMedia = vi.fn(async () => {
    if (options.denyCamera) {
      const error = new Error('denied');
      error.name = 'NotAllowedError';
      throw error;
    }
    const track = {
      readyState: 'live',
      kind: 'video',
      stop: vi.fn(function (this: { readyState: string }) {
        this.readyState = 'ended';
      }),
      getSettings: () => ({ facingMode: 'user', width: 640, height: 480 }),
    };
    tracks.push(track);
    return { getTracks: () => [track], getVideoTracks: () => [track] };
  });
  const originalMediaDevices = Object.getOwnPropertyDescriptor(navigator, 'mediaDevices');
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia, enumerateDevices: async () => [{ kind: 'videoinput' }] },
  });
  const proto = HTMLMediaElement.prototype;
  const saved = {
    play: proto.play,
    pause: proto.pause,
    getContext: HTMLCanvasElement.prototype.getContext,
  };
  Object.defineProperty(proto, 'readyState', { configurable: true, get: () => 4 });
  Object.defineProperty(HTMLVideoElement.prototype, 'videoWidth', {
    configurable: true,
    get: () => 640,
  });
  Object.defineProperty(HTMLVideoElement.prototype, 'videoHeight', {
    configurable: true,
    get: () => 480,
  });
  proto.play = vi.fn(async () => undefined);
  proto.pause = vi.fn();
  HTMLCanvasElement.prototype.getContext = vi.fn((type: string) =>
    type === 'webgl2' ? { getExtension: () => null } : null,
  ) as unknown as typeof HTMLCanvasElement.prototype.getContext;
  resetCapabilitiesCache();
  Object.defineProperty(window, 'isSecureContext', { configurable: true, value: true });
  return {
    tracks,
    getUserMedia,
    restore() {
      proto.play = saved.play;
      proto.pause = saved.pause;
      HTMLCanvasElement.prototype.getContext = saved.getContext;
      if (originalMediaDevices)
        Object.defineProperty(navigator, 'mediaDevices', originalMediaDevices);
      else Reflect.deleteProperty(navigator, 'mediaDevices');
      resetCapabilitiesCache();
    },
  };
}

/** Counts live document and window listeners so tests can detect leaks. */
export function trackListeners(): { count(): number; restore(): void } {
  const targets = [document, window] as EventTarget[];
  const live: { target: number; type: string; listener: unknown }[] = [];
  const originals = targets.map((t) => ({
    add: t.addEventListener,
    remove: t.removeEventListener,
  }));
  targets.forEach((target, i) => {
    target.addEventListener = function (
      type: string,
      listener: EventListenerOrEventListenerObject | null,
      opts?: boolean | AddEventListenerOptions,
    ) {
      live.push({ target: i, type, listener });
      return originals[i]!.add.call(this, type, listener, opts);
    };
    target.removeEventListener = function (
      type: string,
      listener: EventListenerOrEventListenerObject | null,
      opts?: boolean | EventListenerOptions,
    ) {
      const index = live.findIndex(
        (l) => l.target === i && l.type === type && l.listener === listener,
      );
      if (index >= 0) live.splice(index, 1);
      return originals[i]!.remove.call(this, type, listener, opts);
    };
  });
  return {
    count: () => live.length,
    restore() {
      targets.forEach((t, i) => {
        t.addEventListener = originals[i]!.add;
        t.removeEventListener = originals[i]!.remove;
      });
    },
  };
}

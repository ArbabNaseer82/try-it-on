export type Listener<T> = (state: T, prev: T) => void;

/** Minimal external store, compatible with React `useSyncExternalStore`. */
export interface Store<T> {
  getState(): T;
  setState(partial: Partial<T> | ((prev: T) => Partial<T>)): void;
  subscribe(listener: Listener<T>): () => void;
  destroy(): void;
}

const nativeMicrotask = (globalThis as { queueMicrotask?: (fn: () => void) => void })
  .queueMicrotask;
const schedule: (fn: () => void) => void = nativeMicrotask
  ? (fn) => nativeMicrotask(fn)
  : (fn) => {
      void Promise.resolve().then(fn);
    };

/**
 * Creates a tiny immutable store. `getState()` is always current, while listeners are
 * notified once per microtask so many updates in one frame trigger one notification.
 */
export function createStore<T extends object>(initial: T): Store<T> {
  let state = initial;
  let lastNotified = initial;
  let pending = false;
  let destroyed = false;
  const listeners = new Set<Listener<T>>();

  const flush = () => {
    pending = false;
    if (destroyed || state === lastNotified) return;
    const prev = lastNotified;
    lastNotified = state;
    for (const listener of [...listeners]) listener(state, prev);
  };

  return {
    getState: () => state,
    setState(partial) {
      if (destroyed) return;
      const patch = typeof partial === 'function' ? partial(state) : partial;
      let changed = false;
      for (const key in patch) {
        if (!Object.is(patch[key], state[key])) {
          changed = true;
          break;
        }
      }
      if (!changed) return;
      state = { ...state, ...patch };
      if (!pending) {
        pending = true;
        schedule(flush);
      }
    },
    subscribe(listener) {
      if (destroyed) return () => {};
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    destroy() {
      destroyed = true;
      listeners.clear();
    },
  };
}

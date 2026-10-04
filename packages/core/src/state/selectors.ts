import type { Listener, Store } from './create-store';

/** Shallow comparison of two values (objects compared one level deep). */
export function shallowEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  const recA = a as Record<string, unknown>;
  const recB = b as Record<string, unknown>;
  for (const key of keysA) {
    if (!Object.prototype.hasOwnProperty.call(b, key) || !Object.is(recA[key], recB[key]))
      return false;
  }
  return true;
}

/**
 * Subscribes to a derived slice of the store. The listener runs only when the slice changes.
 * Useful for mirroring TryOnIt state into Redux, Zustand or any other state library.
 */
export function subscribeSelector<T, U>(
  store: Store<T>,
  selector: (state: T) => U,
  listener: (slice: U, prev: U) => void,
  isEqual: (a: U, b: U) => boolean = Object.is,
): () => void {
  let current = selector(store.getState());
  const onChange: Listener<T> = (state) => {
    const next = selector(state);
    if (isEqual(next, current)) return;
    const prev = current;
    current = next;
    listener(next, prev);
  };
  return store.subscribe(onChange);
}

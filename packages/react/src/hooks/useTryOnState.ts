import { useCallback, useRef, useSyncExternalStore } from 'react';
import type { SessionState } from '@tryonit/web';
import { INITIAL_STATE, useTryOnContext } from '../provider/contexts';

/**
 * Subscribes to the smallest slice of session state a component needs.
 * Re-renders only when `isEqual(previousSlice, nextSlice)` is false.
 *
 * @example
 * const faceVisible = useTryOnState((s) => s.tracking.faceVisible);
 * const { fps, detectionMs } = useTryOnState((s) => s.perf, shallowEqual);
 */
export function useTryOnState<T>(
  selector: (state: SessionState) => T,
  isEqual: (a: T, b: T) => boolean = Object.is,
): T {
  const { holder } = useTryOnContext();
  const cache = useRef<{ state: SessionState; value: T } | null>(null);
  const select = useCallback(
    (state: SessionState): T => {
      const cached = cache.current;
      if (cached && cached.state === state) return cached.value;
      const next = selector(state);
      if (cached && isEqual(cached.value, next)) {
        cache.current = { state, value: cached.value };
        return cached.value;
      }
      cache.current = { state, value: next };
      return next;
    },
    [selector, isEqual],
  );
  return useSyncExternalStore(
    holder.subscribe,
    () => select(holder.getState()),
    () => select(INITIAL_STATE),
  );
}

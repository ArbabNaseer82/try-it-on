import { useMemo, useRef, useState } from 'react';
import type { AssetSource } from '@tryonit/core';
import type { CaptureOptions, TryOnPhoto, TryOnState } from './protocol';
import type { TryOnViewRef } from './types';

/**
 * Headless controller for building your own React Native UI around a `TryOnView`.
 *
 * @example
 * const tryOn = useTryOn();
 * <TryOnView {...tryOn.viewProps} controls="none" asset={lipstick} />
 * <Button title="Snap" onPress={async () => setPhoto(await tryOn.capture())} />
 */
export function useTryOn() {
  const ref = useRef<TryOnViewRef>(null);
  const [state, setState] = useState<TryOnState | null>(null);
  const actions = useMemo(() => {
    const view = () => {
      if (!ref.current) throw new Error('Render <TryOnView {...tryOn.viewProps} /> first.');
      return ref.current;
    };
    return {
      start: () => view().start(),
      stop: () => view().stop(),
      pause: () => view().pause(),
      resume: () => view().resume(),
      setAsset: (source: AssetSource | null) => view().setAsset(source),
      setVariant: (id: string) => view().setVariant(id),
      setIntensity: (value: number) => view().setIntensity(value),
      switchCamera: () => view().switchCamera(),
      setCompare: (position: number | null) => view().setCompare(position),
      capture: (options?: CaptureOptions): Promise<TryOnPhoto> =>
        ref.current
          ? ref.current.capture(options)
          : Promise.reject(new Error('Try-on view is not mounted.')),
    };
  }, []);
  const viewProps = useMemo(() => ({ ref, onStateChange: setState }), []);
  return {
    ...actions,
    state,
    status: state?.status ?? 'idle',
    error: state?.error ?? null,
    /** Spread onto `<TryOnView />`. */
    viewProps,
  };
}

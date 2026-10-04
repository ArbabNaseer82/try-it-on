import { useCallback, useMemo } from 'react';
import type {
  AssetManifest,
  AssetSource,
  CaptureOptions,
  ImageInput,
  SessionState,
  TryOnEngine,
} from '@tryonit/web';
import { useTryOnContext } from '../provider/contexts';
import { useTryOnState } from './useTryOnState';

const selectCore = (s: SessionState) => s;

export interface TryOnController {
  /** Full session state (re-renders on every change; prefer `useTryOnState` for slices). */
  state: SessionState;
  status: SessionState['status'];
  error: SessionState['error'];
  asset: AssetManifest | null;
  /** Returns the engine, creating it if needed. Use in effects and handlers only. */
  getEngine(): TryOnEngine;
  /** Ref callback that mounts the camera stage into an element. */
  attach(element: HTMLElement | null): void;
  start(): Promise<void>;
  startFromImage(input: ImageInput): Promise<void>;
  stop(): void;
  setAsset(source: AssetSource | null): Promise<AssetManifest | null>;
  setVariant(id: string): Promise<void>;
  setIntensity(value: number): void;
  switchCamera(): Promise<void>;
  capture(options?: CaptureOptions): Promise<Blob>;
  pause(): void;
  resume(): void;
  setCompare(position: number | null): void;
}

/**
 * Headless controller for building a fully custom try-on UI.
 *
 * @example
 * const { status, start, setAsset, capture, attach } = useTryOn();
 * return <div ref={attach} style={{ height: 480 }} />;
 */
export function useTryOn(): TryOnController {
  const { holder } = useTryOnContext();
  const state = useTryOnState(selectCore);
  const attach = useCallback(
    (element: HTMLElement | null) => {
      if (element) holder.get().attach(element);
      else holder.peek()?.attach(null);
    },
    [holder],
  );
  const actions = useMemo(
    () => ({
      getEngine: () => holder.get(),
      start: () => holder.get().start(),
      startFromImage: (input: ImageInput) => holder.get().startFromImage(input),
      stop: () => holder.peek()?.stop(),
      setAsset: (source: AssetSource | null) => holder.get().setAsset(source),
      setVariant: (id: string) => holder.get().setVariant(id),
      setIntensity: (value: number) => holder.get().setIntensity(value),
      switchCamera: () => holder.get().switchCamera(),
      capture: (options?: CaptureOptions) => holder.get().capture(options),
      pause: () => holder.peek()?.pause(),
      resume: () => holder.peek()?.resume(),
      setCompare: (position: number | null) => holder.peek()?.setCompare(position),
    }),
    [holder],
  );
  return {
    state,
    status: state.status,
    error: state.error,
    asset: state.asset,
    attach,
    ...actions,
  };
}

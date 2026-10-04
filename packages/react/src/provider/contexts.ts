import { createContext, useContext } from 'react';
import {
  createInitialSessionState,
  createTryOnEngine,
  type SessionState,
  type TryOnEngine,
  type TryOnEngineOptions,
} from '@tryonit/web';
import type { Icons } from '../icons';
import type { Labels } from '../i18n/default-labels';

/** Replaceable images. Every one is optional. */
export interface TryOnImages {
  loader?: string;
  logo?: string;
  placeholder?: string;
  permissionIllustration?: string;
}

/** Stable server and pre mount snapshot. */
export const INITIAL_STATE: SessionState = createInitialSessionState();

/**
 * Holds the engine and creates it lazily on the client (never during render), so components
 * are SSR safe and React StrictMode double mounting does not leak cameras or listeners.
 */
export class EngineHolder {
  private engine: TryOnEngine | null = null;
  private readonly listeners = new Set<() => void>();
  private unsubscribe: (() => void) | null = null;

  constructor(private readonly factory: () => TryOnEngine) {}

  /** Current engine or null when not created yet. */
  peek(): TryOnEngine | null {
    return this.engine;
  }

  /** Returns the engine, creating it on first use. Call from effects and event handlers. */
  get(): TryOnEngine {
    if (!this.engine) {
      const engine = this.factory();
      this.engine = engine;
      this.unsubscribe = engine.store.subscribe(() => this.notify());
      this.notify();
    }
    return this.engine;
  }

  getState = (): SessionState => this.engine?.store.getState() ?? INITIAL_STATE;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private notify(): void {
    for (const listener of [...this.listeners]) listener();
  }

  destroy(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
    const engine = this.engine;
    this.engine = null;
    engine?.destroy();
    this.notify();
  }
}

export function createEngineHolder(
  options?: TryOnEngineOptions,
  engine?: TryOnEngine | (() => TryOnEngine),
): EngineHolder {
  return new EngineHolder(() => {
    if (typeof engine === 'function') return engine();
    if (engine) return engine;
    return createTryOnEngine(options);
  });
}

export interface TryOnContextValue {
  holder: EngineHolder;
  icons: Icons;
  labels: Labels;
  images: TryOnImages;
  engineOptions: TryOnEngineOptions;
  dir: 'ltr' | 'rtl' | undefined;
  rootStyle: Record<string, string>;
  themeMode: 'light' | 'dark' | 'auto';
}

export const TryOnContext = createContext<TryOnContextValue | null>(null);

/** Reads the provider context. Throws a helpful error outside of `TryOnProvider`. */
export function useTryOnContext(): TryOnContextValue {
  const ctx = useContext(TryOnContext);
  if (!ctx) {
    throw new Error(
      '[tryonit] Wrap your tree in <TryOnProvider>, or use <TryOn> / <TryOnButton> which add one.',
    );
  }
  return ctx;
}

export function useOptionalTryOnContext(): TryOnContextValue | null {
  return useContext(TryOnContext);
}

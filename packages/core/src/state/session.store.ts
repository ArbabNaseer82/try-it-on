import type { AssetManifest } from '../domain/asset.types';
import type { TryOnError } from '../domain/errors';
import type {
  CameraFacing,
  FrameSourceKind,
  PerfState,
  SessionState,
  SessionStatus,
  TrackingState,
} from '../domain/session.types';
import { createStore, type Store } from './create-store';

/** Allowed status transitions of the session finite state machine. */
export const SESSION_TRANSITIONS: Readonly<Record<SessionStatus, readonly SessionStatus[]>> = {
  idle: ['checking', 'error', 'destroyed'],
  checking: ['requesting-camera', 'loading-models', 'idle', 'error', 'destroyed'],
  'requesting-camera': ['loading-models', 'idle', 'error', 'destroyed'],
  'loading-models': ['ready', 'idle', 'error', 'destroyed'],
  ready: ['running', 'paused', 'loading-models', 'idle', 'error', 'destroyed'],
  running: ['paused', 'loading-models', 'idle', 'error', 'destroyed'],
  paused: ['running', 'loading-models', 'idle', 'error', 'destroyed'],
  error: ['checking', 'idle', 'destroyed'],
  destroyed: [],
};

/** Returns true when the session may move from `from` to `to`. */
export function canTransition(from: SessionStatus, to: SessionStatus): boolean {
  return SESSION_TRANSITIONS[from].includes(to);
}

export function createInitialSessionState(overrides: Partial<SessionState> = {}): SessionState {
  return {
    status: 'idle',
    error: null,
    asset: null,
    assetLoading: false,
    variantId: null,
    intensity: 1,
    camera: { facing: 'user', source: null, mirrored: true },
    tracking: { faceVisible: false, handVisible: false, bodyVisible: false },
    perf: { fps: 0, detectionMs: 0, renderMs: 0, detectionRate: 30 },
    modules: [],
    ...overrides,
  };
}

export interface SessionStoreOptions {
  initial?: Partial<SessionState>;
  /** Called when an invalid transition is ignored. Wire to `console.debug` in debug mode. */
  onInvalidTransition?: (from: SessionStatus, to: SessionStatus) => void;
}

export interface SessionActions {
  /** Moves the FSM. Returns false and ignores the call when the transition is not allowed. */
  transition(to: SessionStatus): boolean;
  fail(error: TryOnError): void;
  /** Records a non fatal error (for example a bad asset) without changing the status. */
  setError(error: TryOnError | null): void;
  setAsset(asset: AssetManifest | null, variantId?: string | null): void;
  setAssetLoading(loading: boolean): void;
  setVariant(variantId: string | null): void;
  setIntensity(intensity: number): void;
  setCamera(
    camera: Partial<{ facing: CameraFacing; source: FrameSourceKind | null; mirrored: boolean }>,
  ): void;
  setTracking(tracking: Partial<TrackingState>): void;
  setPerf(perf: Partial<PerfState>): void;
  addModule(name: string): void;
}

export interface SessionStore extends Store<SessionState> {
  actions: SessionActions;
}

/** Creates the session store used by the engine and UI bindings. */
export function createSessionStore(options: SessionStoreOptions = {}): SessionStore {
  const store = createStore<SessionState>(createInitialSessionState(options.initial));
  const { getState, setState } = store;

  const actions: SessionActions = {
    transition(to) {
      const from = getState().status;
      if (from === to) return true;
      if (!canTransition(from, to)) {
        options.onInvalidTransition?.(from, to);
        return false;
      }
      setState(to === 'error' ? { status: to } : { status: to, error: null });
      return true;
    },
    fail(error) {
      if (getState().status === 'destroyed') return;
      setState({ status: 'error', error, assetLoading: false });
    },
    setError(error) {
      setState({ error });
    },
    setAsset(asset, variantId) {
      setState({
        asset,
        variantId:
          variantId !== undefined
            ? variantId
            : (asset?.defaultVariantId ?? asset?.variants?.[0]?.id ?? null),
      });
    },
    setAssetLoading(assetLoading) {
      setState({ assetLoading });
    },
    setVariant(variantId) {
      setState({ variantId });
    },
    setIntensity(intensity) {
      setState({ intensity: Math.min(1, Math.max(0, intensity)) });
    },
    setCamera(camera) {
      setState((prev) => ({ camera: { ...prev.camera, ...camera } }));
    },
    setTracking(tracking) {
      const prev = getState().tracking;
      const next = { ...prev, ...tracking };
      if (
        next.faceVisible === prev.faceVisible &&
        next.handVisible === prev.handVisible &&
        next.bodyVisible === prev.bodyVisible
      )
        return;
      setState({ tracking: next });
    },
    setPerf(perf) {
      setState((prev) => ({ perf: { ...prev.perf, ...perf } }));
    },
    addModule(name) {
      const modules = getState().modules;
      if (!modules.includes(name)) setState({ modules: [...modules, name] });
    },
  };

  return { ...store, actions };
}

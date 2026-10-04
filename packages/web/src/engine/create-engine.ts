import {
  ErrorCode,
  TryOnError,
  applyVariant,
  createEmitter,
  createSessionStore,
  getAssetRequirements,
  isAbortError,
  resolveAsset,
  toTryOnError,
  type AssetManifest,
  type AssetRequirements,
  type AssetSource,
  type FrameResults,
  type RendererKind,
  type SessionStatus,
  type TrackerKind,
} from '@tryonit/core';
import { openCamera } from '../camera/camera-source';
import type { FrameSource } from '../camera/frame-source';
import { createImageSource, type ImageInput } from '../camera/image-source';
import { snapshot } from '../capture/snapshot';
import { DEFAULT_WASM_BASE_URL, DETECTION_MAX_SIZE, getModelUrl } from '../config';
import { DebugOverlay, formatHud } from '../renderers/debug-overlay';
import type { GLStage } from '../renderers/gl/stage';
import type * as ThreeRendererModule from '../renderers/three/three-renderer';
import type { FrameState, Renderer } from '../renderers/renderer.interface';
import { StageLayers } from '../renderers/video-layer';
import { createTracker } from '../trackers';
import type { Tracker } from '../trackers/tracker.interface';
import { assertCapabilities, detectCapabilities } from './capabilities';
import { AdaptiveRate, FrameLoop } from './frame-loop';
import { watchVisibility } from './lifecycle';
import { TrackingPipeline } from './tracking-pipeline';
import type { CaptureOptions, TryOnEngine, TryOnEngineOptions, TryOnEvents } from './types';

type ThreeModule = typeof ThreeRendererModule;

const GL_KINDS: ReadonlySet<RendererKind> = new Set(['makeup', 'hair', 'overlay2d']);
const ACTIVE: ReadonlySet<SessionStatus> = new Set(['ready', 'running', 'paused']);

const emptyResults = (): FrameResults => ({
  timestamp: 0,
  face: null,
  hand: null,
  pose: null,
  hairMask: null,
});

/**
 * Creates a try-on engine. Nothing heavy happens until `start()` or `startFromImage()`:
 * MediaPipe, models, WebGL renderers and three.js are loaded lazily, and only the ones the
 * current asset needs.
 *
 * @example
 * const engine = createTryOnEngine({ container: el, modelBaseUrl: '/models' });
 * await engine.setAsset('/assets/aviator.json');
 * await engine.start();
 */
export function createTryOnEngine(options: TryOnEngineOptions = {}): TryOnEngine {
  const store = createSessionStore({
    onInvalidTransition: (from, to) => {
      if (debug) console.debug(`[tryonit] ignored transition ${from} -> ${to}`);
    },
  });
  const { actions } = store;
  const emitter = createEmitter<TryOnEvents>();
  const stage = new StageLayers(options.fit ?? 'cover');
  const rate = new AdaptiveRate(options.performance ?? 'auto');
  const wasmBaseUrl = options.wasmBaseUrl ?? DEFAULT_WASM_BASE_URL;
  const delegatePref = options.delegate ?? 'auto';
  let debug = !!options.debug;

  let source: FrameSource | null = null;
  let sourceVersion = 0;
  const trackers = new Map<TrackerKind, Tracker>();
  const trackerLoads = new Map<TrackerKind, Promise<Tracker>>();
  const renderers = new Map<RendererKind, Renderer>();
  const rendererLoads = new Map<RendererKind, Promise<Renderer>>();
  let glStage: GLStage | null = null;
  let activeRenderer: Renderer | null = null;
  let asset: AssetManifest | null = null;
  let required: AssetRequirements | null = null;
  let assetAbort: AbortController | null = null;
  let latest: FrameResults = emptyResults();
  let lastTimestamp = 0;
  let starting: Promise<void> | null = null;
  /** Incremented by start, startFromImage and stop so stale async work can bail out. */
  let session = 0;
  let destroyed = false;
  let autoPaused = false;
  let debugOverlay: DebugOverlay | null = null;
  let comparePosition: number | null = null;
  let detectionCanvas: HTMLCanvasElement | null = null;
  let lastDetectMs = 0;
  const perf = { frames: 0, renderTotal: 0, detectTotal: 0, detections: 0, windowStart: 0 };

  const pipeline = new TrackingPipeline({
    ...(options.smoothing ? { smoothing: options.smoothing } : {}),
    ...(options.irisDiameterMm ? { irisDiameterMm: options.irisDiameterMm } : {}),
    onVisibilityChange(kind, visible) {
      actions.setTracking({ [`${kind}Visible`]: visible });
      const event = `${kind}${visible ? 'Found' : 'Lost'}` as 'faceFound';
      emitter.emit(event, undefined);
    },
  });

  // Status ----------------------------------------------------------------

  const transition = (to: SessionStatus): boolean => {
    const prev = store.getState().status;
    if (prev === to) return true;
    const ok = actions.transition(to);
    if (ok) emitter.emit('statusChange', { status: to, prev });
    return ok;
  };

  const fail = (error: unknown, code: ErrorCode = ErrorCode.UNKNOWN): TryOnError => {
    const err = toTryOnError(error, code);
    if (destroyed) return err;
    const prev = store.getState().status;
    actions.fail(err);
    if (prev !== 'error') emitter.emit('statusChange', { status: 'error', prev });
    emitter.emit('error', err);
    if (debug) console.error('[tryonit]', err);
    return err;
  };

  const assertAlive = () => {
    if (destroyed) throw new TryOnError(ErrorCode.UNKNOWN, 'The engine was destroyed.');
  };

  // Lazy modules ------------------------------------------------------------

  const mode = () => (source?.kind === 'image' ? 'IMAGE' : 'VIDEO');

  const ensureTracker = async (kind: TrackerKind): Promise<Tracker> => {
    const existing = trackers.get(kind);
    if (existing) return existing;
    let pending = trackerLoads.get(kind);
    if (!pending) {
      pending = createTracker(kind, {
        wasmBaseUrl,
        modelUrl: getModelUrl(kind, options),
        delegate: delegatePref,
        mode: mode(),
      });
      trackerLoads.set(kind, pending);
    }
    try {
      const tracker = await pending;
      if (destroyed) {
        tracker.close();
        throw new TryOnError(ErrorCode.UNKNOWN, 'The engine was destroyed.');
      }
      if (!trackers.has(kind)) {
        trackers.set(kind, tracker);
        actions.addModule(`tracker:${kind}`);
      }
      await tracker.setMode(mode());
      return tracker;
    } finally {
      trackerLoads.delete(kind);
    }
  };

  const createRenderer = async (kind: RendererKind): Promise<Renderer> => {
    if (GL_KINDS.has(kind)) {
      const gl = await import('../renderers/gl-renderers');
      if (!glStage) {
        glStage = new gl.GLStage();
        stage.addLayer(glStage.canvas, 1);
        actions.addModule('webgl:stage');
      }
      if (kind === 'makeup') return new gl.MakeupRenderer(glStage);
      if (kind === 'hair') return new gl.HairRenderer(glStage);
      return new gl.Overlay2DRenderer(glStage);
    }
    let mod: ThreeModule;
    try {
      mod = await import('../renderers/three/three-renderer');
    } catch (error) {
      throw new TryOnError(
        ErrorCode.MODEL_LOAD_FAILED,
        '3D assets need the optional peer dependency "three". Install it with `npm i three`.',
        { cause: error },
      );
    }
    const renderer = new mod.ThreeRenderer(options.three);
    stage.addLayer(renderer.canvas, 2);
    actions.addModule('three');
    return renderer;
  };

  const ensureRenderer = async (kind: RendererKind): Promise<Renderer> => {
    const existing = renderers.get(kind);
    if (existing) return existing;
    let pending = rendererLoads.get(kind);
    if (!pending) {
      pending = createRenderer(kind);
      rendererLoads.set(kind, pending);
    }
    try {
      const renderer = await pending;
      if (destroyed) {
        renderer.dispose();
        throw new TryOnError(ErrorCode.UNKNOWN, 'The engine was destroyed.');
      }
      if (!renderers.has(kind)) {
        renderers.set(kind, renderer);
        actions.addModule(`renderer:${kind}`);
      }
      return renderer;
    } finally {
      rendererLoads.delete(kind);
    }
  };

  const ensureModules = async (req: AssetRequirements): Promise<Renderer> => {
    const [renderer] = await Promise.all([
      ensureRenderer(req.renderers[0] as RendererKind),
      ...req.trackers.map((kind) => ensureTracker(kind)),
    ]);
    return renderer;
  };

  const needsLoading = (req: AssetRequirements) =>
    req.trackers.some((k) => !trackers.has(k)) || req.renderers.some((k) => !renderers.has(k));

  const applyCompare = () => {
    const mirrored = store.getState().camera.mirrored;
    const p = comparePosition === null ? null : Math.min(1, Math.max(0, comparePosition)) * 100;
    const clip = p === null ? '' : mirrored ? `inset(0 ${p}% 0 0)` : `inset(0 0 0 ${p}%)`;
    if (glStage) glStage.canvas.style.clipPath = clip;
    const three = renderers.get('three');
    if (three) three.canvas.style.clipPath = clip;
  };

  const activate = (renderer: Renderer | null) => {
    if (activeRenderer && activeRenderer !== renderer) activeRenderer.clear();
    activeRenderer = renderer;
    const glActive = !!renderer && GL_KINDS.has(renderer.kind);
    if (glStage) glStage.canvas.style.visibility = glActive ? 'visible' : 'hidden';
    const three = renderers.get('three');
    if (three) three.canvas.style.visibility = renderer?.kind === 'three' ? 'visible' : 'hidden';
    applyCompare();
  };

  /** Loads modules for the current asset and hands it to its renderer. */
  const prepareAsset = async (
    manifest: AssetManifest,
    variantId: string | null,
  ): Promise<Renderer> => {
    const req = getAssetRequirements(manifest);
    const renderer = await ensureModules(req);
    await renderer.setAsset(applyVariant(manifest, variantId));
    return renderer;
  };

  // Frame loop ----------------------------------------------------------------

  const detectionInput = (src: FrameSource): TexImageSource => {
    const long = Math.max(src.width, src.height);
    if (long <= DETECTION_MAX_SIZE || src.kind === 'image') return src.element;
    const scale = DETECTION_MAX_SIZE / long;
    detectionCanvas ??= document.createElement('canvas');
    const w = Math.round(src.width * scale);
    const h = Math.round(src.height * scale);
    if (detectionCanvas.width !== w || detectionCanvas.height !== h) {
      detectionCanvas.width = w;
      detectionCanvas.height = h;
    }
    detectionCanvas.getContext('2d')?.drawImage(src.element, 0, 0, w, h);
    return detectionCanvas;
  };

  const detect = (now: number) => {
    const src = source;
    const req = required;
    if (!src || !req || src.width === 0) return;
    const t0 = performance.now();
    const timestamp = Math.max(lastTimestamp + 1, Math.round(now));
    lastTimestamp = timestamp;
    const input = detectionInput(src);
    const aspect = src.width / src.height;
    const results: FrameResults = { ...emptyResults(), timestamp: now };
    try {
      for (const kind of req.trackers) {
        const tracker = trackers.get(kind);
        if (!tracker) continue;
        const result = tracker.detect(input, timestamp);
        if (kind === 'face') {
          results.face = result as FrameResults['face'];
          pipeline.updateFace(results.face, now, aspect);
        } else if (kind === 'hand') {
          results.hand = result as FrameResults['hand'];
          pipeline.updateHand(results.hand, now, aspect);
        } else if (kind === 'pose') {
          results.pose = result as FrameResults['pose'];
          const padding = asset?.type === 'clothing.top' ? asset.padding : undefined;
          pipeline.updateBody(results.pose, now, aspect, padding);
        } else {
          results.hairMask = result as FrameResults['hairMask'];
          pipeline.updateHair(results.hairMask, now);
        }
      }
    } catch (error) {
      loop.stop();
      fail(error, ErrorCode.TRACKER_FAILED);
      return;
    }
    latest = results;
    lastDetectMs = performance.now() - t0;
    perf.detectTotal += lastDetectMs;
    perf.detections++;
    options.onFrame?.(results);
    emitter.emit('frame', results);
  };

  const render = (now: number) => {
    const src = source;
    if (!src || src.width === 0) return;
    const t0 = performance.now();
    if (activeRenderer) {
      const frame: FrameState = {
        time: now,
        width: src.width,
        height: src.height,
        aspect: src.width / src.height,
        source: src.element,
        sourceVersion,
        intensity: store.getState().intensity,
        ...pipeline.snapshot(now),
      };
      try {
        activeRenderer.render(frame);
      } catch (error) {
        loop.stop();
        fail(error, ErrorCode.WEBGL_UNSUPPORTED);
        return;
      }
    } else {
      pipeline.snapshot(now);
    }
    if (debug && debugOverlay) debugOverlay.draw(latest, src.width, src.height);
    const renderMs = performance.now() - t0;
    perf.frames++;
    perf.renderTotal += renderMs;
    if (rate.record(lastDetectMs + renderMs, now)) actions.setPerf({ detectionRate: rate.rate });
    if (now - perf.windowStart >= 500) {
      const seconds = (now - perf.windowStart) / 1000;
      if (perf.windowStart > 0) {
        actions.setPerf({
          fps: perf.frames / seconds,
          renderMs: perf.renderTotal / Math.max(1, perf.frames),
          detectionMs: perf.detectTotal / Math.max(1, perf.detections),
        });
        if (debug) {
          const delegate = [...trackers.values()].map((t) => `${t.kind}:${t.delegate}`).join(' ');
          stage.hud.textContent = formatHud(store.getState(), delegate || 'none');
        }
      }
      perf.frames = 0;
      perf.renderTotal = 0;
      perf.detectTotal = 0;
      perf.detections = 0;
      perf.windowStart = now;
    }
  };

  const loop = new FrameLoop(
    {
      detect,
      render,
      newFrame: () => {
        sourceVersion++;
      },
    },
    rate,
  );

  /** Photo mode: detect once on the still image. */
  const detectStatic = () => {
    if (source?.kind !== 'image') return;
    pipeline.reset();
    pipeline.staticMode = true;
    sourceVersion++;
    detect(performance.now());
  };

  const startLoop = () => {
    loop.start(source?.kind === 'camera' ? (source.element as HTMLVideoElement) : null);
  };

  const setSource = (next: FrameSource | null) => {
    if (source && source !== next) source.stop();
    source = next;
    sourceVersion++;
    glStage?.invalidate();
    pipeline.reset();
    pipeline.staticMode = next?.kind === 'image';
    stage.setBackground(next?.element ?? null);
    const mirrored = next
      ? (options.mirror ?? (next.kind === 'camera' && next.facing !== 'environment'))
      : false;
    stage.setMirrored(mirrored);
    actions.setCamera({
      source: next?.kind ?? null,
      mirrored,
      ...(next?.facing ? { facing: next.facing } : {}),
    });
    applyCompare();
  };

  const loadForSession = async () => {
    if (!asset) return;
    const renderer = await prepareAsset(asset, store.getState().variantId);
    required = getAssetRequirements(asset);
    activate(renderer);
  };

  const stopVisibility = watchVisibility({
    onHidden() {
      if (store.getState().status === 'running') {
        engine.pause();
        autoPaused = true;
      }
    },
    onVisible() {
      if (autoPaused) {
        autoPaused = false;
        engine.resume();
      }
    },
  });

  const resetToIdleIfActive = () => {
    const status = store.getState().status;
    if (ACTIVE.has(status) || status === 'loading-models') engine.stop();
  };

  // Public API ----------------------------------------------------------------

  const engine: TryOnEngine = {
    store,
    element: stage.root,

    attach(container) {
      if (container) stage.attach(container);
      else stage.detach();
    },

    start() {
      if (destroyed)
        return Promise.reject(new TryOnError(ErrorCode.UNKNOWN, 'The engine was destroyed.'));
      if (starting) return starting;
      const status = store.getState().status;
      if (source?.kind === 'camera' && ACTIVE.has(status)) {
        if (status === 'paused') engine.resume();
        return Promise.resolve();
      }
      resetToIdleIfActive();
      const token = ++session;
      const stale = () => destroyed || token !== session;
      const run = (async () => {
        try {
          transition('checking');
          assertCapabilities(detectCapabilities(), { camera: true });
          transition('requesting-camera');
          const camera = await openCamera({
            ...options.camera,
            facing: store.getState().camera.facing,
          });
          if (stale()) {
            camera.stop();
            return;
          }
          setSource(camera);
          transition('loading-models');
          await loadForSession();
          if (stale()) return;
          transition('ready');
          startLoop();
          transition('running');
        } catch (error) {
          if (stale()) return;
          loop.stop();
          throw fail(error);
        } finally {
          if (token === session) starting = null;
        }
      })();
      starting = run;
      return run;
    },

    async startFromImage(input: ImageInput) {
      assertAlive();
      resetToIdleIfActive();
      const token = ++session;
      const stale = () => destroyed || token !== session;
      try {
        transition('checking');
        assertCapabilities(detectCapabilities(), { camera: false });
        const image = await createImageSource(input);
        if (stale()) {
          image.stop();
          return;
        }
        setSource(image);
        transition('loading-models');
        await loadForSession();
        if (stale()) return;
        transition('ready');
        detectStatic();
        startLoop();
        transition('running');
      } catch (error) {
        if (stale()) return;
        loop.stop();
        throw fail(error);
      }
    },

    stop() {
      if (destroyed) return;
      session++;
      starting = null;
      loop.stop();
      setSource(null);
      autoPaused = false;
      transition('idle');
    },

    async setAsset(next: AssetSource | null) {
      assertAlive();
      assetAbort?.abort();
      const controller = new AbortController();
      assetAbort = controller;
      if (next === null) {
        asset = null;
        required = null;
        activate(null);
        actions.setAsset(null);
        actions.setAssetLoading(false);
        return null;
      }
      actions.setAssetLoading(true);
      try {
        const manifest = await resolveAsset(next, {
          signal: controller.signal,
          ...(options.fetch ? { fetch: options.fetch } : {}),
          ...(typeof location !== 'undefined' ? { baseUrl: location.href } : {}),
          ...(debug ? { warn: (m: string) => console.warn(m) } : {}),
        });
        const variantId = manifest.defaultVariantId ?? manifest.variants?.[0]?.id ?? null;
        const req = getAssetRequirements(manifest);
        let renderer: Renderer | null = null;
        if (source) {
          const prev = store.getState().status;
          const visibleLoading = ACTIVE.has(prev) && needsLoading(req);
          if (visibleLoading) {
            if (prev === 'running') loop.stop();
            transition('loading-models');
          }
          renderer = await prepareAsset(manifest, variantId);
          if (controller.signal.aborted || destroyed) return null;
          if (visibleLoading) {
            transition('ready');
            if (prev !== 'paused') {
              startLoop();
              transition('running');
            } else {
              transition('paused');
            }
          }
        }
        if (controller.signal.aborted || destroyed) return null;
        asset = manifest;
        if (renderer) {
          required = req;
          activate(renderer);
          if (source?.kind === 'image') detectStatic();
        }
        actions.setError(null);
        actions.setAsset(manifest, variantId);
        actions.setAssetLoading(false);
        emitter.emit('assetLoaded', manifest);
        return manifest;
      } catch (error) {
        if (isAbortError(error) || controller.signal.aborted || destroyed) return null;
        actions.setAssetLoading(false);
        const err = toTryOnError(error, ErrorCode.ASSET_LOAD_FAILED);
        const status = store.getState().status;
        if (status === 'loading-models') {
          // A tracker or renderer failed to load: the session cannot continue.
          throw fail(err);
        }
        actions.setError(err);
        emitter.emit('error', err);
        throw err;
      } finally {
        if (assetAbort === controller) assetAbort = null;
      }
    },

    async setVariant(variantId) {
      assertAlive();
      actions.setVariant(variantId);
      if (asset && activeRenderer) {
        await activeRenderer.setAsset(applyVariant(asset, variantId));
      }
    },

    setIntensity(value) {
      actions.setIntensity(value);
    },

    async switchCamera() {
      assertAlive();
      if (source?.kind !== 'camera') return;
      const current = store.getState().camera.facing;
      const next = current === 'user' ? 'environment' : 'user';
      const wasRunning = store.getState().status === 'running';
      loop.stop();
      setSource(null);
      try {
        setSource(await openCamera({ ...options.camera, deviceId: undefined, facing: next }));
      } catch (error) {
        try {
          setSource(await openCamera({ ...options.camera, facing: current }));
        } catch {
          throw fail(error);
        }
      }
      if (wasRunning) startLoop();
    },

    async capture(captureOptions: CaptureOptions = {}) {
      assertAlive();
      const src = source;
      if (!src)
        throw new TryOnError(ErrorCode.UNKNOWN, 'Nothing to capture: the session is not started.');
      render(performance.now());
      const glActive = !!activeRenderer && GL_KINDS.has(activeRenderer.kind);
      const three = renderers.get('three');
      const blob = await snapshot(
        [
          { element: src.element, visible: true },
          { element: glStage?.canvas ?? src.element, visible: glActive && !!glStage },
          {
            element: three?.canvas ?? src.element,
            visible: activeRenderer?.kind === 'three' && !!three,
          },
        ],
        src.width,
        src.height,
        {
          mirror: captureOptions.mirror ?? store.getState().camera.mirrored,
          type: captureOptions.type ?? 'image/png',
          quality: captureOptions.quality ?? 0.92,
        },
      );
      emitter.emit('capture', blob);
      return blob;
    },

    pause() {
      if (store.getState().status !== 'running') return;
      loop.stop();
      if (source?.kind === 'camera') (source.element as HTMLVideoElement).pause();
      transition('paused');
    },

    resume() {
      if (store.getState().status !== 'paused') return;
      if (source?.kind === 'camera')
        void (source.element as HTMLVideoElement).play().catch(() => undefined);
      startLoop();
      transition('running');
    },

    setCompare(position) {
      comparePosition = position;
      applyCompare();
    },

    setDebug(enabled) {
      debug = enabled;
      stage.hud.style.display = enabled ? 'block' : 'none';
      if (enabled && !debugOverlay) {
        debugOverlay = new DebugOverlay();
        stage.addLayer(debugOverlay.canvas, 5);
      }
      if (debugOverlay) {
        debugOverlay.canvas.style.display = enabled ? 'block' : 'none';
        if (!enabled) debugOverlay.clear();
      }
    },

    destroy() {
      if (destroyed) return;
      session++;
      assetAbort?.abort();
      loop.stop();
      setSource(null);
      destroyed = true;
      for (const tracker of trackers.values()) tracker.close();
      trackers.clear();
      for (const renderer of renderers.values()) renderer.dispose();
      renderers.clear();
      glStage?.dispose();
      glStage = null;
      debugOverlay?.canvas.remove();
      stopVisibility();
      stage.detach();
      transition('destroyed');
      emitter.clear();
    },

    on(event, handler) {
      return emitter.on(event, handler);
    },

    off(event, handler) {
      emitter.off(event, handler);
    },

    getLatestResults() {
      return latest;
    },
  };

  if (options.container) engine.attach(options.container);
  if (debug) engine.setDebug(true);
  return engine;
}

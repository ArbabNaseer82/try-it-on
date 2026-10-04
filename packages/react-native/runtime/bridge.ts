// Runs inside the WebView. Bundled with @tryonit/web into one module by scripts/build-runtime.mjs.
import {
  createTryOnEngine,
  mount,
  toTryOnError,
  type SessionState,
  type TryOnEngine,
  type TryOnError,
} from '@tryonit/web';
import type {
  BridgeCommand,
  BridgeConfig,
  BridgeEvent,
  CaptureOptions,
  TryOnErrorInfo,
  TryOnState,
} from '../src/protocol';

declare global {
  interface Window {
    ReactNativeWebView?: { postMessage(message: string): void };
    __TRYONIT_CONFIG__: BridgeConfig;
    __tryonit?: { receive(command: BridgeCommand): void };
  }
}

const config = window.__TRYONIT_CONFIG__;

function post(event: BridgeEvent): void {
  window.ReactNativeWebView?.postMessage(JSON.stringify(event));
}

function serializeError(error: TryOnError): TryOnErrorInfo {
  return {
    code: error.code,
    message: error.message,
    retryable: error.retryable,
    canUsePhotoFallback: error.canUsePhotoFallback,
  };
}

function serializeState(state: SessionState): TryOnState {
  return { ...state, error: state.error ? serializeError(state.error) : null };
}

const root = document.getElementById('tryonit-root') as HTMLElement;
let engine: TryOnEngine;

async function sendCapture(blob: Blob, id: number | null): Promise<void> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
  let width = 0;
  let height = 0;
  try {
    const bitmap = await createImageBitmap(blob);
    width = bitmap.width;
    height = bitmap.height;
    bitmap.close();
  } catch {
    // Dimensions are optional.
  }
  post({ type: 'capture', id, dataUrl, mimeType: blob.type, width, height });
}

const captureOptions = (options?: CaptureOptions) => ({
  type: options?.type ?? config.capture.type ?? 'image/jpeg',
  quality: options?.quality ?? config.capture.quality ?? 0.9,
  ...((options?.mirror ?? config.capture.mirror) !== undefined
    ? { mirror: options?.mirror ?? config.capture.mirror }
    : {}),
});

if (config.controls === 'web') {
  const handle = mount(root, {
    ...config.engine,
    autoStart: false,
    theme: config.theme,
    labels: config.labels,
    onCapture: () => undefined,
  });
  engine = handle.engine;
  // Route the built in shutter through the configured capture format.
  const shutter = root.querySelector<HTMLButtonElement>('.toi-btn--capture');
  if (shutter) {
    shutter.onclick = async () => {
      try {
        await sendCapture(await engine.capture(captureOptions()), null);
      } catch (error) {
        post({
          type: 'commandError',
          id: null,
          command: 'capture',
          error: serializeError(toTryOnError(error)),
        });
      }
    };
  }
} else {
  engine = createTryOnEngine({ ...config.engine, container: root });
}

engine.store.subscribe((state) => post({ type: 'state', state: serializeState(state) }));
engine.on('error', (error) => post({ type: 'error', error: serializeError(error) }));
engine.on('assetLoaded', (asset) => post({ type: 'assetLoaded', asset }));

async function run(command: BridgeCommand): Promise<void> {
  switch (command.type) {
    case 'start':
      return engine.start();
    case 'stop':
      return engine.stop();
    case 'pause':
      return engine.pause();
    case 'resume':
      return engine.resume();
    case 'setAsset':
      await engine.setAsset(command.asset);
      return;
    case 'setVariant':
      return engine.setVariant(command.variantId);
    case 'setIntensity':
      return engine.setIntensity(command.value);
    case 'switchCamera':
      return engine.switchCamera();
    case 'setCompare':
      return engine.setCompare(command.position);
    case 'setDebug':
      return engine.setDebug(command.enabled);
    case 'capture':
      return sendCapture(await engine.capture(captureOptions(command.options)), command.id);
  }
}

window.__tryonit = {
  receive(command) {
    run(command).catch((error: unknown) => {
      post({
        type: 'commandError',
        id: command.type === 'capture' ? command.id : null,
        command: command.type,
        error: serializeError(toTryOnError(error)),
      });
    });
  },
};

document.addEventListener('visibilitychange', () => {
  post({ type: 'log', level: 'debug', message: `visibility ${document.visibilityState}` });
});

post({ type: 'ready' });
post({ type: 'state', state: serializeState(engine.store.getState()) });
if (config.autoStart) engine.start().catch(() => undefined);

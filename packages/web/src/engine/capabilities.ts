import { ErrorCode, TryOnError } from '@tryonit/core';

/** What the current browser can do. Safe to call during SSR (everything false). */
export interface Capabilities {
  browser: boolean;
  secureContext: boolean;
  camera: boolean;
  webgl2: boolean;
  videoFrameCallback: boolean;
  offscreenCanvas: boolean;
}

let cachedWebGL2: boolean | null = null;

function hasWebGL2(): boolean {
  if (cachedWebGL2 !== null) return cachedWebGL2;
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    cachedWebGL2 = !!gl;
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
  } catch {
    cachedWebGL2 = false;
  }
  return cachedWebGL2;
}

/** Detects browser capabilities. Never throws. */
export function detectCapabilities(): Capabilities {
  const browser = typeof window !== 'undefined' && typeof document !== 'undefined';
  if (!browser) {
    return {
      browser,
      secureContext: false,
      camera: false,
      webgl2: false,
      videoFrameCallback: false,
      offscreenCanvas: false,
    };
  }
  return {
    browser,
    secureContext: window.isSecureContext !== false,
    camera: typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia,
    webgl2: hasWebGL2(),
    videoFrameCallback:
      typeof HTMLVideoElement !== 'undefined' &&
      'requestVideoFrameCallback' in HTMLVideoElement.prototype,
    offscreenCanvas: typeof OffscreenCanvas !== 'undefined',
  };
}

/** True when try-on can run in this browser (camera or photo mode). */
export function isTryOnSupported(): boolean {
  const caps = detectCapabilities();
  return caps.browser && caps.webgl2;
}

/** Throws the matching `TryOnError` when a requirement is missing. */
export function assertCapabilities(caps: Capabilities, needs: { camera: boolean }): void {
  if (!caps.browser)
    throw new TryOnError(ErrorCode.UNKNOWN, 'TryOnIt can only start in a browser.');
  if (!caps.webgl2) {
    throw new TryOnError(ErrorCode.WEBGL_UNSUPPORTED, 'WebGL2 is not available in this browser.');
  }
  if (needs.camera && !caps.secureContext) {
    throw new TryOnError(
      ErrorCode.INSECURE_CONTEXT,
      'The camera needs a secure context (HTTPS or localhost).',
    );
  }
  if (needs.camera && !caps.camera) {
    throw new TryOnError(ErrorCode.CAMERA_NOT_FOUND, 'This browser does not expose a camera API.');
  }
}

/** Resets cached probes (tests only). */
export function resetCapabilitiesCache(): void {
  cachedWebGL2 = null;
}

import type { AssetSource, SessionState, TryOnError } from '@tryonit/core';
import { createTryOnEngine } from '../engine/create-engine';
import type { TryOnEngine, TryOnEngineOptions } from '../engine/types';

export interface MountLabels {
  start: string;
  capture: string;
  switchCamera: string;
  uploadPhoto: string;
  retry: string;
  loading: string;
  noFace: string;
  noHand: string;
  noBody: string;
  cameraDenied: string;
  cameraNotFound: string;
  cameraInUse: string;
  insecureContext: string;
  webglUnsupported: string;
  genericError: string;
}

export const DEFAULT_MOUNT_LABELS: MountLabels = {
  start: 'Start try-on',
  capture: 'Take photo',
  switchCamera: 'Switch camera',
  uploadPhoto: 'Upload a photo',
  retry: 'Try again',
  loading: 'Loading try-on',
  noFace: 'Look at the camera',
  noHand: 'Show your hand to the camera',
  noBody: 'Step back so your upper body is visible',
  cameraDenied: 'Camera access was blocked. Allow it in your browser settings or upload a photo.',
  cameraNotFound: 'No camera found. You can upload a photo instead.',
  cameraInUse: 'Your camera is used by another app. Close it and try again.',
  insecureContext: 'The camera only works on HTTPS pages.',
  webglUnsupported: 'Your browser does not support WebGL2, which try-on needs.',
  genericError: 'Something went wrong. Please try again.',
};

export interface MountOptions extends Omit<TryOnEngineOptions, 'container'> {
  asset?: AssetSource;
  /** Start the camera immediately. Default true. */
  autoStart?: boolean;
  labels?: Partial<MountLabels>;
  /** CSS variables without the `--toi-` prefix, for example `{ 'color-primary': '#7C3AED' }`. */
  theme?: Record<string, string>;
  onCapture?: (blob: Blob) => void;
  onError?: (error: TryOnError) => void;
}

export interface MountHandle {
  engine: TryOnEngine;
  element: HTMLElement;
  setAsset(source: AssetSource | null): Promise<void>;
  destroy(): void;
}

const ICONS = {
  capture:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" fill="currentColor"/></svg>',
  switch:
    '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h11l-3-3M20 17H9l3 3"/></svg>',
  upload:
    '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V4m0 0-4 4m4-4 4 4M4 20h16"/></svg>',
};

function errorLabel(labels: MountLabels, error: TryOnError): string {
  switch (error.code) {
    case 'CAMERA_DENIED':
      return labels.cameraDenied;
    case 'CAMERA_NOT_FOUND':
      return labels.cameraNotFound;
    case 'CAMERA_IN_USE':
      return labels.cameraInUse;
    case 'INSECURE_CONTEXT':
      return labels.insecureContext;
    case 'WEBGL_UNSUPPORTED':
      return labels.webglUnsupported;
    default:
      return labels.genericError;
  }
}

function button(className: string, label: string, icon?: string): HTMLButtonElement {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = `toi-btn ${className}`;
  el.setAttribute('aria-label', label);
  if (icon) el.innerHTML = icon;
  else el.textContent = label;
  return el;
}

/**
 * Framework free UI for plain HTML, Vue, Svelte, Angular or any other stack. Builds the
 * camera stage, a toolbar (capture, switch camera, upload photo) and status messages, styled
 * with the same `--toi-*` CSS variables as the React package.
 *
 * @example
 * import { mount } from '@tryonit/web';
 * import '@tryonit/web/styles.css';
 * const handle = mount(document.getElementById('tryon'), { asset: '/assets/aviator.json' });
 */
export function mount(target: HTMLElement, options: MountOptions = {}): MountHandle {
  const labels: MountLabels = { ...DEFAULT_MOUNT_LABELS, ...options.labels };
  const root = document.createElement('div');
  root.className = 'toi-root toi-mount';
  for (const [key, value] of Object.entries(options.theme ?? {}))
    root.style.setProperty(`--toi-${key}`, value);

  const stageEl = document.createElement('div');
  stageEl.className = 'toi-mount__stage';
  const status = document.createElement('div');
  status.className = 'toi-status';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  const toolbar = document.createElement('div');
  toolbar.className = 'toi-toolbar';
  const switchBtn = button('toi-btn--icon', labels.switchCamera, ICONS.switch);
  const captureBtn = button('toi-btn--capture', labels.capture, ICONS.capture);
  const uploadBtn = button('toi-btn--icon', labels.uploadPhoto, ICONS.upload);
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*';
  fileInput.hidden = true;
  toolbar.append(uploadBtn, captureBtn, switchBtn, fileInput);
  root.append(stageEl, status, toolbar);
  target.append(root);

  const { asset, autoStart, onCapture, onError, labels: _l, theme: _t, ...engineOptions } = options;
  const engine = createTryOnEngine({ ...engineOptions, container: stageEl });

  const render = (state: SessionState) => {
    root.dataset.status = state.status;
    status.replaceChildren();
    const message = (text: string, actions: HTMLElement[] = []) => {
      const p = document.createElement('p');
      p.className = 'toi-status__text';
      p.textContent = text;
      status.append(p, ...actions);
      status.hidden = false;
    };
    status.hidden = true;
    if (state.error) {
      const retry = button('toi-btn--primary', labels.retry);
      retry.textContent = labels.retry;
      retry.onclick = () => void engine.start().catch(() => undefined);
      const actions: HTMLElement[] = [retry];
      if (state.error.canUsePhotoFallback) {
        const upload = button('toi-btn--secondary', labels.uploadPhoto);
        upload.textContent = labels.uploadPhoto;
        upload.onclick = () => fileInput.click();
        actions.push(upload);
      }
      message(errorLabel(labels, state.error), actions);
    } else if (
      ['checking', 'requesting-camera', 'loading-models'].includes(state.status) ||
      state.assetLoading
    ) {
      message(labels.loading);
    } else if (state.status === 'idle') {
      const start = button('toi-btn--primary', labels.start);
      start.textContent = labels.start;
      start.onclick = () => void engine.start().catch(() => undefined);
      message('', [start]);
    } else if (state.status === 'running' && state.asset) {
      const type = state.asset.type;
      if ((type === 'watch' || type === 'ring') && !state.tracking.handVisible)
        message(labels.noHand);
      else if (type === 'clothing.top' && !state.tracking.bodyVisible) message(labels.noBody);
      else if (
        type !== 'watch' &&
        type !== 'ring' &&
        type !== 'clothing.top' &&
        !state.tracking.faceVisible
      )
        message(labels.noFace);
    }
    switchBtn.hidden = state.camera.source !== 'camera';
    captureBtn.disabled = state.status !== 'running';
  };
  const unsubscribe = engine.store.subscribe((state) => render(state));
  render(engine.store.getState());

  captureBtn.onclick = async () => {
    const blob = await engine.capture();
    onCapture?.(blob);
  };
  switchBtn.onclick = () => void engine.switchCamera().catch(() => undefined);
  uploadBtn.onclick = () => fileInput.click();
  fileInput.onchange = () => {
    const file = fileInput.files?.[0];
    if (file) void engine.startFromImage(file).catch(() => undefined);
    fileInput.value = '';
  };
  const offError = engine.on('error', (e) => onError?.(e));

  if (asset) void engine.setAsset(asset).catch(() => undefined);
  if (autoStart ?? true) void engine.start().catch(() => undefined);

  return {
    engine,
    element: root,
    async setAsset(source) {
      await engine.setAsset(source);
    },
    destroy() {
      unsubscribe();
      offError();
      engine.destroy();
      root.remove();
    },
  };
}

import type { TrackerKind } from '@tryonit/core';

/**
 * Version of `@mediapipe/tasks-vision` this build was tested with. The default wasm URL is
 * pinned to it so the JS and wasm halves always match. A unit test keeps it in sync.
 */
export const MEDIAPIPE_VERSION = '1.0.1';

/** Default wasm location (jsDelivr, pinned). Self host with `wasmBaseUrl` for strict CSPs. */
export const DEFAULT_WASM_BASE_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`;

/** File names used when `modelBaseUrl` is set (`scripts/fetch-models.mjs` downloads these). */
export const MODEL_FILES: Record<TrackerKind, string> = {
  face: 'face_landmarker.task',
  hand: 'hand_landmarker.task',
  pose: 'pose_landmarker_lite.task',
  segmenter: 'hair_segmenter.tflite',
};

/** Official Google hosted models, used when no `modelBaseUrl` is configured. */
export const DEFAULT_MODEL_URLS: Record<TrackerKind, string> = {
  face: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
  hand: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
  pose: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
  segmenter:
    'https://storage.googleapis.com/mediapipe-models/image_segmenter/hair_segmenter/float32/latest/hair_segmenter.tflite',
};

export interface ModelLocationOptions {
  modelBaseUrl?: string;
  models?: Partial<Record<TrackerKind, string>>;
}

/** Where the model for a tracker is loaded from. Explicit `models` win over `modelBaseUrl`. */
export function getModelUrl(kind: TrackerKind, options: ModelLocationOptions = {}): string {
  const explicit = options.models?.[kind];
  if (explicit) return explicit;
  if (options.modelBaseUrl)
    return `${options.modelBaseUrl.replace(/\/+$/, '')}/${MODEL_FILES[kind]}`;
  return DEFAULT_MODEL_URLS[kind];
}

/** Long side of the image passed to MediaPipe. Display resolution is independent. */
export const DETECTION_MAX_SIZE = 640;

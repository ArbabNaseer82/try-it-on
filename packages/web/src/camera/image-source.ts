import { ErrorCode, TryOnError } from '@tryonit/core';
import type { FrameSource } from './frame-source';

export type ImageInput = File | Blob | string | HTMLImageElement | ImageBitmap | HTMLCanvasElement;

export interface ImageSource extends FrameSource {
  readonly kind: 'image';
  readonly element: HTMLCanvasElement;
}

/** Largest side of an uploaded photo, larger images are downscaled. */
const MAX_IMAGE_SIZE = 1600;

async function loadElement(src: string): Promise<HTMLImageElement> {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.decoding = 'async';
  img.src = src;
  try {
    await img.decode();
  } catch (error) {
    throw new TryOnError(ErrorCode.ASSET_LOAD_FAILED, 'The photo could not be loaded.', {
      cause: error,
    });
  }
  return img;
}

/**
 * Creates a frame source from an uploaded selfie, a URL or an existing image. Used as the
 * photo fallback when the camera is denied or unavailable.
 */
export async function createImageSource(input: ImageInput): Promise<ImageSource> {
  let drawable: CanvasImageSource;
  let width: number;
  let height: number;
  let revoke: string | null = null;
  if (typeof input === 'string' || input instanceof Blob) {
    const url = typeof input === 'string' ? input : URL.createObjectURL(input);
    if (typeof input !== 'string') revoke = url;
    const img = await loadElement(url);
    drawable = img;
    width = img.naturalWidth;
    height = img.naturalHeight;
  } else if (input instanceof HTMLImageElement) {
    if (!input.complete) await input.decode();
    drawable = input;
    width = input.naturalWidth;
    height = input.naturalHeight;
  } else {
    drawable = input;
    width = input.width;
    height = input.height;
  }
  if (revoke) URL.revokeObjectURL(revoke);
  if (!width || !height) {
    throw new TryOnError(ErrorCode.ASSET_LOAD_FAILED, 'The photo has no pixels.');
  }
  const scale = Math.min(1, MAX_IMAGE_SIZE / Math.max(width, height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new TryOnError(ErrorCode.UNKNOWN, '2D canvas is not available.');
  ctx.drawImage(drawable, 0, 0, canvas.width, canvas.height);
  return {
    kind: 'image',
    element: canvas,
    width: canvas.width,
    height: canvas.height,
    facing: null,
    stop() {
      canvas.width = 0;
      canvas.height = 0;
      canvas.remove();
    },
  };
}

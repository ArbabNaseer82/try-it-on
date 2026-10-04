import { ErrorCode, TryOnError } from '@tryonit/core';

export interface SnapshotLayer {
  element: CanvasImageSource;
  visible: boolean;
}

/**
 * Composites the visible stage layers into one image. Call it right after a render so WebGL
 * drawing buffers are still intact (no preserveDrawingBuffer needed).
 */
export async function snapshot(
  layers: SnapshotLayer[],
  width: number,
  height: number,
  options: { mirror: boolean; type: string; quality: number },
): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new TryOnError(ErrorCode.UNKNOWN, '2D canvas is not available for capture.');
  if (options.mirror) {
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
  }
  for (const layer of layers) {
    if (layer.visible) ctx.drawImage(layer.element, 0, 0, width, height);
  }
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        canvas.width = 0;
        canvas.height = 0;
        if (blob) resolve(blob);
        else reject(new TryOnError(ErrorCode.UNKNOWN, 'Capture failed.'));
      },
      options.type,
      options.quality,
    );
  });
}

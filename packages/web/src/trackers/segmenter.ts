import type { MaskResult } from '@tryonit/core';
import type { ImageSegmenter } from '@mediapipe/tasks-vision';
import { fetchModel } from './model-cache';
import type { RunningMode, Tracker, TrackerFactoryOptions } from './tracker.interface';
import { createWithFallback, getVisionRuntime } from './vision-runtime';

/**
 * Hair segmentation with the MediaPipe hair segmenter. Confidence masks are converted to a
 * compact 8 bit mask so the result can outlive the MediaPipe callback and be uploaded as an
 * R8 texture.
 */
export async function createSegmenter(
  options: TrackerFactoryOptions,
): Promise<Tracker<'segmenter'>> {
  const [{ vision, fileset }, model] = await Promise.all([
    getVisionRuntime(options.wasmBaseUrl),
    fetchModel(options.modelUrl),
  ]);
  let mode: RunningMode = options.mode;
  const { task, delegate } = await createWithFallback<ImageSegmenter>(options.delegate, (d) =>
    vision.ImageSegmenter.createFromOptions(fileset, {
      baseOptions: { modelAssetBuffer: model, delegate: d },
      runningMode: mode,
      outputConfidenceMasks: true,
      outputCategoryMask: false,
    }),
  );
  const labels = task.getLabels().map((l) => l.toLowerCase());
  const labelIndex = labels.findIndex((l) => l.includes('hair'));
  let buffer = new Uint8Array(0);
  return {
    kind: 'segmenter',
    delegate,
    detect(input, timestampMs): MaskResult | null {
      const result =
        mode === 'VIDEO' ? task.segmentForVideo(input, timestampMs) : task.segment(input);
      try {
        const masks = result.confidenceMasks;
        if (!masks || masks.length === 0) return null;
        // Two class models are [background, hair]. Fall back to the last mask otherwise.
        const mask = masks[labelIndex >= 0 ? labelIndex : masks.length - 1];
        if (!mask) return null;
        const values = mask.getAsFloat32Array();
        if (buffer.length !== values.length) buffer = new Uint8Array(values.length);
        for (let i = 0; i < values.length; i++) {
          const v = values[i] ?? 0;
          buffer[i] = v <= 0 ? 0 : v >= 1 ? 255 : (v * 255) | 0;
        }
        return { width: mask.width, height: mask.height, data: buffer };
      } finally {
        result.close();
      }
    },
    async setMode(next) {
      if (next === mode) return;
      mode = next;
      await task.setOptions({ runningMode: next });
    },
    close() {
      task.close();
    },
  };
}

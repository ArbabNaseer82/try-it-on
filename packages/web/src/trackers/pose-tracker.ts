import type { PoseResult } from '@tryonit/core';
import type { PoseLandmarker } from '@mediapipe/tasks-vision';
import { fetchModel } from './model-cache';
import type { RunningMode, Tracker, TrackerFactoryOptions } from './tracker.interface';
import { createWithFallback, getVisionRuntime } from './vision-runtime';

/**
 * Pose Landmarker (lite model) for clothing. Also returns the person segmentation mask, which
 * fitted garments use to follow the outline of the body.
 */
export async function createPoseTracker(options: TrackerFactoryOptions): Promise<Tracker<'pose'>> {
  const [{ vision, fileset }, model] = await Promise.all([
    getVisionRuntime(options.wasmBaseUrl),
    fetchModel(options.modelUrl),
  ]);
  let mode: RunningMode = options.mode;
  let buffer = new Uint8Array(0);
  const { task, delegate } = await createWithFallback<PoseLandmarker>(options.delegate, (d) =>
    vision.PoseLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetBuffer: model, delegate: d },
      runningMode: mode,
      numPoses: 1,
      outputSegmentationMasks: true,
    }),
  );
  return {
    kind: 'pose',
    delegate,
    detect(input, timestampMs): PoseResult | null {
      const result =
        mode === 'VIDEO' ? task.detectForVideo(input, timestampMs) : task.detect(input);
      try {
        const landmarks = result.landmarks[0];
        const worldLandmarks = result.worldLandmarks[0];
        if (!landmarks || !worldLandmarks) return null;
        const mask = result.segmentationMasks?.[0];
        if (!mask) return { landmarks, worldLandmarks, mask: null };
        const values = mask.getAsFloat32Array();
        if (buffer.length !== values.length) buffer = new Uint8Array(values.length);
        for (let i = 0; i < values.length; i++) {
          const v = values[i] ?? 0;
          buffer[i] = v <= 0 ? 0 : v >= 1 ? 255 : (v * 255) | 0;
        }
        return {
          landmarks,
          worldLandmarks,
          mask: { width: mask.width, height: mask.height, data: buffer },
        };
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

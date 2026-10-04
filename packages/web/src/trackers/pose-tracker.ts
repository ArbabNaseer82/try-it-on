import type { PoseResult } from '@tryonit/core';
import type { PoseLandmarker } from '@mediapipe/tasks-vision';
import { fetchModel } from './model-cache';
import type { RunningMode, Tracker, TrackerFactoryOptions } from './tracker.interface';
import { createWithFallback, getVisionRuntime } from './vision-runtime';

/** Pose Landmarker (lite model) for the experimental clothing overlay. */
export async function createPoseTracker(options: TrackerFactoryOptions): Promise<Tracker<'pose'>> {
  const [{ vision, fileset }, model] = await Promise.all([
    getVisionRuntime(options.wasmBaseUrl),
    fetchModel(options.modelUrl),
  ]);
  let mode: RunningMode = options.mode;
  const { task, delegate } = await createWithFallback<PoseLandmarker>(options.delegate, (d) =>
    vision.PoseLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetBuffer: model, delegate: d },
      runningMode: mode,
      numPoses: 1,
      outputSegmentationMasks: false,
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
        return { landmarks, worldLandmarks };
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

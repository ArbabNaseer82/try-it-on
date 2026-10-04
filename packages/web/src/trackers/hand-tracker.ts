import type { HandResult } from '@tryonit/core';
import type { HandLandmarker } from '@mediapipe/tasks-vision';
import { fetchModel } from './model-cache';
import type { RunningMode, Tracker, TrackerFactoryOptions } from './tracker.interface';
import { createWithFallback, getVisionRuntime } from './vision-runtime';

/** Hand Landmarker with world landmarks, one hand by default. */
export async function createHandTracker(
  options: TrackerFactoryOptions & { numHands?: number },
): Promise<Tracker<'hand'>> {
  const [{ vision, fileset }, model] = await Promise.all([
    getVisionRuntime(options.wasmBaseUrl),
    fetchModel(options.modelUrl),
  ]);
  let mode: RunningMode = options.mode;
  const { task, delegate } = await createWithFallback<HandLandmarker>(options.delegate, (d) =>
    vision.HandLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetBuffer: model, delegate: d },
      runningMode: mode,
      numHands: options.numHands ?? 1,
      minHandDetectionConfidence: 0.5,
      minHandPresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    }),
  );
  return {
    kind: 'hand',
    delegate,
    detect(input, timestampMs): HandResult | null {
      const result =
        mode === 'VIDEO' ? task.detectForVideo(input, timestampMs) : task.detect(input);
      const landmarks = result.landmarks[0];
      const worldLandmarks = result.worldLandmarks[0];
      if (!landmarks || !worldLandmarks) return null;
      const label = result.handedness[0]?.[0]?.categoryName;
      return { landmarks, worldLandmarks, handedness: label === 'Left' ? 'Left' : 'Right' };
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

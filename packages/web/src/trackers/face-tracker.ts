import type { FaceResult } from '@tryonit/core';
import type { FaceLandmarker } from '@mediapipe/tasks-vision';
import { fetchModel } from './model-cache';
import type { RunningMode, Tracker, TrackerFactoryOptions } from './tracker.interface';
import { createWithFallback, getVisionRuntime } from './vision-runtime';

/** Face Landmarker (478 points with irises) plus the facial transformation matrix. */
export async function createFaceTracker(options: TrackerFactoryOptions): Promise<Tracker<'face'>> {
  const [{ vision, fileset }, model] = await Promise.all([
    getVisionRuntime(options.wasmBaseUrl),
    fetchModel(options.modelUrl),
  ]);
  let mode: RunningMode = options.mode;
  const { task, delegate } = await createWithFallback<FaceLandmarker>(options.delegate, (d) =>
    vision.FaceLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetBuffer: model, delegate: d },
      runningMode: mode,
      numFaces: 1,
      minFaceDetectionConfidence: 0.5,
      minFacePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
      outputFaceBlendshapes: false,
      outputFacialTransformationMatrixes: true,
    }),
  );
  return {
    kind: 'face',
    delegate,
    detect(input, timestampMs): FaceResult | null {
      const result =
        mode === 'VIDEO' ? task.detectForVideo(input, timestampMs) : task.detect(input);
      const landmarks = result.faceLandmarks[0];
      if (!landmarks || landmarks.length === 0) return null;
      const matrix = result.facialTransformationMatrixes[0]?.data;
      return { landmarks, matrix: matrix ? Array.from(matrix) : null };
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

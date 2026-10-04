import type { TrackerKind } from '@tryonit/core';
import type { Tracker, TrackerFactoryOptions } from './tracker.interface';

/**
 * Lazily imports the adapter for one tracker kind. Each adapter is its own chunk, and none of
 * them is loaded until an asset needs it.
 */
export async function createTracker(
  kind: TrackerKind,
  options: TrackerFactoryOptions,
): Promise<Tracker> {
  switch (kind) {
    case 'face':
      return (await import('./face-tracker')).createFaceTracker(options);
    case 'hand':
      return (await import('./hand-tracker')).createHandTracker(options);
    case 'pose':
      return (await import('./pose-tracker')).createPoseTracker(options);
    case 'segmenter':
      return (await import('./segmenter')).createSegmenter(options);
  }
}

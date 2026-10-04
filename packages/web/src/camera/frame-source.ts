import type { CameraFacing, FrameSourceKind } from '@tryonit/core';

/** Anything the engine can track and render: a live camera or a still photo. */
export interface FrameSource {
  readonly kind: FrameSourceKind;
  /** Element shown as the background layer and fed to the trackers. */
  readonly element: HTMLVideoElement | HTMLCanvasElement;
  readonly width: number;
  readonly height: number;
  readonly facing: CameraFacing | null;
  /** Stops camera tracks or frees the image. */
  stop(): void;
}

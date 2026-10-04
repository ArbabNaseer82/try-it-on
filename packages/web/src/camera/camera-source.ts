import { ErrorCode, TryOnError, type CameraFacing } from '@tryonit/core';
import type { FrameSource } from './frame-source';

export interface CameraOptions {
  facing?: CameraFacing;
  /** Ideal capture width. Default 1280. */
  width?: number;
  /** Ideal capture height. Default 720. */
  height?: number;
  deviceId?: string;
}

export interface CameraSource extends FrameSource {
  readonly kind: 'camera';
  readonly element: HTMLVideoElement;
  readonly stream: MediaStream;
}

/** Maps getUserMedia DOMExceptions to stable TryOnIt error codes. */
export function mapCameraError(error: unknown): TryOnError {
  const name =
    error instanceof Error || (typeof error === 'object' && error !== null && 'name' in error)
      ? String((error as { name: unknown }).name)
      : '';
  switch (name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
    case 'SecurityError':
      return new TryOnError(ErrorCode.CAMERA_DENIED, 'Camera permission was denied.', {
        cause: error,
      });
    case 'NotFoundError':
    case 'DevicesNotFoundError':
    case 'OverconstrainedError':
      return new TryOnError(ErrorCode.CAMERA_NOT_FOUND, 'No camera was found.', { cause: error });
    case 'NotReadableError':
    case 'TrackStartError':
    case 'AbortError':
      return new TryOnError(ErrorCode.CAMERA_IN_USE, 'The camera is in use by another app.', {
        cause: error,
      });
    default:
      return new TryOnError(ErrorCode.UNKNOWN, 'Could not start the camera.', { cause: error });
  }
}

function stopStream(stream: MediaStream): void {
  for (const track of stream.getTracks()) track.stop();
}

async function waitForVideo(video: HTMLVideoElement): Promise<void> {
  if (video.readyState >= 2 && video.videoWidth > 0) return;
  await new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      video.removeEventListener('loadeddata', onReady);
      video.removeEventListener('error', onError);
    };
    const onReady = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new TryOnError(ErrorCode.UNKNOWN, 'The camera stream could not be played.'));
    };
    video.addEventListener('loadeddata', onReady);
    video.addEventListener('error', onError);
  });
}

/** Opens the camera and returns a playing, muted, inline video element. */
export async function openCamera(options: CameraOptions = {}): Promise<CameraSource> {
  const facing = options.facing ?? 'user';
  const constraints: MediaStreamConstraints = {
    audio: false,
    video: {
      ...(options.deviceId ? { deviceId: { exact: options.deviceId } } : { facingMode: facing }),
      width: { ideal: options.width ?? 1280 },
      height: { ideal: options.height ?? 720 },
      frameRate: { ideal: 30, max: 30 },
    },
  };
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia(constraints);
  } catch (error) {
    throw mapCameraError(error);
  }
  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.autoplay = true;
  video.setAttribute('playsinline', '');
  video.setAttribute('muted', '');
  video.srcObject = stream;
  try {
    await video.play().catch(() => undefined);
    await waitForVideo(video);
  } catch (error) {
    stopStream(stream);
    throw error;
  }
  const settings = stream.getVideoTracks()[0]?.getSettings();
  const resolvedFacing: CameraFacing =
    settings?.facingMode === 'environment'
      ? 'environment'
      : settings?.facingMode === 'user'
        ? 'user'
        : facing;
  let stopped = false;
  return {
    kind: 'camera',
    element: video,
    stream,
    get width() {
      return video.videoWidth;
    },
    get height() {
      return video.videoHeight;
    },
    facing: resolvedFacing,
    stop() {
      if (stopped) return;
      stopped = true;
      stopStream(stream);
      video.pause();
      video.srcObject = null;
      video.remove();
    },
  };
}

/** Number of video inputs (labels require permission). Returns 0 when unknown. */
export async function countCameras(): Promise<number> {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter((d) => d.kind === 'videoinput').length;
  } catch {
    return 0;
  }
}

import { ErrorCode, TryOnError } from '@tryonit/core';
import type * as Vision from '@mediapipe/tasks-vision';

export type VisionModule = typeof Vision;
export type WasmFileset = Awaited<ReturnType<VisionModule['FilesetResolver']['forVisionTasks']>>;

let modulePromise: Promise<VisionModule> | null = null;
const filesets = new Map<string, Promise<WasmFileset>>();

/** Lazily imports `@mediapipe/tasks-vision`. Only called when an asset needs tracking. */
export function loadVisionModule(): Promise<VisionModule> {
  if (!modulePromise) {
    modulePromise = import('@mediapipe/tasks-vision').catch((error: unknown) => {
      modulePromise = null;
      throw new TryOnError(ErrorCode.MODEL_LOAD_FAILED, 'Failed to load the MediaPipe runtime.', {
        cause: error,
      });
    });
  }
  return modulePromise;
}

/** Single shared wasm fileset per base URL. */
export async function getVisionRuntime(
  wasmBaseUrl: string,
): Promise<{ vision: VisionModule; fileset: WasmFileset }> {
  const vision = await loadVisionModule();
  let pending = filesets.get(wasmBaseUrl);
  if (!pending) {
    pending = vision.FilesetResolver.forVisionTasks(wasmBaseUrl.replace(/\/+$/, '')).catch(
      (error: unknown) => {
        filesets.delete(wasmBaseUrl);
        throw new TryOnError(
          ErrorCode.MODEL_LOAD_FAILED,
          'Failed to load the MediaPipe wasm files.',
          {
            cause: error,
          },
        );
      },
    );
    filesets.set(wasmBaseUrl, pending);
  }
  return { vision, fileset: await pending };
}

/**
 * Creates a MediaPipe task on the GPU delegate and falls back to CPU automatically when the
 * GPU path fails (old drivers, blocked WebGL in some embedded browsers).
 */
export async function createWithFallback<T>(
  preference: 'GPU' | 'CPU' | 'auto',
  create: (delegate: 'GPU' | 'CPU') => Promise<T>,
): Promise<{ task: T; delegate: 'GPU' | 'CPU' }> {
  if (preference === 'CPU') return { task: await create('CPU'), delegate: 'CPU' };
  try {
    return { task: await create('GPU'), delegate: 'GPU' };
  } catch (gpuError) {
    if (preference === 'GPU') {
      throw new TryOnError(ErrorCode.TRACKER_FAILED, 'GPU tracker could not be created.', {
        cause: gpuError,
      });
    }
    try {
      return { task: await create('CPU'), delegate: 'CPU' };
    } catch (cpuError) {
      throw new TryOnError(ErrorCode.TRACKER_FAILED, 'Tracker could not be created.', {
        cause: cpuError,
      });
    }
  }
}

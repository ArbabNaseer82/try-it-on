import { ErrorCode, TryOnError } from '@tryonit/core';

const buffers = new Map<string, Promise<Uint8Array>>();

/**
 * Downloads a model file once and keeps the bytes in memory, so `preloadTryOn()` and every
 * engine instance share the same download. Use `clearModelCache()` to free memory.
 */
export function fetchModel(url: string): Promise<Uint8Array> {
  let pending = buffers.get(url);
  if (!pending) {
    pending = fetch(url)
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return new Uint8Array(await response.arrayBuffer());
      })
      .catch((error: unknown) => {
        buffers.delete(url);
        throw new TryOnError(ErrorCode.MODEL_LOAD_FAILED, `Failed to load model "${url}".`, {
          cause: error,
        });
      });
    buffers.set(url, pending);
  }
  return pending;
}

/** Frees cached model bytes. Running engines keep working. */
export function clearModelCache(): void {
  buffers.clear();
}

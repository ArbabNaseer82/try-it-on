import { useEffect, useState } from 'react';
import { resolveAsset, type AssetManifest, type AssetSource } from '@tryonit/web';

/** Resolves a list of sources (objects, URLs, loaders) into manifests for the switcher. */
export function useResolvedAssets(
  sources: readonly AssetSource[],
  onError?: (error: unknown) => void,
): AssetManifest[] {
  const [assets, setAssets] = useState<AssetManifest[]>([]);
  const key = sources
    .map((s) => (typeof s === 'string' ? s : typeof s === 'function' ? 'fn' : s.id))
    .join('|');
  useEffect(() => {
    const controller = new AbortController();
    Promise.all(
      sources.map((source) =>
        resolveAsset(source, { signal: controller.signal, baseUrl: location.href }).catch(
          (error: unknown) => {
            if (!controller.signal.aborted) onError?.(error);
            return null;
          },
        ),
      ),
    ).then((list) => {
      if (!controller.signal.aborted) setAssets(list.filter((a): a is AssetManifest => a !== null));
    });
    return () => controller.abort();
    // `key` captures the identity of the sources list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return assets;
}

import {
  resolveAsset,
  type AbortSignalLike,
  type AssetManifest,
  type AssetSource,
} from '@tryonit/core';

/**
 * Resolves an asset on the React Native side (validation, URL fetch, async loaders) so the
 * camera view receives a ready manifest. Relative file paths inside a manifest loaded from a
 * URL are resolved against that URL. Manifests passed as objects must use absolute URLs.
 */
export function resolveNativeAsset(
  source: AssetSource,
  signal?: AbortSignalLike,
): Promise<AssetManifest> {
  if (typeof source === 'string' && !/^https?:\/\//i.test(source)) {
    return Promise.reject(
      new Error(`Asset URL "${source}" must be absolute (https://...) in React Native.`),
    );
  }
  return resolveAsset(source, signal ? { signal } : {});
}

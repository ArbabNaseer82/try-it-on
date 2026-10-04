import { useCallback, useEffect } from 'react';
import type { AssetSource } from '@tryonit/web';
import { useTryOnContext } from '../provider/contexts';
import { useTryOnState } from './useTryOnState';

/**
 * Current asset state. When `source` is given, it is loaded into the engine and reloaded
 * whenever it changes (pass a stable value: a URL string, a memoized object or loader).
 */
export function useAsset(source?: AssetSource | null) {
  const { holder } = useTryOnContext();
  const asset = useTryOnState((s) => s.asset);
  const loading = useTryOnState((s) => s.assetLoading);
  const variantId = useTryOnState((s) => s.variantId);
  const error = useTryOnState((s) => s.error);
  useEffect(() => {
    if (source === undefined) return;
    holder
      .get()
      .setAsset(source)
      .catch(() => undefined);
  }, [holder, source]);
  const setVariant = useCallback((id: string) => holder.get().setVariant(id), [holder]);
  return { asset, loading, variantId, error, setVariant };
}

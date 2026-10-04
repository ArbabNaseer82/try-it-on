import { useCallback, useEffect, useState } from 'react';
import type { CaptureOptions } from '@tryonit/web';
import { useTryOnContext } from '../provider/contexts';

export interface CaptureResult {
  blob: Blob;
  /** Object URL for previews and downloads. Revoked automatically. */
  url: string;
}

/** Takes photos of the try-on view and manages preview URLs. */
export function useCapture() {
  const { holder } = useTryOnContext();
  const [last, setLast] = useState<CaptureResult | null>(null);
  useEffect(
    () => () => {
      if (last) URL.revokeObjectURL(last.url);
    },
    [last],
  );
  const capture = useCallback(
    async (options?: CaptureOptions) => {
      const blob = await holder.get().capture(options);
      const result = { blob, url: URL.createObjectURL(blob) };
      setLast(result);
      return result;
    },
    [holder],
  );
  const clear = useCallback(() => setLast(null), []);
  return { capture, last, clear };
}

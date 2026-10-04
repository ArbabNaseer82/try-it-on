import { useCallback } from 'react';
import { shallowEqual } from '@tryonit/web';
import { useTryOnContext } from '../provider/contexts';
import { useTryOnState } from './useTryOnState';

/** Camera facing, source and mirroring, plus `switchCamera`. */
export function useCamera() {
  const { holder } = useTryOnContext();
  const camera = useTryOnState((s) => s.camera, shallowEqual);
  const switchCamera = useCallback(() => holder.get().switchCamera(), [holder]);
  return { ...camera, isCamera: camera.source === 'camera', switchCamera };
}

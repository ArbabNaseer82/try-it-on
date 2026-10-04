import { useTryOnContext } from '../../provider/contexts';
import { useCamera } from '../../hooks/useCamera';
import { cx } from '../../utils/cx';

export interface CameraSwitchProps {
  className?: string;
}

/** Toggles front and rear cameras. Hidden in photo mode. */
export function CameraSwitch({ className }: CameraSwitchProps) {
  const { labels, icons } = useTryOnContext();
  const { isCamera, switchCamera } = useCamera();
  if (!isCamera) return null;
  const Icon = icons.switchCamera;
  return (
    <button
      type="button"
      className={cx('toi-btn', 'toi-icon-btn', className)}
      aria-label={labels.switchCamera}
      onClick={() => switchCamera().catch(() => undefined)}
    >
      <Icon />
    </button>
  );
}

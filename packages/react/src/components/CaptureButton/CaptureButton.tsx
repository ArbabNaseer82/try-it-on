import { useState } from 'react';
import type { CaptureOptions } from '@tryonit/web';
import { useTryOnContext } from '../../provider/contexts';
import { useTryOnState } from '../../hooks/useTryOnState';
import { cx } from '../../utils/cx';

export interface CaptureButtonProps {
  className?: string;
  options?: CaptureOptions;
  onCapture?: (blob: Blob) => void;
  onError?: (error: unknown) => void;
}

/** Big round shutter button. Disabled until the session is running. */
export function CaptureButton({ className, options, onCapture, onError }: CaptureButtonProps) {
  const { holder, labels, icons } = useTryOnContext();
  const running = useTryOnState((s) => s.status === 'running');
  const [busy, setBusy] = useState(false);
  const Icon = icons.capture;
  return (
    <button
      type="button"
      className={cx('toi-btn', 'toi-capture', className)}
      aria-label={labels.capture}
      disabled={!running || busy}
      onClick={async () => {
        setBusy(true);
        try {
          onCapture?.(await holder.get().capture(options));
        } catch (error) {
          onError?.(error);
        } finally {
          setBusy(false);
        }
      }}
    >
      <Icon size={28} />
    </button>
  );
}

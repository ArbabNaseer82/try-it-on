import { useEffect, useState } from 'react';
import type { SessionState } from '@tryonit/web';
import { useTryOnContext } from '../../provider/contexts';
import { useTryOnState } from '../../hooks/useTryOnState';
import { cx } from '../../utils/cx';
import { Loader, type LoaderProps } from '../shared/Loader';
import { PhotoUpload } from '../shared/PhotoUpload';
import type { ComponentType } from 'react';

export interface StatusOverlayProps {
  className?: string;
  Loader?: ComponentType<LoaderProps>;
  /** Delay before showing "look at the camera" style hints. Default 1000 ms. */
  hintDelayMs?: number;
}

type Hint = 'noFace' | 'noHand' | 'noBody' | null;

function hintFor(state: SessionState): Hint {
  if (state.status !== 'running' || !state.asset || state.assetLoading) return null;
  const type = state.asset.type;
  if (type === 'watch' || type === 'ring') return state.tracking.handVisible ? null : 'noHand';
  if (type === 'clothing.top') return state.tracking.bodyVisible ? null : 'noBody';
  return state.tracking.faceVisible ? null : 'noFace';
}

const LOADING = new Set(['checking', 'requesting-camera', 'loading-models']);

/** Loading, tracking hints and errors with retry and photo fallback. Includes a live region. */
export function StatusOverlay({
  className,
  Loader: LoaderSlot = Loader,
  hintDelayMs = 1000,
}: StatusOverlayProps) {
  const { holder, labels, icons } = useTryOnContext();
  const status = useTryOnState((s) => s.status);
  const error = useTryOnState((s) => s.error);
  const loading = useTryOnState((s) => LOADING.has(s.status) || s.assetLoading);
  const hint = useTryOnState(hintFor);
  const [delayed, setDelayed] = useState<Hint>(null);

  useEffect(() => {
    // Reset immediately when the hint goes away, show it again only after the delay.
    const timer = setTimeout(() => setDelayed(hint), hint ? hintDelayMs : 0);
    return () => clearTimeout(timer);
  }, [hint, hintDelayMs]);
  const showHint = hint && delayed === hint ? hint : null;

  const announcement = error
    ? labels.errors[error.code]
    : loading
      ? labels.loading
      : showHint
        ? labels[showHint]
        : status === 'running'
          ? labels.ready
          : '';
  const Warning = icons.warning;

  return (
    <div
      className={cx('toi-status', className)}
      data-state={error ? 'error' : loading ? 'loading' : showHint ? 'hint' : 'idle'}
    >
      <span className="toi-sr-only" role="status" aria-live="polite">
        {announcement}
      </span>
      {error ? (
        <div className="toi-status__card" role="alert">
          <Warning className="toi-status__icon" />
          <p className="toi-status__text">{labels.errors[error.code]}</p>
          <div className="toi-status__actions">
            {error.retryable && (
              <button
                type="button"
                className="toi-btn toi-btn--primary"
                onClick={() =>
                  holder
                    .get()
                    .start()
                    .catch(() => undefined)
                }
              >
                {labels.retry}
              </button>
            )}
            {error.canUsePhotoFallback && <PhotoUpload />}
          </div>
        </div>
      ) : loading ? (
        <div className="toi-status__card toi-status__card--loading">
          <LoaderSlot label={labels.loading} />
          <p className="toi-status__text">{labels.loading}</p>
        </div>
      ) : showHint ? (
        <div className="toi-status__pill">{labels[showHint]}</div>
      ) : null}
    </div>
  );
}

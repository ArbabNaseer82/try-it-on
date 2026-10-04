import { useEffect, useMemo } from 'react';
import { useTryOnContext } from '../../provider/contexts';
import { cx } from '../../utils/cx';

export interface CapturePreviewProps {
  blob: Blob;
  onClose: () => void;
  className?: string;
  fileName?: string;
}

/** Shows the captured photo with download, share (when supported) and retake actions. */
export function CapturePreview({
  blob,
  onClose,
  className,
  fileName = 'try-on.png',
}: CapturePreviewProps) {
  const { labels, icons } = useTryOnContext();
  const url = useMemo(() => URL.createObjectURL(blob), [blob]);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);
  const file = typeof File !== 'undefined' ? new File([blob], fileName, { type: blob.type }) : null;
  const canShare =
    !!file && typeof navigator !== 'undefined' && !!navigator.canShare?.({ files: [file] });
  const Download = icons.download;
  const Share = icons.share;
  const Retry = icons.retry;
  return (
    <div className={cx('toi-preview', className)} role="group" aria-label={labels.captured}>
      <img className="toi-preview__img" src={url} alt={labels.captured} />
      <div className="toi-preview__actions">
        <button type="button" className="toi-btn toi-btn--secondary" onClick={onClose}>
          <Retry size={18} /> {labels.retake}
        </button>
        <a className="toi-btn toi-btn--primary" href={url} download={fileName}>
          <Download size={18} /> {labels.download}
        </a>
        {canShare && file && (
          <button
            type="button"
            className="toi-btn toi-btn--secondary"
            onClick={() => navigator.share({ files: [file] }).catch(() => undefined)}
          >
            <Share size={18} /> {labels.share}
          </button>
        )}
      </div>
    </div>
  );
}

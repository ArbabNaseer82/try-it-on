import type { ChangeEvent, ReactNode } from 'react';
import { useTryOnContext } from '../../provider/contexts';
import { cx } from '../../utils/cx';

export interface PhotoUploadProps {
  className?: string;
  children?: ReactNode;
  onError?: (error: unknown) => void;
}

/** Accessible file picker that switches the session to photo mode. */
export function PhotoUpload({ className, children, onError }: PhotoUploadProps) {
  const { holder, labels } = useTryOnContext();
  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file)
      holder
        .get()
        .startFromImage(file)
        .catch((e: unknown) => onError?.(e));
  };
  return (
    <label className={cx('toi-btn', 'toi-btn--secondary', 'toi-upload', className)}>
      <input type="file" accept="image/*" className="toi-sr-only" onChange={onChange} />
      {children ?? labels.uploadPhoto}
    </label>
  );
}

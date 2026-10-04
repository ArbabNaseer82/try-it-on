import { useTryOnContext } from '../../provider/contexts';
import { cx } from '../../utils/cx';

export interface LoaderProps {
  className?: string;
  label?: string;
}

/** Spinner, or the `images.loader` image when provided. */
export function Loader({ className, label }: LoaderProps) {
  const { images } = useTryOnContext();
  return images.loader ? (
    <img className={cx('toi-loader-img', className)} src={images.loader} alt={label ?? ''} />
  ) : (
    <span className={cx('toi-loader', className)} aria-hidden="true" />
  );
}

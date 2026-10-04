import { useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { preloadTryOn, type AssetSource } from '@tryonit/web';
import { EnsureProvider } from '../../provider/TryOnProvider';
import { useTryOnContext } from '../../provider/contexts';
import { cx } from '../../utils/cx';
import { TryOn, type TryOnProps } from '../TryOn/TryOn';

export interface TryOnButtonProps extends Omit<TryOnProps, 'layout' | 'open' | 'onOpenChange'> {
  /** Button text. Defaults to `labels.open`. */
  children?: ReactNode;
  /** Dialog style. Default `modal`. */
  layout?: 'modal' | 'fullscreen';
  /** Warm models in the background: on `hover` (default), when `visible`, or `none`. */
  preload?: 'hover' | 'visible' | 'none';
  buttonClassName?: string;
  buttonProps?: Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick' | 'children'>;
  onOpenChange?: (open: boolean) => void;
}

function TryOnButtonInner({
  children,
  layout = 'modal',
  preload = 'hover',
  buttonClassName,
  buttonProps,
  onOpenChange,
  ...tryOnProps
}: TryOnButtonProps) {
  const { labels, icons, engineOptions, rootStyle, themeMode, dir } = useTryOnContext();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
  const preloaded = useRef(false);
  const sources: AssetSource[] =
    tryOnProps.assets ?? (tryOnProps.asset !== undefined ? [tryOnProps.asset] : []);

  const warm = () => {
    if (preloaded.current || preload === 'none' || sources.length === 0) return;
    preloaded.current = true;
    void preloadTryOn(sources, {
      ...(engineOptions.modelBaseUrl ? { modelBaseUrl: engineOptions.modelBaseUrl } : {}),
      ...(engineOptions.wasmBaseUrl ? { wasmBaseUrl: engineOptions.wasmBaseUrl } : {}),
      ...(engineOptions.models ? { models: engineOptions.models } : {}),
    });
  };

  useEffect(() => {
    if (preload !== 'visible' || !ref.current || typeof IntersectionObserver === 'undefined')
      return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        warm();
        observer.disconnect();
      }
    });
    observer.observe(ref.current);
    return () => observer.disconnect();
    // warm reads refs only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preload]);

  const setOpenState = (next: boolean) => {
    setOpen(next);
    onOpenChange?.(next);
  };
  const Camera = icons.camera;

  return (
    <>
      <span
        className={cx('toi-root', 'toi-trigger-root', tryOnProps.unstyled && 'toi-unstyled')}
        style={rootStyle}
        data-theme-mode={themeMode}
        dir={dir}
      >
        <button
          ref={ref}
          type="button"
          className={cx('toi-btn', 'toi-trigger', buttonClassName)}
          aria-haspopup="dialog"
          aria-expanded={open}
          onPointerEnter={preload === 'hover' ? warm : undefined}
          onFocus={preload === 'hover' ? warm : undefined}
          onClick={() => setOpenState(true)}
          {...buttonProps}
        >
          <Camera size={20} />
          <span>{children ?? labels.open}</span>
        </button>
      </span>
      <TryOn {...tryOnProps} layout={layout} open={open} onOpenChange={setOpenState} />
    </>
  );
}

/**
 * Drop in button that opens the try-on dialog. Works without a provider.
 *
 * @example
 * import { TryOnButton } from '@tryonit/react';
 * import '@tryonit/react/styles.css';
 * <TryOnButton asset="/assets/aviator.json" />
 */
export function TryOnButton(props: TryOnButtonProps) {
  const { theme, icons, labels, images, engineOptions, dir, engine } = props;
  return (
    <EnsureProvider {...{ theme, icons, labels, images, engineOptions, dir, engine }}>
      <TryOnButtonInner {...props} />
    </EnsureProvider>
  );
}

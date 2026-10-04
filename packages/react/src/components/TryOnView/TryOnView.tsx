import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import type { AssetSource } from '@tryonit/web';
import { useTryOnContext } from '../../provider/contexts';
import { cx } from '../../utils/cx';

export interface TryOnViewProps {
  className?: string;
  stageClassName?: string;
  style?: CSSProperties;
  /** Start the camera on mount. Default true. */
  autoStart?: boolean;
  /** Asset to show. Pass a stable value (URL string or memoized object). */
  asset?: AssetSource | null;
  /** Stop the camera when unmounted (keeps models warm). Default true. */
  stopOnUnmount?: boolean;
  /** Overlays rendered above the camera stage. */
  children?: ReactNode;
}

/** Camera and canvas stage only. Put your own overlays inside as children. */
export function TryOnView({
  className,
  stageClassName,
  style,
  autoStart = true,
  asset,
  stopOnUnmount = true,
  children,
}: TryOnViewProps) {
  const { holder } = useTryOnContext();
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const engine = holder.get();
    engine.attach(stageRef.current);
    if (autoStart) engine.start().catch(() => undefined);
    return () => {
      const current = holder.peek();
      if (!current) return;
      if (stopOnUnmount) current.stop();
      current.attach(null);
    };
  }, [holder, autoStart, stopOnUnmount]);

  useEffect(() => {
    if (asset === undefined) return;
    holder
      .get()
      .setAsset(asset)
      .catch(() => undefined);
  }, [holder, asset]);

  return (
    <div className={cx('toi-view', className)} style={style}>
      <div ref={stageRef} className={cx('toi-view__stage', stageClassName)} />
      {children}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useTryOnContext } from '../../provider/contexts';
import { cx } from '../../utils/cx';

export interface CompareSliderProps {
  className?: string;
  /** Initial divider position in percent. Default 50. */
  defaultValue?: number;
}

/** Before and after split view. Left of the divider is the plain camera, right is the product. */
export function CompareSlider({ className, defaultValue = 50 }: CompareSliderProps) {
  const { holder, labels } = useTryOnContext();
  const [value, setValue] = useState(defaultValue);
  useEffect(() => {
    holder.peek()?.setCompare(value / 100);
  }, [holder, value]);
  useEffect(() => () => holder.peek()?.setCompare(null), [holder]);
  return (
    <div className={cx('toi-compare', className)}>
      <div
        className="toi-compare__line"
        style={{ insetInlineStart: `${value}%` }}
        aria-hidden="true"
      />
      <input
        className="toi-compare__input"
        type="range"
        min={0}
        max={100}
        value={value}
        aria-label={labels.compare}
        onChange={(e) => setValue(Number(e.target.value))}
      />
    </div>
  );
}

import { useId } from 'react';
import { useTryOnContext } from '../../provider/contexts';
import { useTryOnState } from '../../hooks/useTryOnState';
import { cx } from '../../utils/cx';

export interface IntensitySliderProps {
  className?: string;
}

/** Makeup and hair color strength, keyboard operable. */
export function IntensitySlider({ className }: IntensitySliderProps) {
  const { holder, labels } = useTryOnContext();
  const intensity = useTryOnState((s) => s.intensity);
  const id = useId();
  return (
    <div className={cx('toi-intensity', className)}>
      <label htmlFor={id} className="toi-intensity__label">
        {labels.intensity}
      </label>
      <input
        id={id}
        className="toi-range"
        type="range"
        min={0}
        max={100}
        value={Math.round(intensity * 100)}
        aria-valuetext={`${Math.round(intensity * 100)}%`}
        onChange={(e) => holder.get().setIntensity(Number(e.target.value) / 100)}
      />
    </div>
  );
}

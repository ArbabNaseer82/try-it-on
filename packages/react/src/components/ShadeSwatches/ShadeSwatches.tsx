import type { Variant } from '@tryonit/web';
import { useTryOnContext } from '../../provider/contexts';
import { useTryOnState } from '../../hooks/useTryOnState';
import { cx } from '../../utils/cx';
import { rovingKeyDown } from '../shared/useRovingFocus';

const EMPTY: Variant[] = [];

export interface ShadeSwatchesProps {
  className?: string;
}

/** Variant picker (shades, colors, frame styles) for the current asset. */
export function ShadeSwatches({ className }: ShadeSwatchesProps) {
  const { holder, labels } = useTryOnContext();
  const variants = useTryOnState((s) => (s.asset?.variants ?? EMPTY) as Variant[]);
  const selected = useTryOnState((s) => s.variantId);
  if (variants.length < 2) return null;
  const select = (i: number) => {
    const v = variants[i];
    if (v)
      holder
        .get()
        .setVariant(v.id)
        .catch(() => undefined);
  };
  return (
    <div className={cx('toi-swatches', className)} role="radiogroup" aria-label={labels.shades}>
      {variants.map((variant, i) => {
        const checked = variant.id === selected;
        return (
          <button
            key={variant.id}
            type="button"
            role="radio"
            aria-checked={checked}
            aria-label={variant.name ?? variant.id}
            title={variant.name ?? variant.id}
            tabIndex={checked || (!selected && i === 0) ? 0 : -1}
            className="toi-swatch"
            style={variant.swatch ? { background: variant.swatch } : undefined}
            onClick={() => select(i)}
            onKeyDown={(e) => rovingKeyDown(e, i, variants.length, select)}
          >
            {variant.thumbnail && <img src={variant.thumbnail} alt="" />}
          </button>
        );
      })}
    </div>
  );
}

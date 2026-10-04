import type { AssetManifest } from '@tryonit/web';
import { useTryOnContext } from '../../provider/contexts';
import { cx } from '../../utils/cx';
import { rovingKeyDown } from '../shared/useRovingFocus';

export interface ProductSwitcherProps {
  assets: AssetManifest[];
  selectedId: string | null;
  onSelect: (asset: AssetManifest) => void;
  className?: string;
}

function initials(asset: AssetManifest): string {
  return (asset.name ?? asset.id).slice(0, 2).toUpperCase();
}

/** Thumbnail strip to switch between products. Arrow keys move the selection. */
export function ProductSwitcher({ assets, selectedId, onSelect, className }: ProductSwitcherProps) {
  const { labels } = useTryOnContext();
  if (assets.length < 2) return null;
  const select = (i: number) => {
    const a = assets[i];
    if (a) onSelect(a);
  };
  return (
    <div className={cx('toi-products', className)} role="radiogroup" aria-label={labels.products}>
      {assets.map((asset, i) => {
        const checked = asset.id === selectedId;
        const swatch = 'color' in asset ? asset.color : undefined;
        return (
          <button
            key={asset.id}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked || (!selectedId && i === 0) ? 0 : -1}
            className="toi-product"
            onClick={() => select(i)}
            onKeyDown={(e) => rovingKeyDown(e, i, assets.length, select)}
          >
            <span
              className="toi-product__thumb"
              style={swatch ? { background: swatch } : undefined}
              aria-hidden="true"
            >
              {asset.thumbnail ? (
                <img src={asset.thumbnail} alt="" />
              ) : swatch ? null : (
                initials(asset)
              )}
            </span>
            <span className="toi-product__name">{asset.name ?? asset.id}</span>
          </button>
        );
      })}
    </div>
  );
}

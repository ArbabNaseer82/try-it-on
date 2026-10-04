import type { AssetManifest, Variant } from '../domain/asset.types';

/** Finds a variant by id, falling back to the default and then the first variant. */
export function findVariant(asset: AssetManifest, variantId?: string | null): Variant | undefined {
  const variants = (asset.variants ?? []) as Variant[];
  return (
    variants.find((v) => v.id === variantId) ??
    variants.find((v) => v.id === asset.defaultVariantId) ??
    variants[0]
  );
}

/** Returns the asset with the selected variant overrides merged in. */
export function applyVariant<T extends AssetManifest>(asset: T, variantId?: string | null): T {
  const variant = findVariant(asset, variantId);
  if (!variant?.overrides) return asset;
  return { ...asset, ...variant.overrides } as T;
}

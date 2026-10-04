import type { AssetManifest, AssetType, MakeupLayer } from '../domain/asset.types';
import { s, type ParseOptions, type Schema, type Shape } from './schema';

const unit = (fallback: number) => s.optional(s.number({ min: 0, max: 1 }), fallback);
const vec2 = s.tuple([s.number(), s.number()]);
const vec3 = s.tuple([s.number(), s.number(), s.number()]);
const url = s.string({ min: 1, max: 4096, url: true });

/** Default values applied during validation. Documented in docs/MANIFEST_SPEC.md. */
export const MANIFEST_DEFAULTS = {
  lips: { opacity: 0.6, finish: 'matte' },
  blush: { opacity: 0.35, size: 0.5 },
  eyeshadow: { opacity: 0.5, finish: 'matte' },
  eyeliner: { opacity: 0.9, thickness: 0.35, wing: false },
  brows: { opacity: 0.4 },
  foundation: { opacity: 0.35, coverage: 0.4 },
  hair: { opacity: 0.55 },
  occlusion: 'head',
  earrings: { side: 'both' },
  watch: { wristWidthMm: 60 },
  ring: { finger: 'ring', sizeMm: 18 },
  overlay2d: { anchor: 'noseBridge', scale: 1, offset: [0, 0], opacity: 1 },
  clothing: { padding: 1.15, opacity: 1 },
} as const;

const D = MANIFEST_DEFAULTS;

export const transformSchema = s.object(
  {
    position: s.optional(vec3),
    rotation: s.optional(vec3),
    scale: s.optional(s.union(s.number({ min: 0 }), vec3)),
  },
  { strict: true },
);

// Prop shapes, reused by standalone assets, makeup look layers and variant overrides.
const lipsShape = {
  color: s.color(),
  opacity: unit(D.lips.opacity),
  finish: s.optional(s.enum(['matte', 'gloss', 'satin', 'shimmer']), D.lips.finish),
};
const blushShape = {
  color: s.color(),
  opacity: unit(D.blush.opacity),
  size: unit(D.blush.size),
};
const eyeshadowShape = {
  color: s.color(),
  opacity: unit(D.eyeshadow.opacity),
  finish: s.optional(s.enum(['matte', 'satin', 'shimmer']), D.eyeshadow.finish),
};
const eyelinerShape = {
  color: s.color(),
  opacity: unit(D.eyeliner.opacity),
  thickness: unit(D.eyeliner.thickness),
  wing: s.optional(s.boolean(), D.eyeliner.wing as boolean),
};
const browsShape = { color: s.color(), opacity: unit(D.brows.opacity) };
const foundationShape = {
  color: s.color(),
  opacity: unit(D.foundation.opacity),
  coverage: unit(D.foundation.coverage),
};
const hairShape = { color: s.color(), opacity: unit(D.hair.opacity) };
const occlusion = s.optional(s.enum(['head', 'none']), D.occlusion);
const modelShape = { model: url, transform: s.optional(transformSchema) };
const glassesShape = { ...modelShape, occlusion };
const hatShape = { ...modelShape, occlusion };
const earringsShape = {
  ...modelShape,
  side: s.optional(s.enum(['both', 'left', 'right']), D.earrings.side),
};
const watchShape = {
  ...modelShape,
  wristWidthMm: s.optional(s.number({ min: 20, max: 150 }), D.watch.wristWidthMm as number),
};
const ringShape = {
  ...modelShape,
  finger: s.optional(s.enum(['index', 'middle', 'ring', 'pinky']), D.ring.finger),
  sizeMm: s.optional(s.number({ min: 8, max: 40 }), D.ring.sizeMm as number),
};
const overlay2dShape = {
  image: url,
  anchor: s.optional(
    s.enum([
      'forehead',
      'eyes',
      'noseBridge',
      'noseTip',
      'mouth',
      'chin',
      'leftCheek',
      'rightCheek',
    ]),
    D.overlay2d.anchor,
  ),
  scale: s.optional(s.number({ min: 0.01, max: 10 }), D.overlay2d.scale as number),
  offset: s.optional(vec2, [0, 0] as [number, number]),
  opacity: unit(D.overlay2d.opacity),
};
const clothingShape = {
  image: url,
  anchors: s.object(
    {
      leftShoulder: vec2,
      rightShoulder: vec2,
      leftHip: vec2,
      rightHip: vec2,
    },
    { strict: true },
  ),
  padding: s.optional(s.number({ min: 0.5, max: 3 }), D.clothing.padding as number),
  opacity: unit(D.clothing.opacity),
};

const layerSchema: Schema<MakeupLayer> = s.discriminatedUnion('type', {
  'makeup.lips': s.object({ type: s.literal('makeup.lips'), ...lipsShape }),
  'makeup.blush': s.object({ type: s.literal('makeup.blush'), ...blushShape }),
  'makeup.eyeshadow': s.object({ type: s.literal('makeup.eyeshadow'), ...eyeshadowShape }),
  'makeup.eyeliner': s.object({ type: s.literal('makeup.eyeliner'), ...eyelinerShape }),
  'makeup.brows': s.object({ type: s.literal('makeup.brows'), ...browsShape }),
  'makeup.foundation': s.object({ type: s.literal('makeup.foundation'), ...foundationShape }),
});
const lookShape = { layers: s.array(layerSchema, { min: 1, max: 12 }) };

function assetSchema<const T extends AssetType, P extends Shape>(type: T, props: P) {
  const variant = s.object({
    id: s.string({ min: 1, max: 200 }),
    name: s.optional(s.string({ max: 200 })),
    swatch: s.optional(s.color()),
    thumbnail: s.optional(url),
    overrides: s.optional(s.partial(s.object(props, { strict: true }))),
  });
  const base = s.object({
    version: s.literal(1),
    id: s.string({ min: 1, max: 200 }),
    type: s.literal(type),
    name: s.optional(s.string({ max: 200 })),
    thumbnail: s.optional(url),
    variants: s.optional(
      s.refine(
        s.array(variant, { max: 200 }),
        (list) => new Set(list.map((v) => v.id)).size === list.length,
        'Variant ids must be unique',
      ),
    ),
    defaultVariantId: s.optional(s.string({ min: 1 })),
    meta: s.optional(s.record(s.unknown())),
    ...props,
  });
  return s.refine(
    base,
    (value) => {
      const asset = value as { defaultVariantId?: string; variants?: { id: string }[] };
      return (
        asset.defaultVariantId === undefined ||
        (asset.variants ?? []).some((v) => v.id === asset.defaultVariantId)
      );
    },
    '`defaultVariantId` must match the id of one of the variants',
  );
}

/** Per type schemas, exported for tooling and the JSON Schema sync test. */
export const assetSchemas = {
  'makeup.lips': assetSchema('makeup.lips', lipsShape),
  'makeup.blush': assetSchema('makeup.blush', blushShape),
  'makeup.eyeshadow': assetSchema('makeup.eyeshadow', eyeshadowShape),
  'makeup.eyeliner': assetSchema('makeup.eyeliner', eyelinerShape),
  'makeup.brows': assetSchema('makeup.brows', browsShape),
  'makeup.foundation': assetSchema('makeup.foundation', foundationShape),
  'makeup.look': assetSchema('makeup.look', lookShape),
  'hair.color': assetSchema('hair.color', hairShape),
  glasses: assetSchema('glasses', glassesShape),
  hat: assetSchema('hat', hatShape),
  earrings: assetSchema('earrings', earringsShape),
  'face.overlay2d': assetSchema('face.overlay2d', overlay2dShape),
  watch: assetSchema('watch', watchShape),
  ring: assetSchema('ring', ringShape),
  'clothing.top': assetSchema('clothing.top', clothingShape),
} as const;

/** Prop shapes keyed by asset type (without the common fields). */
export const assetPropShapes = {
  'makeup.lips': lipsShape,
  'makeup.blush': blushShape,
  'makeup.eyeshadow': eyeshadowShape,
  'makeup.eyeliner': eyelinerShape,
  'makeup.brows': browsShape,
  'makeup.foundation': foundationShape,
  'makeup.look': lookShape,
  'hair.color': hairShape,
  glasses: glassesShape,
  hat: hatShape,
  earrings: earringsShape,
  'face.overlay2d': overlay2dShape,
  watch: watchShape,
  ring: ringShape,
  'clothing.top': clothingShape,
} as const;

/**
 * Runtime schema for any asset manifest v1. The explicit annotation makes the compiler
 * prove that the validator output always matches the public `AssetManifest` type.
 */
export const manifestSchema: Schema<AssetManifest> = s.discriminatedUnion('type', assetSchemas);

/** Every supported `type` value. */
export const ASSET_TYPES = Object.keys(assetSchemas) as AssetType[];

/**
 * Validates an unknown value as an asset manifest. Applies defaults and strips unknown keys.
 * Throws `TryOnError` with code `ASSET_INVALID` and path based issues when invalid.
 */
export function validateManifest(input: unknown, options?: ParseOptions): AssetManifest {
  const label =
    typeof input === 'object' && input !== null && 'id' in input && typeof input.id === 'string'
      ? input.id
      : undefined;
  return manifestSchema.parse(input, { ...options, ...(label ? { label } : {}) });
}

/** Non throwing variant of {@link validateManifest}. */
export function safeValidateManifest(input: unknown, options?: ParseOptions) {
  return manifestSchema.safeParse(input, options);
}

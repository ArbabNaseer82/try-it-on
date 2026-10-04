import { describe, expect, it } from 'vitest';
import { ASSET_TYPES, ErrorCode, TryOnError, safeValidateManifest, validateManifest } from '../src';

const lips = {
  version: 1,
  id: 'ruby',
  type: 'makeup.lips',
  name: 'Ruby',
  color: '#B0123A',
  variants: [
    { id: 'ruby', name: 'Ruby', swatch: '#B0123A' },
    {
      id: 'nude',
      name: 'Nude',
      swatch: '#C48A7A',
      overrides: { color: '#C48A7A', finish: 'gloss' },
    },
  ],
  defaultVariantId: 'nude',
  meta: { sku: 'L-1', price: 19 },
};

describe('validateManifest', () => {
  it('applies defaults', () => {
    const asset = validateManifest(lips);
    expect(asset.type).toBe('makeup.lips');
    if (asset.type !== 'makeup.lips') throw new Error('narrowing');
    expect(asset.opacity).toBe(0.6);
    expect(asset.finish).toBe('matte');
    expect(asset.variants?.[1]?.overrides).toEqual({ color: '#C48A7A', finish: 'gloss' });
    expect(asset.meta).toEqual({ sku: 'L-1', price: 19 });
  });

  it('rejects unknown types with a readable path', () => {
    const result = safeValidateManifest({ ...lips, type: 'makeup.nails' });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.issues[0]?.path).toBe('type');
  });

  it('reports invalid variant colors by path', () => {
    try {
      validateManifest({
        ...lips,
        variants: [{ id: 'a' }, { id: 'b', overrides: { color: 'blue' } }],
        defaultVariantId: undefined,
      });
      expect.unreachable();
    } catch (error) {
      expect((error as TryOnError).code).toBe(ErrorCode.ASSET_INVALID);
      expect((error as TryOnError).issues[0]?.path).toBe('variants[1].overrides.color');
      expect((error as TryOnError).message).toContain('"ruby"');
    }
  });

  it('rejects unknown override keys, duplicate variant ids and bad defaultVariantId', () => {
    expect(
      safeValidateManifest({
        ...lips,
        variants: [{ id: 'a', overrides: { model: 'x' } }],
        defaultVariantId: 'a',
      }).success,
    ).toBe(false);
    expect(
      safeValidateManifest({ ...lips, variants: [{ id: 'a' }, { id: 'a' }], defaultVariantId: 'a' })
        .success,
    ).toBe(false);
    expect(safeValidateManifest({ ...lips, defaultVariantId: 'missing' }).success).toBe(false);
  });

  it('rejects wrong version', () => {
    expect(safeValidateManifest({ ...lips, version: 2 }).success).toBe(false);
  });

  it('validates every asset type', () => {
    const samples: Record<string, Record<string, unknown>> = {
      'makeup.lips': { color: '#f00' },
      'makeup.blush': { color: '#f00' },
      'makeup.eyeshadow': { color: '#f00', finish: 'shimmer' },
      'makeup.eyeliner': { color: '#000', wing: true },
      'makeup.brows': { color: '#321' },
      'makeup.foundation': { color: '#d8b' },
      'makeup.look': {
        layers: [
          { type: 'makeup.lips', color: '#f00' },
          { type: 'makeup.blush', color: '#f88' },
        ],
      },
      'hair.color': { color: '#a52' },
      glasses: { model: '/a.glb', transform: { position: [0, 1, 2], scale: 1.1 } },
      hat: { model: '/hat.glb' },
      earrings: { model: '/e.glb', side: 'left' },
      'face.overlay2d': { image: '/m.png', anchor: 'eyes' },
      watch: { model: '/w.glb' },
      ring: { model: '/r.glb', finger: 'index' },
      'clothing.top': {
        image: '/t.png',
        anchors: { leftShoulder: [1, 2], rightShoulder: [3, 4], leftHip: [5, 6], rightHip: [7, 8] },
      },
    };
    expect(Object.keys(samples).sort()).toEqual([...ASSET_TYPES].sort());
    for (const [type, props] of Object.entries(samples)) {
      const result = safeValidateManifest({ version: 1, id: type, type, ...props });
      expect(result.success, type).toBe(true);
    }
  });

  it('applies defaults for 3D and overlay assets', () => {
    const ring = validateManifest({ version: 1, id: 'r', type: 'ring', model: 'r.glb' });
    if (ring.type !== 'ring') throw new Error('narrowing');
    expect(ring.finger).toBe('ring');
    expect(ring.sizeMm).toBe(18);
    const sticker = validateManifest({
      version: 1,
      id: 's',
      type: 'face.overlay2d',
      image: 's.png',
    });
    if (sticker.type !== 'face.overlay2d') throw new Error('narrowing');
    expect(sticker.offset).toEqual([0, 0]);
  });

  it('rejects invalid look layers and transform keys', () => {
    expect(
      safeValidateManifest({ version: 1, id: 'l', type: 'makeup.look', layers: [] }).success,
    ).toBe(false);
    expect(
      safeValidateManifest({
        version: 1,
        id: 'l',
        type: 'makeup.look',
        layers: [{ type: 'hair.color', color: '#fff' }],
      }).success,
    ).toBe(false);
    expect(
      safeValidateManifest({
        version: 1,
        id: 'g',
        type: 'glasses',
        model: 'a.glb',
        transform: { skew: 1 },
      }).success,
    ).toBe(false);
  });

  it('throws TryOnError for non objects', () => {
    expect(() => validateManifest(null)).toThrow(TryOnError);
    expect(() => validateManifest('x')).toThrow(TryOnError);
  });
});

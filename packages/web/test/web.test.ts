import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ErrorCode, validateManifest, type MakeupLayer } from '@tryonit/core';
import { DEFAULT_MODEL_URLS, MEDIAPIPE_VERSION, getModelUrl } from '../src/config';
import { assertCapabilities, detectCapabilities } from '../src/engine/capabilities';
import { mapCameraError } from '../src/camera/camera-source';
import { AdaptiveRate } from '../src/engine/frame-loop';
import { buildLayerGeometry } from '../src/renderers/makeup-geometry';
import { garmentMesh, stickerQuad } from '../src/renderers/overlay2d-geometry';
import { toMakeupLayers } from '../src/renderers/makeup-renderer';
import { syntheticFace } from './synthetic-face';

describe('config', () => {
  it('pins the wasm URL to the installed MediaPipe version', () => {
    const pkgPath = `${process.cwd()}/node_modules/@mediapipe/tasks-vision/package.json`;
    const installed = JSON.parse(readFileSync(pkgPath, 'utf8')) as { version: string };
    expect(MEDIAPIPE_VERSION).toBe(installed.version);
  });

  it('resolves model URLs', () => {
    expect(getModelUrl('face')).toBe(DEFAULT_MODEL_URLS.face);
    expect(getModelUrl('hand', { modelBaseUrl: '/models/' })).toBe('/models/hand_landmarker.task');
    expect(getModelUrl('pose', { modelBaseUrl: '/m', models: { pose: '/x.task' } })).toBe(
      '/x.task',
    );
  });
});

describe('capabilities', () => {
  it('maps missing features to error codes', () => {
    const base = detectCapabilities();
    expect(base.browser).toBe(true);
    const caps = { ...base, webgl2: true, secureContext: true, camera: true };
    expect(() => assertCapabilities({ ...caps, webgl2: false }, { camera: false })).toThrow(
      expect.objectContaining({ code: ErrorCode.WEBGL_UNSUPPORTED }),
    );
    expect(() => assertCapabilities({ ...caps, secureContext: false }, { camera: true })).toThrow(
      expect.objectContaining({ code: ErrorCode.INSECURE_CONTEXT }),
    );
    expect(() => assertCapabilities({ ...caps, camera: false }, { camera: true })).toThrow(
      expect.objectContaining({ code: ErrorCode.CAMERA_NOT_FOUND }),
    );
    expect(() => assertCapabilities({ ...caps, browser: false }, { camera: true })).toThrow();
    expect(() => assertCapabilities(caps, { camera: true })).not.toThrow();
  });
});

describe('mapCameraError', () => {
  it.each([
    ['NotAllowedError', ErrorCode.CAMERA_DENIED],
    ['SecurityError', ErrorCode.CAMERA_DENIED],
    ['NotFoundError', ErrorCode.CAMERA_NOT_FOUND],
    ['OverconstrainedError', ErrorCode.CAMERA_NOT_FOUND],
    ['NotReadableError', ErrorCode.CAMERA_IN_USE],
    ['Weird', ErrorCode.UNKNOWN],
  ])('%s -> %s', (name, code) => {
    const error = new Error('x');
    error.name = name;
    expect(mapCameraError(error).code).toBe(code);
  });
});

describe('AdaptiveRate', () => {
  it('drops to 15 under load and recovers after stable windows', () => {
    const rate = new AdaptiveRate('auto');
    expect(rate.rate).toBe(30);
    let t = 0;
    const second = (cost: number) => {
      for (let i = 0; i < 30; i++) rate.record(cost, (t += 34));
    };
    second(40);
    expect(rate.rate).toBe(15);
    for (let i = 0; i < 4; i++) second(5);
    expect(rate.rate).toBe(30);
  });

  it('keeps fixed rates for quality and battery', () => {
    const q = new AdaptiveRate('quality');
    const b = new AdaptiveRate('battery');
    for (let i = 0; i < 100; i++) {
      q.record(80, i * 34);
      b.record(1, i * 34);
    }
    expect(q.rate).toBe(30);
    expect(b.rate).toBe(15);
    expect(b.interval).toBeCloseTo(1000 / 15);
  });
});

describe('makeup geometry', () => {
  const face = syntheticFace();
  const layers: MakeupLayer[] = [
    { type: 'makeup.lips', color: '#b00' },
    { type: 'makeup.blush', color: '#f88', size: 0.5 },
    { type: 'makeup.eyeshadow', color: '#536' },
    { type: 'makeup.eyeliner', color: '#000', wing: true, thickness: 0.5 },
    { type: 'makeup.brows', color: '#321' },
    { type: 'makeup.foundation', color: '#d9b' },
  ];

  it.each(layers.map((l) => [l.type, l] as const))(
    '%s builds finite in-range triangles',
    (_type, layer) => {
      const geometry = buildLayerGeometry(layer, face, 1280, 720);
      expect(geometry.shapes.length).toBeGreaterThan(0);
      expect(geometry.featherPx).toBeGreaterThan(0);
      for (const shape of geometry.shapes) {
        expect(shape.positions.length % 6).toBe(0);
        for (const v of shape.positions) {
          expect(Number.isFinite(v)).toBe(true);
          expect(v).toBeGreaterThan(-0.5);
          expect(v).toBeLessThan(1.5);
        }
        if (shape.disc) expect(shape.local.length).toBe(shape.positions.length);
      }
    },
  );

  it('lips cut out the inner mouth so teeth stay untouched', () => {
    const g = buildLayerGeometry(layers[0]!, face, 1280, 720);
    expect(g.shapes.map((s) => s.value)).toEqual([1, 0]);
  });

  it('extracts layers from single assets and looks (ordered)', () => {
    const lips = validateManifest({
      version: 1,
      id: 'l',
      type: 'makeup.lips',
      color: '#f00',
      meta: { sku: 1 },
    });
    expect(toMakeupLayers(lips)).toEqual([
      { type: 'makeup.lips', color: '#f00', opacity: 0.6, finish: 'matte' },
    ]);
    const look = validateManifest({
      version: 1,
      id: 'look',
      type: 'makeup.look',
      layers: [
        { type: 'makeup.lips', color: '#f00' },
        { type: 'makeup.foundation', color: '#dba' },
      ],
    });
    expect(toMakeupLayers(look).map((l) => l.type)).toEqual(['makeup.foundation', 'makeup.lips']);
    expect(
      toMakeupLayers(validateManifest({ version: 1, id: 'g', type: 'glasses', model: 'a.glb' })),
    ).toEqual([]);
  });
});

describe('overlay geometry', () => {
  it('sticker quad keeps aspect ratio and follows the anchor', () => {
    const quad = stickerQuad(
      { x: 0.5, y: 0.5, angle: 0, size: 0.3 },
      { scale: 1, offset: [0, 0], imageAspect: 2, frameWidth: 1000, frameHeight: 500 },
    );
    expect(quad.positions.length).toBe(12);
    const xs = [...quad.positions].filter((_, i) => i % 2 === 0);
    const ys = [...quad.positions].filter((_, i) => i % 2 === 1);
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(0.3);
    expect((Math.max(...ys) - Math.min(...ys)) * 500).toBeCloseTo(150, 0);
  });

  it('mirrored stickers flip texture and horizontal offset so artwork reads correctly', () => {
    const anchor = { x: 0.5, y: 0.5, angle: 0, size: 0.3 };
    const base = {
      scale: 1,
      offset: [0.2, 0] as [number, number],
      imageAspect: 1,
      frameWidth: 1000,
      frameHeight: 1000,
    };
    const normal = stickerQuad(anchor, base);
    const mirrored = stickerQuad(anchor, { ...base, mirrored: true });
    expect(normal.uvs[0]).toBe(0);
    expect(mirrored.uvs[0]).toBe(1);
    const centerX = (q: { positions: Float32Array }) => (q.positions[0]! + q.positions[2]!) / 2;
    expect(centerX(normal)).toBeCloseTo(0.56);
    expect(centerX(mirrored)).toBeCloseTo(0.44);
  });

  it('garment mesh maps anchors onto the torso', () => {
    const mesh = garmentMesh(
      {
        leftShoulder: [400, 50],
        rightShoulder: [100, 50],
        leftHip: [380, 450],
        rightHip: [120, 450],
      },
      {
        leftShoulder: [0.7, 0.3],
        rightShoulder: [0.3, 0.3],
        leftHip: [0.65, 0.8],
        rightHip: [0.35, 0.8],
      },
      500,
      500,
    );
    expect(mesh).not.toBeNull();
    expect(mesh!.positions.length).toBe(8 * 8 * 6 * 2);
    expect(
      garmentMesh(
        { leftShoulder: [0, 0], rightShoulder: [0, 0], leftHip: [0, 0], rightHip: [0, 0] },
        { leftShoulder: [0, 0], rightShoulder: [1, 0], leftHip: [1, 1], rightHip: [0, 1] },
        1,
        1,
      ),
    ).toBeNull();
  });
});

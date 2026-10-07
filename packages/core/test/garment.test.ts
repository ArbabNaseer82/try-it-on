import { describe, expect, it } from 'vitest';
import {
  BODY_RIG_LEVELS,
  computeBodyAnchors,
  computeBodyRig,
  computeGarmentControls,
  createMlsDeformer,
  deformGrid,
  isFittedGarment,
  type ClothingAnchors,
  type Landmark,
  type PoseResult,
  type Vec2,
} from '../src';

/** Front facing upper body: wearer's left on the image right. */
function pose(overrides: Partial<Record<number, Partial<Landmark>>> = {}): PoseResult {
  const landmarks: Landmark[] = Array.from({ length: 33 }, () => ({
    x: 0.5,
    y: 0.5,
    z: 0,
    visibility: 0.9,
  }));
  const set = (i: number, x: number, y: number) =>
    (landmarks[i] = { x, y, z: 0, visibility: 0.9, ...overrides[i] });
  set(0, 0.5, 0.15); // nose
  set(11, 0.62, 0.3); // left shoulder
  set(12, 0.38, 0.3); // right shoulder
  set(13, 0.66, 0.5); // left elbow
  set(14, 0.34, 0.5); // right elbow
  set(23, 0.57, 0.7); // left hip
  set(24, 0.43, 0.7); // right hip
  return { landmarks, worldLandmarks: landmarks };
}

const TEE: ClothingAnchors = {
  leftShoulder: [466, 150],
  rightShoulder: [172, 150],
  leftHip: [459, 600],
  rightHip: [181, 600],
  neck: [315, 158],
  leftArmpit: [459, 404],
  rightArmpit: [181, 408],
  leftSleeve: [500, 385],
  rightSleeve: [140, 388],
  leftWaist: [459, 500],
  rightWaist: [181, 500],
};

describe('createMlsDeformer', () => {
  const src: Vec2[] = [
    [0, 0],
    [100, 0],
    [0, 100],
    [100, 100],
    [50, 30],
  ];

  it('passes exactly through every control point', () => {
    const dst: Vec2[] = [
      [10, 10],
      [130, 0],
      [0, 120],
      [90, 140],
      [60, 50],
    ];
    const f = createMlsDeformer(src, dst);
    src.forEach((p, i) => {
      const [x, y] = f(p);
      expect(x).toBeCloseTo(dst[i]![0]);
      expect(y).toBeCloseTo(dst[i]![1]);
    });
  });

  it('reproduces a global rotation, scale and translation exactly', () => {
    const angle = 0.4;
    const scale = 1.7;
    const move = (p: Vec2): Vec2 => [
      scale * (p[0] * Math.cos(angle) - p[1] * Math.sin(angle)) + 25,
      scale * (p[0] * Math.sin(angle) + p[1] * Math.cos(angle)) - 8,
    ];
    const f = createMlsDeformer(src, src.map(move));
    for (const p of [
      [20, 70],
      [80, 15],
      [-30, 140],
    ] as Vec2[]) {
      const [x, y] = f(p);
      expect(x).toBeCloseTo(move(p)[0], 6);
      expect(y).toBeCloseTo(move(p)[1], 6);
    }
  });

  it('builds a deformed grid with matching uvs', () => {
    const grid = deformGrid((p) => [p[0] * 2, p[1]], 10, 10, 4, 2);
    expect(grid.positions.length).toBe(5 * 3 * 2);
    expect(grid.indices.length).toBe(4 * 2 * 6);
    expect(grid.positions[grid.positions.length - 2]).toBe(20);
    expect(grid.uvs[grid.uvs.length - 1]).toBe(1);
  });
});

describe('computeBodyRig', () => {
  it('places the neck above the shoulders and shoulder tops outside the joints', () => {
    const rig = computeBodyRig(pose(), 1);
    expect(rig.neck[1]).toBeLessThan(0.3);
    expect(rig.leftShoulder[0]).toBeGreaterThan(0.62);
    expect(rig.rightShoulder[0]).toBeLessThan(0.38);
    expect(rig.leftShoulder[1]).toBeLessThan(0.3);
    expect(rig.levels).toEqual(BODY_RIG_LEVELS);
    expect(rig.leftSide).toHaveLength(BODY_RIG_LEVELS.length);
    expect(rig.measured).toBe(false);
  });

  it('measures the torso outline from the segmentation mask', () => {
    // A body 0.26 wide (0.37 to 0.63) for the whole height.
    const width = 200;
    const height = 200;
    const data = new Uint8Array(width * height);
    for (let y = 0; y < height; y++) for (let x = 74; x < 126; x++) data[y * width + x] = 255;
    const rig = computeBodyRig({ ...pose(), mask: { width, height, data } }, 1);
    expect(rig.measured).toBe(true);
    for (const [x] of rig.leftSide) expect(x).toBeCloseTo(0.63, 1);
    for (const [x] of rig.rightSide) expect(x).toBeCloseTo(0.37, 1);
  });

  it('falls back to the estimate when the mask is implausible (arms against the torso)', () => {
    const width = 100;
    const height = 100;
    const data = new Uint8Array(width * height).fill(255);
    const rig = computeBodyRig({ ...pose(), mask: { width, height, data } }, 1);
    expect(rig.measured).toBe(false);
    expect(rig.leftSide[0]![0]).toBeLessThan(0.75);
  });
});

describe('computeBodyAnchors visibility', () => {
  it('accepts hips just below the frame (waist up framing)', () => {
    const below = pose({ 23: { y: 1.07, visibility: 0.2 }, 24: { y: 1.06, visibility: 0.2 } });
    expect(computeBodyAnchors(below, { aspect: 1 })!.visible).toBe(true);
  });

  it('still needs both shoulders', () => {
    const noShoulder = pose({ 11: { visibility: 0.1 } });
    expect(computeBodyAnchors(noShoulder, { aspect: 1 })!.visible).toBe(false);
  });
});

describe('computeGarmentControls', () => {
  it('detects fitted garments from their optional points', () => {
    expect(isFittedGarment(TEE)).toBe(true);
    const { leftShoulder, rightShoulder, leftHip, rightHip } = TEE;
    expect(isFittedGarment({ leftShoulder, rightShoulder, leftHip, rightHip })).toBe(false);
  });

  it('pins the neckline, shoulders and hem to the body', () => {
    const rig = computeBodyRig(pose(), 1);
    const { src, dst } = computeGarmentControls(TEE, rig, 1000, 1000, 1);
    const at = (p: Vec2) => dst[src.findIndex((s) => s[0] === p[0] && s[1] === p[1])]!;
    expect(at(TEE.neck!)[1]).toBeCloseTo(rig.neck[1] * 1000);
    expect(at(TEE.leftShoulder)[0]).toBeCloseTo(rig.leftShoulder[0] * 1000);
    expect(at(TEE.rightHip)[0]).toBeLessThan(500);
    expect(src.length).toBe(dst.length);
  });

  it('turns the sleeves with the arms', () => {
    const down = computeGarmentControls(TEE, computeBodyRig(pose(), 1), 1000, 1000);
    // Left arm raised out to the side.
    const raised = computeGarmentControls(
      TEE,
      computeBodyRig(pose({ 13: { x: 0.85, y: 0.3 } }), 1),
      1000,
      1000,
    );
    const sleeveEnd = (c: typeof down) => c.dst[c.src.findIndex((s) => s === TEE.leftSleeve)]!;
    expect(sleeveEnd(raised)[0]).toBeGreaterThan(sleeveEnd(down)[0] + 100);
    expect(sleeveEnd(raised)[1]).toBeLessThan(sleeveEnd(down)[1] - 100);
  });

  it('loosens the garment with fit', () => {
    const rig = computeBodyRig(pose(), 1);
    const snug = computeGarmentControls(TEE, rig, 1000, 1000, 1);
    const loose = computeGarmentControls(TEE, rig, 1000, 1000, 1.3);
    const waist = (c: typeof snug) =>
      c.dst[c.src.findIndex((s) => s[0] === TEE.leftWaist![0] && s[1] === TEE.leftWaist![1])]![0];
    expect(waist(loose)).toBeGreaterThan(waist(snug));
  });
});

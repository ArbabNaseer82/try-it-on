import { describe, expect, it } from 'vitest';
import {
  DEFAULT_FOV_Y,
  FACE,
  computeBodyAnchors,
  computeFaceAnchors,
  computeHandAnchors,
  estimateMetricScale,
  project,
  quatRotateVec3,
  unproject,
  type HandResult,
  type Landmark,
  type PoseResult,
} from '../src';
import face from './fixtures/face-frontal.json';
import hand from './fixtures/hand-right-back.json';
import pose from './fixtures/pose-upper-body.json';

const camera = { fovY: DEFAULT_FOV_Y, aspect: 4 / 3 };

describe('camera helpers', () => {
  it('project inverts unproject', () => {
    const p = unproject(camera, 0.25, 0.75, 40);
    const [x, y] = project(camera, p);
    expect(x).toBeCloseTo(0.25);
    expect(y).toBeCloseTo(0.75);
    expect(p[2]).toBe(-40);
  });
});

describe('estimateMetricScale', () => {
  it('derives millimeters from the iris diameter', () => {
    const scale = estimateMetricScale(face.landmarks, { aspect: face.aspect });
    expect(scale).not.toBeNull();
    expect(scale!.mmPerUnit).toBeCloseTo(500, 0);
    expect(scale!.faceWidthMm).toBeCloseTo(150, 0);
    expect(scale!.scaleFactor).toBeCloseTo(145 / 150, 2);
  });

  it('returns null without iris landmarks and clamps the factor', () => {
    expect(estimateMetricScale(face.landmarks.slice(0, 468), { aspect: 1 })).toBeNull();
    const tiny = estimateMetricScale(face.landmarks, { aspect: face.aspect, irisDiameterMm: 1 });
    expect(tiny!.scaleFactor).toBe(1.25);
    const flat = face.landmarks.map((l) => ({ ...l, x: 0.5, y: 0.5 }));
    expect(estimateMetricScale(flat, { aspect: 1 })).toBeNull();
  });
});

describe('computeFaceAnchors', () => {
  it('uses the transformation matrix depth and rotation', () => {
    const anchors = computeFaceAnchors(
      { landmarks: face.landmarks, matrix: face.matrix },
      { camera },
    );
    expect(anchors).not.toBeNull();
    const a = anchors!;
    expect(a.depth).toBeCloseTo(50);
    expect(Math.abs(a.yaw)).toBeLessThan(1e-6);
    expect(a.leftEarVisible && a.rightEarVisible).toBe(true);
    const [bx, by] = project(camera, a.noseBridge.position);
    expect(bx).toBeCloseTo(0.5, 3);
    expect(by).toBeCloseTo(0.44, 3);
    // Left ear is on the image right in an unmirrored frame.
    expect(a.leftEar.position[0]).toBeGreaterThan(a.rightEar.position[0]);
    // Occluder sits behind the nose bridge.
    expect(a.occluder.position[2]).toBeLessThan(a.noseBridge.position[2]);
    expect(a.faceWidth).toBeCloseTo(0.3);
    expect(a.overlay.noseTip.x).toBeCloseTo(0.5);
    expect(a.overlay.eyes.angle).toBeCloseTo(0);
  });

  it('falls back to landmark based depth and rotation without a matrix', () => {
    const a = computeFaceAnchors(
      { landmarks: face.landmarks, matrix: null },
      { camera, scaleFactor: 1.1 },
    )!;
    expect(a.depth).toBeGreaterThan(10);
    expect(a.noseBridge.scale).toBe(1.1);
    const forward = quatRotateVec3(a.head.rotation, [0, 0, 1]);
    expect(forward[2]).toBeGreaterThan(0.5);
  });

  it('hides the far ear on strong yaw', () => {
    const yaw = 0.8;
    const c = Math.cos(yaw);
    const s = Math.sin(yaw);
    const matrix = [c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, -50, 1];
    const a = computeFaceAnchors({ landmarks: face.landmarks, matrix }, { camera })!;
    expect(a.yaw).toBeCloseTo(yaw);
    expect(a.leftEarVisible).toBe(false);
    expect(a.rightEarVisible).toBe(true);
  });

  it('returns null for incomplete meshes', () => {
    expect(computeFaceAnchors({ landmarks: [], matrix: null }, { camera })).toBeNull();
  });

  it('exposes named indices', () => {
    expect(FACE.NOSE_BRIDGE).toBe(168);
  });
});

describe('computeHandAnchors', () => {
  const result = hand as unknown as HandResult;

  it('builds a wrist frame with Z out of the back of the hand', () => {
    const a = computeHandAnchors(result, { camera })!;
    expect(a.side).toBe('right');
    const z = quatRotateVec3(a.wrist.rotation, [0, 0, 1]);
    const y = quatRotateVec3(a.wrist.rotation, [0, 1, 0]);
    expect(z[2]).toBeGreaterThan(0.9);
    expect(y[1]).toBeGreaterThan(0.9);
    expect(a.depth).toBeGreaterThan(5);
    expect(a.palmWidthCm).toBeCloseTo(7.02, 1);
    const [wx, wy] = project(camera, a.wrist.position);
    expect(wx).toBeCloseTo(0.5, 3);
    expect(wy).toBeCloseTo(0.8, 3);
  });

  it('places rings between the base and first joint', () => {
    const a = computeHandAnchors(result, { camera })!;
    const [, ry] = project(camera, a.rings.ring.position);
    expect(ry).toBeLessThan(0.62);
    expect(ry).toBeGreaterThan(0.56);
    const fy = quatRotateVec3(a.rings.index.rotation, [0, 1, 0]);
    expect(fy[1]).toBeGreaterThan(0.9);
  });

  it('respects handedness configuration and rejects partial hands', () => {
    const a = computeHandAnchors(result, {
      camera,
      config: { handednessFromMirroredInput: false },
    })!;
    expect(a.side).toBe('left');
    expect(computeHandAnchors({ ...result, landmarks: [] }, { camera })).toBeNull();
    const flat: HandResult = {
      ...result,
      landmarks: result.landmarks.map((l: Landmark) => ({ ...l, x: 0.5, y: 0.5 })),
    };
    expect(computeHandAnchors(flat, { camera })!.depth).toBe(40);
  });
});

describe('computeBodyAnchors', () => {
  const result = pose as unknown as PoseResult;

  it('pads the torso quad and keeps subject left on image right', () => {
    const a = computeBodyAnchors(result, { aspect: 4 / 3 })!;
    expect(a.visible).toBe(true);
    expect(a.torso.leftShoulder[0]).toBeGreaterThan(0.65);
    expect(a.torso.rightShoulder[0]).toBeLessThan(0.35);
    expect(a.torso.leftShoulder[1]).toBeLessThan(0.4);
    expect(a.shoulderWidth).toBeCloseTo(0.3);
  });

  it('reports low visibility and missing landmarks', () => {
    const low = { ...result, landmarks: result.landmarks.map((l) => ({ ...l, visibility: 0.1 })) };
    expect(computeBodyAnchors(low, { aspect: 1 })!.visible).toBe(false);
    expect(computeBodyAnchors({ landmarks: [], worldLandmarks: [] }, { aspect: 1 })).toBeNull();
  });
});

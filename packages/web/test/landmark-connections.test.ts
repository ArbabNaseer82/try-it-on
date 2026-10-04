// Verifies the hand written region rings in @tryonit/core against MediaPipe's exported
// connection sets, so index lists cannot silently drift from the official topology.
import { describe, expect, it } from 'vitest';
import { FACE_REGIONS } from '@tryonit/core';
import { FaceLandmarker } from '@mediapipe/tasks-vision';

type Connection = { start: number; end: number };
const key = (a: number, b: number) => (a < b ? `${a}-${b}` : `${b}-${a}`);
const toSet = (connections: Connection[]) => new Set(connections.map((c) => key(c.start, c.end)));

function ringEdges(ring: readonly number[], closed: boolean): string[] {
  const edges: string[] = [];
  for (let i = 0; i < ring.length - (closed ? 0 : 1); i++) {
    edges.push(key(ring[i]!, ring[(i + 1) % ring.length]!));
  }
  return edges;
}

describe('face region rings follow MediaPipe connections', () => {
  const lips = toSet(FaceLandmarker.FACE_LANDMARKS_LIPS);
  const oval = toSet(FaceLandmarker.FACE_LANDMARKS_FACE_OVAL);
  const leftEye = toSet(FaceLandmarker.FACE_LANDMARKS_LEFT_EYE);
  const rightEye = toSet(FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE);
  const tess = toSet(FaceLandmarker.FACE_LANDMARKS_TESSELATION);

  it('lips', () => {
    for (const e of ringEdges(FACE_REGIONS.LIPS_OUTER, true))
      expect(lips.has(e) || tess.has(e), e).toBe(true);
    for (const e of ringEdges(FACE_REGIONS.LIPS_INNER, true))
      expect(lips.has(e) || tess.has(e), e).toBe(true);
  });

  it('face oval', () => {
    for (const e of ringEdges(FACE_REGIONS.FACE_OVAL, true)) expect(oval.has(e), e).toBe(true);
  });

  it('eyes (MediaPipe left is the subject left)', () => {
    for (const e of ringEdges(FACE_REGIONS.LEFT_EYE, true)) expect(leftEye.has(e), e).toBe(true);
    for (const e of ringEdges(FACE_REGIONS.RIGHT_EYE, true)) expect(rightEye.has(e), e).toBe(true);
  });

  it('brows and lash lines are connected in the tessellation', () => {
    for (const ring of [
      FACE_REGIONS.LEFT_UPPER_LASH,
      FACE_REGIONS.RIGHT_UPPER_LASH,
      FACE_REGIONS.LEFT_BROW_LOWER,
      FACE_REGIONS.RIGHT_BROW_LOWER,
    ]) {
      for (const e of ringEdges(ring, false)) expect(tess.has(e), e).toBe(true);
    }
  });
});

import { describe, expect, it } from 'vitest';
import { PoseFilter, QuaternionFilter, quatAngle, quatFromEuler } from '../src';

describe('QuaternionFilter', () => {
  it('passes the first rotation then smooths toward new ones', () => {
    const f = new QuaternionFilter({ minCutoff: 1, beta: 0 });
    const a = quatFromEuler(0, 0, 0);
    const b = quatFromEuler(0, 0, 0.5);
    expect(f.filter(a, 0)).toBe(a);
    const step = f.filter(b, 33);
    const progress = quatAngle(a, step);
    expect(progress).toBeGreaterThan(0);
    expect(progress).toBeLessThan(0.5);
    f.reset();
    expect(f.filter(b, 100)).toBe(b);
  });

  it('reduces lag for fast rotations when beta is high', () => {
    const slow = new QuaternionFilter({ minCutoff: 1, beta: 0 });
    const fast = new QuaternionFilter({ minCutoff: 1, beta: 1 });
    const target = quatFromEuler(0, 1, 0);
    slow.filter(quatFromEuler(0, 0, 0), 0);
    fast.filter(quatFromEuler(0, 0, 0), 0);
    const s = slow.filter(target, 16);
    const q = fast.filter(target, 16);
    expect(quatAngle(q, target)).toBeLessThan(quatAngle(s, target));
  });
});

describe('PoseFilter', () => {
  it('filters position, rotation and scale', () => {
    const f = new PoseFilter();
    const pose = {
      position: [0, 0, -50] as [number, number, number],
      rotation: quatFromEuler(0, 0, 0),
      scale: 1,
    };
    expect(f.filter(pose, 0).position).toEqual([0, 0, -50]);
    const next = f.filter({ ...pose, position: [1, 0, -50], scale: 1.2 }, 33);
    expect(next.position[0]).toBeGreaterThan(0);
    expect(next.position[0]).toBeLessThan(1);
    expect(next.scale).toBeLessThan(1.2);
    f.reset();
    expect(f.filter({ ...pose, scale: 2 }, 50).scale).toBe(2);
  });
});

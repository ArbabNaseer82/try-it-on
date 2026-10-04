import { describe, expect, it } from 'vitest';
import { parseColor } from '../src';

describe('parseColor', () => {
  it.each([
    ['#fff', [1, 1, 1, 1]],
    ['#0000', [0, 0, 0, 0]],
    ['#ff0000', [1, 0, 0, 1]],
    ['#00ff0080', [0, 1, 0, 128 / 255]],
    ['rgb(255, 0, 0)', [1, 0, 0, 1]],
    ['rgba(0,0,255,0.5)', [0, 0, 1, 0.5]],
    ['nonsense', [0, 0, 0, 1]],
    ['#zzzzzz', [0, 0, 0, 1]],
  ])('%s', (input, expected) => {
    const out = parseColor(input);
    out.forEach((v, i) => expect(v).toBeCloseTo(expected[i] as number));
  });
});

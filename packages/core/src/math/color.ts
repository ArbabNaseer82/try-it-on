/** RGBA color with components in 0..1. */
export type RGBA = [number, number, number, number];

/**
 * Parses #RGB, #RGBA, #RRGGBB, #RRGGBBAA, rgb() and rgba() into 0..1 components.
 * Returns opaque black for anything else.
 */
export function parseColor(input: string): RGBA {
  const value = input.trim();
  if (value.startsWith('#')) {
    let hex = value.slice(1);
    if (hex.length === 3 || hex.length === 4) hex = [...hex].map((c) => c + c).join('');
    const n = (i: number) => parseInt(hex.slice(i, i + 2), 16) / 255;
    if (/^[0-9a-f]{6}([0-9a-f]{2})?$/i.test(hex))
      return [n(0), n(2), n(4), hex.length === 8 ? n(6) : 1];
  }
  const match = /^rgba?\(([^)]+)\)$/i.exec(value);
  if (match?.[1]) {
    const parts = match[1].split(',').map((p) => parseFloat(p));
    const [r = 0, g = 0, b = 0, a = 1] = parts;
    return [r / 255, g / 255, b / 255, a];
  }
  return [0, 0, 0, 1];
}

import type { ThemeColors, ThemeInput } from './types';

const px = (v: number | string) => (typeof v === 'number' ? `${v}px` : v);
const kebab = (s: string) => s.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);

/**
 * Converts a (partial) theme into `--toi-*` CSS custom properties. Only provided values are
 * emitted, everything else falls back to the stylesheet defaults. No runtime CSS-in-JS.
 */
export function themeToCssVars(theme: ThemeInput = {}): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const [key, value] of Object.entries(theme.colors ?? {}) as [
    keyof ThemeColors,
    string | undefined,
  ][]) {
    if (value) vars[`--toi-color-${kebab(key)}`] = value;
  }
  if (theme.radius !== undefined) vars['--toi-radius'] = px(theme.radius);
  if (theme.spacing !== undefined) {
    for (let i = 1; i <= 4; i++) vars[`--toi-space-${i}`] = `${theme.spacing * i}px`;
  }
  if (theme.fontFamily) vars['--toi-font-family'] = theme.fontFamily;
  for (const [size, value] of Object.entries(theme.fontSize ?? {})) {
    if (value !== undefined) vars[`--toi-font-size-${size}`] = px(value);
  }
  if (theme.zIndex !== undefined) vars['--toi-z-index'] = String(theme.zIndex);
  if (theme.shadow) vars['--toi-shadow'] = theme.shadow;
  if (theme.transitionMs !== undefined) vars['--toi-transition'] = `${theme.transitionMs}ms`;
  return vars;
}

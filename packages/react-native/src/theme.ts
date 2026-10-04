/** Theme tokens shared with @tryonit/react, so web and native look the same. */
export interface ThemeInput {
  mode?: 'light' | 'dark' | 'auto';
  colors?: Partial<{
    primary: string;
    onPrimary: string;
    surface: string;
    onSurface: string;
    overlay: string;
    danger: string;
    success: string;
    muted: string;
  }>;
  /** Corner radius in px. */
  radius?: number;
  fontFamily?: string;
  /** Base font size in px. */
  fontSize?: number;
}

const kebab = (s: string) => s.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);

/** Converts a theme into CSS variable names (without the `--toi-` prefix) for the camera view. */
export function themeToCssVars(theme: ThemeInput = {}): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const [key, value] of Object.entries(theme.colors ?? {})) {
    if (value) vars[`color-${kebab(key)}`] = value;
  }
  if (theme.radius !== undefined) vars.radius = `${theme.radius}px`;
  if (theme.fontFamily) vars['font-family'] = theme.fontFamily;
  if (theme.fontSize !== undefined) vars['font-size'] = `${theme.fontSize}px`;
  return vars;
}

export const DEFAULT_PRIMARY = '#6d28d9';

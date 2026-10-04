import type { Theme } from './types';

/** Default theme (light). Dark defaults live in the CSS file under `prefers-color-scheme`. */
export const defaultTheme: Theme = {
  mode: 'auto',
  colors: {
    primary: '#6d28d9',
    onPrimary: '#ffffff',
    surface: '#ffffff',
    onSurface: '#111827',
    overlay: 'rgba(17, 24, 39, 0.72)',
    danger: '#b91c1c',
    success: '#15803d',
    muted: '#6b7280',
  },
  radius: 14,
  spacing: 8,
  fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  fontSize: { sm: 13, md: 15, lg: 18 },
  zIndex: 2147483000,
  shadow: '0 12px 40px rgba(0, 0, 0, 0.25)',
  transitionMs: 160,
};

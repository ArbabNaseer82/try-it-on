export type ThemeMode = 'light' | 'dark' | 'auto';

export interface ThemeColors {
  primary: string;
  onPrimary: string;
  surface: string;
  onSurface: string;
  overlay: string;
  danger: string;
  success: string;
  muted: string;
}

export interface Theme {
  mode: ThemeMode;
  colors: ThemeColors;
  /** Corner radius, number in px or any CSS length. */
  radius: number | string;
  /** Base spacing unit in px. The scale is 1x, 2x, 3x, 4x. */
  spacing: number;
  fontFamily: string;
  fontSize: { sm: number | string; md: number | string; lg: number | string };
  zIndex: number;
  shadow: string;
  /** UI transition duration in ms. */
  transitionMs: number;
}

export type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };

export type ThemeInput = DeepPartial<Theme>;

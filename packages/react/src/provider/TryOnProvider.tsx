import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { TryOnEngine, TryOnEngineOptions } from '@tryonit/web';
import { defaultIcons, type Icons } from '../icons';
import { mergeLabels, type LabelsInput } from '../i18n/default-labels';
import { themeToCssVars } from '../theme/theme-to-css-vars';
import type { ThemeInput } from '../theme/types';
import {
  TryOnContext,
  createEngineHolder,
  useOptionalTryOnContext,
  type TryOnContextValue,
  type TryOnImages,
} from './contexts';

export interface TryOnProviderProps {
  children?: ReactNode;
  /** Brand colors, radius, fonts. Converted to `--toi-*` CSS variables. */
  theme?: ThemeInput;
  /** Replace any built in icon with your own component. */
  icons?: Partial<Icons>;
  /** Override any user facing string (i18n). */
  labels?: LabelsInput;
  /** Replace loader, logo, placeholder and permission illustration images. */
  images?: TryOnImages;
  /** Options passed to `createTryOnEngine` (models location, performance, camera). */
  engineOptions?: TryOnEngineOptions;
  /** Text direction for RTL languages. */
  dir?: 'ltr' | 'rtl';
  /** Use your own engine instance or factory (advanced, also used for tests). */
  engine?: TryOnEngine | (() => TryOnEngine);
}

/**
 * Shares one try-on engine, theme, icons, labels and images with every TryOnIt component
 * below it. The engine is created lazily on the client and destroyed on unmount.
 */
export function TryOnProvider({
  children,
  theme,
  icons,
  labels,
  images,
  engineOptions,
  dir,
  engine,
}: TryOnProviderProps) {
  // The holder is created once. Engine options are read when the engine is first created.
  const [holder] = useState(() => createEngineHolder(engineOptions, engine));
  useEffect(() => () => holder.destroy(), [holder]);

  const value = useMemo<TryOnContextValue>(
    () => ({
      holder,
      icons: { ...defaultIcons, ...icons },
      labels: mergeLabels(labels),
      images: images ?? {},
      engineOptions: engineOptions ?? {},
      dir,
      rootStyle: themeToCssVars(theme),
      themeMode: theme?.mode ?? 'auto',
    }),
    [holder, icons, labels, images, engineOptions, dir, theme],
  );
  return <TryOnContext.Provider value={value}>{children}</TryOnContext.Provider>;
}

/** Renders children inside a provider only when none exists above. */
export function EnsureProvider({ children, ...props }: TryOnProviderProps) {
  const existing = useOptionalTryOnContext();
  if (existing) return <>{children}</>;
  return <TryOnProvider {...props}>{children}</TryOnProvider>;
}

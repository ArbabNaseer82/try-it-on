import type { ComponentType, ReactNode } from 'react';
import type { CaptureButtonProps } from '../CaptureButton/CaptureButton';
import type { ProductSwitcherProps } from '../ProductSwitcher/ProductSwitcher';
import type { StatusOverlayProps } from '../StatusOverlay/StatusOverlay';
import type { LoaderProps } from '../shared/Loader';

/** Class name hooks for every part of the UI (works with Tailwind and CSS modules). */
export type TryOnSlotName =
  | 'root'
  | 'stage'
  | 'toolbar'
  | 'captureButton'
  | 'cameraSwitch'
  | 'compareButton'
  | 'uploadButton'
  | 'productSwitcher'
  | 'swatches'
  | 'intensity'
  | 'status'
  | 'permission'
  | 'preview'
  | 'compare'
  | 'modal'
  | 'backdrop'
  | 'badge';

export type TryOnClassNames = Partial<Record<TryOnSlotName, string>>;

export interface ToolbarSlotProps {
  className?: string;
  /** The default buttons, so a custom toolbar can wrap or reorder them. */
  children: ReactNode;
}

/** Replace whole sub components. Each receives the same props as the default. */
export interface TryOnSlots {
  Toolbar: ComponentType<ToolbarSlotProps>;
  CaptureButton: ComponentType<CaptureButtonProps>;
  StatusOverlay: ComponentType<StatusOverlayProps>;
  ProductSwitcher: ComponentType<ProductSwitcherProps>;
  Loader: ComponentType<LoaderProps>;
}

// Provider and context
export { TryOnProvider, type TryOnProviderProps } from './provider/TryOnProvider';
export type { TryOnImages } from './provider/contexts';

// Headless hooks
export { useTryOn, type TryOnController } from './hooks/useTryOn';
export { useTryOnState } from './hooks/useTryOnState';
export { useCamera } from './hooks/useCamera';
export { useAsset } from './hooks/useAsset';
export { useCapture, type CaptureResult } from './hooks/useCapture';

// Components
export { TryOn, type TryOnLayout, type TryOnProps } from './components/TryOn/TryOn';
export type {
  ToolbarSlotProps,
  TryOnClassNames,
  TryOnSlotName,
  TryOnSlots,
} from './components/TryOn/types';
export { TryOnButton, type TryOnButtonProps } from './components/TryOnButton/TryOnButton';
export { TryOnModal, type TryOnModalProps } from './components/TryOnModal/TryOnModal';
export { TryOnView, type TryOnViewProps } from './components/TryOnView/TryOnView';
export {
  ProductSwitcher,
  type ProductSwitcherProps,
} from './components/ProductSwitcher/ProductSwitcher';
export { ShadeSwatches, type ShadeSwatchesProps } from './components/ShadeSwatches/ShadeSwatches';
export { CaptureButton, type CaptureButtonProps } from './components/CaptureButton/CaptureButton';
export { CameraSwitch, type CameraSwitchProps } from './components/CameraSwitch/CameraSwitch';
export { CompareSlider, type CompareSliderProps } from './components/CompareSlider/CompareSlider';
export {
  IntensitySlider,
  type IntensitySliderProps,
} from './components/IntensitySlider/IntensitySlider';
export { StatusOverlay, type StatusOverlayProps } from './components/StatusOverlay/StatusOverlay';
export {
  PermissionPrompt,
  type PermissionPromptProps,
} from './components/PermissionPrompt/PermissionPrompt';
export { CapturePreview, type CapturePreviewProps } from './components/TryOn/CapturePreview';
export { Loader, type LoaderProps } from './components/shared/Loader';
export { PhotoUpload, type PhotoUploadProps } from './components/shared/PhotoUpload';

// Theming, icons, labels
export { defaultIcons, type IconName, type IconProps, type Icons } from './icons';
export { defaultTheme } from './theme/default-theme';
export { themeToCssVars } from './theme/theme-to-css-vars';
export type { DeepPartial, Theme, ThemeColors, ThemeInput, ThemeMode } from './theme/types';
export { defaultLabels, mergeLabels, type Labels, type LabelsInput } from './i18n/default-labels';
export { cx } from './utils/cx';

// Common re-exports so apps can import everything from one package.
export {
  preloadTryOn,
  isTryOnSupported,
  shallowEqual,
  type AssetManifest,
  type AssetSource,
  type SessionState,
  type SessionStatus,
  type TryOnEngine,
  type TryOnEngineOptions,
  type TryOnError,
} from '@tryonit/web';

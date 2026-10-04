/** Options for the @tryonit/react-native Expo config plugin. */
export interface TryOnItPluginOptions {
  /** iOS camera usage description shown in the permission prompt. */
  cameraPermission?: string;
}

/** Adds the iOS camera usage description and the Android CAMERA permission. */
declare function withTryOnIt<T extends Record<string, unknown>>(
  config: T,
  props?: TryOnItPluginOptions,
): T;
export = withTryOnIt;

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  type ForwardedRef,
} from 'react';
import { AppState, StyleSheet } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { ErrorCode, toTryOnError, type AssetManifest, type AssetSource } from '@tryonit/core';
import { resolveNativeAsset } from './assets';
import { createTryOnHtml, TRYON_BASE_URL } from './html';
import {
  commandScript,
  parseBridgeEvent,
  type BridgeCommand,
  type BridgeConfig,
  type BridgeEvent,
  type TryOnErrorInfo,
  type TryOnPhoto,
  type TryOnState,
} from './protocol';
import { themeToCssVars } from './theme';
import type { TryOnViewProps, TryOnViewRef } from './types';

const CAPTURE_TIMEOUT_MS = 20_000;

function toErrorInfo(error: unknown, fallback: ErrorCode): TryOnErrorInfo {
  const e = toTryOnError(error, fallback);
  return {
    code: e.code,
    message: e.message,
    retryable: e.retryable,
    canUsePhotoFallback: e.canUsePhotoFallback,
  };
}

function toPhoto(event: Extract<BridgeEvent, { type: 'capture' }>): TryOnPhoto {
  const comma = event.dataUrl.indexOf(',');
  return {
    dataUrl: event.dataUrl,
    base64: event.dataUrl.slice(comma + 1),
    mimeType: event.mimeType,
    width: event.width,
    height: event.height,
  };
}

interface PendingCapture {
  resolve: (photo: TryOnPhoto) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

/**
 * Camera try-on view. Runs the TryOnIt engine inside a WebView (works in Expo Go, Expo dev
 * builds and bare React Native) and talks to it through a typed message bridge.
 *
 * @example
 * <TryOnView asset="https://cdn.example.com/tryon/aviator.json" style={{ flex: 1 }} />
 */
function TryOnViewInner(props: TryOnViewProps, ref: ForwardedRef<TryOnViewRef>) {
  const {
    asset,
    controls = 'web',
    autoStart = true,
    engineOptions,
    theme,
    labels,
    captureOptions,
    cdn,
    pauseInBackground = true,
    style,
    webViewProps,
  } = props;
  const webRef = useRef<WebView>(null);
  const ready = useRef(false);
  const queue = useRef<BridgeCommand[]>([]);
  const manifest = useRef<AssetManifest | null>(null);
  const state = useRef<TryOnState | null>(null);
  const pending = useRef(new Map<number, PendingCapture>());
  const nextId = useRef(1);
  const callbacks = useRef(props);
  useEffect(() => {
    callbacks.current = props;
  });

  // Rebuild the page only when configuration really changes (not on every render).
  const configKey = JSON.stringify([
    controls,
    autoStart,
    engineOptions,
    theme,
    labels,
    captureOptions,
    cdn,
  ]);
  const html = useMemo(() => {
    const config: BridgeConfig = {
      engine: engineOptions ?? {},
      controls,
      autoStart,
      theme: themeToCssVars(theme),
      labels: { ...labels },
      capture: captureOptions ?? {},
    };
    return createTryOnHtml(config, cdn);
    // configKey captures every input.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configKey]);

  useEffect(() => {
    ready.current = false;
  }, [html]);

  const send = useCallback((command: BridgeCommand) => {
    if (ready.current && webRef.current) webRef.current.injectJavaScript(commandScript(command));
    else queue.current.push(command);
  }, []);

  // Products are resolved and validated on the React Native side, then sent as manifests.
  const applyAsset = useCallback(
    async (source: AssetSource | null, signal?: AbortSignal): Promise<AssetManifest | null> => {
      if (source === null) {
        manifest.current = null;
        send({ type: 'setAsset', asset: null });
        return null;
      }
      const resolved = await resolveNativeAsset(source, signal);
      if (signal?.aborted) return null;
      manifest.current = resolved;
      send({ type: 'setAsset', asset: resolved });
      return resolved;
    },
    [send],
  );

  useEffect(() => {
    if (asset === undefined) return;
    const controller = new AbortController();
    applyAsset(asset, controller.signal).catch((error: unknown) => {
      if (!controller.signal.aborted)
        callbacks.current.onError?.(toErrorInfo(error, ErrorCode.ASSET_LOAD_FAILED));
    });
    return () => controller.abort();
  }, [asset, applyAsset]);

  useEffect(() => {
    if (!pauseInBackground) return;
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') send({ type: 'resume' });
      else if (next === 'background') send({ type: 'pause' });
    });
    return () => subscription.remove();
  }, [pauseInBackground, send]);

  useEffect(() => {
    const captures = pending.current;
    return () => {
      for (const capture of captures.values()) {
        clearTimeout(capture.timer);
        capture.reject(new Error('The try-on view was closed.'));
      }
      captures.clear();
    };
  }, []);

  const onMessage = useCallback(
    (event: WebViewMessageEvent) => {
      const message = parseBridgeEvent(event.nativeEvent.data);
      if (!message) return;
      const cb = callbacks.current;
      switch (message.type) {
        case 'ready': {
          ready.current = true;
          // A reloaded page needs the current product again, then everything queued meanwhile.
          const commands = queue.current.filter((c) => c.type !== 'setAsset');
          queue.current = [];
          if (manifest.current) send({ type: 'setAsset', asset: manifest.current });
          commands.forEach(send);
          cb.onReady?.();
          break;
        }
        case 'state': {
          const previous = state.current;
          state.current = message.state;
          cb.onStateChange?.(message.state);
          if (previous?.status !== message.state.status) cb.onStatusChange?.(message.state.status);
          break;
        }
        case 'error':
          cb.onError?.(message.error);
          break;
        case 'assetLoaded':
          cb.onAssetLoaded?.(message.asset);
          break;
        case 'capture': {
          const photo = toPhoto(message);
          const request = message.id !== null ? pending.current.get(message.id) : undefined;
          if (request && message.id !== null) {
            clearTimeout(request.timer);
            pending.current.delete(message.id);
            request.resolve(photo);
          } else {
            cb.onCapture?.(photo);
          }
          break;
        }
        case 'commandError': {
          const request = message.id !== null ? pending.current.get(message.id) : undefined;
          if (request && message.id !== null) {
            clearTimeout(request.timer);
            pending.current.delete(message.id);
            request.reject(
              Object.assign(new Error(message.error.message), { code: message.error.code }),
            );
          } else {
            cb.onError?.(message.error);
          }
          break;
        }
        case 'log':
          cb.onLog?.(message.level, message.message);
          break;
      }
    },
    [send],
  );

  useImperativeHandle(
    ref,
    (): TryOnViewRef => ({
      start: () => send({ type: 'start' }),
      stop: () => send({ type: 'stop' }),
      pause: () => send({ type: 'pause' }),
      resume: () => send({ type: 'resume' }),
      setAsset: (source) => applyAsset(source),
      setVariant: (variantId) => send({ type: 'setVariant', variantId }),
      setIntensity: (value) => send({ type: 'setIntensity', value }),
      switchCamera: () => send({ type: 'switchCamera' }),
      setCompare: (position) => send({ type: 'setCompare', position }),
      setDebug: (enabled) => send({ type: 'setDebug', enabled }),
      capture: (options) =>
        new Promise<TryOnPhoto>((resolve, reject) => {
          const id = nextId.current++;
          const timer = setTimeout(() => {
            pending.current.delete(id);
            reject(new Error('Capture timed out.'));
          }, CAPTURE_TIMEOUT_MS);
          pending.current.set(id, { resolve, reject, timer });
          send({ type: 'capture', id, ...(options ? { options } : {}) });
        }),
      getState: () => state.current,
    }),
    [send, applyAsset],
  );

  return (
    <WebView
      ref={webRef}
      source={{ html, baseUrl: TRYON_BASE_URL }}
      originWhitelist={['*']}
      javaScriptEnabled
      domStorageEnabled
      allowsInlineMediaPlayback
      mediaPlaybackRequiresUserAction={false}
      mediaCapturePermissionGrantType="grant"
      allowsBackForwardNavigationGestures={false}
      bounces={false}
      scrollEnabled={false}
      overScrollMode="never"
      setSupportMultipleWindows={false}
      androidLayerType="hardware"
      webviewDebuggingEnabled={engineOptions?.debug ?? false}
      onMessage={onMessage}
      {...webViewProps}
      style={[styles.webview, style]}
    />
  );
}

export const TryOnView = forwardRef<TryOnViewRef, TryOnViewProps>(TryOnViewInner);
TryOnView.displayName = 'TryOnView';

const styles = StyleSheet.create({
  webview: { flex: 1, backgroundColor: '#000' },
});

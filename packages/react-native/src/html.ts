import type { BridgeConfig } from './protocol';
import { RUNTIME } from './generated/runtime';

/** Where the page loads MediaPipe and three.js from. */
export interface CdnOptions {
  /** URL of `vision_bundle.mjs`. Default: jsDelivr, pinned to the bundled MediaPipe version. */
  mediapipeUrl?: string;
  /** Folder of the three.js package (must contain `build/` and `examples/`). Default: jsDelivr. */
  threeBaseUrl?: string;
  /** Extra or replacement import map entries (advanced self hosting). */
  importMap?: Record<string, string>;
}

/** Origin the page runs on. HTTPS is required for camera access inside the WebView. */
export const TRYON_BASE_URL = 'https://tryonit.local/';

/** Import map entries for the lazily loaded libraries. */
export function createImportMap(cdn: CdnOptions = {}): Record<string, string> {
  const three = (
    cdn.threeBaseUrl ?? `https://cdn.jsdelivr.net/npm/three@${RUNTIME.versions.three}`
  ).replace(/\/+$/, '');
  return {
    '@mediapipe/tasks-vision':
      cdn.mediapipeUrl ??
      `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${RUNTIME.versions.mediapipe}/vision_bundle.mjs`,
    three: `${three}/build/three.module.js`,
    'three/': `${three}/`,
    ...cdn.importMap,
  };
}

/** Makes a JSON value safe to embed inside an inline <script>. */
export function toInlineScriptJson(value: unknown): string {
  return JSON.stringify(value)
    .replace(/<\/(script)/gi, '<\\/$1')
    .replace(/<!--/g, '<\\!--')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

const BASE_CSS =
  'html,body{margin:0;height:100%;background:#000;overflow:hidden;overscroll-behavior:none;' +
  '-webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent;touch-action:manipulation}' +
  '#tryonit-root{position:fixed;inset:0}#tryonit-root .toi-mount{border-radius:0;height:100%;min-height:0}';

/**
 * Builds the self contained page that runs the try-on engine inside a WebView. The TryOnIt
 * code is embedded, MediaPipe and three.js are fetched lazily through an import map.
 */
export function createTryOnHtml(config: BridgeConfig, cdn: CdnOptions = {}): string {
  const payload = toInlineScriptJson({
    core: RUNTIME.core,
    three: RUNTIME.three,
    main: RUNTIME.main,
    imports: createImportMap(cdn),
    config,
  });
  // The bootstrap is a classic script: it reports early errors, turns the embedded modules into
  // blob URLs, installs the import map, then starts the main module.
  return `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">
<style>${BASE_CSS}${RUNTIME.css}</style></head><body><div id="tryonit-root"></div>
<script>(function(){
var post=function(m){try{window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(JSON.stringify(m))}catch(e){}};
window.addEventListener('error',function(e){post({type:'log',level:'error',message:String(e&&e.message||e)})});
window.addEventListener('unhandledrejection',function(e){var r=e&&e.reason;post({type:'log',level:'error',message:String(r&&r.message||r)})});
var R=${payload};
var url=function(code){return URL.createObjectURL(new Blob([code],{type:'text/javascript'}))};
var imports=Object.assign({'@tryonit/core':url(R.core),'@tryonit/web-three-renderer':url(R.three)},R.imports);
window.__TRYONIT_CONFIG__=R.config;
var map=document.createElement('script');map.type='importmap';map.textContent=JSON.stringify({imports:imports});document.head.appendChild(map);
var main=document.createElement('script');main.type='module';main.textContent=R.main;document.body.appendChild(main);
})();</script></body></html>`;
}

/** Versions bundled into this build. */
export const RUNTIME_VERSIONS = RUNTIME.versions;

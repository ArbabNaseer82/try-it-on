import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import {
  TryOn,
  TryOnButton,
  TryOnProvider,
  useTryOn,
  type ThemeInput,
  type TryOnEngineOptions,
} from '@tryonit/react';
import { useCatalog } from './catalog';
import { Headless } from './Headless';
import { PerfHud } from './PerfHud';
import { ThemeEditor } from './ThemeEditor';

declare global {
  interface Window {
    /** Exposed for the Playwright smoke test. */
    __tryonitLastCapture?: number;
  }
}

const subscribeHash = (cb: () => void) => {
  window.addEventListener('hashchange', cb);
  return () => window.removeEventListener('hashchange', cb);
};
const useHash = () =>
  useSyncExternalStore(
    subscribeHash,
    () => location.hash,
    () => '',
  );

function initialAsset(): string {
  const param = new URLSearchParams(location.search).get('asset');
  return param ? `/assets/${param}.json` : '/assets/lipstick.json';
}

function DebugToggle({ debug }: { debug: boolean }) {
  const { getEngine } = useTryOn();
  useEffect(() => {
    getEngine().setDebug(debug);
  }, [debug, getEngine]);
  return null;
}

function PhotoMode() {
  const { startFromImage } = useTryOn();
  return (
    <label className="pg-row">
      <span>Selfie (image mode)</span>
      <input
        type="file"
        accept="image/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) startFromImage(file).catch(() => undefined);
        }}
      />
    </label>
  );
}

export function App() {
  const hash = useHash();
  const { catalog, error } = useCatalog();
  const [asset, setAsset] = useState(initialAsset);
  const [layout, setLayout] = useState<'inline' | 'modal'>(
    new URLSearchParams(location.search).get('layout') === 'modal' ? 'modal' : 'inline',
  );
  const [debug, setDebug] = useState(false);
  const [theme, setTheme] = useState<ThemeInput>({});
  const engineOptions = useMemo<TryOnEngineOptions>(
    () => ({ modelBaseUrl: '/models', wasmBaseUrl: '/wasm' }),
    [],
  );

  if (hash === '#/headless') {
    return (
      <main className="pg-main">
        <a href="#/">Back to playground</a>
        <Headless />
      </main>
    );
  }

  const onCapture = (blob: Blob) => {
    window.__tryonitLastCapture = blob.size;
  };

  return (
    <TryOnProvider theme={theme} engineOptions={engineOptions}>
      <DebugToggle debug={debug} />
      <div className="pg-layout">
        <aside className="pg-aside">
          <h1>TryOnIt Playground</h1>
          <p>
            <a href="#/headless">Headless demo</a>
          </p>
          {error && <p className="pg-error">{error}</p>}
          {catalog &&
            Object.entries(catalog).map(([group, items]) => (
              <fieldset key={group} className="pg-fieldset">
                <legend>{group}</legend>
                {items.map((item) => (
                  <label key={item.url} className="pg-asset">
                    <input
                      type="radio"
                      name="asset"
                      checked={asset === item.url}
                      onChange={() => setAsset(item.url)}
                    />
                    {item.name}
                  </label>
                ))}
              </fieldset>
            ))}
          <fieldset className="pg-fieldset">
            <legend>Options</legend>
            <label className="pg-row">
              <span>Layout</span>
              <select
                value={layout}
                onChange={(e) => setLayout(e.target.value as 'inline' | 'modal')}
              >
                <option value="inline">inline</option>
                <option value="modal">modal</option>
              </select>
            </label>
            <label className="pg-row">
              <span>Debug landmarks</span>
              <input type="checkbox" checked={debug} onChange={(e) => setDebug(e.target.checked)} />
            </label>
            <PhotoMode />
          </fieldset>
          <ThemeEditor theme={theme} onChange={setTheme} />
          <PerfHud />
        </aside>
        <main className="pg-stage">
          {layout === 'inline' ? (
            <TryOn key="inline" asset={asset} layout="inline" onCapture={onCapture} />
          ) : (
            <TryOnButton asset={asset} onCapture={onCapture} preload="visible" />
          )}
        </main>
      </div>
    </TryOnProvider>
  );
}

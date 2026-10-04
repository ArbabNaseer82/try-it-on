import { useEffect } from 'react';
import { TryOnProvider, useTryOn, useTryOnState } from '@tryonit/react';

const LIPSTICK = '/assets/lipstick.json';

function CustomUi() {
  const { status, start, setAsset, capture, attach, setVariant } = useTryOn();
  const faceVisible = useTryOnState((s) => s.tracking.faceVisible);
  const variants = useTryOnState((s) => s.asset?.variants ?? []);
  useEffect(() => {
    setAsset(LIPSTICK).catch(() => undefined);
  }, [setAsset]);
  return (
    <div className="pg-headless">
      <div ref={attach} className="pg-headless__stage" />
      <div className="pg-headless__bar">
        <span>
          {status} {status === 'running' && (faceVisible ? 'face found' : 'no face')}
        </span>
        <button type="button" onClick={() => start().catch(() => undefined)}>
          Start
        </button>
        {variants.map((v) => (
          <button
            key={v.id}
            type="button"
            style={{ background: v.swatch }}
            onClick={() => setVariant(v.id)}
          >
            {v.name}
          </button>
        ))}
        <button
          type="button"
          onClick={async () => {
            const blob = await capture();
            window.open(URL.createObjectURL(blob), '_blank');
          }}
        >
          Capture
        </button>
      </div>
    </div>
  );
}

/** 100% custom UI built only with hooks, no TryOnIt components. */
export function Headless() {
  return (
    <TryOnProvider engineOptions={{ modelBaseUrl: '/models', wasmBaseUrl: '/wasm' }}>
      <h2>Headless demo</h2>
      <p>Everything below is custom markup driven by useTryOn and useTryOnState.</p>
      <CustomUi />
    </TryOnProvider>
  );
}

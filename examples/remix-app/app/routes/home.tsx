import { TryOn, TryOnButton } from '@tryonit/react';
import { ClientOnly } from '../components/ClientOnly';

export function meta() {
  return [
    { title: 'TryOnIt + React Router (Remix)' },
    {
      name: 'description',
      content: 'Virtual try-on in React Router v7 framework mode with TryOnIt.',
    },
  ];
}

const engineOptions = { modelBaseUrl: '/models', wasmBaseUrl: '/wasm' };
const ASSETS = [
  '/assets/glasses-aviator.json',
  '/assets/lipstick.json',
  '/assets/earrings.json',
  '/assets/look.json',
];

export default function Home() {
  return (
    <main style={{ maxWidth: 960, margin: '0 auto', padding: 16 }}>
      <h1>Virtual try-on with React Router</h1>
      <p>
        TryOnIt components are SSR safe. The modal button renders on the server, while the inline
        camera view is wrapped in a client only guard.
      </p>
      <TryOnButton asset="/assets/glasses-round.json" engineOptions={engineOptions} />
      <section style={{ height: 640, marginTop: 24 }}>
        <ClientOnly
          fallback={<div style={{ height: '100%', background: '#e2e8f0', borderRadius: 14 }} />}
        >
          {() => (
            <TryOn
              assets={ASSETS}
              layout="inline"
              engineOptions={engineOptions}
              autoStart={false}
            />
          )}
        </ClientOnly>
      </section>
    </main>
  );
}

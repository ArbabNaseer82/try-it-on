'use client';

import { useCallback } from 'react';
import { TryOnButton } from '@tryonit/react';

interface Props {
  id: string;
  name: string;
  price: string;
  thumb: string;
}

/** Client component: the asset comes from an async merchant API call. */
export function ProductCard({ id, name, price, thumb }: Props) {
  const loadAsset = useCallback(
    (signal?: { aborted: boolean }) =>
      fetch(`/api/assets/${id}`, { signal: signal as AbortSignal | undefined }).then((r) => {
        if (!r.ok) throw new Error(`Asset ${id} not found`);
        return r.json() as Promise<unknown>;
      }),
    [id],
  );
  return (
    <article className="card">
      <img src={thumb} alt="" />
      <h2>{name}</h2>
      <p className="price">{price}</p>
      <TryOnButton
        asset={loadAsset}
        preload="visible"
        title={name}
        engineOptions={{ modelBaseUrl: '/models', wasmBaseUrl: '/wasm' }}
        theme={{ colors: { primary: '#0f766e' } }}
      />
    </article>
  );
}

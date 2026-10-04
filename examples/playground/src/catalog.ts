import { useEffect, useState } from 'react';

export interface CatalogItem {
  url: string;
  name: string;
  type: string;
}

export type Catalog = Record<string, CatalogItem[]>;

/** Loads the generated sample catalog (`pnpm generate-assets`). */
export function useCatalog(): { catalog: Catalog | null; error: string | null } {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    (async () => {
      const res = await fetch('/assets/catalog.json');
      if (!res.ok) throw new Error('Run `pnpm generate-assets` to create the sample assets.');
      const groups = (await res.json()) as Record<string, string[]>;
      const out: Catalog = {};
      for (const [group, files] of Object.entries(groups)) {
        out[group] = await Promise.all(
          files.map(async (file) => {
            const url = `/assets/${file}`;
            const manifest = (await fetch(url).then((r) => r.json())) as {
              name?: string;
              id: string;
              type: string;
            };
            return { url, name: manifest.name ?? manifest.id, type: manifest.type };
          }),
        );
      }
      setCatalog(out);
    })().catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, []);
  return { catalog, error };
}

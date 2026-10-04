import { useSyncExternalStore, type ReactNode } from 'react';

const subscribe = () => () => {};

/** Renders `fallback` on the server and during hydration, then `children` on the client. */
export function ClientOnly({
  children,
  fallback = null,
}: {
  children: () => ReactNode;
  fallback?: ReactNode;
}) {
  const hydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  return <>{hydrated ? children() : fallback}</>;
}

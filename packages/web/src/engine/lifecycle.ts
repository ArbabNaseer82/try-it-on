/**
 * Pauses the session when the page is hidden and resumes when it becomes visible again,
 * but only if the pause was automatic.
 */
export function watchVisibility(handlers: { onHidden(): void; onVisible(): void }): () => void {
  if (typeof document === 'undefined') return () => {};
  const listener = () => {
    if (document.visibilityState === 'hidden') handlers.onHidden();
    else handlers.onVisible();
  };
  document.addEventListener('visibilitychange', listener);
  return () => document.removeEventListener('visibilitychange', listener);
}

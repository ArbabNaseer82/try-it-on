import type { KeyboardEvent } from 'react';

function step(key: string, rtl: boolean): number | 'first' | 'last' | null {
  switch (key) {
    case 'ArrowRight':
      return rtl ? -1 : 1;
    case 'ArrowLeft':
      return rtl ? 1 : -1;
    case 'ArrowDown':
      return 1;
    case 'ArrowUp':
      return -1;
    case 'Home':
      return 'first';
    case 'End':
      return 'last';
    default:
      return null;
  }
}

/** Arrow key navigation for radio groups. Calls `select` with the new index. */
export function rovingKeyDown(
  event: KeyboardEvent<HTMLElement>,
  index: number,
  count: number,
  select: (index: number) => void,
): void {
  const move = step(event.key, getComputedStyle(event.currentTarget).direction === 'rtl');
  if (move === null) return;
  event.preventDefault();
  const next = move === 'first' ? 0 : move === 'last' ? count - 1 : (index + move + count) % count;
  select(next);
  const group = event.currentTarget.parentElement;
  (group?.children[next] as HTMLElement | undefined)?.focus();
}

import { useEffect, useId, useRef, useSyncExternalStore, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useTryOnContext } from '../../provider/contexts';
import { cx } from '../../utils/cx';
import { useLatest } from '../../utils/useLatest';

export interface TryOnModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children?: ReactNode;
  /** Classes for the backdrop root (theme scope) and the dialog. */
  className?: string;
  dialogClassName?: string;
  fullscreen?: boolean;
  unstyled?: boolean;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const subscribeNoop = () => () => {};
/** True only after hydration on the client. */
function useIsClient(): boolean {
  return useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  );
}

/**
 * Accessible dialog: focus trap, Escape to close, focus returns to the opener, body scroll
 * lock, portal to `document.body`.
 */
export function TryOnModal({
  open,
  onClose,
  title,
  children,
  className,
  dialogClassName,
  fullscreen,
  unstyled,
}: TryOnModalProps) {
  const { labels, icons, rootStyle, dir, themeMode } = useTryOnContext();
  const isClient = useIsClient();
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const onCloseRef = useLatest(onClose);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const first = dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? dialogRef.current)?.focus();
    // Listen on the document: focus can fall back to <body> when a focused control becomes
    // disabled (for example the shutter while capturing), and Escape must still work.
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      const dialog = dialogRef.current;
      if (!dialog) return;
      if (event.key === 'Escape') {
        event.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const items = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => !el.closest('[hidden], [inert]'),
      );
      if (items.length === 0) return;
      const firstItem = items[0] as HTMLElement;
      const lastItem = items[items.length - 1] as HTMLElement;
      const active = document.activeElement;
      if (!dialog.contains(active)) {
        event.preventDefault();
        (event.shiftKey ? lastItem : firstItem).focus();
      } else if (event.shiftKey && active === firstItem) {
        event.preventDefault();
        lastItem.focus();
      } else if (!event.shiftKey && active === lastItem) {
        event.preventDefault();
        firstItem.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, [open, onCloseRef]);

  if (!open || !isClient) return null;
  const Close = icons.close;

  return createPortal(
    <div
      className={cx('toi-root', 'toi-backdrop', unstyled && 'toi-unstyled', className)}
      style={rootStyle}
      dir={dir}
      data-theme-mode={themeMode}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCloseRef.current();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cx('toi-modal', fullscreen && 'toi-modal--fullscreen', dialogClassName)}
      >
        <div className="toi-modal__header">
          <h2 id={titleId} className="toi-modal__title">
            {title ?? labels.dialogTitle}
          </h2>
          <button
            type="button"
            className="toi-btn toi-icon-btn toi-modal__close"
            aria-label={labels.close}
            onClick={() => onCloseRef.current()}
          >
            <Close />
          </button>
        </div>
        <div className="toi-modal__body">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

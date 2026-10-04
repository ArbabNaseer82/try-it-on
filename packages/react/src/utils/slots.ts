import { createElement, type ComponentType, type ReactElement } from 'react';

/** Renders the user slot component when provided, otherwise the default one. */
export function renderSlot<P extends object>(
  custom: ComponentType<P> | undefined,
  fallback: ComponentType<P>,
  props: P,
): ReactElement {
  return createElement(custom ?? fallback, props);
}

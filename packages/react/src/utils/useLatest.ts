import { useEffect, useRef } from 'react';

/** Keeps the latest value in a ref for use in event handlers and long lived subscriptions. */
export function useLatest<T>(value: T) {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  });
  return ref;
}

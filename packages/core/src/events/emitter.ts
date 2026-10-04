export type EventMap = Record<string, unknown>;
export type Handler<T> = (payload: T) => void;

/** Small typed event emitter with no dependencies. */
export interface Emitter<E extends EventMap> {
  on<K extends keyof E>(event: K, handler: Handler<E[K]>): () => void;
  once<K extends keyof E>(event: K, handler: Handler<E[K]>): () => void;
  off<K extends keyof E>(event: K, handler: Handler<E[K]>): void;
  emit<K extends keyof E>(event: K, payload: E[K]): void;
  /** Number of handlers for an event, or for all events when omitted. */
  listenerCount(event?: keyof E): number;
  clear(): void;
}

export function createEmitter<E extends EventMap>(): Emitter<E> {
  const handlers = new Map<keyof E, Set<Handler<never>>>();

  const emitter: Emitter<E> = {
    on(event, handler) {
      let set = handlers.get(event);
      if (!set) {
        set = new Set();
        handlers.set(event, set);
      }
      set.add(handler as Handler<never>);
      return () => emitter.off(event, handler);
    },
    once(event, handler) {
      const off = emitter.on(event, (payload) => {
        off();
        handler(payload);
      });
      return off;
    },
    off(event, handler) {
      const set = handlers.get(event);
      set?.delete(handler as Handler<never>);
      if (set && set.size === 0) handlers.delete(event);
    },
    emit(event, payload) {
      const set = handlers.get(event);
      if (!set) return;
      for (const handler of [...set]) (handler as Handler<E[typeof event]>)(payload);
    },
    listenerCount(event) {
      if (event !== undefined) return handlers.get(event)?.size ?? 0;
      let total = 0;
      for (const set of handlers.values()) total += set.size;
      return total;
    },
    clear() {
      handlers.clear();
    },
  };
  return emitter;
}

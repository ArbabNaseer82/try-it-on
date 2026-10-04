import { describe, expect, it, vi } from 'vitest';
import { ErrorCode, TryOnError, createEmitter, isTryOnError, toTryOnError } from '../src';

describe('createEmitter', () => {
  it('on, once, off, emit, count and clear', () => {
    const emitter = createEmitter<{ a: number; b: string }>();
    const a = vi.fn();
    const once = vi.fn();
    const off = emitter.on('a', a);
    emitter.once('a', once);
    emitter.emit('a', 1);
    emitter.emit('a', 2);
    expect(a).toHaveBeenCalledTimes(2);
    expect(once).toHaveBeenCalledTimes(1);
    expect(emitter.listenerCount('a')).toBe(1);
    expect(emitter.listenerCount()).toBe(1);
    off();
    expect(emitter.listenerCount('a')).toBe(0);
    emitter.emit('b', 'nobody');
    emitter.on('b', vi.fn());
    emitter.clear();
    expect(emitter.listenerCount()).toBe(0);
  });
});

describe('TryOnError', () => {
  it('exposes retry and photo fallback hints', () => {
    const denied = new TryOnError(ErrorCode.CAMERA_DENIED, 'denied', { cause: 'x' });
    expect(denied.retryable).toBe(true);
    expect(denied.canUsePhotoFallback).toBe(true);
    expect(denied.cause).toBe('x');
    const webgl = new TryOnError(ErrorCode.WEBGL_UNSUPPORTED, 'no gl');
    expect(webgl.retryable).toBe(false);
    expect(webgl.canUsePhotoFallback).toBe(false);
    expect(isTryOnError(webgl)).toBe(true);
    expect(isTryOnError(new Error('x'))).toBe(false);
  });

  it('wraps unknown values', () => {
    const e = new TryOnError(ErrorCode.UNKNOWN, 'x');
    expect(toTryOnError(e)).toBe(e);
    expect(toTryOnError(new Error('boom'), ErrorCode.TRACKER_FAILED).code).toBe('TRACKER_FAILED');
    expect(toTryOnError('str').message).toBe('str');
  });
});

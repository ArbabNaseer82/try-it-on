/**
 * Stable error codes emitted by every TryOnIt package.
 * Use them to show your own messages or to report analytics.
 */
export const ErrorCode = {
  INSECURE_CONTEXT: 'INSECURE_CONTEXT',
  CAMERA_DENIED: 'CAMERA_DENIED',
  CAMERA_NOT_FOUND: 'CAMERA_NOT_FOUND',
  CAMERA_IN_USE: 'CAMERA_IN_USE',
  WEBGL_UNSUPPORTED: 'WEBGL_UNSUPPORTED',
  MODEL_LOAD_FAILED: 'MODEL_LOAD_FAILED',
  ASSET_INVALID: 'ASSET_INVALID',
  ASSET_LOAD_FAILED: 'ASSET_LOAD_FAILED',
  TRACKER_FAILED: 'TRACKER_FAILED',
  UNKNOWN: 'UNKNOWN',
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

/** A single validation problem, with a path such as `variants[2].color`. */
export interface ValidationIssue {
  path: string;
  message: string;
  expected?: string;
  received?: string;
}

export interface TryOnErrorOptions {
  cause?: unknown;
  issues?: ValidationIssue[];
}

/** Error codes where calling `start()` again can succeed. */
const RETRYABLE: ReadonlySet<ErrorCode> = new Set<ErrorCode>([
  ErrorCode.CAMERA_DENIED,
  ErrorCode.CAMERA_NOT_FOUND,
  ErrorCode.CAMERA_IN_USE,
  ErrorCode.MODEL_LOAD_FAILED,
  ErrorCode.ASSET_LOAD_FAILED,
  ErrorCode.TRACKER_FAILED,
  ErrorCode.UNKNOWN,
]);

/** Error codes where uploading a photo is a valid fallback. */
const PHOTO_FALLBACK: ReadonlySet<ErrorCode> = new Set<ErrorCode>([
  ErrorCode.CAMERA_DENIED,
  ErrorCode.CAMERA_NOT_FOUND,
  ErrorCode.CAMERA_IN_USE,
  ErrorCode.INSECURE_CONTEXT,
]);

/** The only error type thrown by TryOnIt. Check `code` instead of `message`. */
export class TryOnError extends Error {
  readonly code: ErrorCode;
  readonly issues: ValidationIssue[];
  override readonly cause?: unknown;

  constructor(code: ErrorCode, message: string, options: TryOnErrorOptions = {}) {
    super(message);
    this.name = 'TryOnError';
    this.code = code;
    this.issues = options.issues ?? [];
    if (options.cause !== undefined) this.cause = options.cause;
  }

  /** True when retrying the same action can succeed. */
  get retryable(): boolean {
    return RETRYABLE.has(this.code);
  }

  /** True when the photo upload fallback should be offered. */
  get canUsePhotoFallback(): boolean {
    return PHOTO_FALLBACK.has(this.code);
  }
}

/** Type guard for {@link TryOnError}. */
export function isTryOnError(value: unknown): value is TryOnError {
  return value instanceof TryOnError;
}

/** Wraps any thrown value into a {@link TryOnError}, keeping existing ones untouched. */
export function toTryOnError(value: unknown, fallback: ErrorCode = ErrorCode.UNKNOWN): TryOnError {
  if (value instanceof TryOnError) return value;
  const message = value instanceof Error ? value.message : String(value);
  return new TryOnError(fallback, message, { cause: value });
}

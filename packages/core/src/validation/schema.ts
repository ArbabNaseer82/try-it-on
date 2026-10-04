import { ErrorCode, TryOnError, type ValidationIssue } from '../domain/errors';
import { describeValue, formatIssues, formatPath, type PathSegment } from './issues';

/** Options accepted by `parse` and `safeParse`. */
export interface ParseOptions {
  /** Called for non fatal notes, such as unknown keys being stripped. Pass `console.warn` in debug mode. */
  warn?: (message: string) => void;
  /** Label used in the thrown error message, for example the asset id. */
  label?: string;
}

interface Context {
  issues: ValidationIssue[];
  warn: ((message: string) => void) | undefined;
}

const INVALID: unique symbol = Symbol('invalid');
type Invalid = typeof INVALID;

export type SafeParseResult<T> =
  { success: true; data: T } | { success: false; issues: ValidationIssue[] };

/** A runtime schema that validates unknown input and produces a typed value. */
export interface Schema<T> {
  /** Human readable description of what is expected, used in issues and error messages. */
  readonly expected: string;
  /** Throws `TryOnError(ASSET_INVALID)` with path based issues when invalid. */
  parse(input: unknown, options?: ParseOptions): T;
  safeParse(input: unknown, options?: ParseOptions): SafeParseResult<T>;
  /** @internal */
  run(input: unknown, ctx: Context, path: PathSegment[]): T | Invalid;
}

/** Marker for object keys that may be omitted. */
export interface OptionalSchema<T> extends Schema<T | undefined> {
  readonly optional: true;
  readonly inner: Schema<T>;
}

/** A schema with a default value. The key may be omitted in input but is always present in output. */
export interface DefaultSchema<T> extends Schema<T> {
  readonly inner: Schema<T>;
  readonly defaultValue: T;
}

export type Shape = Record<string, Schema<unknown>>;

export interface ObjectSchema<S extends Shape> extends Schema<InferShape<S>> {
  readonly shape: S;
  readonly strict: boolean;
}

export type Infer<S> = S extends Schema<infer T> ? T : never;

type Simplify<T> = { [K in keyof T]: T[K] } & {};
type OptionalKeys<S extends Shape> = {
  [K in keyof S]: S[K] extends { readonly optional: true } ? K : never;
}[keyof S];
type RequiredKeys<S extends Shape> = Exclude<keyof S, OptionalKeys<S>>;
export type InferShape<S extends Shape> = Simplify<
  { [K in RequiredKeys<S>]: Infer<S[K]> } & {
    [K in OptionalKeys<S>]?: Exclude<Infer<S[K]>, undefined>;
  }
>;

function makeSchema<T>(
  expected: string,
  run: (input: unknown, ctx: Context, path: PathSegment[]) => T | Invalid,
): Schema<T> {
  const schema: Schema<T> = {
    expected,
    run,
    safeParse(input, options) {
      const ctx: Context = { issues: [], warn: options?.warn };
      const data = run(input, ctx, []);
      if (data === INVALID || ctx.issues.length > 0) return { success: false, issues: ctx.issues };
      return { success: true, data };
    },
    parse(input, options) {
      const result = schema.safeParse(input, options);
      if (result.success) return result.data;
      const label = options?.label ? ` "${options.label}"` : '';
      throw new TryOnError(
        ErrorCode.ASSET_INVALID,
        `Invalid asset${label}:\n${formatIssues(result.issues)}`,
        { issues: result.issues },
      );
    },
  };
  return schema;
}

function fail(
  ctx: Context,
  path: PathSegment[],
  message: string,
  expected: string,
  input: unknown,
): Invalid {
  ctx.issues.push({ path: formatPath(path), message, expected, received: describeValue(input) });
  return INVALID;
}

// Primitive schemas ---------------------------------------------------------

export interface StringOptions {
  min?: number;
  max?: number;
  pattern?: RegExp;
  /** Accepts absolute http(s), data and blob URLs plus relative paths. Rejects script URLs. */
  url?: boolean;
}

const SAFE_URL =
  /^(?:https?:\/\/|data:|blob:|\/\/|\/|\.{1,2}\/|[\w@%+~-][\w./@%+~-]*(?:[?#].*)?$)/i;
const UNSAFE_SCHEME = /^\s*(?:javascript|vbscript):/i;

function string(options: StringOptions = {}): Schema<string> {
  const expected = options.url ? 'url' : 'string';
  return makeSchema(expected, (input, ctx, path) => {
    if (typeof input !== 'string') return fail(ctx, path, `Expected ${expected}`, expected, input);
    if (options.min !== undefined && input.length < options.min)
      return fail(ctx, path, `Must be at least ${options.min} characters`, expected, input);
    if (options.max !== undefined && input.length > options.max)
      return fail(ctx, path, `Must be at most ${options.max} characters`, expected, input);
    if (options.pattern && !options.pattern.test(input))
      return fail(ctx, path, `Does not match ${String(options.pattern)}`, expected, input);
    if (options.url && (UNSAFE_SCHEME.test(input) || /\s/.test(input) || !SAFE_URL.test(input)))
      return fail(
        ctx,
        path,
        'Expected a valid http(s), data, blob or relative URL',
        expected,
        input,
      );
    return input;
  });
}

export interface NumberOptions {
  min?: number;
  max?: number;
  int?: boolean;
}

function number(options: NumberOptions = {}): Schema<number> {
  return makeSchema('number', (input, ctx, path) => {
    if (typeof input !== 'number' || !Number.isFinite(input))
      return fail(ctx, path, 'Expected a finite number', 'number', input);
    if (options.int && !Number.isInteger(input))
      return fail(ctx, path, 'Expected an integer', 'integer', input);
    if (options.min !== undefined && input < options.min)
      return fail(ctx, path, `Must be >= ${options.min}`, `number >= ${options.min}`, input);
    if (options.max !== undefined && input > options.max)
      return fail(ctx, path, `Must be <= ${options.max}`, `number <= ${options.max}`, input);
    return input;
  });
}

function boolean(): Schema<boolean> {
  return makeSchema('boolean', (input, ctx, path) =>
    typeof input === 'boolean' ? input : fail(ctx, path, 'Expected boolean', 'boolean', input),
  );
}

function unknownSchema(): Schema<unknown> {
  return makeSchema('unknown', (input) => input);
}

type Primitive = string | number | boolean | null;

function literal<const T extends Primitive>(value: T): Schema<T> {
  const expected = JSON.stringify(value);
  return makeSchema(expected, (input, ctx, path) =>
    input === value ? value : fail(ctx, path, `Expected ${expected}`, expected, input),
  );
}

function enumSchema<const T extends readonly [string, ...string[]]>(values: T): Schema<T[number]> {
  const expected = values.map((v) => `"${v}"`).join(' | ');
  const set = new Set<string>(values);
  return makeSchema(expected, (input, ctx, path) =>
    typeof input === 'string' && set.has(input)
      ? (input as T[number])
      : fail(ctx, path, `Expected one of ${expected}`, expected, input),
  );
}

const COLOR =
  /^(?:#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})|rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(?:,\s*(?:0|1|0?\.\d+|1\.0+)\s*)?\))$/i;

/** Accepts #RGB, #RGBA, #RRGGBB, #RRGGBBAA, rgb() and rgba(). */
function color(): Schema<string> {
  return makeSchema('color', (input, ctx, path) => {
    if (typeof input !== 'string' || !COLOR.test(input.trim()))
      return fail(ctx, path, 'Expected a color like #RRGGBB or rgb(r, g, b)', 'color', input);
    return input.trim();
  });
}

// Composite schemas ---------------------------------------------------------

export interface ArrayOptions {
  min?: number;
  max?: number;
}

function array<T>(item: Schema<T>, options: ArrayOptions = {}): Schema<T[]> {
  const expected = `${item.expected}[]`;
  return makeSchema(expected, (input, ctx, path) => {
    if (!Array.isArray(input)) return fail(ctx, path, 'Expected array', expected, input);
    if (options.min !== undefined && input.length < options.min)
      return fail(ctx, path, `Must contain at least ${options.min} item(s)`, expected, input);
    if (options.max !== undefined && input.length > options.max)
      return fail(ctx, path, `Must contain at most ${options.max} item(s)`, expected, input);
    const out: T[] = [];
    let ok = true;
    input.forEach((value: unknown, i) => {
      const result = item.run(value, ctx, [...path, i]);
      if (result === INVALID) ok = false;
      else out.push(result);
    });
    return ok ? out : INVALID;
  });
}

type InferTuple<T extends readonly Schema<unknown>[]> = { -readonly [K in keyof T]: Infer<T[K]> };

function tuple<const T extends readonly Schema<unknown>[]>(items: T): Schema<InferTuple<T>> {
  const expected = `[${items.map((i) => i.expected).join(', ')}]`;
  return makeSchema(expected, (input, ctx, path) => {
    if (!Array.isArray(input) || input.length !== items.length)
      return fail(ctx, path, `Expected tuple of length ${items.length}`, expected, input);
    const out: unknown[] = [];
    let ok = true;
    items.forEach((schema, i) => {
      const result = schema.run(input[i], ctx, [...path, i]);
      if (result === INVALID) ok = false;
      else out.push(result);
    });
    return ok ? (out as InferTuple<T>) : INVALID;
  });
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export interface ObjectOptions {
  /** Reports unknown keys as issues instead of stripping them. */
  strict?: boolean;
}

function object<S extends Shape>(shape: S, options: ObjectOptions = {}): ObjectSchema<S> {
  const strict = options.strict ?? false;
  const keys = Object.keys(shape);
  const base = makeSchema<InferShape<S>>('object', (input, ctx, path) => {
    if (!isPlainObject(input)) return fail(ctx, path, 'Expected object', 'object', input);
    const out: Record<string, unknown> = {};
    let ok = true;
    for (const key of keys) {
      const schema = shape[key] as Schema<unknown>;
      const result = schema.run(input[key], ctx, [...path, key]);
      if (result === INVALID) ok = false;
      else if (result !== undefined) out[key] = result;
    }
    for (const key of Object.keys(input)) {
      if (key in shape) continue;
      if (strict) {
        ctx.issues.push({
          path: formatPath([...path, key]),
          message: 'Unknown key',
          expected: 'no extra keys',
          received: describeValue(input[key]),
        });
        ok = false;
      } else {
        ctx.warn?.(`[tryonit] Unknown key "${formatPath([...path, key])}" was stripped.`);
      }
    }
    return ok ? (out as InferShape<S>) : INVALID;
  });
  return Object.assign(base, { shape, strict });
}

function record<T>(value: Schema<T>): Schema<Record<string, T>> {
  const expected = `Record<string, ${value.expected}>`;
  return makeSchema(expected, (input, ctx, path) => {
    if (!isPlainObject(input)) return fail(ctx, path, 'Expected object', expected, input);
    const out: Record<string, T> = {};
    let ok = true;
    for (const [key, v] of Object.entries(input)) {
      const result = value.run(v, ctx, [...path, key]);
      if (result === INVALID) ok = false;
      else out[key] = result;
    }
    return ok ? out : INVALID;
  });
}

function optional<T>(inner: Schema<T>): OptionalSchema<T>;
function optional<T>(inner: Schema<T>, defaultValue: T): DefaultSchema<T>;
function optional<T>(inner: Schema<T>, ...rest: [] | [T]): OptionalSchema<T> | DefaultSchema<T> {
  if (rest.length === 1) {
    const defaultValue = rest[0];
    const base = makeSchema<T>(inner.expected, (input, ctx, path) =>
      input === undefined ? defaultValue : inner.run(input, ctx, path),
    );
    return Object.assign(base, { inner, defaultValue });
  }
  const base = makeSchema<T | undefined>(`${inner.expected} | undefined`, (input, ctx, path) =>
    input === undefined ? undefined : inner.run(input, ctx, path),
  );
  return Object.assign(base, { optional: true as const, inner });
}

/** Makes every key of an object schema optional and drops defaults (used for variant overrides). */
function partial<S extends Shape>(
  schema: ObjectSchema<S>,
): ObjectSchema<{ [K in keyof S]: OptionalSchema<Exclude<Infer<S[K]>, undefined>> }> {
  const shape: Record<string, Schema<unknown>> = {};
  for (const [key, value] of Object.entries(schema.shape)) {
    const inner = 'inner' in value ? (value as { inner: Schema<unknown> }).inner : value;
    shape[key] = optional(inner);
  }
  return object(shape, { strict: schema.strict }) as unknown as ObjectSchema<{
    [K in keyof S]: OptionalSchema<Exclude<Infer<S[K]>, undefined>>;
  }>;
}

function union<const T extends readonly Schema<unknown>[]>(
  ...options: T
): Schema<Infer<T[number]>> {
  const expected = options.map((o) => o.expected).join(' | ');
  return makeSchema(expected, (input, ctx, path) => {
    for (const option of options) {
      const local: Context = { issues: [], warn: ctx.warn };
      const result = option.run(input, local, path);
      if (result !== INVALID && local.issues.length === 0) return result as Infer<T[number]>;
    }
    return fail(ctx, path, `Expected ${expected}`, expected, input);
  });
}

function discriminatedUnion<K extends string, M extends Record<string, Schema<unknown>>>(
  key: K,
  map: M,
): Schema<Infer<M[keyof M]>> {
  const names = Object.keys(map);
  const expected = names.map((n) => `"${n}"`).join(' | ');
  return makeSchema('object', (input, ctx, path) => {
    if (!isPlainObject(input)) return fail(ctx, path, 'Expected object', 'object', input);
    const tag = input[key];
    const schema = typeof tag === 'string' ? map[tag] : undefined;
    if (!schema) return fail(ctx, [...path, key], `Expected one of ${expected}`, expected, tag);
    return schema.run(input, ctx, path) as Infer<M[keyof M]> | Invalid;
  });
}

function refine<T>(inner: Schema<T>, check: (value: T) => boolean, message: string): Schema<T> {
  return makeSchema(inner.expected, (input, ctx, path) => {
    const result = inner.run(input, ctx, path);
    if (result === INVALID) return INVALID;
    if (!check(result)) {
      ctx.issues.push({ path: formatPath(path), message, expected: inner.expected });
      return INVALID;
    }
    return result;
  });
}

/** Tiny schema builder. Replaces Zod for TryOnIt with a fraction of the size. */
export const s = {
  string,
  number,
  boolean,
  unknown: unknownSchema,
  literal,
  enum: enumSchema,
  color,
  array,
  tuple,
  object,
  record,
  optional,
  partial,
  union,
  discriminatedUnion,
  refine,
};

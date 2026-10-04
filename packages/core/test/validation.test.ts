import { describe, expect, it, vi } from 'vitest';
import { ErrorCode, TryOnError, s, formatIssues, type Infer } from '../src';

describe('s.string', () => {
  it('accepts strings and enforces length and pattern', () => {
    const schema = s.string({ min: 2, max: 4, pattern: /^[a-z]+$/ });
    expect(schema.parse('abc')).toBe('abc');
    expect(schema.safeParse('a').success).toBe(false);
    expect(schema.safeParse('abcde').success).toBe(false);
    expect(schema.safeParse('AB').success).toBe(false);
    expect(schema.safeParse(3).success).toBe(false);
  });

  it('validates urls and rejects script urls', () => {
    const url = s.string({ url: true });
    for (const ok of [
      'https://cdn.example.com/a.glb',
      '/assets/a.glb',
      './a.glb',
      '../a.glb',
      'a.glb',
      'data:image/png;base64,AAA',
      'blob:abc',
      '//cdn.x/a.png',
    ]) {
      expect(url.safeParse(ok).success, ok).toBe(true);
    }
    for (const bad of ['javascript:alert(1)', 'has space.png', '', ' vbscript:x']) {
      expect(url.safeParse(bad).success, bad).toBe(false);
    }
  });
});

describe('s.number', () => {
  it('checks finite, int, min and max', () => {
    const schema = s.number({ min: 0, max: 10, int: true });
    expect(schema.parse(5)).toBe(5);
    expect(schema.safeParse(5.5).success).toBe(false);
    expect(schema.safeParse(-1).success).toBe(false);
    expect(schema.safeParse(11).success).toBe(false);
    expect(schema.safeParse(Number.NaN).success).toBe(false);
    expect(schema.safeParse('5').success).toBe(false);
  });
});

describe('primitives', () => {
  it('boolean, literal, enum, unknown', () => {
    expect(s.boolean().parse(true)).toBe(true);
    expect(s.boolean().safeParse('true').success).toBe(false);
    expect(s.literal(1).parse(1)).toBe(1);
    expect(s.literal(1).safeParse(2).success).toBe(false);
    const e = s.enum(['a', 'b']);
    expect(e.parse('a')).toBe('a');
    const bad = e.safeParse('c');
    expect(bad.success).toBe(false);
    if (!bad.success) expect(bad.issues[0]?.expected).toBe('"a" | "b"');
    expect(s.unknown().parse({ x: 1 })).toEqual({ x: 1 });
  });

  it('color accepts hex and rgb forms', () => {
    const c = s.color();
    for (const ok of [
      '#fff',
      '#ffff',
      '#a1b2c3',
      '#a1b2c3d4',
      'rgb(1, 2, 3)',
      'rgba(255,0,0,0.5)',
      ' #FFF ',
    ]) {
      expect(c.safeParse(ok).success, ok).toBe(true);
    }
    for (const bad of ['red', '#ggg', 'rgb(1,2)', '#12345', 12]) {
      expect(c.safeParse(bad).success, String(bad)).toBe(false);
    }
    expect(c.parse(' #FFF ')).toBe('#FFF');
  });
});

describe('composites', () => {
  it('array with bounds and item paths', () => {
    const schema = s.array(s.number(), { min: 1, max: 3 });
    expect(schema.parse([1, 2])).toEqual([1, 2]);
    expect(schema.safeParse([]).success).toBe(false);
    expect(schema.safeParse([1, 2, 3, 4]).success).toBe(false);
    expect(schema.safeParse('x').success).toBe(false);
    const result = schema.safeParse([1, 'x']);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.issues[0]?.path).toBe('[1]');
  });

  it('tuple', () => {
    const t = s.tuple([s.number(), s.string()]);
    expect(t.parse([1, 'a'])).toEqual([1, 'a']);
    expect(t.safeParse([1]).success).toBe(false);
    expect(t.safeParse([1, 2]).success).toBe(false);
  });

  it('object strips unknown keys and warns, strict mode reports them', () => {
    const shape = { a: s.number(), b: s.optional(s.string()), c: s.optional(s.number(), 7) };
    const loose = s.object(shape);
    const warn = vi.fn();
    expect(loose.parse({ a: 1, extra: true }, { warn })).toEqual({ a: 1, c: 7 });
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('extra'));
    const strict = s.object(shape, { strict: true });
    const result = strict.safeParse({ a: 1, extra: true });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.issues[0]?.path).toBe('extra');
    expect(loose.safeParse(null).success).toBe(false);
    expect(loose.safeParse([]).success).toBe(false);
    type Out = Infer<typeof loose>;
    const typed: Out = { a: 1, c: 2 };
    expect(typed.a).toBe(1);
  });

  it('record', () => {
    const r = s.record(s.number());
    expect(r.parse({ a: 1 })).toEqual({ a: 1 });
    const bad = r.safeParse({ a: 'x' });
    expect(bad.success).toBe(false);
    if (!bad.success) expect(bad.issues[0]?.path).toBe('a');
    expect(r.safeParse(1).success).toBe(false);
  });

  it('partial removes defaults', () => {
    const base = s.object({ a: s.number(), b: s.optional(s.number(), 3) });
    const p = s.partial(base);
    expect(p.parse({})).toEqual({});
    expect(p.parse({ b: 1 })).toEqual({ b: 1 });
  });

  it('union and discriminated union', () => {
    const u = s.union(s.number(), s.string());
    expect(u.parse(1)).toBe(1);
    expect(u.parse('x')).toBe('x');
    expect(u.safeParse(true).success).toBe(false);
    const d = s.discriminatedUnion('kind', {
      a: s.object({ kind: s.literal('a'), n: s.number() }),
      b: s.object({ kind: s.literal('b'), t: s.string() }),
    });
    expect(d.parse({ kind: 'a', n: 1 })).toEqual({ kind: 'a', n: 1 });
    const bad = d.safeParse({ kind: 'z' });
    expect(bad.success).toBe(false);
    if (!bad.success) expect(bad.issues[0]?.path).toBe('kind');
    expect(d.safeParse('x').success).toBe(false);
  });

  it('refine', () => {
    const even = s.refine(s.number(), (n) => n % 2 === 0, 'Must be even');
    expect(even.parse(2)).toBe(2);
    const bad = even.safeParse(3);
    expect(bad.success).toBe(false);
    if (!bad.success) expect(bad.issues[0]?.message).toBe('Must be even');
    expect(even.safeParse('x').success).toBe(false);
  });

  it('parse throws TryOnError with issues and nested paths', () => {
    const schema = s.object({ variants: s.array(s.object({ color: s.color() })) });
    try {
      schema.parse(
        { variants: [{ color: '#fff' }, { color: '#fff' }, { color: 'nope' }] },
        { label: 'x' },
      );
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(TryOnError);
      const e = error as TryOnError;
      expect(e.code).toBe(ErrorCode.ASSET_INVALID);
      expect(e.issues[0]?.path).toBe('variants[2].color');
      expect(e.message).toContain('"x"');
      expect(formatIssues(e.issues)).toContain('variants[2].color');
    }
  });

  it('formats root issues', () => {
    expect(formatIssues([{ path: '', message: 'bad' }])).toContain('(root)');
  });
});

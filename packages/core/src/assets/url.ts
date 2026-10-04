const ABSOLUTE = /^[a-z][a-z\d+.-]*:/i;

/**
 * Resolves `relative` against `base`, like `new URL(relative, base)` but without relying on
 * the URL global (keeps core usable in React Native and other non browser runtimes).
 * Works with absolute bases (`https://cdn/x/a.json`) and path only bases (`/assets/a.json`).
 */
export function resolveUrl(relative: string, base?: string): string {
  if (!base || ABSOLUTE.test(relative)) return relative;
  if (relative.startsWith('//')) {
    const scheme = /^([a-z][a-z\d+.-]*:)/i.exec(base);
    return scheme ? `${scheme[1]}${relative}` : relative;
  }
  const match = /^([a-z][a-z\d+.-]*:\/\/[^/?#]*)?([^?#]*)/i.exec(base);
  const origin = match?.[1] ?? '';
  const basePath = match?.[2] ?? '';
  if (relative.startsWith('/')) return origin + relative;
  if (relative === '' || relative.startsWith('?') || relative.startsWith('#')) {
    return origin + basePath + relative;
  }
  const dir = basePath.slice(0, basePath.lastIndexOf('/') + 1);
  const [pathPart, suffix = ''] = splitSuffix(relative);
  const segments = (dir + pathPart).split('/');
  const out: string[] = [];
  segments.forEach((segment, i) => {
    if (segment === '..') {
      if (out.length > 1 || (out.length === 1 && out[0] !== '')) out.pop();
      if (i === segments.length - 1) out.push('');
    } else if (segment === '.') {
      if (i === segments.length - 1) out.push('');
    } else {
      out.push(segment);
    }
  });
  let path = out.join('/');
  if (dir.startsWith('/') && !path.startsWith('/')) path = `/${path}`;
  return origin + path + suffix;
}

function splitSuffix(value: string): [string, string] {
  const index = value.search(/[?#]/);
  return index === -1 ? [value, ''] : [value.slice(0, index), value.slice(index)];
}

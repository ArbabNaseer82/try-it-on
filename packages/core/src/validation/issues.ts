import type { ValidationIssue } from '../domain/errors';

export type PathSegment = string | number;

/** Formats a path array into `variants[2].color` style. */
export function formatPath(path: readonly PathSegment[]): string {
  let out = '';
  for (const segment of path) {
    if (typeof segment === 'number') out += `[${segment}]`;
    else out += out === '' ? segment : `.${segment}`;
  }
  return out;
}

/** Describes a runtime value for issue messages: `string`, `null`, `array`, `number (NaN)`. */
export function describeValue(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'number' && Number.isNaN(value)) return 'number (NaN)';
  return typeof value;
}

/** Renders issues as a readable multi line string. */
export function formatIssues(issues: readonly ValidationIssue[]): string {
  return issues
    .map((issue) => {
      const where = issue.path === '' ? '(root)' : issue.path;
      return `  - ${where}: ${issue.message}`;
    })
    .join('\n');
}

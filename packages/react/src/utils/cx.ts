/** Joins truthy class names. */
export function cx(...values: (string | false | null | undefined)[]): string {
  let out = '';
  for (const v of values) if (v) out = out ? `${out} ${v}` : v;
  return out;
}

// Keeps schema/manifest.v1.schema.json (editor autocomplete) in sync with the runtime validator.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ASSET_TYPES, MANIFEST_DEFAULTS, safeValidateManifest } from '../src';
import { assetPropShapes } from '../src/validation/manifest.schema';
import type { Schema } from '../src/validation/schema';

interface JsonBranch {
  title: string;
  required: string[];
  properties: Record<string, { const?: unknown; enum?: string[]; default?: unknown }>;
}

const jsonSchema = JSON.parse(
  readFileSync(join(__dirname, '../../../schema/manifest.v1.schema.json'), 'utf8'),
) as { oneOf: JsonBranch[] };

const isOptional = (schema: Schema<unknown>) => 'optional' in schema || 'defaultValue' in schema;

describe('JSON Schema sync', () => {
  it('covers exactly the runtime asset types', () => {
    const types = jsonSchema.oneOf.map((b) => b.properties.type?.const);
    expect([...types].sort()).toEqual([...ASSET_TYPES].sort());
  });

  it.each(ASSET_TYPES)('%s has matching required fields, enums and defaults', (type) => {
    const branch = jsonSchema.oneOf.find((b) => b.properties.type?.const === type)!;
    const shape = assetPropShapes[type] as Record<string, Schema<unknown>>;
    const runtimeRequired = Object.entries(shape)
      .filter(([, s]) => !isOptional(s))
      .map(([k]) => k);
    expect(branch.required.sort()).toEqual(['id', 'type', 'version', ...runtimeRequired].sort());
    for (const [key, field] of Object.entries(shape)) {
      const json = branch.properties[key];
      expect(json, `${type}.${key}`).toBeDefined();
      const expected = field.expected;
      if (json?.enum) {
        expect(expected).toBe(json.enum.map((v) => `"${v}"`).join(' | '));
      }
      if ('defaultValue' in field) {
        expect(json?.default, `${type}.${key} default`).toEqual(
          (field as { defaultValue: unknown }).defaultValue,
        );
      }
    }
  });

  it('defaults table matches the runtime', () => {
    const ok = safeValidateManifest({ version: 1, id: 'x', type: 'makeup.lips', color: '#000' });
    expect(ok.success && (ok.data as { opacity?: number }).opacity).toBe(
      MANIFEST_DEFAULTS.lips.opacity,
    );
  });
});

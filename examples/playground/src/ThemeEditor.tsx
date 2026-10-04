import type { ThemeInput } from '@tryonit/react';

interface Props {
  theme: ThemeInput;
  onChange: (theme: ThemeInput) => void;
}

/** Live controls for the most common theme tokens. */
export function ThemeEditor({ theme, onChange }: Props) {
  const colors = theme.colors ?? {};
  const setColor = (key: 'primary' | 'onPrimary' | 'surface' | 'onSurface', value: string) =>
    onChange({ ...theme, colors: { ...colors, [key]: value } });
  return (
    <fieldset className="pg-fieldset">
      <legend>Theme</legend>
      {(['primary', 'onPrimary', 'surface', 'onSurface'] as const).map((key) => (
        <label key={key} className="pg-row">
          <span>{key}</span>
          <input
            type="color"
            value={colors[key] ?? '#6d28d9'}
            onChange={(e) => setColor(key, e.target.value)}
          />
        </label>
      ))}
      <label className="pg-row">
        <span>radius</span>
        <input
          type="range"
          min={0}
          max={32}
          value={typeof theme.radius === 'number' ? theme.radius : 14}
          onChange={(e) => onChange({ ...theme, radius: Number(e.target.value) })}
        />
      </label>
      <label className="pg-row">
        <span>mode</span>
        <select
          value={theme.mode ?? 'auto'}
          onChange={(e) => onChange({ ...theme, mode: e.target.value as 'auto' })}
        >
          <option value="auto">auto</option>
          <option value="light">light</option>
          <option value="dark">dark</option>
        </select>
      </label>
      <button type="button" onClick={() => onChange({})}>
        Reset theme
      </button>
    </fieldset>
  );
}

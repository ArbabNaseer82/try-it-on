// @vitest-environment node
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { TryOn, TryOnButton, TryOnProvider, TryOnView } from '../src';

describe('server rendering', () => {
  it('renders without touching browser globals', () => {
    expect(typeof (globalThis as { window?: unknown }).window).toBe('undefined');
    const button = renderToString(<TryOnButton asset="/assets/aviator.json" />);
    expect(button).toContain('Try it on');
    const inline = renderToString(<TryOn asset="/assets/ruby.json" />);
    expect(inline).toContain('toi-view');
    const view = renderToString(
      <TryOnProvider>
        <TryOnView />
      </TryOnProvider>,
    );
    expect(view).toContain('toi-view__stage');
  });
});

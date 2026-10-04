import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StrictMode } from 'react';
import { TryOnProvider, TryOnView } from '../src';
import { installBrowserMocks, trackListeners } from '../../web/test/browser-mocks';

const settle = () => new Promise<void>((resolve) => setTimeout(resolve, 10));

describe('mount/unmount leak test (real engine, mock camera)', () => {
  it('leaves no live media tracks or listeners after 20 cycles', async () => {
    const camera = installBrowserMocks();
    // React installs a few permanent document listeners on its first render: warm up first.
    render(<div />).unmount();
    const listeners = trackListeners();
    const before = listeners.count();
    for (let i = 0; i < 20; i++) {
      const { unmount } = render(
        <StrictMode>
          <TryOnProvider>
            <TryOnView />
          </TryOnProvider>
        </StrictMode>,
      );
      await settle();
      unmount();
      await settle();
    }
    expect(camera.tracks.length).toBeGreaterThanOrEqual(20);
    expect(camera.tracks.filter((t) => t.readyState === 'live')).toHaveLength(0);
    expect(listeners.count()).toBe(before);
    expect(document.querySelectorAll('video')).toHaveLength(0);
    listeners.restore();
    camera.restore();
  });
});

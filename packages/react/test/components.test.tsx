import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useEffect } from 'react';
import { describe, expect, it } from 'vitest';
import { TryOnError, validateManifest } from '@tryonit/web';
import {
  StatusOverlay,
  TryOn,
  TryOnButton,
  TryOnProvider,
  themeToCssVars,
  mergeLabels,
  useTryOn,
  type ToolbarSlotProps,
} from '../src';
import { createMockEngine } from './mock-engine';

const lipstick = validateManifest({
  version: 1,
  id: 'ruby',
  type: 'makeup.lips',
  name: 'Ruby',
  color: '#b0123a',
  variants: [
    { id: 'ruby', name: 'Ruby', swatch: '#b0123a' },
    { id: 'nude', name: 'Nude', swatch: '#c48a7a', overrides: { color: '#c48a7a' } },
  ],
});
const glasses = validateManifest({
  version: 1,
  id: 'aviator',
  type: 'glasses',
  name: 'Aviator',
  model: '/a.glb',
});

describe('TryOnButton', () => {
  it('opens an accessible modal, traps focus, closes on Escape and returns focus', async () => {
    const user = userEvent.setup();
    const engine = createMockEngine();
    render(<TryOnButton asset={lipstick} engine={engine} preload="none" />);
    const trigger = screen.getByRole('button', { name: 'Try it on' });
    await user.click(trigger);
    const dialog = await screen.findByRole('dialog', { name: 'Virtual try-on' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();
    await waitFor(() => expect(engine.start).toHaveBeenCalled());
    await waitFor(() =>
      expect(engine.setAsset).toHaveBeenCalledWith(expect.objectContaining({ id: 'ruby' })),
    );

    // Shift+Tab from the first element wraps to the last one.
    await user.keyboard('{Shift>}{Tab}{/Shift}');
    expect(dialog.contains(document.activeElement)).toBe(true);
    expect(document.activeElement).not.toBe(screen.getByRole('button', { name: 'Close' }));

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(engine.stop).toHaveBeenCalled();
    expect(trigger).toHaveFocus();
  });

  it('closes on Escape even when focus fell back to the body', async () => {
    const user = userEvent.setup();
    render(<TryOnButton asset={lipstick} engine={createMockEngine()} preload="none" />);
    await user.click(screen.getByRole('button', { name: 'Try it on' }));
    await screen.findByRole('dialog');
    (document.activeElement as HTMLElement | null)?.blur();
    expect(document.activeElement).toBe(document.body);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('applies custom labels and the unstyled flag', () => {
    render(
      <TryOnButton
        asset={glasses}
        engine={createMockEngine()}
        labels={{ open: 'See it on me' }}
        unstyled
        preload="none"
      />,
    );
    const trigger = screen.getByRole('button', { name: 'See it on me' });
    expect(trigger.closest('.toi-root')).toHaveClass('toi-unstyled');
  });
});

describe('TryOn', () => {
  it('renders slots, classNames, product switcher and shade swatches', async () => {
    const engine = createMockEngine();
    const Toolbar = ({ children }: ToolbarSlotProps) => (
      <div data-testid="custom-toolbar">{children}</div>
    );
    render(
      <TryOn
        assets={[lipstick, glasses]}
        engine={engine}
        classNames={{ root: 'my-root', captureButton: 'my-capture' }}
        slots={{ Toolbar }}
      />,
    );
    expect(document.querySelector('.my-root')).not.toBeNull();
    expect(screen.getByTestId('custom-toolbar')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole('radiogroup', { name: 'Products' })).toBeInTheDocument(),
    );
    await waitFor(() => expect(engine.start).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByRole('button', { name: 'Take photo' })).toBeEnabled());
    expect(screen.getByRole('button', { name: 'Take photo' })).toHaveClass('my-capture');
    const shades = await screen.findByRole('radiogroup', { name: 'Shades' });
    expect(shades).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: 'Nude' }));
    expect(engine.setVariant).toHaveBeenCalledWith('nude');
    fireEvent.click(screen.getByRole('radio', { name: /Aviator/ }));
    await waitFor(() =>
      expect(engine.setAsset).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'aviator' })),
    );
  });

  it('captures and shows the preview with download link', async () => {
    const engine = createMockEngine();
    let captured: Blob | null = null;
    render(<TryOn asset={lipstick} engine={engine} onCapture={(b) => (captured = b)} />);
    const button = await screen.findByRole('button', { name: 'Take photo' });
    await waitFor(() => expect(button).toBeEnabled());
    fireEvent.click(button);
    await waitFor(() => expect(captured).not.toBeNull());
    expect(await screen.findByRole('link', { name: /Download/ })).toHaveAttribute(
      'download',
      'try-on.png',
    );
  });

  it('shows a permission prompt when autoStart is false', () => {
    render(<TryOn asset={lipstick} engine={createMockEngine()} autoStart={false} />);
    expect(screen.getByRole('button', { name: 'Start camera' })).toBeInTheDocument();
    expect(screen.getByText('Your camera feed never leaves this device.')).toBeInTheDocument();
  });
});

describe('StatusOverlay', () => {
  it.each([
    ['CAMERA_DENIED', /Camera access was blocked/, true, true],
    ['WEBGL_UNSUPPORTED', /graphics features/, false, false],
    ['MODEL_LOAD_FAILED', /could not load/, true, false],
  ] as const)('renders %s with the right actions', (code, text, retry, upload) => {
    const engine = createMockEngine();
    engine.store.actions.fail(new TryOnError(code, 'x'));
    render(
      <TryOnProvider engine={engine}>
        <Starter />
        <StatusOverlay />
      </TryOnProvider>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent(text);
    expect(!!screen.queryByRole('button', { name: 'Try again' })).toBe(retry);
    expect(!!screen.queryByText('Upload a photo')).toBe(upload);
  });

  it('shows the no face hint after the delay while running', async () => {
    const engine = createMockEngine();
    render(
      <TryOnProvider engine={engine}>
        <Starter />
        <StatusOverlay hintDelayMs={10} />
      </TryOnProvider>,
    );
    await act(async () => {
      await engine.start();
      engine.store.actions.setAsset(lipstick);
    });
    expect(
      await screen.findByText('Look at the camera', { selector: '.toi-status__pill' }),
    ).toBeInTheDocument();
    await act(async () => engine.store.actions.setTracking({ faceVisible: true }));
    await waitFor(() =>
      expect(
        screen.queryByText('Look at the camera', { selector: '.toi-status__pill' }),
      ).toBeNull(),
    );
  });
});

/** Forces engine creation like a TryOnView would. */
function Starter() {
  const { getEngine } = useTryOn();
  useEffect(() => {
    getEngine();
  }, [getEngine]);
  return null;
}

describe('theme and labels', () => {
  it('converts theme to CSS variables', () => {
    expect(
      themeToCssVars({
        colors: { primary: '#7C3AED', onPrimary: '#fff' },
        radius: 16,
        spacing: 4,
        fontFamily: 'Inter',
        fontSize: { md: '1rem' },
        zIndex: 10,
        shadow: 'none',
        transitionMs: 0,
      }),
    ).toEqual({
      '--toi-color-primary': '#7C3AED',
      '--toi-color-on-primary': '#fff',
      '--toi-radius': '16px',
      '--toi-space-1': '4px',
      '--toi-space-2': '8px',
      '--toi-space-3': '12px',
      '--toi-space-4': '16px',
      '--toi-font-family': 'Inter',
      '--toi-font-size-md': '1rem',
      '--toi-z-index': '10',
      '--toi-shadow': 'none',
      '--toi-transition': '0ms',
    });
    expect(themeToCssVars()).toEqual({});
  });

  it('merges labels deeply', () => {
    const labels = mergeLabels({ capture: 'Snap', errors: { CAMERA_DENIED: 'Nope' } });
    expect(labels.capture).toBe('Snap');
    expect(labels.errors.CAMERA_DENIED).toBe('Nope');
    expect(labels.errors.UNKNOWN).toMatch(/went wrong/);
  });
});

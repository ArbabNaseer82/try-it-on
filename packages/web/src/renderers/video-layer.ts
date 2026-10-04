export type FitMode = 'cover' | 'contain';

/** Styles a stage layer (video or canvas) to fill its parent like CSS object-fit. */
export function styleLayer(element: HTMLElement, fit: FitMode, zIndex: number): void {
  Object.assign(element.style, {
    position: 'absolute',
    inset: '0',
    width: '100%',
    height: '100%',
    objectFit: fit,
    zIndex: String(zIndex),
    pointerEvents: 'none',
    display: 'block',
  } satisfies Partial<CSSStyleDeclaration>);
}

/**
 * DOM stage: a mirror wrapper holding the background (video or photo canvas), the GL canvas,
 * the three.js canvas and the debug canvas. Mirroring is a single CSS transform on the wrapper
 * so video, landmarks and 3D always agree.
 */
export class StageLayers {
  readonly root: HTMLDivElement;
  readonly mirror: HTMLDivElement;
  readonly hud: HTMLDivElement;
  private background: HTMLElement | null = null;

  constructor(private fit: FitMode) {
    this.root = document.createElement('div');
    this.root.className = 'toi-stage';
    Object.assign(this.root.style, {
      position: 'relative',
      overflow: 'hidden',
      width: '100%',
      height: '100%',
      background: '#000',
    } satisfies Partial<CSSStyleDeclaration>);
    this.mirror = document.createElement('div');
    this.mirror.className = 'toi-stage__mirror';
    Object.assign(this.mirror.style, {
      position: 'absolute',
      inset: '0',
    } satisfies Partial<CSSStyleDeclaration>);
    this.hud = document.createElement('div');
    this.hud.className = 'toi-stage__hud';
    Object.assign(this.hud.style, {
      position: 'absolute',
      left: '8px',
      top: '8px',
      zIndex: '10',
      font: '11px/1.4 ui-monospace, monospace',
      color: '#0f0',
      background: 'rgba(0,0,0,0.55)',
      padding: '4px 6px',
      borderRadius: '4px',
      pointerEvents: 'none',
      whiteSpace: 'pre',
      display: 'none',
    } satisfies Partial<CSSStyleDeclaration>);
    this.root.append(this.mirror, this.hud);
  }

  setMirrored(mirrored: boolean): void {
    this.mirror.style.transform = mirrored ? 'scaleX(-1)' : '';
  }

  setFit(fit: FitMode): void {
    this.fit = fit;
    for (const child of Array.from(this.mirror.children)) {
      if (child instanceof HTMLElement) child.style.objectFit = fit;
    }
  }

  setBackground(element: HTMLElement | null): void {
    if (this.background && this.background !== element) this.background.remove();
    this.background = element;
    if (element) {
      styleLayer(element, this.fit, 0);
      this.mirror.prepend(element);
    }
  }

  addLayer(canvas: HTMLCanvasElement, zIndex: number): void {
    if (canvas.parentElement === this.mirror) return;
    styleLayer(canvas, this.fit, zIndex);
    this.mirror.append(canvas);
  }

  attach(container: HTMLElement): void {
    if (this.root.parentElement !== container) container.append(this.root);
  }

  detach(): void {
    this.root.remove();
  }
}

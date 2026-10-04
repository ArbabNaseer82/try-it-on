import type { FrameResults, SessionState } from '@tryonit/core';

/** Landmark dots and torso lines drawn on a 2D canvas inside the mirrored stage. */
export class DebugOverlay {
  readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D | null;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'toi-debug';
    this.ctx = this.canvas.getContext('2d');
  }

  draw(results: FrameResults, width: number, height: number): void {
    const ctx = this.ctx;
    if (!ctx) return;
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
    ctx.clearRect(0, 0, width, height);
    const dot = (x: number, y: number, r: number, color: string) => {
      ctx.fillStyle = color;
      ctx.fillRect(x * width - r / 2, y * height - r / 2, r, r);
    };
    results.face?.landmarks.forEach((l, i) => {
      if (i % 3 === 0 || i >= 468) dot(l.x, l.y, i >= 468 ? 3 : 2, i >= 468 ? '#0ff' : '#0f0');
    });
    results.hand?.landmarks.forEach((l) => dot(l.x, l.y, 5, '#ff0'));
    results.pose?.landmarks.forEach((l, i) => {
      if ([11, 12, 23, 24].includes(i)) dot(l.x, l.y, 8, '#f0f');
    });
  }

  clear(): void {
    this.ctx?.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}

export function formatHud(state: SessionState, delegate: string): string {
  const p = state.perf;
  return [
    `fps ${p.fps.toFixed(0)}  detect ${p.detectionMs.toFixed(1)}ms  render ${p.renderMs.toFixed(1)}ms`,
    `rate ${p.detectionRate}/s  delegate ${delegate}`,
    `modules ${state.modules.join(', ') || 'none'}`,
  ].join('\n');
}

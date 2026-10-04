import { shallowEqual, useTryOnState } from '@tryonit/react';

/** Reads the throttled perf slice from the store (updated at most twice per second). */
export function PerfHud() {
  const perf = useTryOnState((s) => s.perf, shallowEqual);
  const modules = useTryOnState((s) => s.modules);
  const status = useTryOnState((s) => s.status);
  return (
    <fieldset className="pg-fieldset pg-hud" aria-label="Performance">
      <legend>Performance</legend>
      <dl>
        <dt>status</dt>
        <dd data-testid="status">{status}</dd>
        <dt>fps</dt>
        <dd>{perf.fps.toFixed(0)}</dd>
        <dt>detection</dt>
        <dd>
          {perf.detectionMs.toFixed(1)} ms @ {perf.detectionRate}/s
        </dd>
        <dt>render</dt>
        <dd>{perf.renderMs.toFixed(1)} ms</dd>
        <dt>modules</dt>
        <dd data-testid="modules">{modules.join(', ') || 'none'}</dd>
      </dl>
    </fieldset>
  );
}

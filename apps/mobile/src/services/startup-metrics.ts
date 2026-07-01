const marks = new Map<string, number>();

export function markStartupPhase(phase: string): void {
  marks.set(phase, Date.now());
  if (typeof performance !== 'undefined' && typeof performance.mark === 'function') {
    performance.mark(`startup:${phase}`);
  }
}

export function getStartupMetrics(): Record<string, number> {
  const origin = marks.get('layout_mount') ?? marks.get('init_db_start') ?? 0;
  if (!origin) return {};

  const out: Record<string, number> = {};
  for (const [phase, timestamp] of marks) {
    out[phase] = timestamp - origin;
  }
  return out;
}

export function logStartupMetrics(): void {
  const metrics = getStartupMetrics();
  if (!Object.keys(metrics).length) return;
  console.info('[startup-metrics]', metrics);
}

/** @internal test helper */
export function __resetStartupMetricsForTests(): void {
  marks.clear();
}

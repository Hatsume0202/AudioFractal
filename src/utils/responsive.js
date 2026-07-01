/**
 * Responsive design utilities — breakpoint detection and resize handling.
 */

/** @typedef {'mobile' | 'tablet' | 'desktop'} Breakpoint */

/**
 * Get the current responsive breakpoint.
 * @returns {Breakpoint}
 */
export function getBreakpoint() {
  const w = window.innerWidth;
  if (w < 768) return 'mobile';
  if (w < 1025) return 'tablet';
  return 'desktop';
}

/**
 * Register a debounced resize handler.
 * @param {Function} callback — Receives (width: number, height: number, breakpoint: Breakpoint)
 * @param {number} [debounceMs=100] — Debounce delay in milliseconds
 * @returns {Function} — Unsubscribe function
 */
export function onResize(callback, debounceMs = 100) {
  let timeout;
  let lastBreakpoint = getBreakpoint();

  const handler = () => {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      const bp = getBreakpoint();
      // Only fire if breakpoint changed or first call
      callback(window.innerWidth, window.innerHeight, bp);
      lastBreakpoint = bp;
    }, debounceMs);
  };

  window.addEventListener('resize', handler);
  // Fire once immediately
  handler();

  return () => window.removeEventListener('resize', handler);
}

/**
 * Auto-adjust resolution scale based on breakpoint for performance.
 * @returns {{ scale: number, reason: string }}
 */
export function getRecommendedScale() {
  const bp = getBreakpoint();
  switch (bp) {
    case 'mobile': return { scale: 0.5, reason: 'Mobile: half resolution for performance' };
    case 'tablet': return { scale: 0.75, reason: 'Tablet: reduced resolution' };
    default: return { scale: 1.0, reason: 'Desktop: full resolution' };
  }
}

/**
 * Math utility functions used across the application.
 */

/**
 * Clamp a value between min and max.
 * @param {number} v
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

/**
 * Linear interpolation between a and b.
 * @param {number} a
 * @param {number} b
 * @param {number} t — Interpolation factor (0-1)
 * @returns {number}
 */
export function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * Remap a value from one range to another.
 * @param {number} v
 * @param {number} inMin
 * @param {number} inMax
 * @param {number} outMin
 * @param {number} outMax
 * @returns {number}
 */
export function mapRange(v, inMin, inMax, outMin, outMax) {
  const t = (v - inMin) / (inMax - inMin);
  return outMin + t * (outMax - outMin);
}

/**
 * GLSL-style smoothstep function.
 * @param {number} edge0
 * @param {number} edge1
 * @param {number} x
 * @returns {number}
 */
export function smoothstep(edge0, edge1, x) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

/**
 * Exponential moving average towards a target.
 * @param {number} current — Current smoothed value
 * @param {number} target — Target value
 * @param {number} alpha — Smoothing factor (0-1, higher = more responsive)
 * @param {number} [dt=1] — Delta time multiplier (optional)
 * @returns {number}
 */
export function expDecay(current, target, alpha, dt = 1) {
  return lerp(current, target, 1 - Math.exp(-alpha * dt));
}

/**
 * Color space conversion utilities.
 */

/**
 * Convert a hex color string to an RGB object.
 * @param {string} hex — e.g., "#ff0044" or "ff0044"
 * @returns {{ r: number, g: number, b: number }}
 */
export function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  };
}

/**
 * Convert RGB values (0-255) to HSV.
 * @param {number} r
 * @param {number} g
 * @param {number} b
 * @returns {{ h: number, s: number, v: number }} — h: 0-360, s/v: 0-1
 */
export function rgbToHsv(r, g, b) {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;
  let h = 0;
  const s = max === 0 ? 0 : d / max;
  const v = max;

  if (d !== 0) {
    if (max === rn) {
      h = ((gn - bn) / d + (gn < bn ? 6 : 0)) * 60;
    } else if (max === gn) {
      h = ((bn - rn) / d + 2) * 60;
    } else {
      h = ((rn - gn) / d + 4) * 60;
    }
  }

  return { h, s, v };
}

/**
 * Convert HSV to RGB.
 * @param {number} h — 0-360
 * @param {number} s — 0-1
 * @param {number} v — 0-1
 * @returns {{ r: number, g: number, b: number }} — RGB 0-255
 */
export function hsvToRgb(h, s, v) {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let rp, gp, bp;

  if (h < 60) { rp = c; gp = x; bp = 0; }
  else if (h < 120) { rp = x; gp = c; bp = 0; }
  else if (h < 180) { rp = 0; gp = c; bp = x; }
  else if (h < 240) { rp = 0; gp = x; bp = c; }
  else if (h < 300) { rp = x; gp = 0; bp = c; }
  else { rp = c; gp = 0; bp = x; }

  return {
    r: Math.round((rp + m) * 255),
    g: Math.round((gp + m) * 255),
    b: Math.round((bp + m) * 255),
  };
}

/**
 * Linearly interpolate between two RGB colors.
 * @param {{ r: number, g: number, b: number }} c1
 * @param {{ r: number, g: number, b: number }} c2
 * @param {number} t — 0-1 interpolation factor
 * @returns {{ r: number, g: number, b: number }}
 */
export function lerpColor(c1, c2, t) {
  return {
    r: Math.round(c1.r + (c2.r - c1.r) * t),
    g: Math.round(c1.g + (c2.g - c1.g) * t),
    b: Math.round(c1.b + (c2.b - c1.b) * t),
  };
}

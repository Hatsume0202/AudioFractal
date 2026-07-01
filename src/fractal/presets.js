/**
 * Fractal type presets — defines default parameters for each fractal type.
 * Each preset provides the initial viewport, iteration count, and Julia constant.
 */
export const FRACTAL_PRESETS = {
  mandelbrot: {
    name: 'Mandelbrot Set',
    center: [-0.5, 0.0],
    zoom: 1.0,
    maxIter: 150,
    juliaC: [-0.7269, 0.1889],
    power: 2.0,
  },
  julia: {
    name: 'Julia Set',
    center: [0.0, 0.0],
    zoom: 1.2,
    maxIter: 150,
    juliaC: [-0.7269, 0.1889],
    power: 2.0,
  },
  burningship: {
    name: 'Burning Ship',
    center: [-1.75, -0.03],
    zoom: 2.2,
    maxIter: 120,
    juliaC: [-0.7269, 0.1889],
    power: 2.0,
  },
  mandelbrot_alt: {
    name: 'Higher-Order Mandelbrot',
    center: [0.0, 0.0],
    zoom: 1.5,
    maxIter: 100,
    juliaC: [-0.7269, 0.1889],
    power: 3.0,
  },
};

/** @returns {string[]} List of available fractal type keys */
export function getFractalTypes() {
  return Object.keys(FRACTAL_PRESETS);
}

/** @returns {string[]} List of human-readable fractal names */
export function getFractalNames() {
  return Object.values(FRACTAL_PRESETS).map(p => p.name);
}

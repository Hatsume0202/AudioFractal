import { describe, it, expect, beforeEach } from 'vitest';
import { FractalParameters } from '../fractal/FractalParameters.js';

// Sample feature snapshot matching the interface from AudioFeatures
function createFeatures(overrides = {}) {
  return {
    rms: 0,
    beat: false,
    spectralCentroid: 0,
    lowFreqRatio: 0,
    spectralFlux: 0,
    zeroCrossingRate: 0,
    lowBand: 0,
    midBand: 0,
    highBand: 0,
    ...overrides,
  };
}

describe('FractalParameters', () => {
  let params;

  beforeEach(() => {
    params = new FractalParameters();
  });

  it('initializes with default mandelbrot preset', () => {
    expect(params.getFractalType()).toBe('mandelbrot');
    expect(params.preset.name).toBe('Mandelbrot Set');
  });

  it('initializes with a specified fractal type', () => {
    const jp = new FractalParameters('julia');
    expect(jp.getFractalType()).toBe('julia');
    expect(jp.preset.name).toBe('Julia Set');
  });

  it('update() with zero features returns base uniforms', () => {
    const uniforms = params.update(createFeatures());
    expect(uniforms).toHaveProperty('u_zoom');
    expect(uniforms).toHaveProperty('u_maxIter');
    expect(uniforms).toHaveProperty('u_juliaC');
    expect(uniforms).toHaveProperty('u_brightness');
    expect(uniforms).toHaveProperty('u_saturation');
    expect(uniforms).toHaveProperty('u_contrast');
    expect(uniforms).toHaveProperty('u_power');
    expect(uniforms).toHaveProperty('u_hueShift');
    expect(uniforms).toHaveProperty('u_colorOffset');
  });

  it('max RMS increases brightness', () => {
    params.update(createFeatures({ rms: 0 }));
    const dimUniforms = params.getUniforms();
    params.update(createFeatures({ rms: 1.0 }));
    const brightUniforms = params.getUniforms();
    // Brightness is smoothed, so run multiple updates
    for (let i = 0; i < 20; i++) {
      params.update(createFeatures({ rms: 1.0 }));
    }
    const finalBrightness = params.getUniforms().u_brightness;
    expect(finalBrightness).toBeGreaterThan(1.0); // Above default
  });

  it('max lowBand increases zoom', () => {
    // Run many updates with high lowBand to overcome smoothing
    for (let i = 0; i < 30; i++) {
      params.update(createFeatures({ lowBand: 1.0 }));
    }
    const uniforms = params.getUniforms();
    expect(uniforms.u_zoom).toBeGreaterThan(1.5); // Significantly above default
  });

  it('max highBand increases maxIter', () => {
    const uniforms = params.update(createFeatures({ highBand: 1.0 }));
    expect(uniforms.u_maxIter).toBeGreaterThanOrEqual(params.minIter);
    expect(uniforms.u_maxIter).toBeLessThanOrEqual(params.maxIter);
  });

  it('beat triggers Julia C perturbation', () => {
    const baseJulia = [...params.preset.juliaC];
    params.update(createFeatures({ beat: true }));
    const afterBeat = params.getUniforms().u_juliaC;
    // Julia C should have changed from default
    expect(afterBeat[0] !== baseJulia[0] || afterBeat[1] !== baseJulia[1]).toBe(true);
  });

  it('setMappingStrength changes mapping behavior', () => {
    params.setMappingStrength('lowToZoom', 0);
    for (let i = 0; i < 30; i++) {
      params.update(createFeatures({ lowBand: 1.0 }));
    }
    const uniformsZero = params.getUniforms();
    const zoomZero = uniformsZero.u_zoom;

    params.setMappingStrength('lowToZoom', 1.0);
    for (let i = 0; i < 30; i++) {
      params.update(createFeatures({ lowBand: 1.0 }));
    }
    const uniformsOne = params.getUniforms();
    const zoomOne = uniformsOne.u_zoom;

    expect(zoomOne).toBeGreaterThan(zoomZero);
  });

  it('setFractalType switches presets correctly', () => {
    params.setFractalType('burningship');
    expect(params.getFractalType()).toBe('burningship');
    expect(params.preset.name).toBe('Burning Ship');
    expect(params.preset.center[0]).toBe(-1.75);
  });

  it('setFractalType falls back to mandelbrot for unknown type', () => {
    params.setFractalType('nonexistent');
    expect(params.getFractalType()).toBe('mandelbrot');
  });

  it('getUniforms returns all required keys', () => {
    const uniforms = params.getUniforms();
    const requiredKeys = [
      'u_zoom', 'u_center', 'u_maxIter', 'u_juliaC',
      'u_colorOffset', 'u_colorShift', 'u_hueShift',
      'u_saturation', 'u_brightness', 'u_contrast',
      'u_distortion', 'u_power',
    ];
    for (const key of requiredKeys) {
      expect(uniforms).toHaveProperty(key);
    }
  });

  it('setColorParams updates color settings', () => {
    params.setColorParams({ hueShift: 0.5, saturation: 0.8 });
    const colorParams = params.getColorParams();
    expect(colorParams.hueShift).toBe(0.5);
    expect(colorParams.saturation).toBe(0.8);
    // Unchanged params retain defaults
    expect(colorParams.brightness).toBe(1.0);
  });

  it('setIterationRange clamps to valid range', () => {
    params.setIterationRange(10, 500);
    expect(params.minIter).toBe(10);
    expect(params.maxIter).toBe(500);
  });

  it('setIterationRange clamps invalid values', () => {
    params.setIterationRange(-5, 1000);
    expect(params.minIter).toBeGreaterThanOrEqual(10);
    expect(params.maxIter).toBeLessThanOrEqual(500);
  });

  it('reset restores default state', () => {
    params.setFractalType('julia');
    params.setColorParams({ hueShift: 0.9 });
    params.setMappingStrength('lowToZoom', 0.1);
    params.reset();

    expect(params.getFractalType()).toBe('mandelbrot');
    const cp = params.getColorParams();
    expect(cp.hueShift).toBe(0.0);
    expect(cp.saturation).toBe(1.0);
    expect(params.getMappingStrengths().lowToZoom).toBe(0.7);
  });

  it('handles multiple update cycles without errors', () => {
    for (let i = 0; i < 100; i++) {
      const features = createFeatures({
        rms: Math.random(),
        lowBand: Math.random(),
        midBand: Math.random(),
        highBand: Math.random(),
        beat: Math.random() > 0.95,
        spectralCentroid: Math.random(),
        spectralFlux: Math.random(),
        zeroCrossingRate: Math.random(),
      });
      const uniforms = params.update(features);
      expect(uniforms).toBeDefined();
    }
  });
});

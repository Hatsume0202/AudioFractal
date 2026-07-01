import { FRACTAL_PRESETS } from './presets.js';

// Inline utility functions (also in utils/math.js, duplicated for independence)
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const lerp = (a, b, t) => a + (b - a) * t;

/**
 * FractalParameters — Manages fractal state and maps audio features to shader uniforms.
 *
 * Each audio feature maps to a visual parameter with adjustable strength (0-1).
 * Exponential moving average smoothing prevents jitter on slowly-changing parameters.
 */
export class FractalParameters {
  /**
   * @param {string} [fractalType='mandelbrot'] — Initial fractal type
   */
  constructor(fractalType = 'mandelbrot') {
    /** @type {string} */
    this.fractalType = fractalType;
    this.preset = { ...FRACTAL_PRESETS[fractalType] };

    // Mapping strengths (0-1), user-adjustable
    /** @type {object} */
    this.mappingStrengths = {
      lowToZoom: 0.7,
      midToColor: 0.5,
      highToIter: 0.6,
      rmsToBrightness: 0.8,
      beatToJulia: 0.5,
      centroidToSaturation: 0.6,
      fluxToDistortion: 0.3,
      zcrToJuliaImag: 0.4,
    };

    // Color parameters
    /** @type {object} */
    this.colorParams = {
      hueShift: 0.0,
      saturation: 1.0,
      brightness: 1.0,
      contrast: 1.2,
      colorOffset: 0.0,
    };

    // Iteration range
    this.minIter = 50;
    this.maxIter = 500;

    // Smoothed internal state (EMA targets)
    this._smoothZoom = this.preset.zoom;
    this._smoothBrightness = 1.0;
    this._smoothColorShift = 0.0;
    this._smoothDistortion = 0.0;
    this._smoothSaturation = 1.0;

    // Beat energy decay
    this._beatEnergy = 0.0;

    // Current Julia C
    this._juliaC = [...this.preset.juliaC];
  }

  /**
   * Update fractal parameters from audio features. Call each frame.
   * @param {object} features — AudioFeatureSnapshot from AudioFeatures.getAllFeatures()
   * @returns {object} — Uniform values ready for FractalMaterial.updateUniforms()
   */
  update(features) {
    const s = this.mappingStrengths;

    // Low band → zoom (breathing effect)
    const targetZoom = this.preset.zoom + features.lowBand * 3.0 * s.lowToZoom;
    this._smoothZoom = lerp(this._smoothZoom, targetZoom, 0.15);

    // Mid band → color offset (color flow)
    const targetColorShift = features.midBand * 0.5 * s.midToColor;
    this._smoothColorShift = lerp(this._smoothColorShift, targetColorShift, 0.15);

    // High band → max iterations (detail level)
    const iterRange = this.maxIter - this.minIter;
    const targetMaxIter = this.minIter + features.highBand * iterRange * s.highToIter;
    const maxIter = Math.floor(clamp(targetMaxIter, this.minIter, this.maxIter));

    // RMS → brightness
    const targetBrightness = 0.5 + features.rms * 1.5 * s.rmsToBrightness;
    this._smoothBrightness = lerp(this._smoothBrightness, targetBrightness, 0.15);

    // Spectral centroid → saturation
    const targetSaturation = 0.3 + features.spectralCentroid * 1.4 * s.centroidToSaturation;
    this._smoothSaturation = lerp(this._smoothSaturation, targetSaturation, 0.15);

    // Spectral flux → distortion
    const targetDistortion = features.spectralFlux * 0.1 * s.fluxToDistortion;
    this._smoothDistortion = lerp(this._smoothDistortion, targetDistortion, 0.2);

    // Beat → Julia C perturbation + beat energy decay
    if (features.beat) {
      this._beatEnergy = 1.0;
      // Random perturbation on beat
      const perturb = s.beatToJulia * 0.15;
      this._juliaC[0] = this.preset.juliaC[0] + (Math.random() - 0.5) * perturb * 2;
      this._juliaC[1] = this.preset.juliaC[1] + (Math.random() - 0.5) * perturb * 2;
    }
    // Beat energy decay
    this._beatEnergy *= 0.92;

    // Zero crossing rate → Julia C imaginary part (continuous)
    const baseJuliaImag = this.preset.juliaC[1];
    const zcrOffset = features.zeroCrossingRate * 0.5 * s.zcrToJuliaImag;
    // Blend between base and ZCR-influenced value (but don't override beat perturbation fully)
    this._juliaC[1] = lerp(this._juliaC[1], baseJuliaImag + zcrOffset, 0.1);

    return this.getUniforms(maxIter);
  }

  /**
   * Build the complete uniforms object for the current state.
   * @param {number} [maxIter] — Current max iterations (from update)
   * @returns {object}
   */
  getUniforms(maxIter) {
    const iter = maxIter || this.preset.maxIter;
    return {
      u_center: this.preset.center,
      u_zoom: this._smoothZoom + this._beatEnergy * 0.5,
      u_maxIter: iter,
      u_juliaC: this._juliaC,
      u_colorOffset: this.colorParams.colorOffset + this._smoothColorShift * 2.0 + this._beatEnergy * 0.3,
      u_colorShift: this._smoothColorShift,
      u_hueShift: this.colorParams.hueShift,
      u_saturation: this._smoothSaturation * this.colorParams.saturation,
      u_brightness: this._smoothBrightness * this.colorParams.brightness,
      u_contrast: this.colorParams.contrast + this._smoothDistortion * 3.0,
      u_distortion: this._smoothDistortion,
      u_power: this.preset.power,
    };
  }

  /**
   * Switch to a different fractal type.
   * @param {string} type — 'mandelbrot' | 'julia' | 'burningship' | 'mandelbrot_alt'
   */
  setFractalType(type) {
    if (!FRACTAL_PRESETS[type]) {
      console.warn(`Unknown fractal type: ${type}, using mandelbrot`);
      type = 'mandelbrot';
    }
    this.fractalType = type;
    this.preset = { ...FRACTAL_PRESETS[type] };
    this._juliaC = [...this.preset.juliaC];
    this._smoothZoom = this.preset.zoom;
    this._beatEnergy = 0.0;
  }

  /**
   * Set the strength of an audio-to-visual mapping.
   * @param {string} feature — Mapping key (e.g., 'lowToZoom')
   * @param {number} strength — 0.0 to 1.0
   */
  setMappingStrength(feature, strength) {
    if (feature in this.mappingStrengths) {
      this.mappingStrengths[feature] = clamp(strength, 0, 1);
    }
  }

  /** @returns {object} Current mapping strengths */
  getMappingStrengths() {
    return { ...this.mappingStrengths };
  }

  /**
   * Set color adjustment parameters.
   * @param {object} params — { hueShift?, saturation?, brightness?, contrast?, colorOffset? }
   */
  setColorParams(params) {
    Object.assign(this.colorParams, params);
  }

  /** @returns {object} Current color parameters */
  getColorParams() {
    return { ...this.colorParams };
  }

  /**
   * Set the iteration range for the current fractal.
   * @param {number} min — Minimum iterations
   * @param {number} max — Maximum iterations
   */
  setIterationRange(min, max) {
    this.minIter = clamp(min, 10, 500);
    this.maxIter = clamp(max, this.minIter, 500);
  }

  /** @returns {string} Current fractal type key */
  getFractalType() {
    return this.fractalType;
  }

  /** Reset all parameters to defaults */
  reset() {
    this.fractalType = 'mandelbrot';
    this.preset = { ...FRACTAL_PRESETS.mandelbrot };
    this._smoothZoom = this.preset.zoom;
    this._smoothBrightness = 1.0;
    this._smoothColorShift = 0.0;
    this._smoothDistortion = 0.0;
    this._smoothSaturation = 1.0;
    this._beatEnergy = 0.0;
    this._juliaC = [...this.preset.juliaC];
    this.colorParams = { hueShift: 0.0, saturation: 1.0, brightness: 1.0, contrast: 1.2, colorOffset: 0.0 };
    this.minIter = 50;
    this.maxIter = 500;
    this.mappingStrengths = {
      lowToZoom: 0.7,
      midToColor: 0.5,
      highToIter: 0.6,
      rmsToBrightness: 0.8,
      beatToJulia: 0.5,
      centroidToSaturation: 0.6,
      fluxToDistortion: 0.3,
      zcrToJuliaImag: 0.4,
    };
  }
}

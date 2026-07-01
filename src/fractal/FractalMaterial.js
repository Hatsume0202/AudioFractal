import * as THREE from 'three';

// Shader imports using Vite's ?raw suffix
import commonSrc from '../shaders/common.glsl?raw';
import mandelbrotSrc from '../shaders/mandelbrot.frag?raw';
import juliaSrc from '../shaders/julia.frag?raw';
import burningshipSrc from '../shaders/burningship.frag?raw';
import mandelbrotAltSrc from '../shaders/mandelbrot_alt.frag?raw';

/**
 * Map of fractal type keys to shader source imports.
 */
const SHADER_MAP = {
  mandelbrot: mandelbrotSrc,
  julia: juliaSrc,
  burningship: burningshipSrc,
  mandelbrot_alt: mandelbrotAltSrc,
};

// Simple passthrough vertex shader
const VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/**
 * FractalMaterial — Builds and manages a Three.js ShaderMaterial for fractal rendering.
 *
 * Loads fragment shader sources via Vite's ?raw imports and prepends common GLSL
 * utility functions. Handles shader switching at runtime.
 */
export class FractalMaterial {
  /**
   * @param {string} [fractalType='mandelbrot'] — Initial fractal shader to use
   */
  constructor(fractalType = 'mandelbrot') {
    this.fractalType = fractalType;
    /** @type {THREE.ShaderMaterial|null} */
    this.material = null;
    /** @type {string} */
    this.currentShader = '';
  }

  /**
   * Initialize the ShaderMaterial. Must be called before use.
   * Prepends common.glsl to the fractal shader and creates the material.
   * @returns {Promise<void>}
   */
  async init() {
    await this._buildMaterial(this.fractalType);
  }

  /**
   * Switch the active fractal shader.
   * @param {string} type — 'mandelbrot' | 'julia' | 'burningship' | 'mandelbrot_alt'
   * @returns {Promise<void>}
   */
  async setShader(type) {
    if (type === this.fractalType) return;
    this.fractalType = type;
    await this._buildMaterial(type);
  }

  /**
   * Build a new ShaderMaterial for the given fractal type.
   * @private
   */
  async _buildMaterial(type) {
    let source = SHADER_MAP[type];
    if (!source) {
      console.warn(`Unknown shader type: ${type}, falling back to mandelbrot`);
      source = SHADER_MAP.mandelbrot;
      type = 'mandelbrot';
    }

    // Strip common.glsl include guards and prepend the common functions
    // The .frag files already have common functions inlined, but we also
    // prepend common.glsl to ensure all functions are available
    const commonClean = commonSrc
      .replace('#ifndef COMMON_GLSL', '')
      .replace('#define COMMON_GLSL', '')
      .replace('#endif', '')
      .trim();

    // Combine: common functions first, then the fractal shader
    const fragmentShader = commonClean + '\n' + source;

    // Dispose old material if it exists
    if (this.material) {
      this.material.dispose();
    }

    // Create default uniform values
    const uniforms = {
      u_resolution: { value: new THREE.Vector2(800, 600) },
      u_center: { value: new THREE.Vector2(-0.5, 0.0) },
      u_zoom: { value: 1.0 },
      u_maxIter: { value: 150.0 },
      u_colorOffset: { value: 0.0 },
      u_colorShift: { value: 0.0 },
      u_hueShift: { value: 0.0 },
      u_saturation: { value: 1.0 },
      u_brightness: { value: 1.0 },
      u_contrast: { value: 1.2 },
      u_time: { value: 0.0 },
      u_paletteA: { value: new THREE.Vector3(0.5, 0.5, 0.5) },
      u_paletteB: { value: new THREE.Vector3(0.5, 0.5, 0.5) },
      u_paletteC: { value: new THREE.Vector3(1.0, 1.0, 1.0) },
      u_paletteD: { value: new THREE.Vector3(0.0, 0.33, 0.67) },
      u_juliaC: { value: new THREE.Vector2(-0.7269, 0.1889) },
      u_power: { value: 2.0 },
      u_distortion: { value: 0.0 },
    };

    this.material = new THREE.ShaderMaterial({
      vertexShader: VERTEX_SHADER,
      fragmentShader,
      uniforms,
    });

    this.currentShader = fragmentShader;
  }

  /**
   * Update shader uniforms from a uniform values object.
   * Only updates uniforms that exist in the material.
   * @param {object} uniformValues — Key-value pairs of uniform names to values
   */
  updateUniforms(uniformValues) {
    if (!this.material) return;
    const mats = this.material.uniforms;
    for (const [key, value] of Object.entries(uniformValues)) {
      if (mats[key] && mats[key].value !== undefined) {
        if (value instanceof THREE.Vector2 || value instanceof THREE.Vector3) {
          mats[key].value.copy(value);
        } else if (Array.isArray(value) && mats[key].value instanceof THREE.Vector2) {
          mats[key].value.set(value[0], value[1]);
        } else {
          mats[key].value = value;
        }
      }
    }
  }

  /**
   * Update the resolution uniform (called on resize).
   * @param {number} width
   * @param {number} height
   */
  setResolution(width, height) {
    this.updateUniforms({ u_resolution: new THREE.Vector2(width, height) });
  }

  /**
   * Update palette color uniforms from a theme palette definition.
   * @param {object} palette — { a: [r,g,b], b: [r,g,b], c: [r,g,b], d: [r,g,b] }
   */
  setThemeColors(palette) {
    if (!palette) return;
    const updates = {};
    if (palette.a) updates.u_paletteA = new THREE.Vector3(...palette.a);
    if (palette.b) updates.u_paletteB = new THREE.Vector3(...palette.b);
    if (palette.c) updates.u_paletteC = new THREE.Vector3(...palette.c);
    if (palette.d) updates.u_paletteD = new THREE.Vector3(...palette.d);
    this.updateUniforms(updates);
  }

  /**
   * Update the time uniform (called each frame).
   * @param {number} time — Time in seconds
   */
  setTime(time) {
    this.updateUniforms({ u_time: time });
  }

  /** @returns {THREE.ShaderMaterial} */
  getMaterial() {
    return this.material;
  }

  /** @returns {string} Current fractal type */
  getFractalType() {
    return this.fractalType;
  }

  /** Dispose of the shader material */
  dispose() {
    if (this.material) {
      this.material.dispose();
      this.material = null;
    }
  }
}

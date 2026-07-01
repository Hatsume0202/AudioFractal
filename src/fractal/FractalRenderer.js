import * as THREE from 'three';

/**
 * FractalRenderer — Manages the Three.js scene, camera, and render loop.
 *
 * Uses a fullscreen quad with an OrthographicCamera to render fragment shaders.
 * Tracks FPS with a rolling average.
 */
export class FractalRenderer {
  /**
   * @param {HTMLCanvasElement} canvas — The canvas element to render into
   */
  constructor(canvas) {
    /** @type {HTMLCanvasElement} */
    this.canvas = canvas;

    /** @type {THREE.WebGLRenderer|null} */
    this.renderer = null;

    /** @type {THREE.Scene|null} */
    this.scene = null;

    /** @type {THREE.OrthographicCamera|null} */
    this.camera = null;

    /** @type {THREE.Mesh|null} */
    this.quad = null;

    /** @type {THREE.ShaderMaterial|null} */
    this.material = null;

    /** @type {number} */
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    /** @type {number} */
    this.resolutionScale = 1.0;

    /** @type {number} */
    this.animationId = null;

    /** @type {boolean} */
    this.running = false;

    // FPS tracking
    /** @type {number[]} */
    this._fpsHistory = [];
    this._lastFrameTime = performance.now();
    this._fps = 0;

    // Callbacks
    /** @type {Function|null} */
    this._onRender = null;
  }

  /**
   * Initialize the renderer, scene, camera, and fullscreen quad.
   */
  init() {
    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: false,
      preserveDrawingBuffer: false,
      alpha: false,
    });
    this.renderer.setPixelRatio(this.resolutionScale);
    this.renderer.setSize(this.width, this.height, false);

    // Scene
    this.scene = new THREE.Scene();

    // Orthographic camera covering [-1, 1] in both axes
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    // Fullscreen quad
    const geometry = new THREE.PlaneGeometry(2, 2);
    this.quad = new THREE.Mesh(geometry);
    this.scene.add(this.quad);
  }

  /**
   * Set the ShaderMaterial to use on the fullscreen quad.
   * @param {THREE.ShaderMaterial} material
   */
  setMaterial(material) {
    this.material = material;
    if (this.quad) {
      this.quad.material = material;
    }
  }

  /**
   * Register a callback to run each frame before rendering.
   * @param {Function} callback — Receives (deltaTime, elapsedTime)
   */
  onRender(callback) {
    this._onRender = callback;
  }

  /**
   * Start the render loop.
   */
  start() {
    if (this.running) return;
    this.running = true;
    this._lastFrameTime = performance.now();
    this._tick = this._tick.bind(this);
    this.animationId = requestAnimationFrame(this._tick);
  }

  /**
   * Stop the render loop.
   */
  stop() {
    this.running = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  /**
   * Single frame tick.
   * @private
   */
  _tick() {
    if (!this.running) return;

    const now = performance.now();
    const delta = (now - this._lastFrameTime) / 1000; // seconds
    this._lastFrameTime = now;

    // Update FPS
    this._fpsHistory.push(now);
    // Keep only last second of timestamps
    while (this._fpsHistory.length > 0 && this._fpsHistory[0] < now - 1000) {
      this._fpsHistory.shift();
    }
    this._fps = this._fpsHistory.length;

    // Run render callback
    if (this._onRender) {
      this._onRender(delta, now / 1000);
    }

    // Render
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }

    this.animationId = requestAnimationFrame(this._tick);
  }

  /**
   * Handle canvas resize.
   * @param {number} [width] — New width (defaults to window.innerWidth)
   * @param {number} [height] — New height (defaults to window.innerHeight)
   */
  resize(width, height) {
    this.width = width || window.innerWidth;
    this.height = height || window.innerHeight;
    if (this.renderer) {
      this.renderer.setSize(this.width, this.height, false);
    }
  }

  /**
   * Set the internal rendering resolution scale.
   * @param {number} scale — 0.5 for half res, 1.0 for native, 2.0 for supersampling
   */
  setResolutionScale(scale) {
    this.resolutionScale = Math.max(0.25, Math.min(2, scale));
    if (this.renderer) {
      this.renderer.setPixelRatio(this.resolutionScale);
      this.renderer.setSize(this.width, this.height, false);
    }
  }

  /** @returns {number} Current FPS (rolling 1-second average) */
  getFPS() {
    return this._fps;
  }

  /** @returns {THREE.WebGLRenderer} */
  getRenderer() {
    return this.renderer;
  }

  /** Dispose all Three.js resources */
  dispose() {
    this.stop();
    if (this.quad) {
      this.quad.geometry.dispose();
      this.quad = null;
    }
    if (this.material) {
      // Material is owned by FractalMaterial, don't dispose here
      this.material = null;
    }
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = null;
    }
  }
}

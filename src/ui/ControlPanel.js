import { getFractalNames, getFractalTypes } from '../fractal/presets.js';

/**
 * Inline template for slider controls.
 * @param {string} label
 * @param {string} id
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @param {number} step
 * @returns {string} HTML string
 */
function sliderHTML(label, id, value, min, max, step) {
  return `
    <div class="control-row">
      <label for="${id}">${label}</label>
      <input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${value}">
      <span class="control-value" id="${id}-value">${value}</span>
    </div>
  `;
}

/**
 * ControlPanel — Builds and manages the sidebar UI with all control groups.
 */
export class ControlPanel {
  /**
   * @param {HTMLElement} container — DOM element to mount the panel into
   */
  constructor(container) {
    /** @type {HTMLElement} */
    this.container = container;

    // References to bound objects (set via bind methods)
    /** @type {import('../fractal/FractalParameters.js').FractalParameters|null} */
    this.fractalParams = null;
    /** @type {import('./ThemeManager.js').ThemeManager|null} */
    this.themeManager = null;
    /** @type {import('./AudioSourceSelector.js').AudioSourceSelector|null} */
    this.audioSelector = null;

    // DOM element references
    /** @type {object} */
    this.elements = {};

    // Mini spectrum canvas
    /** @type {HTMLCanvasElement|null} */
    this._spectrumCanvas = null;
    /** @type {CanvasRenderingContext2D|null} */
    this._spectrumCtx = null;

    /** @type {boolean} */
    this._open = true;

    /** @type {number} */
    this._fps = 0;
  }

  /** Build the full control panel HTML and attach event listeners. */
  init() {
    const fractalOptions = getFractalTypes()
      .map((key, i) => `<option value="${key}">${getFractalNames()[i]}</option>`)
      .join('');

    this.container.innerHTML = `
      <div class="control-panel-inner">
        <div class="panel-header">
          <h2>🎛️ AudioFractal</h2>
          <button class="btn-panel-close mobile-only" id="btn-panel-close">✕</button>
        </div>

        <fieldset>
          <legend>🔊 Audio Source</legend>
          <div id="audio-source-container"></div>
        </fieldset>

        <fieldset>
          <legend>🌀 Fractal Type</legend>
          <div class="control-row">
            <select id="fractal-type-select">
              ${fractalOptions}
            </select>
          </div>
        </fieldset>

        <fieldset>
          <legend>📊 Audio Mapping</legend>
          ${sliderHTML('Low → Zoom', 'map-low-zoom', 0.7, 0, 1, 0.01)}
          ${sliderHTML('Mid → Color', 'map-mid-color', 0.5, 0, 1, 0.01)}
          ${sliderHTML('High → Detail', 'map-high-iter', 0.6, 0, 1, 0.01)}
          ${sliderHTML('RMS → Brightness', 'map-rms-brightness', 0.8, 0, 1, 0.01)}
          ${sliderHTML('Beat → Perturb', 'map-beat-julia', 0.5, 0, 1, 0.01)}
          ${sliderHTML('Centroid → Saturation', 'map-centroid-sat', 0.6, 0, 1, 0.01)}
          ${sliderHTML('Flux → Distortion', 'map-flux-distort', 0.3, 0, 1, 0.01)}
          ${sliderHTML('ZCR → Julia Imag', 'map-zcr-julia', 0.4, 0, 1, 0.01)}
        </fieldset>

        <fieldset>
          <legend>🎨 Color</legend>
          ${sliderHTML('Hue Shift', 'color-hue', 0.0, -1, 1, 0.01)}
          ${sliderHTML('Saturation', 'color-sat', 1.0, 0, 2, 0.01)}
          ${sliderHTML('Brightness', 'color-bright', 1.0, 0, 2, 0.01)}
          ${sliderHTML('Contrast', 'color-contrast', 1.2, 0.5, 3, 0.01)}
        </fieldset>

        <fieldset>
          <legend>🔢 Iterations</legend>
          ${sliderHTML('Min Iterations', 'iter-min', 50, 10, 200, 1)}
          ${sliderHTML('Max Iterations', 'iter-max', 500, 50, 500, 1)}
        </fieldset>

        <fieldset>
          <legend>🎭 Theme</legend>
          <div class="control-row">
            <select id="theme-select">
              <option value="cyberpunk">Cyberpunk</option>
              <option value="deep-ocean">Deep Ocean</option>
              <option value="aurora">Aurora</option>
              <option value="inferno">Inferno</option>
            </select>
          </div>
        </fieldset>

        <fieldset>
          <legend>⚡ Performance</legend>
          <div class="button-group" id="resolution-buttons">
            <button class="btn btn-small" data-scale="0.5">0.5x</button>
            <button class="btn btn-small active" data-scale="1">1x</button>
            <button class="btn btn-small" data-scale="2">2x</button>
          </div>
        </fieldset>

        <fieldset>
          <legend>📈 Spectrum</legend>
          <canvas id="mini-spectrum" width="280" height="60"></canvas>
        </fieldset>
      </div>
    `;

    // Cache element references
    this._cacheElements();
    // Attach event listeners
    this._attachListeners();

    // Initialize audio source container
    this._spectrumCanvas = this.container.querySelector('#mini-spectrum');
    if (this._spectrumCanvas) {
      this._spectrumCtx = this._spectrumCanvas.getContext('2d');
    }
  }

  /** @private */
  _cacheElements() {
    const ids = [
      'fractal-type-select',
      'map-low-zoom', 'map-mid-color', 'map-high-iter',
      'map-rms-brightness', 'map-beat-julia', 'map-centroid-sat',
      'map-flux-distort', 'map-zcr-julia',
      'color-hue', 'color-sat', 'color-bright', 'color-contrast',
      'iter-min', 'iter-max',
      'theme-select',
      'btn-panel-close',
    ];
    for (const id of ids) {
      this.elements[id] = this.container.querySelector(`#${id}`);
    }
  }

  /** @private */
  _attachListeners() {
    // Fractal type selector
    this.elements['fractal-type-select']?.addEventListener('change', (e) => {
      if (this.fractalParams) {
        this.fractalParams.setFractalType(e.target.value);
      }
      // Notify main.js to sync the shader material
      document.dispatchEvent(new CustomEvent('fractal-type-change', { detail: e.target.value }));
    });

    // Audio mapping sliders
    const mappingKeys = {
      'map-low-zoom': 'lowToZoom',
      'map-mid-color': 'midToColor',
      'map-high-iter': 'highToIter',
      'map-rms-brightness': 'rmsToBrightness',
      'map-beat-julia': 'beatToJulia',
      'map-centroid-sat': 'centroidToSaturation',
      'map-flux-distort': 'fluxToDistortion',
      'map-zcr-julia': 'zcrToJuliaImag',
    };

    for (const [id, key] of Object.entries(mappingKeys)) {
      this.elements[id]?.addEventListener('input', (e) => {
        this._updateSliderValue(id, e.target.value);
        if (this.fractalParams) {
          this.fractalParams.setMappingStrength(key, parseFloat(e.target.value));
        }
      });
    }

    // Color sliders
    this.elements['color-hue']?.addEventListener('input', (e) => {
      this._updateSliderValue('color-hue', e.target.value);
      this._updateColorParams();
    });
    this.elements['color-sat']?.addEventListener('input', (e) => {
      this._updateSliderValue('color-sat', e.target.value);
      this._updateColorParams();
    });
    this.elements['color-bright']?.addEventListener('input', (e) => {
      this._updateSliderValue('color-bright', e.target.value);
      this._updateColorParams();
    });
    this.elements['color-contrast']?.addEventListener('input', (e) => {
      this._updateSliderValue('color-contrast', e.target.value);
      this._updateColorParams();
    });

    // Iteration sliders
    this.elements['iter-min']?.addEventListener('input', (e) => {
      this._updateSliderValue('iter-min', e.target.value);
      if (this.fractalParams) {
        const min = parseInt(e.target.value);
        const max = parseInt(this.elements['iter-max']?.value || 500);
        this.fractalParams.setIterationRange(min, max);
      }
    });
    this.elements['iter-max']?.addEventListener('input', (e) => {
      this._updateSliderValue('iter-max', e.target.value);
      if (this.fractalParams) {
        const min = parseInt(this.elements['iter-min']?.value || 50);
        const max = parseInt(e.target.value);
        this.fractalParams.setIterationRange(min, max);
      }
    });

    // Theme selector
    this.elements['theme-select']?.addEventListener('change', (e) => {
      if (this.themeManager) {
        this.themeManager.applyTheme(e.target.value);
      }
    });

    // Resolution buttons
    const resButtons = this.container.querySelectorAll('#resolution-buttons .btn');
    resButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        resButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const scale = parseFloat(btn.dataset.scale);
        // Will be handled by main.js via event or callback
        this.container.dispatchEvent(new CustomEvent('resolution-change', { detail: scale }));
      });
    });

    // Close button (mobile)
    this.elements['btn-panel-close']?.addEventListener('click', () => this.hide());

    // Keyboard shortcut hints
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.hide();
    });
  }

  /** @private */
  _updateColorParams() {
    if (!this.fractalParams) return;
    const hueShift = parseFloat(this.elements['color-hue']?.value || 0);
    const saturation = parseFloat(this.elements['color-sat']?.value || 1);
    const brightness = parseFloat(this.elements['color-bright']?.value || 1);
    const contrast = parseFloat(this.elements['color-contrast']?.value || 1.2);
    this.fractalParams.setColorParams({ hueShift, saturation, brightness, contrast });
  }

  /** @private */
  _updateSliderValue(id, value) {
    const valueEl = document.getElementById(`${id}-value`);
    if (valueEl) {
      valueEl.textContent = parseFloat(value).toFixed(2);
    }
  }

  /**
   * Bind the fractal parameters controller for bidirectional updates.
   * @param {import('../fractal/FractalParameters.js').FractalParameters} params
   */
  bindFractalParams(params) {
    this.fractalParams = params;
  }

  /**
   * Bind the theme manager.
   * @param {import('./ThemeManager.js').ThemeManager} tm
   */
  bindThemeManager(tm) {
    this.themeManager = tm;
    // Listen for theme changes to update the selector
    if (tm) {
      tm.onChange((theme) => {
        const select = this.elements['theme-select'];
        if (select && select.value !== theme.name) {
          select.value = theme.name;
        }
      });
    }
  }

  /**
   * Bind the audio source selector.
   * @param {import('./AudioSourceSelector.js').AudioSourceSelector} selector
   */
  bindAudioSelector(selector) {
    this.audioSelector = selector;
    const container = this.container.querySelector('#audio-source-container');
    if (container && selector) {
      // The selector is already initialized; append its container
      // (AudioSourceSelector handles its own init)
    }
  }

  /**
   * Draw a mini FFT spectrum on the panel's canvas.
   * @param {Uint8Array} freqData — Frequency data from analyser
   */
  showMiniSpectrum(freqData) {
    if (!this._spectrumCtx) return;
    const ctx = this._spectrumCtx;
    const w = this._spectrumCanvas.width;
    const h = this._spectrumCanvas.height;

    // Clear
    ctx.clearRect(0, 0, w, h);

    // Draw spectrum bars
    const barCount = Math.min(freqData.length, 64); // Show 64 bars
    const barWidth = w / barCount;

    for (let i = 0; i < barCount; i++) {
      const value = freqData[Math.floor(i * freqData.length / barCount)] / 255;
      const barHeight = value * h;
      const x = i * barWidth;

      // Gradient color based on frequency
      const hue = (i / barCount) * 0.6; // Blue to red
      ctx.fillStyle = `hsl(${hue * 360}, 80%, ${40 + value * 40}%)`;
      ctx.fillRect(x, h - barHeight, barWidth - 1, barHeight);
    }
  }

  /**
   * Update the FPS display.
   * @param {number} fps — Current frames per second
   */
  setFPS(fps) {
    this._fps = fps;
    const fpsEl = document.getElementById('fps-counter');
    if (fpsEl) {
      fpsEl.textContent = `FPS: ${fps}`;
    }
  }

  /** Show the control panel */
  show() {
    this._open = true;
    this.container.classList.add('open');
  }

  /** Hide the control panel */
  hide() {
    this._open = false;
    this.container.classList.remove('open');
  }

  /** Toggle panel visibility */
  toggle() {
    if (this._open) this.hide();
    else this.show();
  }

  /** @returns {boolean} Whether the panel is currently open */
  isOpen() {
    return this._open;
  }
}

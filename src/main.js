import { FractalRenderer } from './fractal/FractalRenderer.js';
import { FractalMaterial } from './fractal/FractalMaterial.js';
import { FractalParameters } from './fractal/FractalParameters.js';
import { AudioEngine } from './audio/AudioEngine.js';
import { AudioAnalyzer } from './audio/AudioAnalyzer.js';
import { AudioFeatures } from './audio/AudioFeatures.js';
import { ControlPanel } from './ui/ControlPanel.js';
import { ThemeManager } from './ui/ThemeManager.js';
import { AudioSourceSelector } from './ui/AudioSourceSelector.js';
import { PresetManager } from './ui/PresetManager.js';
import { getRecommendedScale } from './utils/responsive.js';

/**
 * AudioFractal — Main application controller.
 * Initializes all subsystems and runs the render loop.
 */
class AudioFractalApp {
  constructor() {
    /** @type {FractalRenderer} */
    this.renderer = null;
    /** @type {FractalMaterial} */
    this.material = null;
    /** @type {FractalParameters} */
    this.params = null;
    /** @type {AudioEngine} */
    this.audioEngine = null;
    /** @type {AudioAnalyzer} */
    this.analyzer = null;
    /** @type {AudioFeatures} */
    this.features = null;
    /** @type {ControlPanel} */
    this.controlPanel = null;
    /** @type {ThemeManager} */
    this.themeManager = null;
    /** @type {AudioSourceSelector} */
    this.audioSelector = null;
    /** @type {PresetManager} */
    this.presetManager = null;

    this._startTime = performance.now();
    this._initialized = false;
  }

  /**
   * Initialize the entire application.
   * @returns {Promise<void>}
   */
  async init() {
    try {
      this._showLoading('Initializing renderer...');

      // 1. Theme Manager (applies default theme CSS vars)
      this.themeManager = new ThemeManager();
      this.themeManager.applyDefault();

      // 2. Fractal Renderer
      const canvas = document.getElementById('fractal-canvas');
      this.renderer = new FractalRenderer(canvas);
      this.renderer.init();

      // Apply recommended resolution scale for device
      const { scale } = getRecommendedScale();
      this.renderer.setResolutionScale(scale);

      // 3. Fractal Material
      this._showLoading('Compiling shaders...');
      this.material = new FractalMaterial('mandelbrot');
      await this.material.init();
      this.renderer.setMaterial(this.material.getMaterial());

      // Apply default theme palette to shader
      this.material.setThemeColors(this.themeManager.getCurrentTheme().palette);

      // 4. Fractal Parameters
      this.params = new FractalParameters('mandelbrot');

      // 5. Audio Engine (created but not started — needs user gesture)
      this.audioEngine = new AudioEngine({ fftSize: 2048 });

      // 6. Control Panel
      this._showLoading('Building UI...');
      const panelContainer = document.getElementById('control-panel');
      this.controlPanel = new ControlPanel(panelContainer);
      this.controlPanel.init();

      // 7. Audio Source Selector
      const audioContainer = document.getElementById('audio-source-container');
      this.audioSelector = new AudioSourceSelector(audioContainer);
      this.audioSelector.init();
      this.audioSelector.onSourceChange((event) => this._handleSourceChange(event));
      this.controlPanel.bindAudioSelector(this.audioSelector);

      // 8. Bind control panel to params and theme
      this.controlPanel.bindFractalParams(this.params);
      this.controlPanel.bindThemeManager(this.themeManager);

      // 9. Preset Manager
      this.presetManager = new PresetManager();

      // 10. Theme change → update shader palette
      this.themeManager.onChange((theme) => {
        if (this.material) {
          this.material.setThemeColors(theme.palette);
        }
      });

      // 11. Resolution change handler
      panelContainer.addEventListener('resolution-change', (e) => {
        if (this.renderer && e.detail) {
          this.renderer.setResolutionScale(e.detail);
        }
      });

      // 12. Keyboard shortcuts
      this._setupKeyboard();

      // 13. Window resize handling
      window.addEventListener('resize', () => {
        if (this.renderer) {
          this.renderer.resize();
          if (this.material) {
            this.material.setResolution(window.innerWidth, window.innerHeight);
          }
        }
      });

      // 14. Panel toggle button (mobile)
      const toggleBtn = document.getElementById('panel-toggle');
      if (toggleBtn) {
        toggleBtn.addEventListener('click', () => this.controlPanel.toggle());
      }

      // 15. Set initial resolution uniform
      this.material.setResolution(window.innerWidth, window.innerHeight);

      // 16. Register render callback
      this.renderer.onRender((delta, elapsed) => this._frame(delta, elapsed));

      // 17. Start render loop
      this.renderer.start();

      // 18. Hide loading screen
      this._hideLoading();
      this._initialized = true;

      console.log('🎛️ AudioFractal initialized successfully!');
      console.log('  - Click "Mic" to use your microphone');
      console.log('  - Click "File" to upload an audio file');
      console.log('  - Press 1-4 to switch fractal types');
      console.log('  - Press Space to toggle audio playback');
      console.log('  - Press F for fullscreen');

    } catch (err) {
      console.error('Failed to initialize AudioFractal:', err);
      this._showLoading(`Error: ${err.message}`, true);
    }
  }

  /**
   * Per-frame update callback.
   * @private
   */
  _frame(delta, elapsed) {
    // Update time on material
    if (this.material) {
      this.material.setTime(elapsed);
    }

    // If audio is active, update features and map to fractal parameters
    if (this.audioEngine && this.audioEngine.isPlaying() && this.analyzer) {
      // Update features from analyzer
      this.features.update(this.analyzer);

      // Map features to fractal uniforms
      const uniforms = this.params.update(this.features.getAllFeatures());

      // Push uniforms to shader material
      if (this.material) {
        this.material.updateUniforms(uniforms);
      }

      // Update volume indicator
      if (this.audioSelector) {
        this.audioSelector.setVolumeLevel(this.features.getRMS());
      }

      // Update mini spectrum
      if (this.controlPanel) {
        const freqData = this.analyzer.getFrequencyData();
        this.controlPanel.showMiniSpectrum(freqData);
      }
    }

    // Update FPS counter
    if (this.controlPanel) {
      this.controlPanel.setFPS(this.renderer.getFPS());
    }
  }

  /**
   * Handle audio source change events from the selector.
   * @private
   */
  async _handleSourceChange(event) {
    try {
      if (event.type === 'mic') {
        await this.audioEngine.startMicrophone();
        this.audioSelector.setSourceType('mic');
      } else if (event.type === 'file' && event.file) {
        await this.audioEngine.loadAudioFile(event.file);
        this.audioSelector.setSourceType('file');
        this.audioSelector.setFileName(event.file.name);
      }

      // Create/update analyzer and features
      const analyserNode = this.audioEngine.getAnalyser();
      if (analyserNode) {
        this.analyzer = new AudioAnalyzer(analyserNode, 2048);
        this.features = new AudioFeatures();
        this.features.reset();
      }
    } catch (err) {
      console.error('Audio source error:', err);
      this.audioSelector.setSourceType('none');
      alert(`Audio error: ${err.message}`);
    }
  }

  /**
   * Set up keyboard shortcuts.
   * @private
   */
  _setupKeyboard() {
    document.addEventListener('keydown', (e) => {
      // Ignore if user is typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;

      switch (e.key) {
        case ' ': // Space
          e.preventDefault();
          if (this.audioEngine) {
            this.audioEngine.togglePlayback();
          }
          break;
        case 'f':
        case 'F':
          if (document.fullscreenElement) {
            document.exitFullscreen();
          } else {
            document.body.requestFullscreen().catch(() => {});
          }
          break;
        case '1':
          this.params.setFractalType('mandelbrot');
          if (this.material) this.material.setShader('mandelbrot');
          this._updatePanelFractalType();
          break;
        case '2':
          this.params.setFractalType('julia');
          if (this.material) this.material.setShader('julia');
          this._updatePanelFractalType();
          break;
        case '3':
          this.params.setFractalType('burningship');
          if (this.material) this.material.setShader('burningship');
          this._updatePanelFractalType();
          break;
        case '4':
          this.params.setFractalType('mandelbrot_alt');
          if (this.material) this.material.setShader('mandelbrot_alt');
          this._updatePanelFractalType();
          break;
      }
    });

    // Listen for fractal type changes from the ControlPanel
    // (ControlPanel directly calls params.setFractalType, but we need to sync the shader)
    // We use a MutationObserver or polling — simpler: override via event
    document.addEventListener('fractal-type-change', (e) => {
      if (this.material && e.detail) {
        this.material.setShader(e.detail);
      }
    });
  }

  /** @private */
  _updatePanelFractalType() {
    // Sync the shader with params
    const ft = this.params.getFractalType();
    if (this.material) {
      this.material.setShader(ft);
    }
  }

  /**
   * Update loading screen text.
   * @private
   */
  _showLoading(message, isError = false) {
    const el = document.getElementById('loading-screen');
    if (!el) return;
    const textEl = el.querySelector('p');
    if (textEl) {
      textEl.textContent = message;
      textEl.style.color = isError ? '#ff4444' : '';
    }
  }

  /**
   * Hide loading screen with fade-out animation.
   * @private
   */
  _hideLoading() {
    const el = document.getElementById('loading-screen');
    if (el) {
      el.classList.add('hidden');
      // Remove from DOM after transition
      setTimeout(() => {
        if (el.parentNode) el.parentNode.removeChild(el);
      }, 700);
    }
  }
}

// === Bootstrap ===
const app = new AudioFractalApp();

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => app.init());
} else {
  app.init();
}

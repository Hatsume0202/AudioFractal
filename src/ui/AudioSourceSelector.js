/**
 * AudioSourceSelector — UI component for switching between microphone and file input.
 */
export class AudioSourceSelector {
  /**
   * @param {HTMLElement} container — DOM element to mount into
   */
  constructor(container) {
    /** @type {HTMLElement} */
    this.container = container;

    /** @type {'none'|'mic'|'file'} */
    this.sourceType = 'none';

    /** @type {Function|null} */
    this._onSourceChange = null;

    /** @type {number} */
    this._volume = 0;

    // DOM elements created during init
    /** @type {HTMLButtonElement|null} */
    this._micBtn = null;
    /** @type {HTMLButtonElement|null} */
    this._fileBtn = null;
    /** @type {HTMLInputElement|null} */
    this._fileInput = null;
    /** @type {HTMLElement|null} */
    this._statusEl = null;
    /** @type {HTMLElement|null} */
    this._volumeBar = null;
    /** @type {HTMLElement|null} */
    this._fileName = null;
  }

  /** Build and mount the UI */
  init() {
    this.container.innerHTML = `
      <div class="audio-source-selector">
        <div class="source-buttons">
          <button class="btn btn-mic" title="Use Microphone">🎤 Mic</button>
          <button class="btn btn-file" title="Upload Audio File">📁 File</button>
        </div>
        <input type="file" class="file-input-hidden" accept="audio/*" style="display:none">
        <div class="source-status">No audio source</div>
        <div class="volume-indicator">
          <div class="volume-bar" style="width: 0%"></div>
        </div>
        <div class="file-name"></div>
      </div>
    `;

    this._micBtn = this.container.querySelector('.btn-mic');
    this._fileBtn = this.container.querySelector('.btn-file');
    this._fileInput = this.container.querySelector('.file-input-hidden');
    this._statusEl = this.container.querySelector('.source-status');
    this._volumeBar = this.container.querySelector('.volume-bar');
    this._fileName = this.container.querySelector('.file-name');

    // Event listeners
    this._micBtn.addEventListener('click', () => this._handleMicClick());
    this._fileBtn.addEventListener('click', () => this._fileInput.click());
    this._fileInput.addEventListener('change', (e) => this._handleFileSelect(e));
  }

  /**
   * Register callback for source changes.
   * @param {Function} callback — Receives ({ type: 'mic'|'file', file?: File })
   */
  onSourceChange(callback) {
    this._onSourceChange = callback;
  }

  /** @private */
  async _handleMicClick() {
    if (this._onSourceChange) {
      this._onSourceChange({ type: 'mic' });
    }
  }

  /** @private */
  _handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
      this.setFileName(file.name);
      if (this._onSourceChange) {
        this._onSourceChange({ type: 'file', file });
      }
    }
  }

  /**
   * Update the displayed source type and status text.
   * @param {'mic'|'file'|'none'} type
   */
  setSourceType(type) {
    this.sourceType = type;
    this._micBtn.classList.toggle('active', type === 'mic');
    this._fileBtn.classList.toggle('active', type === 'file');

    const statusTexts = {
      mic: '🎤 Microphone Active',
      file: '🎵 Playing Audio File',
      none: 'No audio source',
    };
    if (this._statusEl) {
      this._statusEl.textContent = statusTexts[type] || statusTexts.none;
    }
  }

  /**
   * Set the displayed file name.
   * @param {string} name
   */
  setFileName(name) {
    if (this._fileName) {
      this._fileName.textContent = name ? `📄 ${name}` : '';
    }
  }

  /**
   * Update the volume level indicator bar.
   * @param {number} level — 0.0 to 1.0
   */
  setVolumeLevel(level) {
    this._volume = Math.max(0, Math.min(1, level));
    if (this._volumeBar) {
      this._volumeBar.style.width = `${this._volume * 100}%`;

      // Color gradient based on level
      if (this._volume > 0.8) {
        this._volumeBar.style.backgroundColor = 'var(--color-accent)';
      } else if (this._volume > 0.4) {
        this._volumeBar.style.backgroundColor = 'var(--color-accent)';
        this._volumeBar.style.opacity = '0.7';
      } else {
        this._volumeBar.style.backgroundColor = 'var(--color-accent)';
        this._volumeBar.style.opacity = '0.4';
      }
    }
  }

  /** @returns {string} Current source type */
  getSourceType() {
    return this.sourceType;
  }

  /** Enable or disable the selector */
  setEnabled(enabled) {
    if (this._micBtn) this._micBtn.disabled = !enabled;
    if (this._fileBtn) this._fileBtn.disabled = !enabled;
  }
}

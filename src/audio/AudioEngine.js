/**
 * AudioEngine — Core Web Audio API manager.
 * Handles AudioContext lifecycle, microphone input, and audio file loading.
 */
export class AudioEngine {
  /**
   * @param {object} [config]
   * @param {number} [config.fftSize=2048] — FFT size for the AnalyserNode
   */
  constructor(config = {}) {
    this.fftSize = config.fftSize || 2048;
    /** @type {AudioContext|null} */
    this.context = null;
    /** @type {AnalyserNode|null} */
    this.analyser = null;
    /** @type {GainNode|null} */
    this.gainNode = null;
    /** @type {MediaStreamAudioSourceNode|AudioBufferSourceNode|null} */
    this.source = null;
    /** @type {MediaStream|null} */
    this.stream = null;
    /** @type {'mic'|'file'|'none'} */
    this.sourceType = 'none';
    this._playing = false;
  }

  /**
   * Initialize the AudioContext and analyser node.
   * Must be called after a user gesture (click/tap).
   * @returns {Promise<AudioEngine>}
   */
  async init() {
    this.context = new (window.AudioContext || window.webkitAudioContext)();
    this.analyser = this.context.createAnalyser();
    this.analyser.fftSize = this.fftSize;
    this.analyser.smoothingTimeConstant = 0.8;
    this.gainNode = this.context.createGain();
    this.gainNode.gain.value = 1.0;
    this.analyser.connect(this.gainNode);
    this.gainNode.connect(this.context.destination);
    return this;
  }

  /**
   * Start capturing from the microphone.
   * @returns {Promise<void>}
   * @throws {Error} If microphone access is denied or unavailable
   */
  async startMicrophone() {
    if (!this.context) await this.init();
    // Stop any existing source
    this.disconnect();

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.source = this.context.createMediaStreamSource(this.stream);
      this.source.connect(this.analyser);
      this.sourceType = 'mic';
      this._playing = true;
      // Resume context if suspended
      if (this.context.state === 'suspended') {
        await this.context.resume();
      }
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        throw new Error('Microphone access denied. Please allow microphone access in your browser settings.');
      } else if (err.name === 'NotFoundError') {
        throw new Error('No microphone found. Please connect a microphone and try again.');
      }
      throw err;
    }
  }

  /**
   * Load and play an audio file.
   * @param {File} file — Audio file from file input
   * @returns {Promise<void>}
   */
  async loadAudioFile(file) {
    if (!this.context) await this.init();
    this.disconnect();

    try {
      const arrayBuffer = await file.arrayBuffer();
      const audioBuffer = await this.context.decodeAudioData(arrayBuffer);
      this.source = this.context.createBufferSource();
      this.source.buffer = audioBuffer;
      this.source.loop = true;
      this.source.connect(this.analyser);
      this.source.start(0);
      this.sourceType = 'file';
      this._playing = true;
      if (this.context.state === 'suspended') {
        await this.context.resume();
      }
    } catch (err) {
      throw new Error(`Failed to load audio file: ${err.message}`);
    }
  }

  /** @returns {AnalyserNode} */
  getAnalyser() {
    return this.analyser;
  }

  /** @returns {AudioContext} */
  getAudioContext() {
    return this.context;
  }

  /** @returns {boolean} */
  isPlaying() {
    return this._playing;
  }

  /** Toggle playback (pause/resume) */
  async togglePlayback() {
    if (!this.context) return;
    if (this.context.state === 'running') {
      await this.context.suspend();
      this._playing = false;
    } else if (this.context.state === 'suspended') {
      await this.context.resume();
      this._playing = true;
    }
  }

  /** Disconnect current source (keeps context alive) */
  disconnect() {
    if (this.source) {
      try { this.source.disconnect(); } catch (e) { /* ignore */ }
      this.source = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    this._playing = false;
    this.sourceType = 'none';
  }

  /**
   * Set master volume.
   * @param {number} value — 0.0 to 1.0
   */
  setVolume(value) {
    if (this.gainNode) {
      this.gainNode.gain.value = Math.max(0, Math.min(1, value));
    }
  }

  /**
   * Get current source type.
   * @returns {'mic'|'file'|'none'}
   */
  getSourceType() {
    return this.sourceType;
  }

  /** Fully destroy the audio engine and release resources */
  destroy() {
    this.disconnect();
    if (this.context) {
      this.context.close();
      this.context = null;
    }
    this.analyser = null;
    this.gainNode = null;
    this._playing = false;
  }
}

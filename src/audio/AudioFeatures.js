// Inline utility (also defined in utils/math.js)
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

/**
 * AudioFeatures — Extracts high-level audio features from analyzer data.
 *
 * Beat detection uses spectral energy comparison against a running average.
 * Features are calculated every frame from the AudioAnalyzer output.
 */
export class AudioFeatures {
  /**
   * @param {object} [config]
   * @param {number} [config.historySize=43] — Frames of history for beat detection (~0.7s at 60fps)
   * @param {number} [config.beatThreshold=1.3] — Energy multiplier to trigger a beat
   * @param {number} [config.beatCooldown=20] — Minimum frames between beats
   */
  constructor(config = {}) {
    this.historySize = config.historySize || 43;
    this.beatThreshold = config.beatThreshold || 1.3;
    this.beatCooldown = config.beatCooldown || 20;

    // Circular buffer for energy history
    /** @type {Float64Array} */
    this.energyHistory = new Float64Array(this.historySize);
    this.historyIndex = 0;
    this.historyFilled = 0;

    /** @type {Float64Array|null} */
    this.prevSpectrum = null;

    this.frameCount = 0;
    this.lastBeatFrame = -this.beatCooldown;
    this._rms = 0;
    this._spectralCentroid = 0;
    this._lowFreqRatio = 0;
    this._spectralFlux = 0;
    this._zeroCrossingRate = 0;
    this._currentBeat = false;
    this._lowBand = 0;
    this._midBand = 0;
    this._highBand = 0;
  }

  /**
   * Update all features from the analyzer. Call once per animation frame.
   * @param {import('./AudioAnalyzer.js').AudioAnalyzer} analyzer
   */
  update(analyzer) {
    const freqData = analyzer.getFrequencyData();
    const timeData = analyzer.getTimeData();

    this._rms = this._computeRMS(timeData);
    this._spectralCentroid = this._computeSpectralCentroid(freqData, analyzer.bufferLength);
    this._lowFreqRatio = this._computeLowFreqRatio(freqData, analyzer.bufferLength);
    this._spectralFlux = this._computeSpectralFlux(freqData, analyzer.bufferLength);
    this._zeroCrossingRate = this._computeZeroCrossingRate(timeData);
    this._currentBeat = this._detectBeat(freqData);

    const bands = analyzer.getBands();
    this._lowBand = bands.low;
    this._midBand = bands.mid;
    this._highBand = bands.high;

    this.frameCount++;
  }

  /** @returns {number} RMS volume, 0-1 */
  getRMS() {
    return this._rms;
  }

  /** @returns {boolean} Whether the current frame contains a beat */
  detectBeat() {
    return this._currentBeat;
  }

  /** @returns {number} Spectral centroid (brightness), 0-1 */
  getSpectralCentroid() {
    return this._spectralCentroid;
  }

  /** @returns {number} Low frequency energy ratio, 0-1 */
  getLowFreqRatio() {
    return this._lowFreqRatio;
  }

  /** @returns {number} Spectral flux (rate of change), 0-1 */
  getSpectralFlux() {
    return this._spectralFlux;
  }

  /** @returns {number} Zero crossing rate, 0-1 */
  getZeroCrossingRate() {
    return this._zeroCrossingRate;
  }

  /** @returns {number} Low band energy, 0-1 */
  getLowBand() { return this._lowBand; }
  /** @returns {number} Mid band energy, 0-1 */
  getMidBand() { return this._midBand; }
  /** @returns {number} High band energy, 0-1 */
  getHighBand() { return this._highBand; }

  /**
   * Get all audio features as a single snapshot object.
   * @returns {object}
   */
  getAllFeatures() {
    return {
      rms: this._rms,
      beat: this._currentBeat,
      spectralCentroid: this._spectralCentroid,
      lowFreqRatio: this._lowFreqRatio,
      spectralFlux: this._spectralFlux,
      zeroCrossingRate: this._zeroCrossingRate,
      lowBand: this._lowBand,
      midBand: this._midBand,
      highBand: this._highBand,
    };
  }

  /**
   * Compute RMS from time-domain samples.
   * @private
   */
  _computeRMS(timeData) {
    let sum = 0;
    for (let i = 0; i < timeData.length; i++) {
      const sample = (timeData[i] - 128) / 128; // Center and normalize
      sum += sample * sample;
    }
    return clamp(Math.sqrt(sum / timeData.length), 0, 1);
  }

  /**
   * Compute spectral centroid (center of mass of spectrum).
   * @private
   */
  _computeSpectralCentroid(freqData, bufferLength) {
    let weightedSum = 0;
    let totalSum = 0;
    for (let i = 0; i < bufferLength; i++) {
      const mag = freqData[i];
      weightedSum += i * mag;
      totalSum += mag;
    }
    if (totalSum === 0) return 0;
    return clamp(weightedSum / (totalSum * bufferLength), 0, 1);
  }

  /**
   * Compute ratio of low frequency energy to total energy.
   * @private
   */
  _computeLowFreqRatio(freqData, bufferLength) {
    const lowBinCount = Math.floor(bufferLength * 0.1); // First 10% of bins
    let lowSum = 0;
    let totalSum = 0;
    for (let i = 0; i < bufferLength; i++) {
      totalSum += freqData[i];
      if (i < lowBinCount) lowSum += freqData[i];
    }
    if (totalSum === 0) return 0;
    return clamp(lowSum / totalSum, 0, 1);
  }

  /**
   * Compute spectral flux (sum of positive differences from previous frame).
   * @private
   */
  _computeSpectralFlux(freqData, bufferLength) {
    if (!this.prevSpectrum) {
      this.prevSpectrum = new Float64Array(bufferLength);
      for (let i = 0; i < bufferLength; i++) {
        this.prevSpectrum[i] = freqData[i];
      }
      return 0;
    }
    let flux = 0;
    for (let i = 0; i < bufferLength; i++) {
      const diff = freqData[i] - this.prevSpectrum[i];
      if (diff > 0) flux += diff;
      this.prevSpectrum[i] = freqData[i];
    }
    return clamp(flux / (bufferLength * 255), 0, 1);
  }

  /**
   * Compute zero crossing rate from time-domain waveform.
   * @private
   */
  _computeZeroCrossingRate(timeData) {
    let crossings = 0;
    for (let i = 1; i < timeData.length; i++) {
      // Crossing when samples pass through the 128 midpoint
      if ((timeData[i] >= 128 && timeData[i - 1] < 128) ||
          (timeData[i] < 128 && timeData[i - 1] >= 128)) {
        crossings++;
      }
    }
    return clamp(crossings / (timeData.length - 1), 0, 1);
  }

  /**
   * Beat detection: compare instant energy against running average.
   * @private
   */
  _detectBeat(freqData) {
    // Compute instant energy from all frequency bins
    let energy = 0;
    for (let i = 1; i < freqData.length; i++) {
      energy += freqData[i] * freqData[i];
    }

    // Store in circular history buffer
    this.energyHistory[this.historyIndex] = energy;
    this.historyIndex = (this.historyIndex + 1) % this.historySize;
    if (this.historyFilled < this.historySize) {
      this.historyFilled++;
    }

    // Compute average from history
    if (this.historyFilled < 2) return false;
    let avg = 0;
    for (let i = 0; i < this.historyFilled; i++) {
      avg += this.energyHistory[i];
    }
    avg /= this.historyFilled;

    // Check beat condition with cooldown
    const beatDetected = energy > avg * this.beatThreshold &&
      (this.frameCount - this.lastBeatFrame) > this.beatCooldown;

    if (beatDetected) {
      this.lastBeatFrame = this.frameCount;
    }

    return beatDetected;
  }

  /**
   * Reset all feature state (useful when switching audio sources).
   */
  reset() {
    this.energyHistory.fill(0);
    this.historyIndex = 0;
    this.historyFilled = 0;
    this.prevSpectrum = null;
    this.frameCount = 0;
    this.lastBeatFrame = -this.beatCooldown;
    this._rms = 0;
    this._spectralCentroid = 0;
    this._lowFreqRatio = 0;
    this._spectralFlux = 0;
    this._zeroCrossingRate = 0;
    this._currentBeat = false;
  }
}

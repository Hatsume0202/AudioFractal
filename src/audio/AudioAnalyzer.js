/**
 * AudioAnalyzer — Extracts frequency spectrum and waveform data from an AnalyserNode.
 */
export class AudioAnalyzer {
  /**
   * @param {AnalyserNode} analyser
   * @param {number} [fftSize=2048]
   */
  constructor(analyser, fftSize = 2048) {
    /** @type {AnalyserNode} */
    this.analyser = analyser;
    this.fftSize = fftSize;
    this.bufferLength = fftSize / 2; // Frequency bins
    /** @type {Uint8Array} */
    this.frequencyData = new Uint8Array(this.bufferLength);
    /** @type {Uint8Array} */
    this.timeData = new Uint8Array(fftSize);
    // Sample rate is needed for bin→Hz mapping
    this.sampleRate = analyser.context.sampleRate;
    this.binWidth = this.sampleRate / fftSize;
  }

  /**
   * Get current frequency spectrum data (0-255 per bin).
   * @returns {Uint8Array}
   */
  getFrequencyData() {
    this.analyser.getByteFrequencyData(this.frequencyData);
    return this.frequencyData;
  }

  /**
   * Get current time-domain waveform data (0-255, centered at 128).
   * @returns {Uint8Array}
   */
  getTimeData() {
    this.analyser.getByteTimeDomainData(this.timeData);
    return this.timeData;
  }

  /**
   * Get low band energy (20-200Hz), normalized 0-1.
   * @returns {number}
   */
  getLowBand() {
    this.getFrequencyData();
    const startBin = Math.max(1, Math.floor(20 / this.binWidth));
    const endBin = Math.min(this.bufferLength - 1, Math.floor(200 / this.binWidth));
    return this._averageBins(startBin, endBin);
  }

  /**
   * Get mid band energy (200-2000Hz), normalized 0-1.
   * @returns {number}
   */
  getMidBand() {
    this.getFrequencyData();
    const startBin = Math.floor(200 / this.binWidth);
    const endBin = Math.min(this.bufferLength - 1, Math.floor(2000 / this.binWidth));
    return this._averageBins(startBin, endBin);
  }

  /**
   * Get high band energy (2000-20000Hz), normalized 0-1.
   * @returns {number}
   */
  getHighBand() {
    this.getFrequencyData();
    const startBin = Math.floor(2000 / this.binWidth);
    const endBin = this.bufferLength - 1;
    return this._averageBins(startBin, endBin);
  }

  /**
   * Get all three bands at once.
   * @returns {{ low: number, mid: number, high: number }}
   */
  getBands() {
    return {
      low: this.getLowBand(),
      mid: this.getMidBand(),
      high: this.getHighBand(),
    };
  }

  /**
   * Get total spectral energy (sum of all bins), normalized 0-1.
   * @returns {number}
   */
  getTotalEnergy() {
    this.getFrequencyData();
    let sum = 0;
    for (let i = 0; i < this.bufferLength; i++) {
      sum += this.frequencyData[i];
    }
    return sum / (this.bufferLength * 255);
  }

  /**
   * Average frequency bin values over a range, normalized to 0-1.
   * @private
   */
  _averageBins(startBin, endBin) {
    let sum = 0;
    const count = endBin - startBin + 1;
    if (count <= 0) return 0;
    for (let i = startBin; i <= endBin; i++) {
      sum += this.frequencyData[i];
    }
    return sum / (count * 255);
  }
}

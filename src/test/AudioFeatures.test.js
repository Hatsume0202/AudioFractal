import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AudioFeatures } from '../audio/AudioFeatures.js';

/**
 * Create a mock AudioAnalyzer that returns controlled data.
 */
function createMockAnalyzer(overrides = {}) {
  const bufferLength = overrides.bufferLength || 1024;
  const timeLength = overrides.timeLength || 2048;

  const freqData = new Uint8Array(bufferLength);
  const timeData = new Uint8Array(timeLength);

  // Fill with default patterns
  if (overrides.freqPattern === 'mid') {
    // Energy concentrated in middle bins
    for (let i = 0; i < bufferLength; i++) {
      const center = bufferLength / 2;
      freqData[i] = Math.max(0, Math.floor(255 * (1 - Math.abs(i - center) / (bufferLength / 4))));
    }
  } else if (overrides.freqPattern === 'high') {
    // Energy concentrated in high bins
    for (let i = 0; i < bufferLength; i++) {
      freqData[i] = i > bufferLength * 0.7 ? Math.floor(255 * Math.random()) : 10;
    }
  } else if (overrides.freqPattern === 'low') {
    // Energy concentrated in low bins
    for (let i = 0; i < bufferLength; i++) {
      freqData[i] = i < bufferLength * 0.1 ? Math.floor(200 + 55 * Math.random()) : 10;
    }
  } else if (overrides.freqPattern === 'silent') {
    freqData.fill(0);
  } else {
    // Random noise
    for (let i = 0; i < bufferLength; i++) {
      freqData[i] = Math.floor(Math.random() * 255);
    }
  }

  if (overrides.timePattern === 'sine') {
    // Simulate sine wave
    for (let i = 0; i < timeLength; i++) {
      timeData[i] = 128 + Math.floor(127 * Math.sin(2 * Math.PI * i / 20));
    }
  } else if (overrides.timePattern === 'silent') {
    timeData.fill(128);
  } else {
    // Random noise
    for (let i = 0; i < timeLength; i++) {
      timeData[i] = Math.floor(64 + Math.random() * 128);
    }
  }

  // Bin width for band calculations
  const sampleRate = overrides.sampleRate || 44100;
  const fftSize = timeLength;
  const binWidth = sampleRate / fftSize;

  return {
    bufferLength,
    timeData,
    freqData,
    binWidth,
    sampleRate,
    getFrequencyData() { return this.freqData; },
    getTimeData() { return this.timeData; },
    getLowBand() {
      const startBin = Math.max(1, Math.floor(20 / binWidth));
      const endBin = Math.min(bufferLength - 1, Math.floor(200 / binWidth));
      let sum = 0, count = endBin - startBin + 1;
      for (let i = startBin; i <= endBin; i++) sum += this.freqData[i];
      return count > 0 ? sum / (count * 255) : 0;
    },
    getMidBand() {
      const startBin = Math.floor(200 / binWidth);
      const endBin = Math.min(bufferLength - 1, Math.floor(2000 / binWidth));
      let sum = 0, count = endBin - startBin + 1;
      for (let i = startBin; i <= endBin; i++) sum += this.freqData[i];
      return count > 0 ? sum / (count * 255) : 0;
    },
    getHighBand() {
      const startBin = Math.floor(2000 / binWidth);
      const endBin = bufferLength - 1;
      let sum = 0, count = endBin - startBin + 1;
      for (let i = startBin; i <= endBin; i++) sum += this.freqData[i];
      return count > 0 ? sum / (count * 255) : 0;
    },
    getBands() {
      return { low: this.getLowBand(), mid: this.getMidBand(), high: this.getHighBand() };
    },
  };
}

describe('AudioFeatures', () => {
  let features;
  let mockAnalyzer;

  beforeEach(() => {
    features = new AudioFeatures();
    mockAnalyzer = createMockAnalyzer();
  });

  it('initializes with default values', () => {
    const f = new AudioFeatures();
    expect(f.getRMS()).toBe(0);
    expect(f.detectBeat()).toBe(false);
    expect(f.getSpectralCentroid()).toBe(0);
    expect(f.getSpectralFlux()).toBe(0);
    expect(f.getZeroCrossingRate()).toBe(0);
  });

  it('accepts custom configuration', () => {
    const f = new AudioFeatures({ historySize: 50, beatThreshold: 1.5, beatCooldown: 30 });
    expect(f.historySize).toBe(50);
    expect(f.beatThreshold).toBe(1.5);
    expect(f.beatCooldown).toBe(30);
  });

  it('update() populates feature values in [0,1] range', () => {
    features.update(mockAnalyzer);
    const snapshot = features.getAllFeatures();
    expect(snapshot.rms).toBeGreaterThanOrEqual(0);
    expect(snapshot.rms).toBeLessThanOrEqual(1);
    expect(snapshot.spectralCentroid).toBeGreaterThanOrEqual(0);
    expect(snapshot.spectralCentroid).toBeLessThanOrEqual(1);
    expect(snapshot.spectralFlux).toBeGreaterThanOrEqual(0);
    expect(snapshot.spectralFlux).toBeLessThanOrEqual(1);
    expect(snapshot.zeroCrossingRate).toBeGreaterThanOrEqual(0);
    expect(snapshot.zeroCrossingRate).toBeLessThanOrEqual(1);
  });

  it('gets RMS > 0 for non-silent audio', () => {
    const noisy = createMockAnalyzer({ timePattern: 'sine' });
    features.update(noisy);
    expect(features.getRMS()).toBeGreaterThan(0);
  });

  it('gets RMS ~ 0 for silent audio', () => {
    const silent = createMockAnalyzer({ timePattern: 'silent', freqPattern: 'silent' });
    features.update(silent);
    expect(features.getRMS()).toBeLessThan(0.05);
  });

  it('detectBeat returns false before enough history', () => {
    features.update(mockAnalyzer);
    expect(features.detectBeat()).toBe(false);
  });

  it('spectral centroid is higher for high-frequency signals', () => {
    const lowFreq = createMockAnalyzer({ freqPattern: 'low' });
    const highFreq = createMockAnalyzer({ freqPattern: 'high' });

    features.update(lowFreq);
    const lowCentroid = features.getSpectralCentroid();

    const features2 = new AudioFeatures();
    features2.update(highFreq);
    const highCentroid = features2.getSpectralCentroid();

    // High frequency content should produce higher centroid
    expect(highCentroid).toBeGreaterThan(lowCentroid);
  });

  it('spectral flux is 0 on first frame', () => {
    features.update(mockAnalyzer);
    expect(features.getSpectralFlux()).toBe(0);
  });

  it('zero crossing rate is higher for noisy signals', () => {
    const noisy = createMockAnalyzer({ timePattern: undefined }); // random noise
    features.update(noisy);
    // Random noise should have substantial zero crossings
    expect(features.getZeroCrossingRate()).toBeGreaterThan(0.1);
  });

  it('zero crossing rate is ~0 for silent signals', () => {
    const silent = createMockAnalyzer({ timePattern: 'silent', freqPattern: 'silent' });
    features.update(silent);
    expect(features.getZeroCrossingRate()).toBe(0);
  });

  it('lowFreqRatio is higher for low-frequency signals', () => {
    const lowFreq = createMockAnalyzer({ freqPattern: 'low' });
    const highFreq = createMockAnalyzer({ freqPattern: 'high' });

    features.update(lowFreq);
    const lowRatio = features.getLowFreqRatio();

    const features2 = new AudioFeatures();
    features2.update(highFreq);
    const highRatio = features2.getLowFreqRatio();

    expect(lowRatio).toBeGreaterThan(highRatio);
  });

  it('getAllFeatures returns all expected keys', () => {
    features.update(mockAnalyzer);
    const snapshot = features.getAllFeatures();
    expect(snapshot).toHaveProperty('rms');
    expect(snapshot).toHaveProperty('beat');
    expect(snapshot).toHaveProperty('spectralCentroid');
    expect(snapshot).toHaveProperty('lowFreqRatio');
    expect(snapshot).toHaveProperty('spectralFlux');
    expect(snapshot).toHaveProperty('zeroCrossingRate');
    expect(snapshot).toHaveProperty('lowBand');
    expect(snapshot).toHaveProperty('midBand');
    expect(snapshot).toHaveProperty('highBand');
  });

  it('reset clears all features to zero', () => {
    const noisy = createMockAnalyzer({ timePattern: 'sine', freqPattern: 'low' });
    features.update(noisy);
    features.reset();

    expect(features.getRMS()).toBe(0);
    expect(features.detectBeat()).toBe(false);
    expect(features.getSpectralCentroid()).toBe(0);
    expect(features.getSpectralFlux()).toBe(0);
    expect(features.getZeroCrossingRate()).toBe(0);
  });
});

/**
 * PresetManager — Save and load user presets via localStorage.
 *
 * Presets store the current fractal type, mapping strengths, color params, and theme.
 */
export class PresetManager {
  /**
   * @param {string} [storageKey='audiofractal-presets'] — localStorage key prefix
   */
  constructor(storageKey = 'audiofractal-presets') {
    this.storageKey = storageKey;
  }

  /**
   * Save current state as a named preset.
   * @param {string} name — Preset name
   * @param {object} state — { fractalType, mappingStrengths, colorParams, theme, iterationRange }
   */
  save(name, state) {
    const presets = this._loadAll();
    presets[name] = {
      ...state,
      timestamp: Date.now(),
    };
    this._saveAll(presets);
  }

  /**
   * Load a named preset.
   * @param {string} name
   * @returns {object|null} — The saved state, or null if not found
   */
  load(name) {
    const presets = this._loadAll();
    return presets[name] || null;
  }

  /**
   * List all saved preset names.
   * @returns {string[]}
   */
  list() {
    return Object.keys(this._loadAll());
  }

  /**
   * Delete a named preset.
   * @param {string} name
   */
  delete(name) {
    const presets = this._loadAll();
    delete presets[name];
    this._saveAll(presets);
  }

  /**
   * Export all presets as a JSON string.
   * @returns {string}
   */
  exportAll() {
    return JSON.stringify(this._loadAll(), null, 2);
  }

  /**
   * Import presets from a JSON string, merging with existing.
   * @param {string} json
   */
  importAll(json) {
    try {
      const imported = JSON.parse(json);
      const existing = this._loadAll();
      const merged = { ...existing, ...imported };
      this._saveAll(merged);
    } catch (err) {
      console.error('Failed to import presets:', err);
      throw new Error('Invalid preset JSON format');
    }
  }

  /** @private */
  _loadAll() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  /** @private */
  _saveAll(presets) {
    localStorage.setItem(this.storageKey, JSON.stringify(presets));
  }
}

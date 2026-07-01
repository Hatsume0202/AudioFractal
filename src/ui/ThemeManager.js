import { THEMES, DEFAULT_THEME, getTheme, getThemeNames } from '../themes/themeDefinitions.js';

/**
 * ThemeManager — Applies theme changes to CSS custom properties and notifies listeners.
 */
export class ThemeManager {
  constructor() {
    /** @type {string} */
    this.currentTheme = DEFAULT_THEME;

    /** @type {Function[]} */
    this._listeners = [];
  }

  /**
   * Register all available themes (called once during init).
   * Themes are already imported; this validates availability.
   */
  registerThemes() {
    // Themes are pre-loaded from themeDefinitions.js
    return getThemeNames();
  }

  /**
   * Apply a theme by name. Sets CSS custom properties on document root
   * and notifies all onChange listeners.
   * @param {string} name — Theme name (e.g., 'cyberpunk', 'deep-ocean')
   */
  applyTheme(name) {
    const theme = getTheme(name);
    if (!theme) {
      console.warn(`Theme "${name}" not found, using default`);
      return this.applyTheme(DEFAULT_THEME);
    }

    this.currentTheme = theme.name;
    const root = document.documentElement;
    const colors = theme.colors;

    // Set CSS custom properties
    root.style.setProperty('--color-bg', colors.background);
    root.style.setProperty('--color-surface', colors.surface);
    root.style.setProperty('--color-text', colors.text);
    root.style.setProperty('--color-text-secondary', colors.textSecondary);
    root.style.setProperty('--color-accent', colors.accent);
    root.style.setProperty('--color-border', colors.border);
    root.style.setProperty('--color-glow', colors.glow);
    root.style.setProperty('--border-radius', theme.ui.borderRadius);

    // Set body class for CSS theme-specific overrides
    document.body.className = `theme-${theme.name}`;

    // Notify listeners
    for (const callback of this._listeners) {
      callback(theme);
    }
  }

  /**
   * Get the current theme definition object.
   * @returns {object}
   */
  getCurrentTheme() {
    return getTheme(this.currentTheme);
  }

  /**
   * Get list of all available theme names.
   * @returns {string[]}
   */
  getThemeNames() {
    return getThemeNames();
  }

  /**
   * Register a callback for theme changes.
   * @param {Function} callback — Receives (themeDefinition) when theme changes
   */
  onChange(callback) {
    this._listeners.push(callback);
  }

  /**
   * Apply the default theme.
   */
  applyDefault() {
    this.applyTheme(DEFAULT_THEME);
  }
}

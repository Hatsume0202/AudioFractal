/**
 * Theme definitions for AudioFractal.
 * Each theme defines UI colors (CSS) and shader palette parameters (GLSL cosine palette).
 */

export const THEMES = {
  cyberpunk: {
    name: 'cyberpunk',
    label: 'Cyberpunk',
    colors: {
      background: '#0a0010',
      surface: '#120020',
      text: '#e0b0ff',
      textSecondary: '#9060c0',
      accent: '#ff00ff',
      border: '#8800cc',
      glow: 'rgba(255, 0, 255, 0.4)',
    },
    palette: {
      a: [0.5, 0.5, 0.5],
      b: [0.5, 0.5, 0.5],
      c: [1.0, 1.0, 1.0],
      d: [0.0, 0.33, 0.67],
    },
    ui: {
      borderRadius: '4px',
      glowIntensity: '0.4',
    },
  },

  'deep-ocean': {
    name: 'deep-ocean',
    label: 'Deep Ocean',
    colors: {
      background: '#000a14',
      surface: '#001a2e',
      text: '#80d0ff',
      textSecondary: '#4080aa',
      accent: '#00ccaa',
      border: '#005580',
      glow: 'rgba(0, 200, 255, 0.3)',
    },
    palette: {
      a: [0.0, 0.2, 0.4],
      b: [0.5, 0.5, 0.3],
      c: [1.5, 1.5, 1.5],
      d: [0.0, 0.15, 0.30],
    },
    ui: {
      borderRadius: '6px',
      glowIntensity: '0.3',
    },
  },

  aurora: {
    name: 'aurora',
    label: 'Aurora',
    colors: {
      background: '#000a05',
      surface: '#001a0d',
      text: '#a0ffd0',
      textSecondary: '#40a060',
      accent: '#40ff80',
      border: '#006640',
      glow: 'rgba(64, 255, 128, 0.3)',
    },
    palette: {
      a: [0.2, 0.5, 0.2],
      b: [0.5, 0.5, 0.5],
      c: [2.0, 2.0, 2.0],
      d: [0.0, 0.33, 0.67],
    },
    ui: {
      borderRadius: '8px',
      glowIntensity: '0.35',
    },
  },

  inferno: {
    name: 'inferno',
    label: 'Inferno',
    colors: {
      background: '#140a00',
      surface: '#2e1500',
      text: '#ffb070',
      textSecondary: '#aa6030',
      accent: '#ff4400',
      border: '#802200',
      glow: 'rgba(255, 68, 0, 0.4)',
    },
    palette: {
      a: [0.5, 0.5, 0.0],
      b: [0.5, 0.5, 0.0],
      c: [1.0, 1.0, 1.0],
      d: [0.0, 0.10, 0.20],
    },
    ui: {
      borderRadius: '3px',
      glowIntensity: '0.5',
    },
  },
};

/** Default theme name */
export const DEFAULT_THEME = 'cyberpunk';

/**
 * Get a theme definition by name.
 * @param {string} name
 * @returns {object}
 */
export function getTheme(name) {
  return THEMES[name] || THEMES[DEFAULT_THEME];
}

/** @returns {string[]} Array of available theme names */
export function getThemeNames() {
  return Object.keys(THEMES);
}

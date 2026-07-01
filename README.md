# 🎛️ AudioFractal

**Real-time audio-driven fractal art visualization** — watch the Mandelbrot set, Julia set, Burning Ship, and higher-order fractals dance and evolve with your music.

![AudioFractal](https://img.shields.io/badge/WebGL-Real--time-blueviolet)
![License](https://img.shields.io/badge/license-MIT-green)

## ✨ Features

- **4 Fractal Types**: Mandelbrot Set, Julia Set, Burning Ship, Higher-Order Mandelbrot (z^n)
- **Real-time Audio Analysis**: FFT spectrum, beat detection, RMS, spectral centroid, and more
- **Audio-to-Visual Mapping**: Bass drives zoom, mids shift colors, highs control detail level
- **4 Stunning Themes**: Cyberpunk, Deep Ocean, Aurora, Inferno
- **Dual Audio Sources**: Microphone input or audio file upload
- **Fully Responsive**: Desktop sidebar, tablet, and mobile bottom-drawer layouts
- **GPU-Accelerated**: All fractal computation happens on the GPU via custom GLSL shaders
- **Keyboard Shortcuts**: Space (play/pause), F (fullscreen), 1-4 (switch fractals)

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run tests
npm test
```

## 🎮 How to Use

### Audio Sources
- **Microphone**: Click the 🎤 **Mic** button to capture live audio. Grant microphone permission when prompted.
- **Audio File**: Click the 📁 **File** button to upload a music file (MP3, WAV, OGG, etc.). The file will loop.

### Controls
All controls are in the sidebar panel (right side on desktop, bottom drawer on mobile):

| Section | Controls |
|---------|----------|
| **Audio Source** | Switch between mic and file input, volume indicator |
| **Fractal Type** | Choose from 4 fractal algorithms |
| **Audio Mapping** | Adjust how strongly each audio feature affects the visuals |
| **Color** | Hue shift, saturation, brightness, contrast |
| **Iterations** | Min/max iteration counts for fractal detail |
| **Theme** | Switch between 4 visual themes |
| **Performance** | Render resolution scaling (0.5x, 1x, 2x) |

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` | Toggle audio playback (pause/resume) |
| `F` | Toggle fullscreen |
| `1` | Switch to Mandelbrot Set |
| `2` | Switch to Julia Set |
| `3` | Switch to Burning Ship |
| `4` | Switch to Higher-Order Mandelbrot |
| `Esc` | Close control panel (mobile) |

## 🎨 Audio Mapping

Each audio feature drives a specific visual parameter:

| Audio Feature | Visual Effect |
|---------------|---------------|
| **Low frequencies** (20-200Hz) | Zoom level — creates a "breathing" effect with bass |
| **Mid frequencies** (200-2kHz) | Color shift — mid-range instruments shift the palette |
| **High frequencies** (2-20kHz) | Iteration count — hi-hats and cymbals add fractal detail |
| **RMS Volume** | Overall brightness — louder = brighter |
| **Beat Detection** | Julia set parameter perturbation — beats create visual "kicks" |
| **Spectral Centroid** | Color saturation — brighter sounds = more vivid colors |
| **Spectral Flux** | Distortion amount — rapid changes warp the fractal |
| **Zero Crossing Rate** | Julia C imaginary component — adds organic movement |

Each mapping has an adjustable strength slider (0-1) in the control panel.

## 🏗️ Technical Architecture

```
Audio Source (Mic/File)
    ↓
AudioContext → AnalyserNode (FFT 2048)
    ↓
AudioAnalyzer → AudioFeatures (RMS, Beat, Centroid, Flux, ZCR)
    ↓
FractalParameters (maps audio features → shader uniforms)
    ↓
FractalMaterial (Three.js ShaderMaterial with custom GLSL)
    ↓
FractalRenderer (WebGL fullscreen quad, rAF loop)
    ↓
Canvas
```

**Tech Stack:**
- **Build**: Vite 6
- **3D/GL**: Three.js 0.170 (WebGL renderer management)
- **Shaders**: Custom GLSL fragment shaders (all fractal math on GPU)
- **Audio**: Web Audio API (AnalyserNode, getUserMedia, decodeAudioData)
- **Testing**: Vitest
- **Styling**: CSS3 custom properties, responsive design

## 🧪 Running Tests

```bash
npm test
```

Tests cover:
- `AudioFeatures.test.js` — Beat detection, RMS, spectral analysis, edge cases
- `FractalParameters.test.js` — Audio-to-visual mapping, smoothing, state management

## 🌐 Browser Support

Works in all modern browsers with WebGL and Web Audio API support:
- Chrome 90+
- Firefox 90+
- Safari 15+
- Edge 90+

## 📄 License

MIT — feel free to use, modify, and share!

---

Built with 🎵 + 🌀 = ❤️

# Skill Image Tuner

> **Universal interactive image positioning, scaling, and framing tuner HUD**  
> Born from the Lucy hero framing system at [Skill Heaven](https://skill-heaven.dev).

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61dafb.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6-646cff.svg)](https://vite.dev/)

---

![Skill Image Tuner Overview](docs/screenshots/overview.png)

`skill-image-tuner` is a lightweight, zero-dependency dev-tool HUD and standalone visual staging harness for positioning, scaling, anchoring, and framing images with sub-pixel precision. It turns trial-and-error CSS adjustments into a fluid, visual, drag-and-pinch canvas.

The repository is strictly **minimal and self-contained** (using only lightweight vector SVG placeholders)—upload or drop in your own assets, or paste image URLs from the web, and instantly copy production-ready CSS, React styles, JSON configurations, or Tailwind classes.

---

## ✨ Features

- **✥ Interactive Drag to Pan**: Click and drag directly on the canvas to offset X and Y with live `vh` / pixel readouts.
- **🔍 Trackpad Pinch-to-Zoom**: Native desktop trackpad pinch gesture zoom (via `ctrlKey` wheel event filtering) that scales the image around its configured transform origin.
- **↔️ Drag-Edge Resizing**: Grab and drag any edge or corner handle of the viewfinder box to quickly scale the image zoom up or down.
- **↻ Gesture & Knob Rotation**:
  - **Touchscreens**: Fluid two-finger pinch-and-rotate gestures.
  - **Trackpads**: Native gesture rotation support (`gesturechange`).
  - **Viewfinder Knob**: Dedicated `↻` rotation handle attached above the viewfinder box with intelligent snapping (`0°`, `±90°`, `±180°`).
  - **HUD Steppers**: Fine-tuning with `±1°`, `±15°`, and `±45°` step buttons and an angle range slider (`-180°` to `+180°`).
- **🪞 Horizontal Mirror (Flip)**: Instant horizontal flipping via `M` shortcut or HUD `🪞 Mirror` button (`scaleX(-1)`).
- **🎯 Visual Transform Origin Picker**: Click anywhere on the image to pin the exact CSS `transform-origin` (e.g. anchoring directly to a character's eye/face at `50% 36%`).
- **🎛️ Floating Draggable HUD**: A collapsible, translucent glass HUD window that can be moved anywhere on screen without blocking your canvas view.
- **📐 Viewfinder & Composition Guides**: Toggleable dashed bounding box with corner brackets, live coordinate chips, and a rule-of-thirds grid.
- **🖼️ Universal Image Selector**:
  - Built-in lightweight SVG presets: Portrait Avatar, Landscape 16:9 Card, and Geometric Emblem Badge.
  - **Upload Local Files**: Drag and drop or browse any PNG, WebP, JPG, or SVG from your machine.
  - **Load from Web URL**: Paste any public image link to tune immediately.
- **📋 Multi-Format Export**: One-click code generation for:
  - **JSON Config**: `{ "zoom": 1.00, "x": 0.00, "y": 0.00, "origin": "50% 36%", "rotation": 0.0, "mirror": false }`
  - **CSS**: `transform-origin: 50% 36%; transform: translate(...) scale(1.00) rotate(0deg);`
  - **React Inline Style**: `style={{ transformOrigin: '50% 36%', transform: ... }}`
  - **Tailwind Utility Classes**: Arbitrary value classes for zero-runtime styling.

---

## 🚀 Quick Start

### 1. Clone and Run

```bash
git clone https://github.com/gaia-research/skill-image-tuner.git
cd skill-image-tuner
npm install
npm run dev
```

Open [http://localhost:5188](http://localhost:5188) in your browser.

### 2. URL Parameters

Jump directly into specific presets and view modes:

- `?image=sample-avatar` — Open minimal Portrait Avatar preset
- `?image=sample-card` — Open minimal 16:9 Landscape Card preset
- `?image=sample-badge` — Open minimal Geometric Badge preset
- `?grid=1` — Enable rule-of-thirds composition grid by default
- `?hud=0` — Hide HUD on load (clean view mode)

---

## ⌨️ Controls & Shortcuts

| Action | Shortcut / Gesture |
| :--- | :--- |
| **Pan Image** | Click & drag on canvas |
| **Zoom Image** | Trackpad pinch gesture, Zoom slider, or **drag box edges/corners** |
| **Rotate Image** | Two-finger touch rotate, trackpad gesture, **drag `↻` knob**, or rotation slider |
| **Mirror / Flip** | Press `M` or click `🪞 Mirror` in HUD |
| **Set Transform Origin** | Click `🎯 Pick` in HUD, then click on the target feature |
| **Toggle HUD** | `Cmd + Shift + L` (Mac) / `Ctrl + Shift + L` (Win) |
| **Toggle Viewfinder** | Press `V` |
| **Reset Framing** | Double-click canvas or click `↺ Reset` |

---

## 🛠️ Reusable Component Architecture

The codebase is modular and can be integrated into any React application:

```tsx
import { ImageCanvas } from './components/ImageCanvas'
import { TunerHUD } from './components/TunerHUD'
import { ImageSelector } from './components/ImageSelector'

// Pass any image object and receive live transform updates:
<ImageCanvas
  image={{ src: '/my-character.png', name: 'Hero Character' }}
  config={config}
  onChangeConfig={setConfig}
  showViewfinder={true}
  showGrid={false}
  dragMode={true}
  isSettingOrigin={false}
/>
```

---

## 📜 License

MIT © [Gaia Research](https://github.com/gaia-research)

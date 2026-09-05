# Image Tuner

> **Universal interactive image positioning, scaling, and framing tuner HUD for pinpoint CSS, React, and Tailwind alignment.**  
> Born from the Lucy hero framing system at [Skill Heaven](https://skill-heaven.dev).

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61dafb.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6-646cff.svg)](https://vite.dev/)

---

![Skill Image Tuner Overview](docs/screenshots/overview.png)

`skill-image-tuner` is an interactive visual staging canvas and HUD to eliminate trial-and-error CSS image positioning. Pan, pinch-zoom, rotate, mirror, and pick transform origins visually with sub-pixel precision, then export production-ready CSS, React inline styles, Tailwind arbitrary classes, and JSON configurations.

Invoke as `/image-tuner` inside any agent that reads SKILL.md files: **pi coding agent**, **Claude Code**, **Codex CLI**, **Cursor**, **Windsurf**, or **Gemini CLI**.

---

## Install

**One-liner (recommended):**

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/gaia-research/skill-image-tuner/main/install.sh)
```

Auto-detects your agent skills directory (`~/.pi/agent/skills/`, `.agents/skills/`, `.claude/skills/`, `.cursor/skills/`, `.codex/skills/`) and installs to `image-tuner/`. Prompts if multiple are found.

**Via Gaia CLI:**
```bash
gaia skills install https://github.com/gaia-research/skill-image-tuner
```

**Via npx skills:**
```bash
npx skills install gaia-research/skill-image-tuner
```

**Run immediately via npx:**
```bash
npx @gaia-research/skill-image-tuner path/to/image.png
```

**Manual clone:**
```bash
git clone --depth 1 https://github.com/gaia-research/skill-image-tuner.git .agents/skills/image-tuner
rm -rf .agents/skills/image-tuner/.git
```

**CLI script only (zero-dependency standalone runner):**
```bash
curl -fsSL https://raw.githubusercontent.com/gaia-research/skill-image-tuner/main/image_tuner.py -o image_tuner.py
chmod +x image_tuner.py
```

---

## Requirements

- **Python 3.8+**: Standard library only (no external pip packages required for the CLI and embedded local tuner server).
- **Node.js 18+** *(Optional)*: Needed only when developing or rebuilding the React + Vite application.

---

## Features

- **✥ Interactive Drag to Pan**: Click and drag directly on the canvas to offset X and Y with live `vh` and pixel readouts.
- **Trackpad Pinch-to-Zoom & Drag-Edge Resizing**: Native desktop trackpad pinch gesture zoom (via `ctrlKey` wheel event filtering) that scales around the configured transform origin, or drag bounding box handles to resize.
- **↻ Gesture & Knob Rotation**:
  - **Viewfinder Knob**: Dedicated `↻` rotation handle attached above the viewfinder box with intelligent snapping (`0°`, `±90°`, `±180°`).
  - **HUD Steppers**: Fine-tuning with `±1°`, `±15°`, and `±45°` step buttons and an angle range slider (`-180°` to `+180°`).
  - **Touch & Trackpad**: Native two-finger pinch-and-rotate gesture support.
- **Horizontal Mirror (Flip)**: Instant horizontal flipping via `M` shortcut or HUD `⇄ Mirror` button (`scaleX(-1)`).
- **Visual Transform Origin Picker**: Click anywhere on the image to pin the exact CSS `transform-origin` (e.g. anchoring directly to a character's eye/face at `50% 36%`) so responsive resizing maintains composition.
- **Floating Draggable HUD**: A collapsible, translucent glass HUD window that can be moved anywhere on screen without blocking your canvas view (`Cmd + Shift + L`).
- **Viewfinder & Composition Guides**: Toggleable dashed bounding box with corner brackets, live coordinate chips, and a rule-of-thirds grid (`V`).
- **Universal Asset Loader**:
  - Built-in SVG presets: Portrait Avatar, Landscape 16:9 Card, and Geometric Emblem Badge.
  - **Local Files**: Drag and drop, browse, or pass local file paths via CLI to tune directly with zero CORS issues.
  - **Web URLs**: Paste any public image link or load via URL parameter `?url=...`.
- **Multi-Format Export**: One-click code generation for **JSON**, **CSS**, **React inline styles**, and **Tailwind CSS**.

---

## Usage

### 1. Interactive Visual HUD

Launch the tuner for any local image file or remote URL:

```bash
# Launch interactive tuner for a local image (auto-opens browser)
python3 image_tuner.py path/to/character.png

# Launch with a public image URL
python3 image_tuner.py --url https://example.com/banner.webp

# Launch on a specific port
python3 image_tuner.py --port 5188

# Vite development server (from cloned repository)
npm install && npm run dev
```

### 2. URL Parameters

Deep-link directly into specific images, presets, and view modes:

- `?src=http://localhost:5188/_image/avatar.png` — Load local or remote image source
- `?image=sample-avatar` — Open built-in Portrait Avatar preset
- `?image=sample-card` — Open built-in 16:9 Landscape Card preset
- `?image=sample-badge` — Open built-in Geometric Badge preset
- `?zoom=1.25&x=5&y=-10&origin=50%25+36%25` — Preload specific framing coordinates
- `?grid=1` — Enable rule-of-thirds composition grid by default
- `?hud=0` — Hide HUD on initial load (clean view mode)

### 3. Headless CLI Code Generation

Generate all 4 code export formats directly without launching a browser:

```bash
# Generate CSS, React, Tailwind, and JSON snippets
python3 image_tuner.py export --zoom 1.25 --x 5 --y -10 --origin "50% 36%" --rotation 0

# Machine-readable JSON output for automated agent pipelines
python3 image_tuner.py export --zoom 1.25 --x 5 --y -10 --origin "50% 36%" --json
```

### 4. Image Metadata Inspection

Inspect image dimensions, aspect ratio, file size, and recommended anchor presets:

```bash
python3 image_tuner.py inspect assets/hero.png
python3 image_tuner.py inspect assets/hero.png --json
```

### 5. Parse Existing CSS Transforms

Extract structured zoom, offset, and rotation parameters from CSS strings:

```bash
python3 image_tuner.py parse "transform-origin: 50% 36%; transform: translate(5vh, -10vh) scale(1.25) rotate(15deg);"
```

---

## Code Export Formats

### CSS
```css
transform-origin: 50% 36%;
transform: translate(5vh, -10vh) scale(1.25);
```

### React Inline Style
```tsx
<img
  src="/character.png"
  alt="Character"
  style={{
    transformOrigin: '50% 36%',
    transform: 'translate(5vh, -10vh) scale(1.25)',
  }}
/>
```

### Tailwind Utility Classes
```html
<img
  src="/character.png"
  alt="Character"
  class="origin-[50%_36%] translate-x-[5vh] translate-y-[-10vh] scale-[1.25]"
/>
```

### JSON Configuration
```json
{
  "zoom": 1.25,
  "x": 5.0,
  "y": -10.0,
  "origin": "50% 36%",
  "rotation": 0.0,
  "mirror": false,
  "opacity": 1.0
}
```

---

## Controls & Shortcuts

| Action | Shortcut / Gesture |
| :--- | :--- |
| **Pan Image** | Click & drag on canvas |
| **Zoom Image** | Trackpad pinch gesture, mouse wheel, or Zoom slider |
| **Rotate Image** | Drag `↻` knob, rotation slider, or stepper buttons (`±15°`, `±90°`) |
| **Mirror / Flip** | Press `M` or click `⇄ Mirror` in HUD |
| **Set Transform Origin** | Click `🎯 Origin`, then click target feature on image |
| **Toggle HUD** | `Cmd + Shift + L` (Mac) / `Ctrl + Shift + L` (Linux/Windows) |
| **Toggle Viewfinder** | Press `V` |
| **Reset Framing** | Double-click canvas or click `↺ Reset` |

---

## Reusable Component Architecture

The codebase is modular and can be integrated into any React application:

```tsx
import { ImageCanvas } from './components/ImageCanvas'
import { TunerHUD } from './components/TunerHUD'
import { ImageSelector } from './components/ImageSelector'

// Pass any image object and receive live transform updates:
<ImageCanvas
  image={{ id: 'hero', name: 'Hero Character', category: 'custom', src: '/my-character.png' }}
  config={config}
  onChangeConfig={setConfig}
  showViewfinder={true}
  showGrid={false}
  dragMode={true}
  isSettingOrigin={false}
/>
```

---

## Compatibility

| Agent Harness | Install Path | Notes |
|---|---|---|
| **pi coding agent** | `~/.pi/agent/skills/image-tuner/` or `.agents/skills/image-tuner/` | Native `/image-tuner` command |
| **Claude Code** | `.claude/skills/image-tuner/` or `~/.claude/skills/` | Native `/image-tuner` command |
| **Codex CLI** | `.agents/skills/image-tuner/` or `.codex/skills/` | Prompt invocation |
| **Cursor** | `.cursor/skills/image-tuner/` | Prompt / rules invocation |
| **Gemini CLI** | any skills directory | Shell tool call |
| **Windsurf** | workspace skills directory | Prompt invocation |

---

## Gaia Integration (Optional)

`image-tuner` is part of the [Gaia Skill Registry](https://gaiaskilltree.com). Install via `gaia skills install`, track it in your tree with `gaia scan`, and push improvements with `gaia push`.

You don't need Gaia to use this. The installer is plain bash and the skill files are portable Markdown + Python/Node.

---

## License

MIT © [Gaia Research](https://github.com/gaia-research)

---

<a href="https://gaiaskilltree.com"><img src="./powered-by-gaia.svg" alt="Powered by Gaia" height="28"></a>

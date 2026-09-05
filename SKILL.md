---
name: image-tuner
description: >-
  Universal interactive image positioning, scaling, and framing tuner HUD for
  pinpoint CSS, React inline styles, Tailwind classes, and JSON alignment. Use
  when positioning hero images, avatars, banners, cards, or character art to
  eliminate trial-and-error styling. Supports visual panning, zooming, rotating,
  mirroring, transform-origin picking, and one-click code generation.
  Triggers: "/image-tuner", "tune image", "position image", "image framing",
  "image tuner", "align image", "transform origin", "crop hero", "avatar framing".
version: 1.0.0
---

# image-tuner — Universal Image Transform & Framing HUD

> Universal interactive image positioning, scaling, and framing tuner HUD for pinpoint CSS, React, and Tailwind alignment.

## Install

**One-liner (recommended):**

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/gaia-research/skill-image-tuner/main/install.sh)
```

Auto-detects your agent skills directory (`.agents/skills/`, `~/.pi/agent/skills/`, `.claude/skills/`, `.codex/skills/`, `.cursor/skills/`) and installs to `image-tuner/`.

**Via Gaia CLI:**
```bash
gaia skills install https://github.com/gaia-research/skill-image-tuner
```

**Via npx skills:**
```bash
npx skills install gaia-research/skill-image-tuner
```

**Directly via npx binary:**
```bash
npx @gaia-research/skill-image-tuner path/to/image.png
```

**Manual clone:**
```bash
git clone --depth 1 https://github.com/gaia-research/skill-image-tuner.git .agents/skills/image-tuner
rm -rf .agents/skills/image-tuner/.git
```

---

## When to use

- **Hero Character & Illustration Framing**: Pinning the exact CSS `transform-origin` (e.g. anchoring directly to an eye/face at `50% 36%`) so responsive scaling anchors naturally without cropping out critical features.
- **Avatar & Badge Alignment**: Framing circular or square avatar crops, icons, or badges with sub-pixel translation and scale precision.
- **Card & Banner Composition**: Centering and scaling 16:9 banners, card artwork, or background textures without trial-and-error CSS reloads.
- **Interactive Asset Tuning**: Dragging, pinching, rotating, and flipping assets on a visual staging canvas with live rule-of-thirds grid guides.
- **Multi-Format Code Generation**: Instantly generating production-ready CSS, React inline styles, Tailwind arbitrary utility classes, or structured JSON configurations.
- **Image Metadata & Recommendations**: Inspecting image dimensions, aspect ratios, and receiving suggested anchor origins.

---

## How it works

### 1. Transform Model & Geometry

Every image framing configuration is captured as a normalized parameter set:

| Parameter | Unit / Type | Description | Default |
|---|---|---|---|
| `zoom` | Float multiplier | Scale multiplier (`1.0` = 100%, `1.5` = 150%) | `1.0` |
| `x` | `vh` / Float | Horizontal offset in viewport-height units | `0.0` |
| `y` | `vh` / Float | Vertical offset in viewport-height units | `0.0` |
| `origin` | String (`X% Y%`) | CSS `transform-origin` anchor coordinates | `50% 50%` |
| `rotation` | Degrees (`deg`) | Rotation angle (`-180°` to `+180°`) | `0.0` |
| `mirror` | Boolean | Horizontal flip (`scaleX(-1)`) | `false` |
| `opacity` | Float (`0.0`–`1.0`)| Opacity transparency | `1.0` |

### 2. Zero-Dependency Tuner HUD

The tool includes a standalone, self-contained interactive web HUD (Python standard library `http.server` + embedded canvas) that can run anywhere without installing Node dependencies or build steps. When the full repository is cloned, it also integrates with Vite and React.

---

## Run it

### Interactive Visual HUD

Launch the tuner in your browser with any local image file or remote URL:

```bash
# Launch interactive HUD for a local asset (auto-opens browser)
python3 image_tuner.py path/to/character.png

# Launch with a public image URL
python3 image_tuner.py --url https://example.com/banner.webp

# Launch on a custom port
python3 image_tuner.py --port 5188

# Launch headless server (no browser auto-open)
python3 image_tuner.py --no-browser
```

### Headless CLI Code Generation

Generate all 4 code export formats directly from the command line:

```bash
# Generate CSS, React, Tailwind, and JSON code snippets
python3 image_tuner.py export --zoom 1.25 --x 5.0 --y -10.0 --origin "50% 36%" --rotation 0 --mirror

# Machine-readable JSON output for agent automation
python3 image_tuner.py export --zoom 1.25 --x 5.0 --y -10.0 --origin "50% 36%" --json
```

### Inspect Image Metadata

Read dimensions, aspect ratio, and suggested framing presets:

```bash
python3 image_tuner.py inspect assets/avatar.svg
python3 image_tuner.py inspect assets/avatar.svg --json
```

### Parse Existing CSS Transforms

Convert existing CSS styles back into structured parameters:

```bash
python3 image_tuner.py parse "transform-origin: 50% 36%; transform: translate(5vh, -10vh) scale(1.25) rotate(15deg);"
```

---

## Code Export Formats

### 1. Plain CSS
```css
transform-origin: 50% 36%;
transform: translate(5vh, -10vh) scale(1.25) rotate(0deg);
```

### 2. React Inline Style
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

### 3. Tailwind CSS
```html
<img
  src="/character.png"
  alt="Character"
  class="origin-[50%_36%] translate-x-[5vh] translate-y-[-10vh] scale-[1.25]"
/>
```

### 4. JSON Configuration
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

| Action | Control / Gesture |
|---|---|
| **Pan Image** | Click & drag on canvas |
| **Zoom Image** | Trackpad pinch gesture, mouse wheel, or Zoom slider |
| **Rotate Image** | `↻` rotation knob, angle slider, or stepper buttons (`±15°`, `±90°`) |
| **Mirror / Flip** | Press `M` or click `⇄ Mirror` button in HUD |
| **Set Transform Origin** | Click `🎯 Origin`, then click on the target anchor point (e.g. character eyes) |
| **Toggle HUD** | `Cmd + Shift + L` (Mac) / `Ctrl + Shift + L` (Linux/Windows) |
| **Toggle Viewfinder** | Press `V` |
| **Reset Transform** | Click `↺ Reset` |

---

## Reusable React Component

If integrating directly into a React codebase:

```tsx
import { ImageCanvas } from './components/ImageCanvas'
import { TunerHUD } from './components/TunerHUD'
import { ImageSelector } from './components/ImageSelector'

export function CharacterStage() {
  const [config, setConfig] = useState({
    zoom: 1.25,
    x: 5.0,
    y: -10.0,
    origin: '50% 36%',
    rotation: 0,
    mirror: false,
    opacity: 1.0,
  })

  return (
    <ImageCanvas
      image={{ id: 'hero', name: 'Hero', category: 'custom', src: '/hero.png' }}
      config={config}
      onChangeConfig={setConfig}
      showViewfinder={true}
      showGrid={false}
      dragMode={true}
      isSettingOrigin={false}
    />
  )
}
```

---

## Compatibility

| Agent Harness | Install Path | Method |
|---|---|---|
| **pi coding agent** | `~/.pi/agent/skills/image-tuner/` or `.agents/skills/image-tuner/` | `/image-tuner` command |
| **Claude Code** | `.claude/skills/image-tuner/` or `~/.claude/skills/` | `/image-tuner` command |
| **Codex CLI** | `.agents/skills/image-tuner/` or `.codex/skills/` | Prompt invocation |
| **Cursor** | `.cursor/skills/image-tuner/` | Agent rule invocation |
| **Gemini CLI** | any skills directory | Shell tool call |
| **Windsurf** | workspace skills | Prompt invocation |

---

## Requirements

- **Python 3.8+**: Standard library only (no external pip dependencies required).
- **Node.js 18+** *(Optional)*: Needed only if modifying or rebuilding the React Vite source.

---

## Notes

- Uses `vh` units for translation offsets by default to preserve aspect ratio scaling across wide and narrow viewports.
- Local images served via `/_image/` endpoints are served with permissive CORS headers to prevent canvas-tainting issues.
- Repo: https://github.com/gaia-research/skill-image-tuner
- Issues: https://github.com/gaia-research/skill-image-tuner/issues

---

<a href="https://gaiaskilltree.com"><img src="./powered-by-gaia.svg" alt="Powered by Gaia" height="28"></a>

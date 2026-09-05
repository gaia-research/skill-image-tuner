#!/usr/bin/env python3
"""
Skill Image Tuner — Universal CLI and Interactive Visual Tuner HUD.
Part of Gaia Research (https://github.com/gaia-research/skill-image-tuner).

Eliminates trial-and-error CSS image positioning, scaling, anchoring, and framing.
"""

import argparse
import html
import http.server
import json
import math
import mimetypes
import os
import re
import socket
import socketserver
import struct
import sys
import urllib.parse
import webbrowser
from pathlib import Path

VERSION = "1.0.0"

# ---------------------------------------------------------------------------
# Terminal Colors and Formatting
# ---------------------------------------------------------------------------
IS_TTY = sys.stdout.isatty()
BOLD = "\033[1m" if IS_TTY else ""
DIM = "\033[2m" if IS_TTY else ""
CYAN = "\033[36m" if IS_TTY else ""
GREEN = "\033[32m" if IS_TTY else ""
YELLOW = "\033[33m" if IS_TTY else ""
RESET = "\033[0m" if IS_TTY else ""


def banner():
    return f"""{CYAN}┌──────────────────────────────────────────────────────────────┐
│  {BOLD}SKILL IMAGE TUNER{RESET}{CYAN} — Visual Transform & Framing HUD   v{VERSION} │
│  {DIM}https://github.com/gaia-research/skill-image-tuner{RESET}{CYAN}          │
└──────────────────────────────────────────────────────────────┘{RESET}"""


# ---------------------------------------------------------------------------
# Pure Python Image Dimension Inspector (No external PIL required)
# ---------------------------------------------------------------------------
def inspect_image_file(file_path: str):
    path = Path(file_path).resolve()
    if not path.is_file():
        raise FileNotFoundError(f"File not found: {file_path}")

    size_bytes = path.stat().st_size
    mime_type, _ = mimetypes.guess_type(str(path))
    mime_type = mime_type or "application/octet-stream"

    with open(path, "rb") as f:
        head = f.read(4096)

    width = None
    height = None
    fmt = "UNKNOWN"

    # PNG
    if head.startswith(b"\x89PNG\r\n\x1a\n") and len(head) >= 24:
        fmt = "PNG"
        width, height = struct.unpack(">II", head[16:24])

    # GIF
    elif (head.startswith(b"GIF87a") or head.startswith(b"GIF89a")) and len(head) >= 10:
        fmt = "GIF"
        width, height = struct.unpack("<HH", head[6:10])

    # WebP
    elif head.startswith(b"RIFF") and len(head) >= 30 and head[8:12] == b"WEBP":
        fmt = "WEBP"
        chunk = head[12:16]
        if chunk == b"VP8X" and len(head) >= 30:
            width = 1 + struct.unpack("<I", head[24:27] + b"\x00")[0]
            height = 1 + struct.unpack("<I", head[27:30] + b"\x00")[0]
        elif chunk == b"VP8 " and len(head) >= 30:
            w, h = struct.unpack("<HH", head[26:30])
            width = w & 0x3FFF
            height = h & 0x3FFF
        elif chunk == b"VP8L" and len(head) >= 25:
            b0, b1, b2, b3 = head[21:25]
            width = 1 + (((b1 & 0x3F) << 8) | b0)
            height = 1 + (((b3 & 0xF) << 10) | (b2 << 2) | ((b1 & 0xC0) >> 6))

    # JPEG
    elif head.startswith(b"\xff\xd8"):
        fmt = "JPEG"
        with open(path, "rb") as f:
            f.seek(2)
            b = f.read(2)
            while b:
                if b[0] != 0xFF:
                    b = f.read(1)
                    continue
                marker = b[1]
                if marker in (
                    0xC0, 0xC1, 0xC2, 0xC3, 0xC5, 0xC6, 0xC7,
                    0xC9, 0xCA, 0xCB, 0xCD, 0xCE, 0xCF,
                ):
                    f.read(3)  # len (2), precision (1)
                    h_bytes = f.read(2)
                    w_bytes = f.read(2)
                    if len(h_bytes) == 2 and len(w_bytes) == 2:
                        height, = struct.unpack(">H", h_bytes)
                        width, = struct.unpack(">H", w_bytes)
                    break
                elif marker in (0xD8, 0xD9):
                    b = f.read(2)
                elif 0xD0 <= marker <= 0xD7:
                    b = f.read(2)
                else:
                    len_bytes = f.read(2)
                    if len(len_bytes) == 2:
                        block_len = struct.unpack(">H", len_bytes)[0]
                        f.seek(block_len - 2, os.SEEK_CUR)
                    b = f.read(2)

    # BMP
    elif head.startswith(b"BM") and len(head) >= 26:
        fmt = "BMP"
        width, height = struct.unpack("<II", head[18:26])

    # SVG
    elif b"<svg" in head.lower():
        fmt = "SVG"
        text = head.decode("utf-8", errors="ignore")
        vb = re.search(r'viewBox=[\"\']([0-9\.\s,-]+)[\"\']', text, re.I)
        if vb:
            parts = [float(p) for p in re.split(r'[\s,]+', vb.group(1).strip()) if p]
            if len(parts) == 4:
                width = int(round(parts[2]))
                height = int(round(parts[3]))
        if width is None:
            wm = re.search(r'width=[\"\']([0-9\.]+)p?x?[\"\']', text, re.I)
            hm = re.search(r'height=[\"\']([0-9\.]+)p?x?[\"\']', text, re.I)
            if wm and hm:
                width = int(round(float(wm.group(1))))
                height = int(round(float(hm.group(1))))

    aspect_ratio_str = None
    aspect_ratio_val = None
    if width and height and height > 0:
        aspect_ratio_val = round(width / height, 3)
        gcd = math.gcd(width, height)
        if gcd > 0:
            aspect_ratio_str = f"{width // gcd}:{height // gcd}"
            if (width // gcd) > 32 or (height // gcd) > 32:
                # Approximate common video / photo aspect ratios
                r = width / height
                if abs(r - 16 / 9) < 0.05:
                    aspect_ratio_str = "16:9"
                elif abs(r - 4 / 3) < 0.05:
                    aspect_ratio_str = "4:3"
                elif abs(r - 1.0) < 0.02:
                    aspect_ratio_str = "1:1"
                elif abs(r - 9 / 16) < 0.05:
                    aspect_ratio_str = "9:16"

    # Recommendations
    recommended_origin = "50% 50%"
    recommended_preset = "card"
    if aspect_ratio_val:
        if aspect_ratio_val < 0.85:  # Portrait
            recommended_origin = "50% 36%"  # Focus head/face
            recommended_preset = "avatar"
        elif aspect_ratio_val > 1.2:  # Landscape
            recommended_origin = "50% 50%"
            recommended_preset = "hero-banner"
        else:
            recommended_origin = "50% 50%"
            recommended_preset = "emblem-badge"

    return {
        "file": str(path),
        "filename": path.name,
        "format": fmt,
        "mime_type": mime_type,
        "size_bytes": size_bytes,
        "size_kb": round(size_bytes / 1024, 2),
        "width": width,
        "height": height,
        "aspect_ratio": aspect_ratio_str,
        "aspect_ratio_decimal": aspect_ratio_val,
        "recommended_origin": recommended_origin,
        "recommended_preset": recommended_preset,
    }


# ---------------------------------------------------------------------------
# Transform Calculations & Multi-Format Exporter
# ---------------------------------------------------------------------------
def compute_transforms(
    zoom: float = 1.0,
    x: float = 0.0,
    y: float = 0.0,
    origin: str = "50% 50%",
    rotation: float = 0.0,
    mirror: bool = False,
    opacity: float = 1.0,
):
    zoom = round(float(zoom), 4)
    x = round(float(x), 2)
    y = round(float(y), 2)
    rotation = round(float(rotation), 2)
    opacity = round(float(opacity), 2)
    origin = origin.strip() or "50% 50%"

    # Transform string parts
    translate_part = f"translate({x:g}vh, {y:g}vh)"
    scale_part = f"scale({zoom:g})"
    if mirror:
        scale_part = f"scale({zoom:g}) scaleX(-1)"
    rotate_part = f"rotate({rotation:g}deg)" if rotation != 0 else ""

    transform_tokens = [translate_part, scale_part]
    if rotate_part:
        transform_tokens.append(rotate_part)
    transform_val = " ".join(transform_tokens)

    # CSS
    css_lines = [
        f"transform-origin: {origin};",
        f"transform: {transform_val};",
    ]
    if opacity < 1.0:
        css_lines.append(f"opacity: {opacity:g};")
    css_snippet = "\n".join(css_lines)

    # React Inline Style
    react_obj = {
        "transformOrigin": origin,
        "transform": transform_val,
    }
    if opacity < 1.0:
        react_obj["opacity"] = opacity
    react_entries = [f"  transformOrigin: '{origin}',", f"  transform: '{transform_val}',"]
    if opacity < 1.0:
        react_entries.append(f"  opacity: {opacity:g},")
    react_snippet = "style={{\n" + "\n".join(react_entries) + "\n}}"

    # Tailwind Classes (Arbitrary values)
    origin_token = origin.replace(" ", "_")
    tailwind_classes = [
        f"origin-[{origin_token}]",
        f"translate-x-[{x:g}vh]",
        f"translate-y-[{y:g}vh]",
        f"scale-[{zoom:g}]",
    ]
    if mirror:
        tailwind_classes.append("-scale-x-100")
    if rotation != 0:
        tailwind_classes.append(f"rotate-[{rotation:g}deg]")
    if opacity < 1.0:
        tailwind_classes.append(f"opacity-[{opacity:g}]")
    tailwind_snippet = " ".join(tailwind_classes)

    # JSON Config
    json_config = {
        "zoom": zoom,
        "x": x,
        "y": y,
        "origin": origin,
        "rotation": rotation,
        "mirror": mirror,
        "opacity": opacity,
    }

    return {
        "params": json_config,
        "css": css_snippet,
        "react": react_snippet,
        "tailwind": tailwind_snippet,
        "json": json.dumps(json_config, indent=2),
    }


# ---------------------------------------------------------------------------
# CSS Transform Parser
# ---------------------------------------------------------------------------
def parse_css_transform(text: str):
    result = {
        "zoom": 1.0,
        "x": 0.0,
        "y": 0.0,
        "origin": "50% 50%",
        "rotation": 0.0,
        "mirror": False,
        "opacity": 1.0,
    }

    # Match transform-origin
    m_origin = re.search(r"transform-origin\s*:\s*([^;]+)", text, re.I)
    if m_origin:
        result["origin"] = m_origin.group(1).strip()

    # Match translate(Xvh, Yvh) or translate(Xpx, Ypx)
    m_trans = re.search(r"translate\s*\(\s*(-?[0-9\.]+)\s*(?:vh|px|%|em)?\s*,\s*(-?[0-9\.]+)\s*(?:vh|px|%|em)?\s*\)", text, re.I)
    if m_trans:
        result["x"] = float(m_trans.group(1))
        result["y"] = float(m_trans.group(2))

    # Match scale
    m_scale = re.search(r"scale\s*\(\s*(-?[0-9\.]+)\s*\)", text, re.I)
    if m_scale:
        result["zoom"] = float(m_scale.group(1))

    # Match scaleX(-1) or -scale-x-100
    if "scaleX(-1)" in text or "scale-x-[-1]" in text or "-scale-x-100" in text:
        result["mirror"] = True

    # Match rotate
    m_rot = re.search(r"rotate\s*\(\s*(-?[0-9\.]+)\s*deg\s*\)", text, re.I)
    if m_rot:
        result["rotation"] = float(m_rot.group(1))

    # Match opacity
    m_op = re.search(r"opacity\s*:\s*([0-9\.]+)", text, re.I)
    if m_op:
        result["opacity"] = float(m_op.group(1))

    return result


# ---------------------------------------------------------------------------
# Standalone Embedded Tuner Web UI (Zero external npm/node dependencies)
# ---------------------------------------------------------------------------
EMBEDDED_TUNER_HTML = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Skill Image Tuner HUD</title>
  <style>
    :root {
      --bg: #090b10;
      --card-bg: rgba(15, 18, 26, 0.85);
      --accent: #5FC2D6;
      --accent-glow: rgba(95, 194, 214, 0.35);
      --border: rgba(255, 255, 255, 0.1);
      --text: #e2e8f0;
      --text-muted: #94a3b8;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
      overflow: hidden;
      height: 100vh;
      display: flex;
      flex-direction: column;
    }
    /* Top Bar */
    header {
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 16px;
      background: rgba(11, 14, 20, 0.95);
      border-bottom: 1px solid var(--border);
      z-index: 100;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 700;
      font-size: 13px;
      letter-spacing: 0.05em;
    }
    .brand-dot {
      width: 8px; height: 8px;
      background: var(--accent);
      border-radius: 50%;
      box-shadow: 0 0 8px var(--accent);
    }
    .badge {
      font-size: 10px;
      padding: 2px 6px;
      background: rgba(95, 194, 214, 0.15);
      color: var(--accent);
      border-radius: 4px;
      border: 1px solid rgba(95, 194, 214, 0.3);
    }
    .top-controls {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    button, .btn {
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid var(--border);
      color: var(--text);
      padding: 5px 12px;
      border-radius: 6px;
      font-size: 12px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s ease;
      user-select: none;
    }
    button:hover, .btn:hover {
      background: rgba(95, 194, 214, 0.15);
      border-color: var(--accent);
      color: var(--accent);
    }
    button.active {
      background: var(--accent);
      color: #000;
      font-weight: 600;
    }

    /* Main Stage */
    main {
      flex: 1;
      position: relative;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      background:
        radial-gradient(circle at center, rgba(30, 41, 59, 0.4) 0%, transparent 70%),
        linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px);
      background-size: 100% 100%, 40px 40px, 40px 40px;
      cursor: grab;
    }
    main.dragging { cursor: grabbing; }
    main.picking-origin { cursor: crosshair !important; }

    /* Composition Viewfinder & Grid */
    #viewfinder {
      position: absolute;
      width: 70vmin;
      height: 70vmin;
      max-width: 800px;
      max-height: 800px;
      border: 1px dashed rgba(95, 194, 214, 0.5);
      box-shadow: 0 0 30px rgba(0,0,0,0.6);
      pointer-events: none;
      z-index: 10;
      border-radius: 8px;
    }
    #viewfinder::before, #viewfinder::after {
      content: '';
      position: absolute;
      width: 14px; height: 14px;
      border: 2px solid var(--accent);
    }
    #viewfinder::before { top: -2px; left: -2px; border-right: none; border-bottom: none; }
    #viewfinder::after { bottom: -2px; right: -2px; border-left: none; border-top: none; }

    .grid-line-h1, .grid-line-h2, .grid-line-v1, .grid-line-v2 {
      position: absolute;
      background: rgba(255, 255, 255, 0.08);
      pointer-events: none;
    }
    .grid-line-h1 { top: 33.333%; left: 0; right: 0; height: 1px; }
    .grid-line-h2 { top: 66.666%; left: 0; right: 0; height: 1px; }
    .grid-line-v1 { left: 33.333%; top: 0; bottom: 0; width: 1px; }
    .grid-line-v2 { left: 66.666%; top: 0; bottom: 0; width: 1px; }

    /* Tuned Image Container */
    #target-img {
      max-width: 65vmin;
      max-height: 65vmin;
      object-fit: contain;
      user-select: none;
      pointer-events: auto;
      transition: none;
      filter: drop-shadow(0 15px 35px rgba(0,0,0,0.5));
    }

    /* Origin Pin Indicator */
    #origin-indicator {
      position: absolute;
      width: 14px; height: 14px;
      border: 2px solid #ef4444;
      border-radius: 50%;
      transform: translate(-50%, -50%);
      pointer-events: none;
      z-index: 25;
      background: rgba(239, 68, 68, 0.4);
      box-shadow: 0 0 10px #ef4444;
      display: none;
    }

    /* Floating Draggable HUD */
    #hud {
      position: absolute;
      top: 60px;
      right: 20px;
      width: 320px;
      background: var(--card-bg);
      backdrop-filter: blur(16px);
      border: 1px solid var(--border);
      border-radius: 12px;
      box-shadow: 0 16px 40px rgba(0,0,0,0.6);
      z-index: 50;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      user-select: none;
    }
    .hud-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      cursor: move;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--border);
    }
    .hud-title {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.08em;
      color: var(--accent);
      text-transform: uppercase;
    }
    .control-row {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .control-label {
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      color: var(--text-muted);
    }
    .control-label span.val {
      font-family: monospace;
      color: var(--text);
      font-weight: 600;
    }
    input[type=range] {
      width: 100%;
      accent-color: var(--accent);
      cursor: pointer;
    }
    .btn-group {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
    }
    .btn-group button {
      flex: 1;
      justify-content: center;
      font-size: 11px;
      padding: 4px 6px;
    }

    /* Code Export Box */
    .export-box {
      margin-top: 6px;
      background: rgba(0,0,0,0.5);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 8px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .export-tabs {
      display: flex;
      gap: 4px;
      border-bottom: 1px solid rgba(255,255,255,0.06);
      padding-bottom: 4px;
    }
    .export-tab {
      background: transparent;
      border: none;
      font-size: 10px;
      padding: 2px 6px;
      color: var(--text-muted);
      cursor: pointer;
      border-radius: 4px;
    }
    .export-tab.active {
      color: var(--accent);
      background: rgba(95, 194, 214, 0.15);
      font-weight: bold;
    }
    pre {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 10px;
      color: #38bdf8;
      white-space: pre-wrap;
      word-break: break-all;
      max-height: 80px;
      overflow-y: auto;
      user-select: all;
    }
    .copy-btn {
      width: 100%;
      justify-content: center;
      background: rgba(95, 194, 214, 0.2);
      border-color: var(--accent);
      color: var(--accent);
      font-weight: 600;
    }

    /* Bottom Bar */
    footer {
      height: 30px;
      background: rgba(11, 14, 20, 0.95);
      border-top: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 16px;
      font-size: 11px;
      color: var(--text-muted);
    }
  </style>
</head>
<body>
  <header>
    <div class="brand">
      <div class="brand-dot"></div>
      <span>SKILL IMAGE TUNER</span>
      <span class="badge">HUD</span>
    </div>
    <div class="top-controls">
      <input type="file" id="file-input" accept="image/*" style="display:none">
      <button onclick="document.getElementById('file-input').click()">+ Local File</button>
      <button onclick="loadFromUrl()">🔗 URL</button>
      <button id="btn-toggle-hud" onclick="toggleHud()">Hide HUD</button>
    </div>
  </header>

  <main id="stage">
    <div id="viewfinder">
      <div class="grid-line-h1" id="grid-h1"></div>
      <div class="grid-line-h2" id="grid-h2"></div>
      <div class="grid-line-v1" id="grid-v1"></div>
      <div class="grid-line-v2" id="grid-v2"></div>
    </div>
    <img id="target-img" src="" alt="Target Asset">
    <div id="origin-indicator"></div>
  </main>

  <div id="hud">
    <div class="hud-header" id="hud-drag-handle">
      <span class="hud-title">Framing Controls</span>
      <span style="font-size:10px; color:#64748b;">Cmd+Shift+L</span>
    </div>

    <!-- Zoom -->
    <div class="control-row">
      <div class="control-label"><span>Zoom Scale</span><span class="val" id="val-zoom">1.00×</span></div>
      <input type="range" id="slider-zoom" min="0.1" max="5.0" step="0.01" value="1.0">
    </div>

    <!-- Offset X & Y -->
    <div class="control-row">
      <div class="control-label"><span>Offset X / Y (vh)</span><span class="val" id="val-offset">0.0, 0.0</span></div>
      <div style="display:flex; gap:6px;">
        <input type="range" id="slider-x" min="-80" max="80" step="0.5" value="0" title="Offset X">
        <input type="range" id="slider-y" min="-80" max="80" step="0.5" value="0" title="Offset Y">
      </div>
    </div>

    <!-- Rotation -->
    <div class="control-row">
      <div class="control-label"><span>Rotation</span><span class="val" id="val-rot">0.0°</span></div>
      <input type="range" id="slider-rot" min="-180" max="180" step="0.5" value="0">
    </div>

    <!-- Toggles & Steppers -->
    <div class="btn-group">
      <button id="btn-mirror" onclick="toggleMirror()">⇄ Mirror</button>
      <button id="btn-origin" onclick="startPickOrigin()">🎯 Origin: <span id="val-origin">50% 50%</span></button>
      <button onclick="resetTransform()">↺ Reset</button>
    </div>

    <div class="btn-group">
      <button onclick="rotateBy(-90)">-90°</button>
      <button onclick="rotateBy(-15)">-15°</button>
      <button onclick="rotateBy(15)">+15°</button>
      <button onclick="rotateBy(90)">+90°</button>
    </div>

    <!-- Export Snippets -->
    <div class="export-box">
      <div class="export-tabs">
        <button class="export-tab active" onclick="setExportTab('css')">CSS</button>
        <button class="export-tab" onclick="setExportTab('react')">React</button>
        <button class="export-tab" onclick="setExportTab('tailwind')">Tailwind</button>
        <button class="export-tab" onclick="setExportTab('json')">JSON</button>
      </div>
      <pre id="code-preview"></pre>
      <button class="copy-btn" id="btn-copy" onclick="copySnippet()">Copy Code</button>
    </div>
  </div>

  <footer>
    <div id="status-left">Ready</div>
    <div id="status-right">Drag = Pan · Pinch/Wheel = Zoom · V = Viewfinder · M = Mirror</div>
  </footer>

  <script>
    // State
    const state = {
      zoom: 1.0,
      x: 0.0,
      y: 0.0,
      origin: '50% 50%',
      rotation: 0.0,
      mirror: false,
      opacity: 1.0,
      activeTab: 'css',
      isDragging: false,
      isPickingOrigin: false,
      dragStartX: 0,
      dragStartY: 0,
      initialX: 0,
      initialY: 0
    };

    const targetImg = document.getElementById('target-img');
    const stage = document.getElementById('stage');
    const hud = document.getElementById('hud');
    const codePreview = document.getElementById('code-preview');
    const originIndicator = document.getElementById('origin-indicator');

    // Parse URL params
    const params = new URLSearchParams(window.location.search);
    const srcParam = params.get('src') || params.get('url') || params.get('image');
    if (srcParam) {
      targetImg.src = srcParam;
    } else {
      // Default placeholder SVG
      targetImg.src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='500' viewBox='0 0 400 500'><rect width='400' height='500' rx='20' fill='%231e293b'/><circle cx='200' cy='180' r='80' fill='%235FC2D6'/><ellipse cx='200' cy='390' rx='130' ry='90' fill='%2338bdf8'/><text x='200' y='470' fill='%2394a3b8' font-size='16' text-anchor='middle' font-family='sans-serif'>Image Tuner Sample</text></svg>";
    }

    if (params.has('zoom')) state.zoom = parseFloat(params.get('zoom')) || 1.0;
    if (params.has('x')) state.x = parseFloat(params.get('x')) || 0.0;
    if (params.has('y')) state.y = parseFloat(params.get('y')) || 0.0;
    if (params.has('origin')) state.origin = params.get('origin');
    if (params.has('rot') || params.has('rotation')) state.rotation = parseFloat(params.get('rot') || params.get('rotation')) || 0.0;
    if (params.get('mirror') === '1' || params.get('mirror') === 'true') state.mirror = true;

    // Apply state to DOM & UI controls
    function applyTransform() {
      const transParts = [`translate(${state.x}vh, ${state.y}vh)`];
      if (state.mirror) {
        transParts.push(`scale(${state.zoom}) scaleX(-1)`);
      } else {
        transParts.push(`scale(${state.zoom})`);
      }
      if (state.rotation !== 0) transParts.push(`rotate(${state.rotation}deg)`);

      const transformStr = transParts.join(' ');
      targetImg.style.transformOrigin = state.origin;
      targetImg.style.transform = transformStr;

      // Update HUD sliders & labels
      document.getElementById('slider-zoom').value = state.zoom;
      document.getElementById('val-zoom').textContent = state.zoom.toFixed(2) + '×';

      document.getElementById('slider-x').value = state.x;
      document.getElementById('slider-y').value = state.y;
      document.getElementById('val-offset').textContent = `${state.x > 0 ? '+' : ''}${state.x.toFixed(1)}, ${state.y > 0 ? '+' : ''}${state.y.toFixed(1)}`;

      document.getElementById('slider-rot').value = state.rotation;
      document.getElementById('val-rot').textContent = state.rotation.toFixed(1) + '°';

      document.getElementById('val-origin').textContent = state.origin;
      document.getElementById('btn-mirror').classList.toggle('active', state.mirror);

      updateCodePreview();
      document.getElementById('status-left').textContent = `Zoom: ${state.zoom.toFixed(2)}× | Pos: (${state.x.toFixed(1)}vh, ${state.y.toFixed(1)}vh) | Rot: ${state.rotation.toFixed(1)}° | Origin: ${state.origin}`;
    }

    function updateCodePreview() {
      const transformStr = `translate(${state.x}vh, ${state.y}vh) scale(${state.zoom})${state.mirror ? ' scaleX(-1)' : ''}${state.rotation !== 0 ? ` rotate(${state.rotation}deg)` : ''}`;
      if (state.activeTab === 'css') {
        codePreview.textContent = `transform-origin: ${state.origin};\ntransform: ${transformStr};`;
      } else if (state.activeTab === 'react') {
        codePreview.textContent = `style={{\n  transformOrigin: '${state.origin}',\n  transform: '${transformStr}'\n}}`;
      } else if (state.activeTab === 'tailwind') {
        const originToken = state.origin.replace(/\\s+/g, '_');
        codePreview.textContent = `origin-[${originToken}] translate-x-[${state.x}vh] translate-y-[${state.y}vh] scale-[${state.zoom}]${state.mirror ? ' -scale-x-100' : ''}${state.rotation !== 0 ? ` rotate-[${state.rotation}deg]` : ''}`;
      } else {
        codePreview.textContent = JSON.stringify({
          zoom: parseFloat(state.zoom.toFixed(3)),
          x: parseFloat(state.x.toFixed(2)),
          y: parseFloat(state.y.toFixed(2)),
          origin: state.origin,
          rotation: parseFloat(state.rotation.toFixed(1)),
          mirror: state.mirror
        }, null, 2);
      }
    }

    function setExportTab(tab) {
      state.activeTab = tab;
      document.querySelectorAll('.export-tab').forEach(el => el.classList.remove('active'));
      event.target.classList.add('active');
      updateCodePreview();
    }

    function copySnippet() {
      navigator.clipboard.writeText(codePreview.textContent);
      const btn = document.getElementById('btn-copy');
      const original = btn.textContent;
      btn.textContent = '✓ Copied!';
      setTimeout(() => btn.textContent = original, 1200);
    }

    // Sliders
    document.getElementById('slider-zoom').addEventListener('input', (e) => {
      state.zoom = parseFloat(e.target.value);
      applyTransform();
    });
    document.getElementById('slider-x').addEventListener('input', (e) => {
      state.x = parseFloat(e.target.value);
      applyTransform();
    });
    document.getElementById('slider-y').addEventListener('input', (e) => {
      state.y = parseFloat(e.target.value);
      applyTransform();
    });
    document.getElementById('slider-rot').addEventListener('input', (e) => {
      state.rotation = parseFloat(e.target.value);
      applyTransform();
    });

    // Mirror & Rotate helpers
    function toggleMirror() {
      state.mirror = !state.mirror;
      applyTransform();
    }
    function rotateBy(deg) {
      state.rotation = (state.rotation + deg) % 360;
      if (state.rotation > 180) state.rotation -= 360;
      if (state.rotation < -180) state.rotation += 360;
      applyTransform();
    }
    function resetTransform() {
      state.zoom = 1.0;
      state.x = 0;
      state.y = 0;
      state.rotation = 0;
      state.mirror = false;
      state.origin = '50% 50%';
      applyTransform();
    }

    // Origin Picker
    function startPickOrigin() {
      state.isPickingOrigin = true;
      stage.classList.add('picking-origin');
      document.getElementById('btn-origin').classList.add('active');
    }

    targetImg.addEventListener('click', (e) => {
      if (!state.isPickingOrigin) return;
      const rect = targetImg.getBoundingClientRect();
      const px = ((e.clientX - rect.left) / rect.width) * 100;
      const py = ((e.clientY - rect.top) / rect.height) * 100;
      state.origin = `${Math.round(px)}% ${Math.round(py)}%`;
      state.isPickingOrigin = false;
      stage.classList.remove('picking-origin');
      document.getElementById('btn-origin').classList.remove('active');
      applyTransform();
    });

    // Pan via Drag
    stage.addEventListener('mousedown', (e) => {
      if (state.isPickingOrigin || e.target.closest('#hud')) return;
      state.isDragging = true;
      stage.classList.add('dragging');
      state.dragStartX = e.clientX;
      state.dragStartY = e.clientY;
      state.initialX = state.x;
      state.initialY = state.y;
    });

    window.addEventListener('mousemove', (e) => {
      if (!state.isDragging) return;
      const dx = e.clientX - state.dragStartX;
      const dy = e.clientY - state.dragStartY;
      const vhConversion = 100 / window.innerHeight;
      state.x = state.initialX + (dx * vhConversion);
      state.y = state.initialY + (dy * vhConversion);
      applyTransform();
    });

    window.addEventListener('mouseup', () => {
      if (state.isDragging) {
        state.isDragging = false;
        stage.classList.remove('dragging');
      }
    });

    // Wheel / Pinch Zoom
    stage.addEventListener('wheel', (e) => {
      if (e.target.closest('#hud')) return;
      e.preventDefault();
      const delta = -e.deltaY * 0.002;
      state.zoom = Math.min(5.0, Math.max(0.1, state.zoom + delta));
      applyTransform();
    }, { passive: false });

    // File Upload & URL
    document.getElementById('file-input').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        targetImg.src = reader.result;
        resetTransform();
      };
      reader.readAsDataURL(file);
    });

    function loadFromUrl() {
      const url = prompt('Enter image URL:');
      if (url && url.trim()) {
        targetImg.src = url.trim();
        resetTransform();
      }
    }

    // HUD Dragging
    const hudHandle = document.getElementById('hud-drag-handle');
    let isHudMoving = false, hudOffX = 0, hudOffY = 0;
    hudHandle.addEventListener('mousedown', (e) => {
      isHudMoving = true;
      hudOffX = e.clientX - hud.offsetLeft;
      hudOffY = e.clientY - hud.offsetTop;
    });
    window.addEventListener('mousemove', (e) => {
      if (!isHudMoving) return;
      hud.style.left = `${e.clientX - hudOffX}px`;
      hud.style.top = `${e.clientY - hudOffY}px`;
      hud.style.right = 'auto';
    });
    window.addEventListener('mouseup', () => isHudMoving = false);

    function toggleHud() {
      const hidden = hud.style.display === 'none';
      hud.style.display = hidden ? 'flex' : 'none';
      document.getElementById('btn-toggle-hud').textContent = hidden ? 'Hide HUD' : 'Show HUD';
    }

    // Keyboard shortcuts
    window.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.code === 'KeyL') {
        e.preventDefault();
        toggleHud();
      }
      if (e.code === 'KeyV' && !['INPUT','TEXTAREA'].includes(e.target.tagName)) {
        const vf = document.getElementById('viewfinder');
        vf.style.display = vf.style.display === 'none' ? 'block' : 'none';
      }
      if (e.code === 'KeyM' && !['INPUT','TEXTAREA'].includes(e.target.tagName)) {
        toggleMirror();
      }
    });

    // Initial render
    applyTransform();
  </script>
</body>
</html>
"""


# ---------------------------------------------------------------------------
# HTTP Request Handler Supporting Static Dist & Local Image Proxying
# ---------------------------------------------------------------------------
def make_handler(dist_dir: Path, target_image_path: Path = None):
    class TunerHTTPHandler(http.server.SimpleHTTPRequestHandler):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, directory=str(dist_dir) if dist_dir.exists() else None, **kwargs)

        def end_headers(self):
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "*")
            super().end_headers()

        def do_OPTIONS(self):
            self.send_response(200)
            self.end_headers()

        def do_HEAD(self):
            self.do_GET(is_head=True)

        def do_GET(self, is_head=False):
            parsed = urllib.parse.urlparse(self.path)
            clean_path = parsed.path

            # Endpoint to safely serve local target image file
            if clean_path.startswith("/_image/"):
                img_name = urllib.parse.unquote(clean_path[len("/_image/"):])
                candidate_path = None
                if target_image_path and (target_image_path.name == img_name or str(target_image_path).endswith(img_name)):
                    candidate_path = target_image_path
                elif os.path.exists(img_name):
                    candidate_path = Path(img_name)

                if candidate_path and candidate_path.is_file():
                    mime, _ = mimetypes.guess_type(str(candidate_path))
                    mime = mime or "application/octet-stream"
                    self.send_response(200)
                    self.send_header("Content-Type", mime)
                    self.send_header("Content-Length", str(candidate_path.stat().st_size))
                    self.end_headers()
                    if not is_head:
                        with open(candidate_path, "rb") as f:
                            self.wfile.write(f.read())
                    return
                else:
                    self.send_response(404)
                    self.end_headers()
                    if not is_head:
                        self.wfile.write(b"Image file not found")
                    return

            # If dist/ exists, let SimpleHTTPRequestHandler serve it
            if dist_dir.exists() and (dist_dir / "index.html").exists():
                if is_head:
                    super().do_HEAD()
                else:
                    super().do_GET()
                return

            # Otherwise, serve self-contained embedded tuner UI
            if clean_path in ("/", "/index.html"):
                content = EMBEDDED_TUNER_HTML.encode("utf-8")
                self.send_response(200)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.send_header("Content-Length", str(len(content)))
                self.end_headers()
                if not is_head:
                    self.wfile.write(content)
                return

            self.send_response(404)
            self.end_headers()
            if not is_head:
                self.wfile.write(b"Not Found")

        def log_message(self, format, *args):
            # Suppress noisy standard HTTP access logs for clean CLI
            pass

    return TunerHTTPHandler


# ---------------------------------------------------------------------------
# Server Launcher
# ---------------------------------------------------------------------------
def run_tuner_server(
    image: str = None,
    port: int = 5188,
    host: str = "127.0.0.1",
    no_browser: bool = False,
    dist_dir: str = None,
    zoom: float = None,
    x: float = None,
    y: float = None,
    origin: str = None,
    rotation: float = None,
    mirror: bool = False,
):
    # Locate dist directory (check repo root or package dir)
    script_dir = Path(__file__).resolve().parent
    candidates = [
        Path(dist_dir) if dist_dir else None,
        script_dir / "dist",
        Path.cwd() / "dist",
    ]
    resolved_dist = next((c for c in candidates if c and c.exists()), script_dir / "dist")

    target_file = None
    query_params = {}

    if image:
        if image.startswith("http://") or image.startswith("https://") or image.startswith("data:"):
            query_params["src"] = image
        else:
            p = Path(image).resolve()
            if p.is_file():
                target_file = p
                query_params["src"] = f"http://{host}:{port}/_image/{urllib.parse.quote(p.name)}"
                query_params["name"] = p.stem
            else:
                # Treat as preset id or custom path
                query_params["image"] = image

    if zoom is not None:
        query_params["zoom"] = str(zoom)
    if x is not None:
        query_params["x"] = str(x)
    if y is not None:
        query_params["y"] = str(y)
    if origin is not None:
        query_params["origin"] = origin
    if rotation is not None:
        query_params["rot"] = str(rotation)
    if mirror:
        query_params["mirror"] = "1"

    # Find free port if requested is in use
    actual_port = port
    for port_cand in range(port, port + 20):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            if s.connect_ex((host, port_cand)) != 0:
                actual_port = port_cand
                break

    if target_file and actual_port != port:
        query_params["src"] = f"http://{host}:{actual_port}/_image/{urllib.parse.quote(target_file.name)}"

    qs = urllib.parse.urlencode(query_params)
    url = f"http://{host}:{actual_port}/" + (f"?{qs}" if qs else "")

    handler_class = make_handler(resolved_dist, target_file)

    class ReusableTCPServer(socketserver.TCPServer):
        allow_reuse_address = True

    try:
        with ReusableTCPServer((host, actual_port), handler_class) as httpd:
            print(banner())
            print(f"  {BOLD}Status:{RESET}      {GREEN}RUNNING{RESET}")
            print(f"  {BOLD}Local HUD:{RESET}   {CYAN}{url}{RESET}")
            if target_file:
                print(f"  {BOLD}Image Asset:{RESET} {target_file}")
            print(f"  {BOLD}Serving Mode:{RESET} {'Vite build (dist/)' if resolved_dist.exists() else 'Embedded Standalone Canvas'}")
            print("")
            print(f"  {DIM}Controls: Pan (drag) · Zoom (pinch/wheel) · Rotate (knob) · Mirror (M){RESET}")
            print(f"  {DIM}Press Ctrl+C to shut down the server.{RESET}")
            print("")

            if not no_browser:
                try:
                    webbrowser.open(url)
                except Exception:
                    pass

            httpd.serve_forever()
    except KeyboardInterrupt:
        print(f"\n{YELLOW}Stopping Skill Image Tuner server... Done.{RESET}")


# ---------------------------------------------------------------------------
# CLI Commands Entry Point
# ---------------------------------------------------------------------------
def main():
    parser = argparse.ArgumentParser(
        description="Universal interactive image positioning, scaling, and framing tuner HUD.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""Examples:
  python3 image_tuner.py path/to/hero.png
  python3 image_tuner.py serve --url https://example.com/banner.webp
  python3 image_tuner.py inspect assets/avatar.svg
  python3 image_tuner.py export --zoom 1.25 --x 5 --y -10 --origin "50% 36%"
  python3 image_tuner.py parse "transform-origin: 50% 36%; transform: translate(5vh, -10vh) scale(1.25);"
""",
    )
    parser.add_argument("-v", "--version", action="version", version=f"image-tuner {VERSION}")

    subparsers = parser.add_subparsers(dest="command", help="Command to run")

    # serve
    p_serve = subparsers.add_parser("serve", help="Launch interactive visual tuner HUD web server")
    p_serve.add_argument("image", nargs="?", default=None, help="Local image file path or web URL")
    p_serve.add_argument("--port", type=int, default=5188, help="Port to listen on (default 5188)")
    p_serve.add_argument("--host", default="127.0.0.1", help="Host interface (default 127.0.0.1)")
    p_serve.add_argument("--no-browser", action="store_true", help="Do not automatically open browser")
    p_serve.add_argument("--dist-dir", default=None, help="Custom directory containing built Vite dist assets")
    p_serve.add_argument("--zoom", type=float, default=None, help="Initial zoom level")
    p_serve.add_argument("--x", type=float, default=None, help="Initial X offset in vh")
    p_serve.add_argument("--y", type=float, default=None, help="Initial Y offset in vh")
    p_serve.add_argument("--origin", default=None, help="Initial transform-origin (e.g. '50%% 36%%')")
    p_serve.add_argument("--rotation", type=float, default=None, help="Initial rotation in degrees")
    p_serve.add_argument("--mirror", action="store_true", help="Mirror horizontally")

    # inspect
    p_insp = subparsers.add_parser("inspect", help="Inspect image file dimensions, aspect ratio, and metadata")
    p_insp.add_argument("file", help="Path to image file")
    p_insp.add_argument("--json", action="store_true", help="Output machine-readable JSON")

    # export
    p_exp = subparsers.add_parser("export", help="Generate CSS, React, Tailwind, and JSON snippets")
    p_exp.add_argument("--zoom", type=float, default=1.0, help="Zoom scale multiplier (default 1.0)")
    p_exp.add_argument("--x", type=float, default=0.0, help="Horizontal offset in vh (default 0.0)")
    p_exp.add_argument("--y", type=float, default=0.0, help="Vertical offset in vh (default 0.0)")
    p_exp.add_argument("--origin", default="50% 50%", help="Transform origin anchor (default '50%% 50%%')")
    p_exp.add_argument("--rotation", type=float, default=0.0, help="Rotation in degrees (default 0.0)")
    p_exp.add_argument("--mirror", action="store_true", help="Mirror horizontally")
    p_exp.add_argument("--opacity", type=float, default=1.0, help="Opacity from 0.0 to 1.0")
    p_exp.add_argument("--format", choices=["all", "css", "react", "tailwind", "json"], default="all", help="Output format")
    p_exp.add_argument("--json", action="store_true", help="Output machine-readable JSON dictionary")

    # parse
    p_parse = subparsers.add_parser("parse", help="Parse CSS transform string into structured parameters")
    p_parse.add_argument("string", help="CSS transform string to parse")
    p_parse.add_argument("--json", action="store_true", help="Output machine-readable JSON")

    # Allow direct invocation like `python3 image_tuner.py path/to/image.png`
    if len(sys.argv) > 1 and sys.argv[1] not in (
        "serve", "inspect", "export", "parse", "-h", "--help", "-v", "--version"
    ):
        # Treat first arg as image path for serve
        first_arg = sys.argv[1]
        remaining = sys.argv[2:]
        sys.argv = [sys.argv[0], "serve", first_arg] + remaining

    args = parser.parse_args()

    if not args.command:
        # Default action: serve
        run_tuner_server()
        return

    if args.command == "serve":
        run_tuner_server(
            image=args.image,
            port=args.port,
            host=args.host,
            no_browser=args.no_browser,
            dist_dir=args.dist_dir,
            zoom=args.zoom,
            x=args.x,
            y=args.y,
            origin=args.origin,
            rotation=args.rotation,
            mirror=args.mirror,
        )
    elif args.command == "inspect":
        info = inspect_image_file(args.file)
        if args.json:
            print(json.dumps(info, indent=2))
        else:
            print(f"{BOLD}Image Asset:{RESET} {info['filename']}")
            print(f"  Format:       {CYAN}{info['format']}{RESET} ({info['mime_type']})")
            print(f"  Dimensions:   {info['width']} × {info['height']} px")
            print(f"  Aspect Ratio: {info['aspect_ratio']} ({info['aspect_ratio_decimal']})")
            print(f"  File Size:    {info['size_kb']} KB ({info['size_bytes']} bytes)")
            print(f"  Suggested:    Preset: {info['recommended_preset']} · Anchor: {info['recommended_origin']}")
    elif args.command == "export":
        res = compute_transforms(
            zoom=args.zoom,
            x=args.x,
            y=args.y,
            origin=args.origin,
            rotation=args.rotation,
            mirror=args.mirror,
            opacity=args.opacity,
        )
        if args.json or args.format == "json":
            if args.format == "json" and not args.json:
                print(res["json"])
            else:
                print(json.dumps(res, indent=2))
        elif args.format == "css":
            print(res["css"])
        elif args.format == "react":
            print(res["react"])
        elif args.format == "tailwind":
            print(res["tailwind"])
        else:
            print(f"{BOLD}══ CSS ═════════════════════════════════════{RESET}")
            print(res["css"])
            print(f"\n{BOLD}══ React Inline Style ══════════════════════{RESET}")
            print(res["react"])
            print(f"\n{BOLD}══ Tailwind Utility Classes ════════════════{RESET}")
            print(res["tailwind"])
            print(f"\n{BOLD}══ JSON Config ═════════════════════════════{RESET}")
            print(res["json"])
    elif args.command == "parse":
        parsed = parse_css_transform(args.string)
        if args.json:
            print(json.dumps(parsed, indent=2))
        else:
            print(f"{BOLD}Parsed Transform Parameters:{RESET}")
            print(f"  Zoom:     {parsed['zoom']}")
            print(f"  Offset:   X={parsed['x']}vh, Y={parsed['y']}vh")
            print(f"  Origin:   {parsed['origin']}")
            print(f"  Rotation: {parsed['rotation']}°")
            print(f"  Mirror:   {parsed['mirror']}")
            print(f"  Opacity:  {parsed['opacity']}")


if __name__ == "__main__":
    main()

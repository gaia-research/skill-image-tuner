import React, { useState, useRef } from 'react'
import { ImageConfig, ImageItem } from '../types'

interface TunerHUDProps {
  image: ImageItem
  config: ImageConfig
  onChangeConfig: (updater: (prev: ImageConfig) => ImageConfig) => void
  onReset: () => void
  showViewfinder: boolean
  onToggleViewfinder: () => void
  showGrid: boolean
  onToggleGrid: () => void
  dragMode: boolean
  onToggleDragMode: () => void
  isSettingOrigin: boolean
  onToggleSettingOrigin: () => void
}

type CodeTab = 'json' | 'css' | 'react' | 'tailwind'

export function TunerHUD({
  image,
  config,
  onChangeConfig,
  onReset,
  showViewfinder,
  onToggleViewfinder,
  showGrid,
  onToggleGrid,
  dragMode,
  onToggleDragMode,
  isSettingOrigin,
  onToggleSettingOrigin,
}: TunerHUDProps) {
  const [isOpen, setIsOpen] = useState(true)
  const [codeTab, setCodeTab] = useState<CodeTab>('json')
  const [copied, setCopied] = useState(false)

  // Floating HUD position
  const [hudPos, setHudPos] = useState({ x: 24, y: 80 })
  const isDraggingHudRef = useRef(false)
  const hudDragStartRef = useRef({ clientX: 0, clientY: 0, hudX: 24, hudY: 80 })

  const onHudHeaderPointerDown = (e: React.PointerEvent) => {
    e.stopPropagation()
    isDraggingHudRef.current = true
    hudDragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      hudX: hudPos.x,
      hudY: hudPos.y,
    }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }

  const onHudHeaderPointerMove = (e: React.PointerEvent) => {
    if (!isDraggingHudRef.current) return
    const dx = e.clientX - hudDragStartRef.current.clientX
    const dy = e.clientY - hudDragStartRef.current.clientY
    setHudPos({
      x: Math.max(10, Math.min(window.innerWidth - 380, hudDragStartRef.current.hudX + dx)),
      y: Math.max(10, Math.min(window.innerHeight - 200, hudDragStartRef.current.hudY + dy)),
    })
  }

  const onHudHeaderPointerUp = (e: React.PointerEvent) => {
    isDraggingHudRef.current = false
    try {
      ;(e.target as HTMLElement).releasePointerCapture(e.pointerId)
    } catch {}
  }

  // Code snippets
  const getCodeSnippet = (): string => {
    switch (codeTab) {
      case 'json':
        return `{\n  "zoom": ${config.zoom.toFixed(2)},\n  "x": ${config.x.toFixed(2)},\n  "y": ${config.y.toFixed(2)},\n  "origin": "${config.origin}",\n  "rotation": ${config.rotation.toFixed(1)}\n}`
      case 'css':
        return `/* Framing CSS */\ntransform-origin: ${config.origin};\ntransform: translate(calc(-50% + ${config.x.toFixed(2)}vh), ${config.y.toFixed(2)}vh) scale(${config.zoom.toFixed(2)}) rotate(${config.rotation.toFixed(1)}deg);`
      case 'react':
        return `style={{\n  transformOrigin: '${config.origin}',\n  transform: \`translate(calc(-50% + \${${config.x.toFixed(2)}}vh), \${${config.y.toFixed(2)}}vh) scale(\${${config.zoom.toFixed(2)}}) rotate(\${${config.rotation.toFixed(1)}}deg)\`,\n}}`
      case 'tailwind':
        return `origin-[${config.origin.replace(' ', '_')}] translate-x-[${config.x.toFixed(2)}vh] translate-y-[${config.y.toFixed(2)}vh] scale-[${config.zoom.toFixed(2)}] rotate-[${config.rotation.toFixed(1)}deg]`
      default:
        return ''
    }
  }

  const copyCode = () => {
    const text = getCodeSnippet()
    navigator.clipboard?.writeText(text).catch(() => {
      const ta = document.createElement('textarea')
      ta.value = text
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    })
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }

  const originPresets = [
    { label: 'Face 49/27', value: '49% 27%' },
    { label: 'Center', value: '50% 50%' },
    { label: 'Top', value: '50% 20%' },
    { label: 'Bottom', value: '50% 80%' },
  ]

  return (
    <div
      style={{
        position: 'fixed',
        left: `${hudPos.x}px`,
        top: `${hudPos.y}px`,
        zIndex: 9999,
        width: isOpen ? '360px' : 'auto',
        background: 'rgba(10, 13, 20, 0.94)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(95, 194, 214, 0.35)',
        borderRadius: '8px',
        boxShadow: '0 20px 48px rgba(0,0,0,0.8), 0 0 24px rgba(95, 194, 214, 0.15)',
        color: '#EAE8E3',
        fontFamily: 'ui-monospace, SFMono-Regular, "JetBrains Mono", monospace',
        userSelect: 'none',
        overflow: 'hidden',
        transition: 'width 180ms ease',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* HUD Header */}
      <div
        onPointerDown={onHudHeaderPointerDown}
        onPointerMove={onHudHeaderPointerMove}
        onPointerUp={onHudHeaderPointerUp}
        style={{
          padding: '8px 12px',
          background: 'rgba(255,255,255,0.04)',
          borderBottom: isOpen ? '1px solid rgba(255,255,255,0.08)' : 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'move',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              display: 'inline-block',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#5FC2D6',
              boxShadow: '0 0 8px #5FC2D6',
            }}
          />
          <span style={{ fontSize: '11px', fontWeight: 'bold', letterSpacing: '0.08em' }}>
            IMAGE TUNER HUD
          </span>
          <span
            style={{
              fontSize: '10px',
              background: 'rgba(95, 194, 214, 0.15)',
              color: '#5FC2D6',
              padding: '1px 6px',
              borderRadius: '3px',
              border: '1px solid rgba(95, 194, 214, 0.3)',
              maxWidth: '120px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            title={image.name}
          >
            {image.name}
          </span>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen((o) => !o)}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#fff',
            opacity: 0.7,
            cursor: 'pointer',
            fontSize: '14px',
            padding: '0 4px',
          }}
          title={isOpen ? 'Minimize HUD' : 'Expand HUD'}
        >
          {isOpen ? '—' : '⛶'}
        </button>
      </div>

      {isOpen && (
        <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '11px' }}>
          {/* Metrics Overview Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '6px',
              background: 'rgba(0,0,0,0.35)',
              padding: '8px',
              borderRadius: '6px',
              border: '1px solid rgba(255,255,255,0.06)',
              textAlign: 'center',
            }}
          >
            <div>
              <div style={{ fontSize: '8px', opacity: 0.6, letterSpacing: '0.06em' }}>ZOOM</div>
              <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#5FC2D6' }}>
                {config.zoom.toFixed(2)}×
              </div>
            </div>
            <div>
              <div style={{ fontSize: '8px', opacity: 0.6, letterSpacing: '0.06em' }}>X (VH)</div>
              <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#fff' }}>
                {config.x > 0 ? '+' : ''}{config.x.toFixed(2)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '8px', opacity: 0.6, letterSpacing: '0.06em' }}>Y (VH)</div>
              <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#fff' }}>
                {config.y > 0 ? '+' : ''}{config.y.toFixed(2)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '8px', opacity: 0.6, letterSpacing: '0.06em' }}>ORIGIN</div>
              <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#A58AE0', marginTop: '2px' }}>
                {config.origin}
              </div>
            </div>
          </div>

          {/* Zoom Slider & Steppers */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
              <span style={{ opacity: 0.8 }}>Scale / Zoom</span>
              <span style={{ color: '#5FC2D6', fontWeight: 'bold' }}>{config.zoom.toFixed(2)}×</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                type="button"
                onClick={() => onChangeConfig((p) => ({ ...p, zoom: Math.max(0.1, Number((p.zoom - 0.1).toFixed(2))) }))}
                style={btnStyle}
                title="Decrease scale"
              >
                -0.1
              </button>
              <input
                type="range"
                min="0.1"
                max="5.0"
                step="0.05"
                value={config.zoom}
                onChange={(e) => onChangeConfig((p) => ({ ...p, zoom: parseFloat(e.target.value) }))}
                style={{ flex: 1, accentColor: '#5FC2D6', cursor: 'pointer' }}
              />
              <button
                type="button"
                onClick={() => onChangeConfig((p) => ({ ...p, zoom: Math.min(5.0, Number((p.zoom + 0.1).toFixed(2))) }))}
                style={btnStyle}
                title="Increase scale"
              >
                +0.1
              </button>
            </div>
          </div>

          {/* Horizontal Pan (X) Steppers */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
              <span style={{ opacity: 0.8 }}>Horizontal Offset (X)</span>
              <span style={{ color: '#fff' }}>{config.x > 0 ? '+' : ''}{config.x.toFixed(2)} vh</span>
            </div>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                type="button"
                onClick={() => onChangeConfig((p) => ({ ...p, x: Number((p.x - 1).toFixed(2)) }))}
                style={{ ...btnStyle, flex: 1 }}
              >
                -1vh
              </button>
              <button
                type="button"
                onClick={() => onChangeConfig((p) => ({ ...p, x: Number((p.x - 0.2).toFixed(2)) }))}
                style={{ ...btnStyle, flex: 1 }}
              >
                -0.2
              </button>
              <button
                type="button"
                onClick={() => onChangeConfig((p) => ({ ...p, x: Number((p.x + 0.2).toFixed(2)) }))}
                style={{ ...btnStyle, flex: 1 }}
              >
                +0.2
              </button>
              <button
                type="button"
                onClick={() => onChangeConfig((p) => ({ ...p, x: Number((p.x + 1).toFixed(2)) }))}
                style={{ ...btnStyle, flex: 1 }}
              >
                +1vh
              </button>
            </div>
          </div>

          {/* Vertical Pan (Y) Steppers */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
              <span style={{ opacity: 0.8 }}>Vertical Offset (Y)</span>
              <span style={{ color: '#fff' }}>{config.y > 0 ? '+' : ''}{config.y.toFixed(2)} vh</span>
            </div>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                type="button"
                onClick={() => onChangeConfig((p) => ({ ...p, y: Number((p.y - 1).toFixed(2)) }))}
                style={{ ...btnStyle, flex: 1 }}
              >
                -1vh
              </button>
              <button
                type="button"
                onClick={() => onChangeConfig((p) => ({ ...p, y: Number((p.y - 0.2).toFixed(2)) }))}
                style={{ ...btnStyle, flex: 1 }}
              >
                -0.2
              </button>
              <button
                type="button"
                onClick={() => onChangeConfig((p) => ({ ...p, y: Number((p.y + 0.2).toFixed(2)) }))}
                style={{ ...btnStyle, flex: 1 }}
              >
                +0.2
              </button>
              <button
                type="button"
                onClick={() => onChangeConfig((p) => ({ ...p, y: Number((p.y + 1).toFixed(2)) }))}
                style={{ ...btnStyle, flex: 1 }}
              >
                +1vh
              </button>
            </div>
          </div>

          {/* Transform Origin Presets & Interactive Setter */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
              <span style={{ opacity: 0.8 }}>Transform Origin Anchor</span>
              <span style={{ color: '#A58AE0', fontWeight: 'bold' }}>{config.origin}</span>
            </div>
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {originPresets.map((pr) => (
                <button
                  key={pr.value}
                  type="button"
                  onClick={() => onChangeConfig((p) => ({ ...p, origin: pr.value }))}
                  style={{
                    ...btnStyle,
                    flex: 1,
                    fontSize: '10px',
                    padding: '4px 2px',
                    borderColor: config.origin === pr.value ? '#A58AE0' : 'rgba(255,255,255,0.16)',
                    background: config.origin === pr.value ? 'rgba(165, 138, 224, 0.25)' : 'rgba(255,255,255,0.06)',
                    color: config.origin === pr.value ? '#A58AE0' : '#fff',
                  }}
                >
                  {pr.label}
                </button>
              ))}
              <button
                type="button"
                onClick={onToggleSettingOrigin}
                style={{
                  ...btnStyle,
                  flex: 1,
                  fontSize: '10px',
                  padding: '4px 2px',
                  borderColor: isSettingOrigin ? '#5FC2D6' : 'rgba(255,255,255,0.16)',
                  background: isSettingOrigin ? '#5FC2D6' : 'rgba(255,255,255,0.06)',
                  color: isSettingOrigin ? '#000' : '#fff',
                  fontWeight: isSettingOrigin ? 'bold' : 'normal',
                }}
                title="Click anywhere on the image canvas to place the transform origin"
              >
                {isSettingOrigin ? '🎯 Click Img' : '🎯 Pick'}
              </button>
            </div>
          </div>

          {/* Toggles (Drag, Viewfinder, Grid) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
            <button
              type="button"
              onClick={onToggleDragMode}
              style={{
                ...btnStyle,
                fontSize: '10px',
                padding: '5px 2px',
                background: dragMode ? 'rgba(95, 194, 214, 0.2)' : 'rgba(255,255,255,0.06)',
                borderColor: dragMode ? '#5FC2D6' : 'rgba(255,255,255,0.15)',
                color: dragMode ? '#5FC2D6' : '#aaa',
                fontWeight: dragMode ? 'bold' : 'normal',
              }}
            >
              ✥ Drag: {dragMode ? 'ON' : 'OFF'}
            </button>
            <button
              type="button"
              onClick={onToggleViewfinder}
              style={{
                ...btnStyle,
                fontSize: '10px',
                padding: '5px 2px',
                background: showViewfinder ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)',
                borderColor: showViewfinder ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)',
                color: showViewfinder ? '#fff' : '#888',
              }}
            >
              ⛶ Box: {showViewfinder ? 'ON' : 'OFF'}
            </button>
            <button
              type="button"
              onClick={onToggleGrid}
              style={{
                ...btnStyle,
                fontSize: '10px',
                padding: '5px 2px',
                background: showGrid ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)',
                borderColor: showGrid ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)',
                color: showGrid ? '#fff' : '#888',
              }}
            >
              # Grid: {showGrid ? 'ON' : 'OFF'}
            </button>
          </div>

          {/* Export Code Tabs */}
          <div>
            <div style={{ display: 'flex', gap: '3px', marginBottom: '5px' }}>
              {(['json', 'css', 'react', 'tailwind'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setCodeTab(tab)}
                  style={{
                    ...btnStyle,
                    padding: '3px 6px',
                    fontSize: '9px',
                    textTransform: 'uppercase',
                    background: codeTab === tab ? '#5FC2D6' : 'transparent',
                    color: codeTab === tab ? '#000' : '#888',
                    borderColor: codeTab === tab ? '#5FC2D6' : 'transparent',
                    fontWeight: codeTab === tab ? 'bold' : 'normal',
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>

            <pre
              style={{
                margin: 0,
                background: 'rgba(0,0,0,0.65)',
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid rgba(255,255,255,0.08)',
                fontSize: '10px',
                color: '#A58AE0',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
                maxHeight: '80px',
                overflowY: 'auto',
                lineHeight: 1.4,
              }}
            >
              {getCodeSnippet()}
            </pre>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              type="button"
              onClick={copyCode}
              style={{
                ...btnStyle,
                flex: 3,
                background: copied ? '#2ecc71' : '#5FC2D6',
                borderColor: copied ? '#2ecc71' : '#5FC2D6',
                color: '#000',
                fontWeight: 'bold',
                padding: '7px 10px',
                fontSize: '11px',
              }}
            >
              {copied ? '✓ COPIED SNIPPET!' : '📋 COPY CODE'}
            </button>
            <button
              type="button"
              onClick={onReset}
              style={{
                ...btnStyle,
                flex: 1,
                background: 'rgba(255,255,255,0.06)',
                padding: '7px 8px',
                fontSize: '11px',
              }}
              title="Reset to image default"
            >
              ↺ Reset
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

const btnStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.08)',
  border: '1px solid rgba(255,255,255,0.16)',
  borderRadius: '4px',
  color: '#fff',
  fontSize: '11px',
  padding: '4px 8px',
  cursor: 'pointer',
  fontFamily: 'inherit',
  transition: 'background 120ms ease, border-color 120ms ease',
}

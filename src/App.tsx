import React, { useState, useEffect, useCallback } from 'react'
import { ImageItem, ImageConfig, SAMPLE_IMAGES, DEFAULT_CONFIG } from './types'
import { ImageCanvas } from './components/ImageCanvas'
import { TunerHUD } from './components/TunerHUD'
import { ImageSelector } from './components/ImageSelector'
import './App.css'

export function App() {
  const [images, setImages] = useState<ImageItem[]>(SAMPLE_IMAGES)

  // Initialize from URL search params if present
  const [activeImageId, setActiveImageId] = useState<string>(() => {
    try {
      const p = new URLSearchParams(window.location.search).get('image')
      if (p && SAMPLE_IMAGES.some((s) => s.id === p)) return p
    } catch {}
    return 'lucy-heaven'
  })

  // Configurations map by image ID
  const [configs, setConfigs] = useState<Record<string, ImageConfig>>(() => {
    const initial: Record<string, ImageConfig> = {}
    for (const img of SAMPLE_IMAGES) {
      initial[img.id] = {
        ...DEFAULT_CONFIG,
        ...(img.defaultConfig || {}),
      }
    }
    return initial
  })

  // Display toggles
  const [showViewfinder, setShowViewfinder] = useState(true)
  const [showGrid, setShowGrid] = useState(() => {
    try {
      return new URLSearchParams(window.location.search).get('grid') === '1'
    } catch {
      return false
    }
  })
  const [dragMode, setDragMode] = useState(true)
  const [isSettingOrigin, setIsSettingOrigin] = useState(false)
  const [hudVisible, setHudVisible] = useState(() => {
    try {
      return new URLSearchParams(window.location.search).get('hud') !== '0'
    } catch {
      return true
    }
  })

  const activeImage = images.find((i) => i.id === activeImageId) || images[0]
  const currentConfig = configs[activeImage.id] || DEFAULT_CONFIG

  const updateConfig = useCallback(
    (updater: (prev: ImageConfig) => ImageConfig) => {
      setConfigs((all) => {
        const prev = all[activeImage.id] || DEFAULT_CONFIG
        const nextVal = updater(prev)
        return {
          ...all,
          [activeImage.id]: nextVal,
        }
      })
    },
    [activeImage.id],
  )

  const resetConfig = useCallback(() => {
    updateConfig(() => ({
      ...DEFAULT_CONFIG,
      ...(activeImage.defaultConfig || {}),
    }))
  }, [activeImage, updateConfig])

  const handleAddCustomImage = (item: ImageItem) => {
    setImages((prev) => [...prev, item])
    setConfigs((prev) => ({
      ...prev,
      [item.id]: {
        ...DEFAULT_CONFIG,
        ...(item.defaultConfig || {}),
      },
    }))
    setActiveImageId(item.id)
  }

  // Global keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + Shift + L toggles HUD
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.code === 'KeyL') {
        e.preventDefault()
        setHudVisible((v) => !v)
      }
      // Space + drag toggle or V for viewfinder
      if (e.code === 'KeyV' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        setShowViewfinder((v) => !v)
      }
      // M for mirror flip
      if (e.code === 'KeyM' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        updateConfig((p) => ({ ...p, mirror: !p.mirror }))
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <div className="sit-app">
      {/* Top Application Bar */}
      <header className="sit-header">
        <div className="sit-brand">
          <div className="sit-brand-dot" />
          <span className="sit-brand-title">SKILL IMAGE TUNER</span>
          <span className="sit-brand-badge">v1.0</span>
        </div>

        {/* Center: Image Selector */}
        <div className="sit-selector-wrap">
          <ImageSelector
            images={images}
            activeImageId={activeImageId}
            onSelectImage={setActiveImageId}
            onAddCustomImage={handleAddCustomImage}
          />
        </div>

        {/* Right: Actions */}
        <div className="sit-header-actions">
          <button
            type="button"
            className="sit-btn-ghost"
            onClick={() => setHudVisible((v) => !v)}
            title="Toggle Tuner HUD (Cmd+Shift+L)"
          >
            {hudVisible ? 'Hide HUD' : 'Show HUD'}
          </button>
          <a
            href="https://github.com/gaia-research/skill-image-tuner"
            target="_blank"
            rel="noopener noreferrer"
            className="sit-btn-github"
          >
            GitHub
          </a>
        </div>
      </header>

      {/* Main Interactive Stage */}
      <main className="sit-main">
        <ImageCanvas
          image={activeImage}
          config={currentConfig}
          onChangeConfig={updateConfig}
          showViewfinder={showViewfinder}
          showGrid={showGrid}
          dragMode={dragMode}
          isSettingOrigin={isSettingOrigin}
          onOriginSet={() => setIsSettingOrigin(false)}
        />

        {/* Floating Tuner HUD */}
        {hudVisible && (
          <TunerHUD
            image={activeImage}
            config={currentConfig}
            onChangeConfig={updateConfig}
            onReset={resetConfig}
            showViewfinder={showViewfinder}
            onToggleViewfinder={() => setShowViewfinder((v) => !v)}
            showGrid={showGrid}
            onToggleGrid={() => setShowGrid((g) => !g)}
            dragMode={dragMode}
            onToggleDragMode={() => setDragMode((d) => !d)}
            isSettingOrigin={isSettingOrigin}
            onToggleSettingOrigin={() => setIsSettingOrigin((s) => !s)}
          />
        )}
      </main>

      {/* Bottom Status Bar */}
      <footer className="sit-footer">
        <div className="sit-status-left">
          <span>Active: <strong>{activeImage.name}</strong></span>
          <span className="sit-dot">·</span>
          <span>Zoom: <strong>{currentConfig.zoom.toFixed(2)}×</strong></span>
          <span className="sit-dot">·</span>
          <span>Offset: <strong>{currentConfig.x > 0 ? '+' : ''}{currentConfig.x.toFixed(2)}vh, {currentConfig.y > 0 ? '+' : ''}{currentConfig.y.toFixed(2)}vh</strong></span>
          <span className="sit-dot">·</span>
          <span>Rot: <strong>{currentConfig.rotation.toFixed(1)}°</strong></span>
          <span className="sit-dot">·</span>
          <span>Mirror: <strong>{currentConfig.mirror ? 'ON' : 'OFF'}</strong></span>
          <span className="sit-dot">·</span>
          <span>Origin: <strong>{currentConfig.origin}</strong></span>
        </div>
        <div className="sit-status-right">
          <span>Drag edges to resize · ↻ knob / 2-finger rotate · Pinch zoom · M mirror · Cmd+Shift+L toggle HUD</span>
        </div>
      </footer>
    </div>
  )
}

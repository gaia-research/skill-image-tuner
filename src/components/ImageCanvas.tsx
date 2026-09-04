import React, { useRef, useEffect, useCallback } from 'react'
import { ImageConfig, ImageItem } from '../types'

interface ImageCanvasProps {
  image: ImageItem
  config: ImageConfig
  onChangeConfig: (updater: (prev: ImageConfig) => ImageConfig) => void
  showViewfinder: boolean
  showGrid: boolean
  dragMode: boolean
  isSettingOrigin: boolean
  onOriginSet?: () => void
}

export function ImageCanvas({
  image,
  config,
  onChangeConfig,
  showViewfinder,
  showGrid,
  dragMode,
  isSettingOrigin,
  onOriginSet,
}: ImageCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const isDraggingRef = useRef(false)
  const dragStartRef = useRef({ clientX: 0, clientY: 0, startX: 0, startY: 0 })

  // Trackpad pinch gesture (wheel with ctrlKey)
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const isDesktopTrackpad = () => {
      try {
        return window.matchMedia('(pointer: fine)').matches && navigator.maxTouchPoints === 0
      } catch {
        return true
      }
    }

    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return
      if (!isDesktopTrackpad()) return

      e.preventDefault()
      const factor = Math.exp(-e.deltaY * 0.01)
      onChangeConfig((prev) => {
        const nextZoom = Math.min(5.0, Math.max(0.1, Number((prev.zoom * factor).toFixed(3))))
        return { ...prev, zoom: nextZoom }
      })
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      el.removeEventListener('wheel', onWheel)
    }
  }, [onChangeConfig])

  // Drag to pan
  const onPointerDown = (e: React.PointerEvent) => {
    if (isSettingOrigin) {
      // Calculate origin relative to the image element
      const imgEl = e.currentTarget.querySelector('img')
      if (imgEl) {
        const rect = imgEl.getBoundingClientRect()
        const clickX = e.clientX - rect.left
        const clickY = e.clientY - rect.top
        const pctX = Math.round(Math.max(0, Math.min(100, (clickX / rect.width) * 100)))
        const pctY = Math.round(Math.max(0, Math.min(100, (clickY / rect.height) * 100)))
        onChangeConfig((p) => ({ ...p, origin: `${pctX}% ${pctY}%` }))
        onOriginSet?.()
      }
      return
    }

    if (!dragMode) return
    isDraggingRef.current = true
    dragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      startX: config.x,
      startY: config.y,
    }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return
    const dx = e.clientX - dragStartRef.current.clientX
    const dy = e.clientY - dragStartRef.current.clientY
    const vhInPx = window.innerHeight / 100

    const nextX = Number((dragStartRef.current.startX + dx / vhInPx).toFixed(2))
    const nextY = Number((dragStartRef.current.startY + dy / vhInPx).toFixed(2))

    onChangeConfig((p) => ({ ...p, x: nextX, y: nextY }))
  }

  const onPointerUp = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return
    isDraggingRef.current = false
    try {
      ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
    } catch {}
  }

  const onDoubleClick = () => {
    onChangeConfig((p) => ({ ...p, zoom: 1.0, x: 0, y: 0 }))
  }

  return (
    <div
      ref={containerRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onDoubleClick={onDoubleClick}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        background: '#0a0d14',
        backgroundImage: `
          radial-gradient(circle at 50% 50%, rgba(95, 194, 214, 0.04) 0%, transparent 70%),
          linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px)
        `,
        backgroundSize: '100% 100%, 40px 40px, 40px 40px',
        cursor: isSettingOrigin ? 'crosshair' : dragMode ? 'grab' : 'default',
        userSelect: 'none',
      }}
    >
      {/* Rule of Thirds Grid */}
      {showGrid && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gridTemplateRows: '1fr 1fr 1fr',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            zIndex: 2,
          }}
        >
          <div style={{ borderRight: '1px dashed rgba(255, 255, 255, 0.1)', borderBottom: '1px dashed rgba(255, 255, 255, 0.1)' }} />
          <div style={{ borderRight: '1px dashed rgba(255, 255, 255, 0.1)', borderBottom: '1px dashed rgba(255, 255, 255, 0.1)' }} />
          <div style={{ borderBottom: '1px dashed rgba(255, 255, 255, 0.1)' }} />
          <div style={{ borderRight: '1px dashed rgba(255, 255, 255, 0.1)', borderBottom: '1px dashed rgba(255, 255, 255, 0.1)' }} />
          <div style={{ borderRight: '1px dashed rgba(255, 255, 255, 0.1)', borderBottom: '1px dashed rgba(255, 255, 255, 0.1)' }} />
          <div style={{ borderBottom: '1px dashed rgba(255, 255, 255, 0.1)' }} />
          <div style={{ borderRight: '1px dashed rgba(255, 255, 255, 0.1)' }} />
          <div style={{ borderRight: '1px dashed rgba(255, 255, 255, 0.1)' }} />
          <div />
        </div>
      )}

      {/* Target Image Anchor & Layer */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          bottom: 0,
          height: '90vh',
          transform: `translate(calc(-50% + ${config.x}vh), ${config.y}vh)`,
          transformOrigin: 'bottom center',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      >
        <img
          src={image.src}
          alt={image.name}
          draggable={false}
          style={{
            display: 'block',
            height: '100%',
            width: 'auto',
            transformOrigin: config.origin,
            transform: `scale(${config.zoom}) rotate(${config.rotation}deg)`,
            opacity: config.opacity,
            imageRendering: 'high-quality' as any,
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        />

        {/* Origin Target Marker */}
        <div
          style={{
            position: 'absolute',
            left: config.origin.split(' ')[0],
            top: config.origin.split(' ')[1],
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
            zIndex: 5,
            display: isSettingOrigin || showViewfinder ? 'flex' : 'none',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: '18px',
              height: '18px',
              borderRadius: '50%',
              border: '2px solid #5FC2D6',
              boxShadow: '0 0 10px #5FC2D6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#5FC2D6' }} />
          </div>
          <span
            style={{
              position: 'absolute',
              top: '-20px',
              background: 'rgba(0,0,0,0.85)',
              color: '#5FC2D6',
              fontSize: '10px',
              fontFamily: 'monospace',
              padding: '1px 5px',
              borderRadius: '3px',
              border: '1px solid rgba(95,194,214,0.4)',
              whiteSpace: 'nowrap',
            }}
          >
            {config.origin}
          </span>
        </div>
      </div>

      {/* Viewfinder Bounding Box Overlay */}
      {showViewfinder && (
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: 'min(75vh, 85vw)',
            height: 'min(75vh, 85vw)',
            border: '1.5px dashed rgba(95, 194, 214, 0.45)',
            borderRadius: '6px',
            pointerEvents: 'none',
            zIndex: 3,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '12px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#5FC2D6', fontSize: '14px', fontWeight: 'bold' }}>┌</span>
            <span
              style={{
                background: 'rgba(0,0,0,0.8)',
                color: '#5FC2D6',
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '10px',
                fontFamily: 'monospace',
                border: '1px solid rgba(95,194,214,0.3)',
              }}
            >
              ✥ VIEWPORT FRAME · Drag to Pan · Pinch to Zoom
            </span>
            <span style={{ color: '#5FC2D6', fontSize: '14px', fontWeight: 'bold' }}>┐</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#5FC2D6', fontSize: '14px', fontWeight: 'bold' }}>└</span>
            <span
              style={{
                background: 'rgba(0,0,0,0.8)',
                color: '#EAE8E3',
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '10px',
                fontFamily: 'monospace',
              }}
            >
              Zoom: {config.zoom.toFixed(2)}× · X: {config.x > 0 ? '+' : ''}{config.x.toFixed(2)}vh · Y: {config.y > 0 ? '+' : ''}{config.y.toFixed(2)}vh
            </span>
            <span style={{ color: '#5FC2D6', fontSize: '14px', fontWeight: 'bold' }}>┘</span>
          </div>
        </div>
      )}
    </div>
  )
}

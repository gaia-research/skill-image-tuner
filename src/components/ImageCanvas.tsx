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

  // Viewfinder edge/corner resize handles
  const boxRef = useRef<HTMLDivElement>(null)
  const isResizingRef = useRef<boolean>(false)
  const resizeStartRef = useRef({ clientX: 0, clientY: 0, startZoom: 1, cx: 0, cy: 0, r0: 1 })

  // Viewfinder rotation knob
  const isRotatingRef = useRef<boolean>(false)
  const rotStartRef = useRef({ cx: 0, cy: 0, startAngle: 0, initialRot: 0 })

  const startResize = (e: React.PointerEvent) => {
    e.stopPropagation()
    e.preventDefault()
    isResizingRef.current = true
    const rect = boxRef.current?.getBoundingClientRect()
    const cx = rect ? rect.left + rect.width / 2 : window.innerWidth / 2
    const cy = rect ? rect.top + rect.height / 2 : window.innerHeight / 2
    const r0 = Math.max(20, Math.hypot(e.clientX - cx, e.clientY - cy))

    resizeStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      startZoom: config.zoom,
      cx,
      cy,
      r0,
    }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }

  const onResizeMove = (e: React.PointerEvent) => {
    if (!isResizingRef.current) return
    e.stopPropagation()
    const { cx, cy, r0, startZoom } = resizeStartRef.current
    const r = Math.hypot(e.clientX - cx, e.clientY - cy)
    const factor = r / r0
    const nextZoom = Math.min(5.0, Math.max(0.1, Number((startZoom * factor).toFixed(3))))
    onChangeConfig((prev) => ({ ...prev, zoom: nextZoom }))
  }

  const stopResize = (e: React.PointerEvent) => {
    if (!isResizingRef.current) return
    isResizingRef.current = false
    try {
      ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
    } catch {}
  }

  const startRotate = (e: React.PointerEvent) => {
    e.stopPropagation()
    e.preventDefault()
    isRotatingRef.current = true
    const rect = boxRef.current?.getBoundingClientRect()
    const cx = rect ? rect.left + rect.width / 2 : window.innerWidth / 2
    const cy = rect ? rect.top + rect.height / 2 : window.innerHeight / 2
    const startAngle = (Math.atan2(e.clientY - cy, e.clientX - cx) * 180) / Math.PI

    rotStartRef.current = { cx, cy, startAngle, initialRot: config.rotation }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }

  const onRotateMove = (e: React.PointerEvent) => {
    if (!isRotatingRef.current) return
    e.stopPropagation()
    const { cx, cy, startAngle, initialRot } = rotStartRef.current
    const currentAngle = (Math.atan2(e.clientY - cy, e.clientX - cx) * 180) / Math.PI
    const delta = currentAngle - startAngle
    let nextRot = Number((((initialRot + delta + 180) % 360) - 180).toFixed(1))
    if (Math.abs(nextRot) < 2) nextRot = 0
    if (Math.abs(nextRot - 90) < 2) nextRot = 90
    if (Math.abs(nextRot + 90) < 2) nextRot = -90
    if (Math.abs(Math.abs(nextRot) - 180) < 2) nextRot = 180

    onChangeConfig((prev) => ({ ...prev, rotation: nextRot }))
  }

  const stopRotate = (e: React.PointerEvent) => {
    if (!isRotatingRef.current) return
    isRotatingRef.current = false
    try {
      ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
    } catch {}
  }

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

  // Touchscreen two-finger pinch-to-zoom and rotate
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    let touchStartDist = 0
    let touchStartAngle = 0
    let initialZoom = 1
    let initialRot = 0

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault()
        const t1 = e.touches[0]
        const t2 = e.touches[1]
        touchStartDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY)
        touchStartAngle = (Math.atan2(t2.clientY - t1.clientY, t2.clientX - t1.clientX) * 180) / Math.PI
        initialZoom = config.zoom
        initialRot = config.rotation
      }
    }

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && touchStartDist > 0) {
        e.preventDefault()
        const t1 = e.touches[0]
        const t2 = e.touches[1]
        const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY)
        const angle = (Math.atan2(t2.clientY - t1.clientY, t2.clientX - t1.clientX) * 180) / Math.PI
        const scaleFactor = dist / touchStartDist
        const deltaAngle = angle - touchStartAngle

        const nextZoom = Math.min(5.0, Math.max(0.1, Number((initialZoom * scaleFactor).toFixed(3))))
        const nextRot = Number((((initialRot + deltaAngle + 180) % 360) - 180).toFixed(1))

        onChangeConfig((prev) => ({ ...prev, zoom: nextZoom, rotation: nextRot }))
      }
    }

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        touchStartDist = 0
      }
    }

    el.addEventListener('touchstart', onTouchStart, { passive: false })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend', onTouchEnd)
    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
    }
  }, [config.rotation, config.zoom, onChangeConfig])

  // Safari gesture trackpad rotate
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    let startRot = 0
    const onGestureStart = (e: any) => {
      e.preventDefault()
      startRot = config.rotation
    }
    const onGestureChange = (e: any) => {
      e.preventDefault()
      const nextRot = Number((((startRot + e.rotation + 180) % 360) - 180).toFixed(1))
      onChangeConfig((prev) => ({ ...prev, rotation: nextRot }))
    }

    el.addEventListener('gesturestart', onGestureStart)
    el.addEventListener('gesturechange', onGestureChange)
    return () => {
      el.removeEventListener('gesturestart', onGestureStart)
      el.removeEventListener('gesturechange', onGestureChange)
    }
  }, [config.rotation, onChangeConfig])

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
            transform: `scale(${config.zoom}) rotate(${config.rotation}deg) scaleX(${config.mirror ? -1 : 1})`,
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

      {/* Viewfinder Bounding Box Overlay with Interactive Edge & Corner Resizing */}
      {showViewfinder && (
        <div
          ref={boxRef}
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
          {/* Top Edge Resize Strip + Center Grip */}
          <div
            onPointerDown={startResize}
            onPointerMove={onResizeMove}
            onPointerUp={stopResize}
            onPointerCancel={stopResize}
            style={{
              position: 'absolute',
              top: '-8px',
              left: '16px',
              right: '16px',
              height: '16px',
              cursor: 'ns-resize',
              pointerEvents: 'auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Drag edge to resize zoom"
          >
            <div
              style={{
                width: '36px',
                height: '5px',
                borderRadius: '3px',
                background: '#5FC2D6',
                boxShadow: '0 0 8px rgba(95,194,214,0.6)',
                opacity: 0.75,
              }}
            />
          </div>

          {/* Bottom Edge Resize Strip + Center Grip */}
          <div
            onPointerDown={startResize}
            onPointerMove={onResizeMove}
            onPointerUp={stopResize}
            onPointerCancel={stopResize}
            style={{
              position: 'absolute',
              bottom: '-8px',
              left: '16px',
              right: '16px',
              height: '16px',
              cursor: 'ns-resize',
              pointerEvents: 'auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Drag edge to resize zoom"
          >
            <div
              style={{
                width: '36px',
                height: '5px',
                borderRadius: '3px',
                background: '#5FC2D6',
                boxShadow: '0 0 8px rgba(95,194,214,0.6)',
                opacity: 0.75,
              }}
            />
          </div>

          {/* Left Edge Resize Strip + Center Grip */}
          <div
            onPointerDown={startResize}
            onPointerMove={onResizeMove}
            onPointerUp={stopResize}
            onPointerCancel={stopResize}
            style={{
              position: 'absolute',
              left: '-8px',
              top: '16px',
              bottom: '16px',
              width: '16px',
              cursor: 'ew-resize',
              pointerEvents: 'auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Drag edge to resize zoom"
          >
            <div
              style={{
                width: '5px',
                height: '36px',
                borderRadius: '3px',
                background: '#5FC2D6',
                boxShadow: '0 0 8px rgba(95,194,214,0.6)',
                opacity: 0.75,
              }}
            />
          </div>

          {/* Right Edge Resize Strip + Center Grip */}
          <div
            onPointerDown={startResize}
            onPointerMove={onResizeMove}
            onPointerUp={stopResize}
            onPointerCancel={stopResize}
            style={{
              position: 'absolute',
              right: '-8px',
              top: '16px',
              bottom: '16px',
              width: '16px',
              cursor: 'ew-resize',
              pointerEvents: 'auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Drag edge to resize zoom"
          >
            <div
              style={{
                width: '5px',
                height: '36px',
                borderRadius: '3px',
                background: '#5FC2D6',
                boxShadow: '0 0 8px rgba(95,194,214,0.6)',
                opacity: 0.75,
              }}
            />
          </div>

          {/* Top-Left Corner Handle */}
          <div
            onPointerDown={startResize}
            onPointerMove={onResizeMove}
            onPointerUp={stopResize}
            onPointerCancel={stopResize}
            style={{
              position: 'absolute',
              top: '-8px',
              left: '-8px',
              width: '16px',
              height: '16px',
              borderRadius: '3px',
              background: '#0a0d14',
              border: '2px solid #5FC2D6',
              boxShadow: '0 0 8px #5FC2D6',
              cursor: 'nwse-resize',
              pointerEvents: 'auto',
            }}
            title="Drag corner to resize zoom"
          />

          {/* Top-Right Corner Handle */}
          <div
            onPointerDown={startResize}
            onPointerMove={onResizeMove}
            onPointerUp={stopResize}
            onPointerCancel={stopResize}
            style={{
              position: 'absolute',
              top: '-8px',
              right: '-8px',
              width: '16px',
              height: '16px',
              borderRadius: '3px',
              background: '#0a0d14',
              border: '2px solid #5FC2D6',
              boxShadow: '0 0 8px #5FC2D6',
              cursor: 'nesw-resize',
              pointerEvents: 'auto',
            }}
            title="Drag corner to resize zoom"
          />

          {/* Bottom-Left Corner Handle */}
          <div
            onPointerDown={startResize}
            onPointerMove={onResizeMove}
            onPointerUp={stopResize}
            onPointerCancel={stopResize}
            style={{
              position: 'absolute',
              bottom: '-8px',
              left: '-8px',
              width: '16px',
              height: '16px',
              borderRadius: '3px',
              background: '#0a0d14',
              border: '2px solid #5FC2D6',
              boxShadow: '0 0 8px #5FC2D6',
              cursor: 'nesw-resize',
              pointerEvents: 'auto',
            }}
            title="Drag corner to resize zoom"
          />

          {/* Bottom-Right Corner Handle */}
          <div
            onPointerDown={startResize}
            onPointerMove={onResizeMove}
            onPointerUp={stopResize}
            onPointerCancel={stopResize}
            style={{
              position: 'absolute',
              bottom: '-8px',
              right: '-8px',
              width: '16px',
              height: '16px',
              borderRadius: '3px',
              background: '#0a0d14',
              border: '2px solid #5FC2D6',
              boxShadow: '0 0 8px #5FC2D6',
              cursor: 'nwse-resize',
              pointerEvents: 'auto',
            }}
            title="Drag corner to resize zoom"
          />

          {/* Rotation Handle Knob (Top Center) */}
          <div
            style={{
              position: 'absolute',
              top: '-32px',
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              pointerEvents: 'none',
            }}
          >
            <div
              onPointerDown={startRotate}
              onPointerMove={onRotateMove}
              onPointerUp={stopRotate}
              onPointerCancel={stopRotate}
              style={{
                width: '22px',
                height: '22px',
                borderRadius: '50%',
                background: '#0a0d14',
                border: '2px solid #5FC2D6',
                boxShadow: '0 0 10px rgba(95,194,214,0.7)',
                cursor: 'grab',
                pointerEvents: 'auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#5FC2D6',
                fontSize: '11px',
                fontWeight: 'bold',
                userSelect: 'none',
              }}
              title="Drag to rotate image angle"
            >
              ↻
            </div>
            <div
              style={{
                width: '1.5px',
                height: '10px',
                background: '#5FC2D6',
                opacity: 0.8,
              }}
            />
          </div>

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
              ✥ VIEWPORT FRAME · Drag Edges to Resize · ↻ Rotate · {config.mirror ? '🪞 Mirrored' : 'Standard'}
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
              Zoom: {config.zoom.toFixed(2)}× · X: {config.x > 0 ? '+' : ''}{config.x.toFixed(2)}vh · Y: {config.y > 0 ? '+' : ''}{config.y.toFixed(2)}vh · Rot: {config.rotation.toFixed(1)}° {config.mirror ? '· ⇄ Mirrored' : ''}
            </span>
            <span style={{ color: '#5FC2D6', fontSize: '14px', fontWeight: 'bold' }}>┘</span>
          </div>
        </div>
      )}
    </div>
  )
}

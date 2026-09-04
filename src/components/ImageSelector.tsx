import React, { useRef } from 'react'
import { ImageItem } from '../types'

interface ImageSelectorProps {
  images: ImageItem[]
  activeImageId: string
  onSelectImage: (id: string) => void
  onAddCustomImage: (item: ImageItem) => void
}

export function ImageSelector({
  images,
  activeImageId,
  onSelectImage,
  onAddCustomImage,
}: ImageSelectorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      const src = reader.result as string
      const newItem: ImageItem = {
        id: `custom-${Date.now()}`,
        name: file.name.replace(/\.[^/.]+$/, ''),
        category: 'custom',
        src,
        defaultConfig: { zoom: 1.0, x: 0, y: 0, origin: '50% 50%' },
        description: `Uploaded file: ${file.name}`,
      }
      onAddCustomImage(newItem)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const handleUrlPrompt = () => {
    const url = window.prompt('Enter public image URL:')
    if (!url || !url.trim()) return

    const name = url.split('/').pop()?.split('?')[0] || 'Web Image'
    const newItem: ImageItem = {
      id: `url-${Date.now()}`,
      name,
      category: 'custom',
      src: url.trim(),
      defaultConfig: { zoom: 1.0, x: 0, y: 0, origin: '50% 50%' },
      description: `Loaded from URL: ${url}`,
    }
    onAddCustomImage(newItem)
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        overflowX: 'auto',
        padding: '6px 12px',
        background: 'rgba(15, 18, 25, 0.8)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '8px',
        userSelect: 'none',
      }}
    >
      <span
        style={{
          fontSize: '10px',
          fontWeight: 'bold',
          color: '#888',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
        }}
      >
        SELECT IMAGE:
      </span>

      {/* Preset / Image Pills */}
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
        {images.map((img) => {
          const isSel = img.id === activeImageId
          return (
            <button
              key={img.id}
              type="button"
              onClick={() => onSelectImage(img.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: '6px',
                border: isSel ? '1px solid #5FC2D6' : '1px solid rgba(255, 255, 255, 0.12)',
                background: isSel ? 'rgba(95, 194, 214, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                color: isSel ? '#5FC2D6' : '#ccc',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: '11px',
                fontWeight: isSel ? 'bold' : 'normal',
                transition: 'all 140ms ease',
                whiteSpace: 'nowrap',
                boxShadow: isSel ? '0 0 12px rgba(95, 194, 214, 0.25)' : 'none',
              }}
            >
              <img
                src={img.src}
                alt=""
                style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '3px',
                  objectFit: 'cover',
                  background: '#000',
                }}
              />
              <span>{img.name}</span>
            </button>
          )
        })}
      </div>

      {/* Separator */}
      <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.12)', margin: '0 4px' }} />

      {/* Upload Custom Image */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        style={{ display: 'none' }}
      />

      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          padding: '4px 10px',
          borderRadius: '6px',
          border: '1px dashed rgba(255, 255, 255, 0.25)',
          background: 'rgba(255, 255, 255, 0.03)',
          color: '#aaa',
          cursor: 'pointer',
          fontFamily: 'inherit',
          fontSize: '11px',
          whiteSpace: 'nowrap',
        }}
        title="Upload your own image from disk"
      >
        <span>+ Upload File</span>
      </button>

      <button
        type="button"
        onClick={handleUrlPrompt}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          padding: '4px 10px',
          borderRadius: '6px',
          border: '1px dashed rgba(255, 255, 255, 0.25)',
          background: 'rgba(255, 255, 255, 0.03)',
          color: '#aaa',
          cursor: 'pointer',
          fontFamily: 'inherit',
          fontSize: '11px',
          whiteSpace: 'nowrap',
        }}
        title="Load image from a web URL"
      >
        <span>🔗 From URL</span>
      </button>
    </div>
  )
}

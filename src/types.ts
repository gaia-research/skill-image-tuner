export interface ImageConfig {
  zoom: number // Scale multiplier (1.0 = 100%)
  x: number // Horizontal offset in vh
  y: number // Vertical offset in vh
  origin: string // CSS transform-origin, e.g. '49% 27%' or '50% 50%'
  rotation: number // Degrees (-180 to +180)
  opacity: number // 0.0 to 1.0
}

export interface ImageItem {
  id: string
  name: string
  category: 'sample' | 'custom'
  src: string
  defaultConfig?: Partial<ImageConfig>
  aspectRatio?: string
  description?: string
}

export const DEFAULT_CONFIG: ImageConfig = {
  zoom: 1.0,
  x: 0,
  y: 0,
  origin: '50% 50%',
  rotation: 0,
  opacity: 1.0,
}

export const SAMPLE_IMAGES: ImageItem[] = [
  {
    id: 'lucy-heaven',
    name: 'Lucy: Heaven (V5)',
    category: 'sample',
    src: '/samples/lucy-heaven.webp',
    defaultConfig: { zoom: 1.59, x: -3.25, y: -1.63, origin: '49% 27%' },
    description: 'Convergent cyan motif with face-anchored framing at 49% 27%',
  },
  {
    id: 'lucy-zero',
    name: 'Lucy: Zero (V5)',
    category: 'sample',
    src: '/samples/lucy-zero.webp',
    defaultConfig: { zoom: 1.5, x: 1.2, y: 2.0, origin: '47% 30%' },
    description: 'Monochrome floor motif with katana framing at 47% 30%',
  },
  {
    id: 'lucy-hell',
    name: 'Lucy: Hell (V5)',
    category: 'sample',
    src: '/samples/lucy-hell.webp',
    defaultConfig: { zoom: 1.5, x: 1.8, y: 2.0, origin: '47% 30%' },
    description: 'Exploratory crimson motif framing at 47% 30%',
  },
  {
    id: 'lucy-ultra',
    name: 'Lucy: Ultra (V5)',
    category: 'sample',
    src: '/samples/lucy-ultra.webp',
    defaultConfig: { zoom: 1.4, x: 3.2, y: 3.0, origin: '45% 24%' },
    description: 'Entropy apex gold motif framing at 45% 24%',
  },
  {
    id: 'brand-logo',
    name: 'Skill Heaven Logo',
    category: 'sample',
    src: '/samples/skill-heaven-logo.png',
    defaultConfig: { zoom: 1.0, x: 0, y: 0, origin: '50% 50%' },
    description: 'Skill Heaven brand emblem',
  },
]

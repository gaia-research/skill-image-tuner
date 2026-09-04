export interface ImageConfig {
  zoom: number // Scale multiplier (1.0 = 100%)
  x: number // Horizontal offset in vh
  y: number // Vertical offset in vh
  origin: string // CSS transform-origin, e.g. '49% 27%' or '50% 50%'
  rotation: number // Degrees (-180 to +180)
  mirror: boolean // Horizontal flip (scaleX(-1))
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
  mirror: false,
  opacity: 1.0,
}

export const SAMPLE_IMAGES: ImageItem[] = [
  {
    id: 'gaia-skill-tree',
    name: 'Gaia Skill Tree (Yggdrasil)',
    category: 'sample',
    src: '/samples/gaia-skill-tree.webp',
    defaultConfig: { zoom: 1.0, x: 0, y: 0, origin: '50% 50%' },
    description: 'Gaia Skill Tree canonical golden Yggdrasil backdrop',
  },
  {
    id: 'sample-avatar',
    name: 'Sample: Avatar (Portrait)',
    category: 'sample',
    src: '/samples/avatar.svg',
    defaultConfig: { zoom: 1.0, x: 0, y: 0, origin: '50% 36%' },
    description: 'Minimal vector portrait placeholder with face anchor',
  },
  {
    id: 'sample-card',
    name: 'Sample: Card (Landscape 16:9)',
    category: 'sample',
    src: '/samples/card.svg',
    defaultConfig: { zoom: 1.0, x: 0, y: 0, origin: '50% 50%' },
    description: 'Minimal 16:9 banner card placeholder',
  },
  {
    id: 'sample-badge',
    name: 'Sample: Badge (Geometric)',
    category: 'sample',
    src: '/samples/badge.svg',
    defaultConfig: { zoom: 1.0, x: 0, y: 0, origin: '50% 50%' },
    description: 'Minimal emblem star badge placeholder',
  },
]

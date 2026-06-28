/**
 * Presentation metadata for each activity category — an icon and a colour pair
 * so categories read at a glance across cards, filters and kid interests.
 * Purely visual; the source of truth for the category list stays in types.ts.
 */
import type { Category } from '../types'

export interface CategoryMeta {
  label: string
  icon: string
  /** Text/― accent colour. */
  color: string
  /** Soft tint background. */
  bg: string
}

export const CATEGORY_META: Record<Category, CategoryMeta> = {
  physical: { label: 'Physical', icon: '🏃', color: '#c2410c', bg: '#fff1e6' },
  craft: { label: 'Craft', icon: '🎨', color: '#9333ea', bg: '#f6ecfe' },
  music: { label: 'Music', icon: '🎵', color: '#db2777', bg: '#fdebf4' },
  outdoors: { label: 'Outdoors', icon: '🌳', color: '#15803d', bg: '#e8f6ec' },
  educational: { label: 'Educational', icon: '📚', color: '#1d4ed8', bg: '#e8f0fe' },
  performing: { label: 'Performing', icon: '🎭', color: '#b91c1c', bg: '#fdeaea' },
  science: { label: 'Science', icon: '🔬', color: '#0e7490', bg: '#e3f4f7' },
  social: { label: 'Social', icon: '👋', color: '#a16207', bg: '#fbf3df' }
}

/** A stable, muted avatar colour derived from a kid's name. */
const AVATAR_COLORS = [
  '#3f6f68', '#5b5f8a', '#8a5b73', '#9a6b4a',
  '#4a6d8a', '#5a7a55', '#8a7340', '#4f7a7d'
]

export function avatarColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}

export function initial(name: string): string {
  return (name.trim()[0] || '?').toUpperCase()
}

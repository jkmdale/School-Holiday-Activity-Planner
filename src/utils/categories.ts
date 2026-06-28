/**
 * Presentation metadata for each activity category — an icon and a colour pair
 * so categories read at a glance across cards, filters and kid interests.
 * Purely visual; the source of truth for the category list stays in types.ts.
 */
import type { Category } from '../types'

export interface CategoryMeta {
  label: string
  /** Icon name in Icon.vue. */
  icon: string
  /** Readable text colour on the soft tint. */
  color: string
  /** Soft tint background (brand palette). */
  bg: string
}

// Grouped to the brand palette: coral (active), sage (outdoors/people),
// sky (learning), peach (craft), butter (music). Text colours are darkened so
// every label clears WCAG AA (≥4.5:1) on its soft tint.
export const CATEGORY_META: Record<Category, CategoryMeta> = {
  physical: { label: 'Physical', icon: 'activity', color: '#b04331', bg: '#ffe4dd' },
  performing: { label: 'Performing', icon: 'star', color: '#b44532', bg: '#ffeae3' },
  craft: { label: 'Craft', icon: 'scissors', color: '#9b5b26', bg: '#ffecd9' },
  music: { label: 'Music', icon: 'music', color: '#89670e', bg: '#fff3d4' },
  outdoors: { label: 'Outdoors', icon: 'tree', color: '#4c7447', bg: '#e7f1e5' },
  social: { label: 'Social', icon: 'users', color: '#4d7749', bg: '#edf4eb' },
  educational: { label: 'Educational', icon: 'book', color: '#39709d', bg: '#e5f1fb' },
  science: { label: 'Science', icon: 'flask', color: '#3a72a0', bg: '#eef6fd' }
}

/** A stable, warm avatar colour (brand palette) derived from a kid's name. */
const AVATAR_COLORS = [
  '#FF7A6B', '#E8943B', '#6FA368', '#4F9CC9',
  '#E2685E', '#C79A2E', '#5C97B0', '#D98E5A'
]

export function avatarColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}

export function initial(name: string): string {
  return (name.trim()[0] || '?').toUpperCase()
}

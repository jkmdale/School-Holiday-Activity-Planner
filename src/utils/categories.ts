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
// sky (learning), peach (craft), butter (music).
export const CATEGORY_META: Record<Category, CategoryMeta> = {
  physical: { label: 'Physical', icon: 'activity', color: '#d1503a', bg: '#ffe4dd' },
  performing: { label: 'Performing', icon: 'star', color: '#d1503a', bg: '#ffeae3' },
  craft: { label: 'Craft', icon: 'scissors', color: '#c2722f', bg: '#ffecd9' },
  music: { label: 'Music', icon: 'music', color: '#b08412', bg: '#fff3d4' },
  outdoors: { label: 'Outdoors', icon: 'tree', color: '#5a8a55', bg: '#e7f1e5' },
  social: { label: 'Social', icon: 'users', color: '#5a8a55', bg: '#edf4eb' },
  educational: { label: 'Educational', icon: 'book', color: '#3f7cae', bg: '#e5f1fb' },
  science: { label: 'Science', icon: 'flask', color: '#3f7cae', bg: '#eef6fd' }
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

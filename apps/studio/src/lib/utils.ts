import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Computes display-safe style values for a rarity hex color.
 * When the color is very light (e.g. white for Common rarity),
 * it returns muted neutral values so text and borders remain visible
 * against any background instead of blending in.
 */
export function getRarityStyle(hexColor: string | null | undefined) {
  const color = (hexColor || '#6b7280').trim()
  const hex = color.replace('#', '')

  let luminance = 0
  if (hex.length === 6) {
    const r = parseInt(hex.substring(0, 2), 16)
    const g = parseInt(hex.substring(2, 4), 16)
    const b = parseInt(hex.substring(4, 6), 16)
    luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  }

  const isLight = luminance > 0.72

  return {
    color,
    isLight,
    /** Use for colored text — undefined when light so inherited class applies */
    textColor: isLight ? undefined : color,
    /** Always-visible border color */
    borderColor: isLight ? 'rgba(0,0,0,0.22)' : `${color}99`,
    /** Subtle background tint */
    bgColor: isLight ? 'rgba(0,0,0,0.05)' : `${color}18`,
    /** Always-visible ring under a colored dot/circle */
    dotShadow: isLight ? '0 0 0 1.5px rgba(0,0,0,0.25)' : `0 0 0 1px ${color}60`,
  }
}
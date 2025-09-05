export interface ThemeColors {
  backgroundColor: string
  textColor: string
  headingColor: string
}

export const DEFAULT_THEMES = {
  light: {
    backgroundColor: '#FFFFFF',
    textColor: '#1F2937',
    headingColor: '#111827'
  },
  dark: {
    backgroundColor: '#1F2937',
    textColor: '#F3F4F6',
    headingColor: '#FFFFFF'
  },
  professional: {
    backgroundColor: '#FFFFFF',
    textColor: '#1F2937',
    headingColor: '#3B82F6'
  },
  warm: {
    backgroundColor: '#FEF3C7',
    textColor: '#92400E',
    headingColor: '#D97706'
  },
  cool: {
    backgroundColor: '#ECFDF5',
    textColor: '#065F46',
    headingColor: '#10B981'
  }
} as const

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null
}

function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
}

export function calculateContrast(color1: string, color2: string): number {
  const rgb1 = hexToRgb(color1)
  const rgb2 = hexToRgb(color2)
  
  if (!rgb1 || !rgb2) return 1
  
  const lum1 = getLuminance(rgb1.r, rgb1.g, rgb1.b)
  const lum2 = getLuminance(rgb2.r, rgb2.g, rgb2.b)
  
  const brightest = Math.max(lum1, lum2)
  const darkest = Math.min(lum1, lum2)
  
  return (brightest + 0.05) / (darkest + 0.05)
}

export function ensureContrast(backgroundColor: string, textColor: string, minContrast = 4.5): string {
  const contrast = calculateContrast(backgroundColor, textColor)
  
  if (contrast >= minContrast) {
    return textColor
  }
  
  const bgRgb = hexToRgb(backgroundColor)
  if (!bgRgb) return textColor
  
  const bgLuminance = getLuminance(bgRgb.r, bgRgb.g, bgRgb.b)
  
  return bgLuminance > 0.5 ? '#000000' : '#FFFFFF'
}

export function getOptimalTextColor(backgroundColor: string): string {
  const rgb = hexToRgb(backgroundColor)
  if (!rgb) return '#000000'
  
  const luminance = getLuminance(rgb.r, rgb.g, rgb.b)
  return luminance > 0.5 ? '#1F2937' : '#F3F4F6'
}

export function getOptimalHeadingColor(backgroundColor: string, primaryColor?: string): string {
  if (primaryColor && calculateContrast(backgroundColor, primaryColor) >= 4.5) {
    return primaryColor
  }
  
  const rgb = hexToRgb(backgroundColor)
  if (!rgb) return '#000000'
  
  const luminance = getLuminance(rgb.r, rgb.g, rgb.b)
  return luminance > 0.5 ? '#111827' : '#FFFFFF'
}

export function getThemeColorsForSlide(
  slide: {
    backgroundColor?: string
    textColor?: string  
    headingColor?: string
    layout: string
  },
  presentation: {
    primaryColor: string
    secondaryColor: string
  },
  systemTheme: 'light' | 'dark' = 'light'
): ThemeColors {
  let backgroundColor: string
  let textColor: string
  let headingColor: string

  if (slide.backgroundColor) {
    backgroundColor = slide.backgroundColor
  } else {
    switch (slide.layout) {
      case 'TITLE_COVER':
        backgroundColor = `linear-gradient(135deg, ${presentation.primaryColor}, ${presentation.secondaryColor})`
        break
      case 'IMAGE_BACKGROUND':
        backgroundColor = 'transparent'
        break
      default:
        backgroundColor = systemTheme === 'dark' ? DEFAULT_THEMES.dark.backgroundColor : DEFAULT_THEMES.light.backgroundColor
    }
  }

  if (slide.textColor) {
    textColor = slide.textColor
  } else {
    if (slide.layout === 'TITLE_COVER' || slide.layout === 'IMAGE_BACKGROUND') {
      textColor = '#FFFFFF'
    } else {
      textColor = systemTheme === 'dark' ? DEFAULT_THEMES.dark.textColor : DEFAULT_THEMES.light.textColor
    }
  }

  if (slide.headingColor) {
    headingColor = slide.headingColor
  } else {
    if (slide.layout === 'TITLE_COVER' || slide.layout === 'IMAGE_BACKGROUND') {
      headingColor = '#FFFFFF'
    } else {
      headingColor = systemTheme === 'dark' ? DEFAULT_THEMES.dark.headingColor : DEFAULT_THEMES.light.headingColor
    }
  }

  const finalBackgroundColor = backgroundColor.startsWith('linear-gradient') ? 
    presentation.primaryColor : backgroundColor

  if (finalBackgroundColor !== 'transparent') {
    textColor = ensureContrast(finalBackgroundColor, textColor)
    headingColor = ensureContrast(finalBackgroundColor, headingColor)
  }

  return {
    backgroundColor,
    textColor,
    headingColor
  }
}
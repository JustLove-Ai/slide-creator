// Annotation system type definitions

export interface AnnotationData {
  shapes: AnnotationShape[]
  texts: AnnotationText[]
  version: string // for future migration compatibility
}

export interface AnnotationShape {
  id: string
  type: 'rectangle' | 'circle' | 'line' | 'arrow' | 'path'
  x: number        // percentage (0-100)
  y: number        // percentage (0-100)  
  width: number    // percentage for rectangle/circle
  height: number   // percentage for rectangle/circle
  x2?: number      // end x for line/arrow (percentage)
  y2?: number      // end y for line/arrow (percentage)
  path?: string    // SVG path data for free-hand drawing
  style: {
    stroke: string
    strokeWidth: number
    fill?: string
    opacity: number
    strokeDasharray?: string // for dashed lines
  }
  createdAt: number
  updatedAt: number
}

export interface AnnotationText {
  id: string
  text: string
  x: number        // percentage (0-100)
  y: number        // percentage (0-100)
  style: {
    fontSize: number
    color: string
    fontFamily: string
    fontWeight?: 'normal' | 'bold'
    textAlign?: 'left' | 'center' | 'right'
  }
  createdAt: number
  updatedAt: number
}

export type AnnotationTool = 'select' | 'rectangle' | 'circle' | 'line' | 'arrow' | 'path' | 'text'

export interface AnnotationToolbarState {
  activeTool: AnnotationTool
  strokeColor: string
  fillColor: string
  strokeWidth: number
  fontSize: number
  opacity: number
}

// Helper functions for annotation data
export const createEmptyAnnotationData = (): AnnotationData => ({
  shapes: [],
  texts: [],
  version: '1.0'
})

export const parseAnnotationData = (jsonString: string | null): AnnotationData => {
  if (!jsonString) return createEmptyAnnotationData()
  
  try {
    const parsed = JSON.parse(jsonString)
    return {
      shapes: parsed.shapes || [],
      texts: parsed.texts || [],
      version: parsed.version || '1.0'
    }
  } catch (error) {
    console.warn('Failed to parse annotation data:', error)
    return createEmptyAnnotationData()
  }
}

export const serializeAnnotationData = (data: AnnotationData): string => {
  return JSON.stringify(data)
}

// Generate unique IDs for annotations
export const generateAnnotationId = (): string => {
  return `ann_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}
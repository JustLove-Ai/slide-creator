'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  MousePointer, 
  Square, 
  Circle, 
  Minus, 
  ArrowRight, 
  Type, 
  Palette,
  Undo,
  Redo,
  Trash2,
  Save,
  Pen
} from 'lucide-react'
import { 
  AnnotationData, 
  AnnotationShape, 
  AnnotationText, 
  AnnotationTool,
  AnnotationToolbarState,
  createEmptyAnnotationData,
  parseAnnotationData,
  serializeAnnotationData,
  generateAnnotationId
} from '@/types/annotations'

interface AnnotationOverlayProps {
  slideId: string
  initialAnnotations?: string | null
  isEditMode?: boolean
  isPresentationMode?: boolean
  onAnnotationsChange?: (annotations: string) => void
  onSave?: () => void
  className?: string
}

export default function AnnotationOverlay({
  slideId,
  initialAnnotations,
  isEditMode = false,
  isPresentationMode = false,
  onAnnotationsChange,
  onSave,
  className = ''
}: AnnotationOverlayProps) {
  // State management
  const [annotationData, setAnnotationData] = useState<AnnotationData>(() => 
    parseAnnotationData(initialAnnotations)
  )
  
  const [toolbarState, setToolbarState] = useState<AnnotationToolbarState>({
    activeTool: 'select',
    strokeColor: '#ef4444',
    fillColor: 'transparent',
    strokeWidth: 2,
    fontSize: 16,
    opacity: 1
  })

  const [isDrawing, setIsDrawing] = useState(false)
  const [currentShape, setCurrentShape] = useState<AnnotationShape | null>(null)
  const [currentPath, setCurrentPath] = useState<{x: number, y: number}[]>([])
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null)
  const [isToolbarVisible, setIsToolbarVisible] = useState(false)
  const [showColorPicker, setShowColorPicker] = useState(false)

  // Refs
  const svgRef = useRef<SVGSVGElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  // Convert mouse coordinates to percentage-based coordinates
  const getPercentageCoords = useCallback((event: React.MouseEvent) => {
    if (!overlayRef.current) return { x: 0, y: 0 }
    
    const rect = overlayRef.current.getBoundingClientRect()
    const x = ((event.clientX - rect.left) / rect.width) * 100
    const y = ((event.clientY - rect.top) / rect.height) * 100
    
    return { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) }
  }, [])

  // Handle mouse down for shape creation
  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    if (!isEditMode || toolbarState.activeTool === 'select') return

    event.preventDefault()
    setShowColorPicker(false) // Close color picker when starting to draw
    const coords = getPercentageCoords(event)
    
    if (toolbarState.activeTool === 'text') {
      // Handle text creation
      const newText: AnnotationText = {
        id: generateAnnotationId(),
        text: 'Click to edit',
        x: coords.x,
        y: coords.y,
        style: {
          fontSize: toolbarState.fontSize,
          color: toolbarState.strokeColor,
          fontFamily: 'Inter, sans-serif',
          fontWeight: 'normal'
        },
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
      
      setAnnotationData(prev => ({
        ...prev,
        texts: [...prev.texts, newText]
      }))
      
      setSelectedAnnotationId(newText.id)
    } else if (toolbarState.activeTool === 'path') {
      // Handle path drawing
      setCurrentPath([coords])
      setIsDrawing(true)
    } else {
      // Handle shape creation
      const newShape: AnnotationShape = {
        id: generateAnnotationId(),
        type: toolbarState.activeTool as any,
        x: coords.x,
        y: coords.y,
        width: 0,
        height: 0,
        style: {
          stroke: toolbarState.strokeColor,
          strokeWidth: toolbarState.strokeWidth,
          fill: toolbarState.fillColor,
          opacity: toolbarState.opacity
        },
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
      
      if (toolbarState.activeTool === 'line' || toolbarState.activeTool === 'arrow') {
        newShape.x2 = coords.x
        newShape.y2 = coords.y
      }
      
      setCurrentShape(newShape)
      setIsDrawing(true)
    }
  }, [isEditMode, toolbarState, getPercentageCoords])

  // Handle mouse move for shape drawing
  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    if (!isDrawing) return
    
    const coords = getPercentageCoords(event)
    
    // Handle path drawing
    if (toolbarState.activeTool === 'path') {
      setCurrentPath(prev => [...prev, coords])
      return
    }
    
    if (!currentShape) return
    
    if (currentShape.type === 'line' || currentShape.type === 'arrow') {
      setCurrentShape({
        ...currentShape,
        x2: coords.x,
        y2: coords.y
      })
    } else {
      const width = Math.abs(coords.x - currentShape.x)
      const height = Math.abs(coords.y - currentShape.y)
      const x = Math.min(currentShape.x, coords.x)
      const y = Math.min(currentShape.y, coords.y)
      
      setCurrentShape({
        ...currentShape,
        x,
        y,
        width,
        height
      })
    }
  }, [isDrawing, currentShape, getPercentageCoords])

  // Handle mouse up to finish shape creation
  const handleMouseUp = useCallback(() => {
    if (!isDrawing) return
    
    // Handle path completion
    if (toolbarState.activeTool === 'path' && currentPath.length > 1) {
      // Convert path points to SVG path string
      const pathString = currentPath.reduce((path, point, index) => {
        if (index === 0) {
          return `M ${point.x} ${point.y}`
        } else {
          return `${path} L ${point.x} ${point.y}`
        }
      }, '')
      
      // Calculate bounding box for the path
      const minX = Math.min(...currentPath.map(p => p.x))
      const maxX = Math.max(...currentPath.map(p => p.x))
      const minY = Math.min(...currentPath.map(p => p.y))
      const maxY = Math.max(...currentPath.map(p => p.y))
      
      const pathShape: AnnotationShape = {
        id: generateAnnotationId(),
        type: 'path',
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
        path: pathString,
        style: {
          stroke: toolbarState.strokeColor,
          strokeWidth: toolbarState.strokeWidth,
          fill: 'none',
          opacity: toolbarState.opacity
        },
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
      
      setAnnotationData(prev => ({
        ...prev,
        shapes: [...prev.shapes, pathShape]
      }))
      
      setCurrentPath([])
      setIsDrawing(false)
      return
    }
    
    if (!currentShape) return
    
    // Only add the shape if it has some size
    const hasSize = (currentShape.type === 'line' || currentShape.type === 'arrow') 
      ? (Math.abs((currentShape.x2 || 0) - currentShape.x) > 1 || Math.abs((currentShape.y2 || 0) - currentShape.y) > 1)
      : (currentShape.width > 1 || currentShape.height > 1)
    
    if (hasSize) {
      setAnnotationData(prev => ({
        ...prev,
        shapes: [...prev.shapes, currentShape]
      }))
    }
    
    setCurrentShape(null)
    setIsDrawing(false)
  }, [isDrawing, currentShape, currentPath, toolbarState])

  // Handle annotation deletion
  const deleteAnnotation = useCallback((id: string) => {
    setAnnotationData(prev => ({
      ...prev,
      shapes: prev.shapes.filter(shape => shape.id !== id),
      texts: prev.texts.filter(text => text.id !== id)
    }))
    setSelectedAnnotationId(null)
  }, [])

  // Clear all annotations
  const clearAllAnnotations = useCallback(() => {
    setAnnotationData(createEmptyAnnotationData())
    setSelectedAnnotationId(null)
  }, [])

  // Notify parent of changes
  useEffect(() => {
    const serialized = serializeAnnotationData(annotationData)
    onAnnotationsChange?.(serialized)
  }, [annotationData, onAnnotationsChange])

  // Render SVG shape
  const renderShape = useCallback((shape: AnnotationShape, isSelected: boolean, isPreview: boolean = false) => {
    const commonProps = {
      stroke: shape.style.stroke,
      strokeWidth: shape.style.strokeWidth,
      fill: shape.style.fill,
      opacity: shape.style.opacity,
      strokeDasharray: shape.style.strokeDasharray,
      className: isSelected ? 'cursor-move' : 'cursor-pointer',
      onClick: isEditMode ? () => setSelectedAnnotationId(shape.id) : undefined
    }

    switch (shape.type) {
      case 'rectangle':
        return (
          <rect
            key={shape.id}
            x={`${shape.x}%`}
            y={`${shape.y}%`}
            width={`${shape.width}%`}
            height={`${shape.height}%`}
            {...commonProps}
          />
        )
      
      case 'circle':
        const centerX = shape.x + shape.width / 2
        const centerY = shape.y + shape.height / 2
        const radiusX = shape.width / 2
        const radiusY = shape.height / 2
        
        return (
          <ellipse
            key={shape.id}
            cx={`${centerX}%`}
            cy={`${centerY}%`}
            rx={`${radiusX}%`}
            ry={`${radiusY}%`}
            {...commonProps}
          />
        )
      
      case 'line':
        return (
          <line
            key={shape.id}
            x1={`${shape.x}%`}
            y1={`${shape.y}%`}
            x2={`${shape.x2 || shape.x}%`}
            y2={`${shape.y2 || shape.y}%`}
            {...commonProps}
          />
        )
      
      case 'arrow':
        const x1 = shape.x
        const y1 = shape.y
        const x2 = shape.x2 || shape.x
        const y2 = shape.y2 || shape.y
        
        // Calculate arrow head
        const angle = Math.atan2(y2 - y1, x2 - x1)
        const headLength = 2 // percentage
        const headAngle = Math.PI / 6
        
        const arrowHead1X = x2 - headLength * Math.cos(angle - headAngle)
        const arrowHead1Y = y2 - headLength * Math.sin(angle - headAngle)
        const arrowHead2X = x2 - headLength * Math.cos(angle + headAngle)
        const arrowHead2Y = y2 - headLength * Math.sin(angle + headAngle)
        
        return (
          <g key={shape.id}>
            <line
              x1={`${x1}%`}
              y1={`${y1}%`}
              x2={`${x2}%`}
              y2={`${y2}%`}
              {...commonProps}
            />
            <line
              x1={`${x2}%`}
              y1={`${y2}%`}
              x2={`${arrowHead1X}%`}
              y2={`${arrowHead1Y}%`}
              {...commonProps}
            />
            <line
              x1={`${x2}%`}
              y1={`${y2}%`}
              x2={`${arrowHead2X}%`}
              y2={`${arrowHead2Y}%`}
              {...commonProps}
            />
          </g>
        )
      
      case 'path':
        return (
          <path
            key={shape.id}
            d={shape.path}
            stroke={shape.style.stroke}
            strokeWidth={shape.style.strokeWidth * 0.3} // Better visibility for percentage coordinates
            fill="none"
            opacity={shape.style.opacity}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            className={isSelected ? 'cursor-move' : 'cursor-pointer'}
            onClick={isEditMode ? () => setSelectedAnnotationId(shape.id) : undefined}
          />
        )
      
      default:
        return null
    }
  }, [isEditMode])

  // Render text annotation
  const renderText = useCallback((text: AnnotationText, isSelected: boolean) => {
    return (
      <text
        key={text.id}
        x={`${text.x}%`}
        y={`${text.y}%`}
        fontSize={text.style.fontSize}
        fill={text.style.color}
        fontFamily={text.style.fontFamily}
        fontWeight={text.style.fontWeight}
        textAnchor="start"
        dominantBaseline="hanging"
        className={isSelected ? 'cursor-move' : (isEditMode ? 'cursor-pointer' : '')}
        onClick={isEditMode ? () => setSelectedAnnotationId(text.id) : undefined}
      >
        {text.text}
      </text>
    )
  }, [isEditMode])

  // Show/hide toolbar based on edit mode
  useEffect(() => {
    setIsToolbarVisible(isEditMode)
  }, [isEditMode])

  // Close color picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (showColorPicker && !target.closest('[data-color-picker]')) {
        setShowColorPicker(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showColorPicker])

  return (
    <div 
      ref={overlayRef}
      className={`absolute inset-0 pointer-events-none ${className}`}
      style={{ zIndex: isPresentationMode ? 20 : 10 }}
    >
      {/* SVG Overlay */}
      <svg
        ref={svgRef}
        className={`w-full h-full ${isEditMode ? 'pointer-events-auto' : 'pointer-events-none'}`}
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        style={{ cursor: isEditMode ? (toolbarState.activeTool === 'select' ? 'default' : 'crosshair') : 'default' }}
      >
        {/* Render existing shapes */}
        {annotationData.shapes.map(shape => 
          renderShape(shape, selectedAnnotationId === shape.id)
        )}
        
        {/* Render existing texts */}
        {annotationData.texts.map(text => 
          renderText(text, selectedAnnotationId === text.id)
        )}
        
        {/* Render current shape being drawn */}
        {currentShape && renderShape(currentShape, false, true)}
        
        {/* Render current path being drawn */}
        {currentPath.length > 0 && (
          <path
            d={currentPath.reduce((path, point, index) => {
              if (index === 0) {
                return `M ${point.x} ${point.y}`
              } else {
                return `${path} L ${point.x} ${point.y}`
              }
            }, '')}
            stroke={toolbarState.strokeColor}
            strokeWidth={toolbarState.strokeWidth * 0.3} // Better visibility for percentage coordinates
            fill="none"
            opacity={toolbarState.opacity}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        )}
      </svg>

      {/* Annotation Toolbar */}
      <AnimatePresence>
        {isToolbarVisible && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-auto"
          >
            <div className="bg-background border border-border rounded-lg shadow-lg p-2 flex items-center gap-2">
              {/* Tool Selection */}
              <div className="flex items-center gap-1 pr-2 border-r border-border">
                {[
                  { tool: 'select', icon: MousePointer, title: 'Select' },
                  { tool: 'rectangle', icon: Square, title: 'Rectangle' },
                  { tool: 'circle', icon: Circle, title: 'Circle' },
                  { tool: 'line', icon: Minus, title: 'Line' },
                  { tool: 'arrow', icon: ArrowRight, title: 'Arrow' },
                  { tool: 'path', icon: Pen, title: 'Free Draw' },
                  { tool: 'text', icon: Type, title: 'Text' }
                ].map(({ tool, icon: Icon, title }) => (
                  <button
                    key={tool}
                    onClick={() => {
                      setToolbarState(prev => ({ ...prev, activeTool: tool as AnnotationTool }))
                      setShowColorPicker(false) // Close color picker when switching tools
                    }}
                    className={`p-2 rounded hover:bg-muted transition-colors ${
                      toolbarState.activeTool === tool ? 'bg-primary text-primary-foreground' : ''
                    }`}
                    title={title}
                  >
                    <Icon className="w-4 h-4" />
                  </button>
                ))}
              </div>

              {/* Color Controls */}
              <div className="flex items-center gap-2 pr-2 border-r border-border" data-color-picker>
                <button
                  onClick={() => setShowColorPicker(!showColorPicker)}
                  className="p-2 rounded hover:bg-muted transition-colors"
                  title="Colors"
                >
                  <Palette className="w-4 h-4" />
                </button>
                <div
                  className="w-6 h-6 rounded border-2 border-border"
                  style={{ backgroundColor: toolbarState.strokeColor }}
                />
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1">
                <button
                  onClick={clearAllAnnotations}
                  className="p-2 rounded hover:bg-muted transition-colors text-destructive"
                  title="Clear All"
                  disabled={annotationData.shapes.length === 0 && annotationData.texts.length === 0}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                
                {onSave && (
                  <button
                    onClick={onSave}
                    className="p-2 rounded hover:bg-muted transition-colors text-green-600"
                    title="Save Annotations"
                  >
                    <Save className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Color Picker */}
            <AnimatePresence>
              {showColorPicker && (
                <motion.div
                  initial={{ y: -10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -10, opacity: 0 }}
                  className="absolute top-full left-0 mt-2 bg-background border border-border rounded-lg shadow-lg p-3 min-w-[200px]"
                  data-color-picker
                >
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Stroke Color</label>
                      <div className="flex gap-2 mt-1 flex-wrap">
                        {['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#000000', '#ffffff'].map(color => (
                          <button
                            key={color}
                            onClick={() => setToolbarState(prev => ({ ...prev, strokeColor: color }))}
                            className={`w-6 h-6 rounded border-2 ${
                              toolbarState.strokeColor === color ? 'border-foreground' : 'border-border'
                            } ${color === '#ffffff' ? 'border-gray-300' : ''}`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>

                      <div className="mt-2">
                        <label className="text-xs font-medium text-muted-foreground">Custom Color</label>
                        <div className="flex gap-2 mt-1">
                          <input
                            type="color"
                            value={toolbarState.strokeColor}
                            onChange={(e) => setToolbarState(prev => ({ ...prev, strokeColor: e.target.value }))}
                            className="w-8 h-8 rounded border border-border cursor-pointer"
                          />
                          <input
                            type="text"
                            value={toolbarState.strokeColor}
                            onChange={(e) => {
                              if (/^#[0-9A-F]{6}$/i.test(e.target.value) || e.target.value.length <= 7) {
                                setToolbarState(prev => ({ ...prev, strokeColor: e.target.value }))
                              }
                            }}
                            className="flex-1 px-2 py-1 text-xs border border-border rounded bg-background text-foreground"
                            placeholder="#000000"
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Stroke Width</label>
                      <input
                        type="range"
                        min="1"
                        max="8"
                        value={toolbarState.strokeWidth}
                        onChange={(e) => setToolbarState(prev => ({ ...prev, strokeWidth: Number(e.target.value) }))}
                        className="w-full mt-1"
                      />
                      <div className="text-xs text-muted-foreground text-center">{toolbarState.strokeWidth}px</div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selected Annotation Controls */}
      <AnimatePresence>
        {selectedAnnotationId && isEditMode && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="absolute bottom-4 right-4 pointer-events-auto"
          >
            <div className="bg-background border border-border rounded-lg shadow-lg p-2 flex items-center gap-2">
              <button
                onClick={() => deleteAnnotation(selectedAnnotationId)}
                className="p-2 rounded hover:bg-destructive/10 text-destructive transition-colors"
                title="Delete Selected"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              
              <button
                onClick={() => setSelectedAnnotationId(null)}
                className="p-2 rounded hover:bg-muted transition-colors"
                title="Deselect"
              >
                <MousePointer className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
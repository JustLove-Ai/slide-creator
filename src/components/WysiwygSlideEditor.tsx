'use client'

import React, { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Layout, 
  Edit3, 
  Trash2, 
  RefreshCw, 
  Image as ImageIcon, 
  Bold,
  Italic,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Upload,
  Sparkles,
  Plus,
  Check,
  X,
  Settings,
  MessageSquare,
  FileText,
  Copy,
  PenTool
} from 'lucide-react'
import { SlideLayoutType } from './LayoutSelector'
import ImagePromptModal from './ImagePromptModal'
import AnnotationOverlay from './AnnotationOverlay'
import { parseMarkdownToHtml, htmlToPlainText } from '@/lib/markdown-utils'

interface Slide {
  id: string
  title: string
  content: string
  annotations?: string
  slideType: string
  layout: SlideLayoutType
  order: number
  imageUrl?: string
  backgroundColor?: string
  textColor?: string
  headingColor?: string
  textAlign?: 'LEFT' | 'CENTER' | 'RIGHT' | 'JUSTIFY'
  customStyles?: string
  showTitle?: boolean
  showContent?: boolean
}

interface Presentation {
  id: string
  primaryColor: string
  secondaryColor: string
  fontFamily: string
}

interface WysiwygSlideEditorProps {
  slide: Slide
  presentation: Presentation
  onSave: (slide: Slide) => Promise<void>
  onDelete: (slideId: string) => Promise<void>
  onRequestDelete: (slideId: string) => void
  onDuplicate: (slideId: string) => Promise<void>
  onRegenerate: (slideId: string) => Promise<void>
  onUpdatePresentation: (updates: Partial<Presentation>) => Promise<void>
  onApplyThemeToAllSlides?: (themeUpdates: { backgroundColor?: string, textColor?: string, headingColor?: string }) => Promise<void>
  applyToAllSlides: boolean
  onApplyToAllChange: (apply: boolean) => void
  isActive: boolean
  onActivate: () => void
  onOpenNotes?: () => void
  onOpenSettings?: () => void
  onOpenLayout?: () => void
  onOpenImage?: () => void
  onOpenContent?: () => void
}

export default function WysiwygSlideEditor({ 
  slide, 
  presentation,
  onSave, 
  onDelete, 
  onRequestDelete,
  onDuplicate,
  onRegenerate,
  onUpdatePresentation,
  onApplyThemeToAllSlides,
  applyToAllSlides,
  onApplyToAllChange,
  isActive,
  onActivate,
  onOpenNotes,
  onOpenSettings,
  onOpenLayout,
  onOpenImage,
  onOpenContent
}: WysiwygSlideEditorProps) {
  const [isEditMode, setIsEditMode] = useState(false)
  const [editTitle, setEditTitle] = useState(slide.title)
  const [editContent, setEditContent] = useState(slide.content)
  const [editAnnotations, setEditAnnotations] = useState(slide.annotations || '')
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [hasUnsavedAnnotations, setHasUnsavedAnnotations] = useState(false)
  const [showImagePrompt, setShowImagePrompt] = useState(false)
  const [isAnnotationMode, setIsAnnotationMode] = useState(false)
  
  const slideRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const getSlideBackground = () => {
    switch (slide.layout) {
      case 'TITLE_COVER':
        return { 
          background: `linear-gradient(135deg, ${presentation.primaryColor}, ${presentation.secondaryColor})` 
        }
      case 'IMAGE_BACKGROUND':
      case 'IMAGE_OVERLAY':
        return { 
          backgroundImage: slide.imageUrl ? `url(${slide.imageUrl})` : `linear-gradient(135deg, ${presentation.primaryColor}20, ${presentation.secondaryColor}20)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }
      default:
        // For other layouts, apply theme color if set
        if (slide.backgroundColor) {
          return { backgroundColor: slide.backgroundColor }
        }
        return { background: '#ffffff' }
    }
  }

  const getTextStyle = (isTitle = false) => {
    let color
    
    // Use theme-aware colors if available
    if (isTitle && slide.headingColor) {
      color = slide.headingColor
    } else if (!isTitle && slide.textColor) {
      color = slide.textColor
    } else {
      // Fallback to layout-based colors
      color = slide.layout === 'TITLE_COVER' || slide.layout === 'IMAGE_BACKGROUND' ? 'white' : '#1f2937'
    }
    
    const align = slide.textAlign?.toLowerCase() || 'left'
    
    return {
      color,
      textAlign: align as any,
      fontFamily: presentation.fontFamily === 'Inter' ? 'system-ui, sans-serif' : 
                 presentation.fontFamily === 'Times' ? 'serif' : 
                 presentation.fontFamily === 'Courier' ? 'monospace' : 'system-ui, sans-serif'
    }
  }

  const handleSave = async () => {
    setIsLoading(true)
    setIsSaving(true)
    try {
      await onSave({
        ...slide,
        title: editTitle.trim() || slide.title,
        content: editContent.trim() || slide.content,
        annotations: editAnnotations
      })
      setIsEditMode(false)
      setHasUnsavedChanges(false)
      setHasUnsavedAnnotations(false)
    } catch (error) {
      console.error('Error saving slide:', error)
      setEditTitle(slide.title)
      setEditContent(slide.content)
      setEditAnnotations(slide.annotations || '')
    } finally {
      setIsLoading(false)
      setIsSaving(false)
    }
  }

  const handleQuickSave = async () => {
    setIsSaving(true)
    try {
      await onSave({
        ...slide,
        title: editTitle || slide.title,
        content: editContent || slide.content,
        annotations: editAnnotations
      })
      setHasUnsavedChanges(false)
      setHasUnsavedAnnotations(false)
    } catch (error) {
      console.error('Error saving slide:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancelEdit = () => {
    setEditTitle(slide.title)
    setEditContent(slide.content)
    setIsEditMode(false)
    setHasUnsavedChanges(false)
  }

  const enterEditMode = () => {
    setEditTitle(slide.title)
    setEditContent(slide.content)
    setIsEditMode(true)
    setHasUnsavedChanges(false)
  }

  // Handle ESC key globally when in edit mode
  const handleGlobalKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && isEditMode) {
      e.preventDefault()
      handleCancelEdit()
    }
  }

  // Add global event listener for ESC
  React.useEffect(() => {
    if (isEditMode) {
      document.addEventListener('keydown', handleGlobalKeyDown)
      return () => document.removeEventListener('keydown', handleGlobalKeyDown)
    }
  }, [isEditMode])

  const handleImageUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setIsLoading(true)
      try {
        // Create FormData for file upload
        const formData = new FormData()
        formData.append('file', file)

        // Upload to our API endpoint
        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        })

        if (!uploadResponse.ok) {
          throw new Error('Failed to upload image')
        }

        const { imageUrl } = await uploadResponse.json()

        // Save the image URL to the slide
        await onSave({
          ...slide,
          imageUrl
        })
        
        } catch (error) {
        console.error('Error uploading image:', error)
      } finally {
        setIsLoading(false)
      }
    }
  }, [slide, onSave])

  const handleImageGenerate = async (prompt: string) => {
    setIsLoading(true)
    try {
      // Placeholder for AI image generation
      // In a real app, you'd call an AI image service like DALL-E or Midjourney
      const placeholderImageUrl = `https://picsum.photos/800/600?random=${Date.now()}&text=${encodeURIComponent(prompt)}`
      
      await onSave({
        ...slide,
        imageUrl: placeholderImageUrl
      })
      setShowImagePrompt(false)
    } catch (error) {
      console.error('Error generating image:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAIGenerate = async () => {
    const prompt = window.prompt('Describe what you want this slide to be about:')
    if (!prompt) return
    
    try {
      setIsLoading(true)
      // Try to use the regenerate endpoint for AI content
      const response = await fetch(`/api/slides/${slide.id}/regenerate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      })

      if (response.ok) {
        const data = await response.json()
        await onSave({
          ...slide,
          title: data.title || prompt,
          content: data.content || `Generated content about: ${prompt}`
        })
      }
    } catch (error) {
      console.error('Error generating content:', error)
      // Fallback to simple content generation
      await onSave({
        ...slide,
        title: prompt,
        content: `This slide covers: ${prompt}\n\n• Key points will be generated here\n• More details to follow\n• Interactive content coming soon`
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemoveImage = async () => {
    try {
      await onSave({
        ...slide,
        imageUrl: undefined
      })
    } catch (error) {
      console.error('Error removing image:', error)
    }
  }


  const renderPlaceholderImage = (className: string = '') => (
    <div 
      className={`bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors ${className}`}
      onClick={() => onOpenImage?.()}
    >
      <div className="text-gray-400 text-center">
        <Plus className="w-8 h-8 mx-auto mb-2" />
        <div className="text-sm font-medium">Add Image</div>
      </div>
    </div>
  )

  const renderImage = (className: string = '') => {
    if (slide.imageUrl) {
      return (
        <img 
          src={slide.imageUrl} 
          alt="" 
          className={`object-cover cursor-pointer hover:opacity-90 transition-opacity ${className}`}
          onClick={() => onOpenImage?.()}
        />
      )
    }
    return renderPlaceholderImage(className)
  }

  const renderEditableTitle = (className: string, style: React.CSSProperties) => {
    if (isEditMode) {
      return (
        <input
          type="text"
          value={editTitle}
          onChange={(e) => {
            setEditTitle(e.target.value)
            setHasUnsavedChanges(true)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              handleSave()
            }
          }}
          className={`${className} border-2 border-primary/30 rounded-lg p-2 bg-background/80 backdrop-blur-sm focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all`}
          style={style}
          placeholder="Enter title..."
          autoFocus={editTitle === slide.title}
        />
      )
    }

    return (
      <div
        className={className}
        style={style}
        dangerouslySetInnerHTML={{ __html: parseMarkdownToHtml(slide.title) }}
      />
    )
  }

  const renderEditableContent = (className: string, style: React.CSSProperties) => {
    if (isEditMode) {
      return (
        <textarea
          value={editContent}
          onChange={(e) => {
            setEditContent(e.target.value)
            setHasUnsavedChanges(true)
          }}
          className={`${className} border-2 border-primary/30 rounded-lg p-3 bg-background/80 backdrop-blur-sm focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all resize-none`}
          style={{ ...style, minHeight: '120px' }}
          placeholder="Enter slide content..."
          rows={6}
          autoFocus={editContent === slide.content}
        />
      )
    }

    return (
      <div
        className={className}
        style={style}
        dangerouslySetInnerHTML={{ __html: parseMarkdownToHtml(slide.content) }}
      />
    )
  }

  const renderSlideContent = () => {
    const titleStyle = getTextStyle(true)
    const contentStyle = getTextStyle()

    switch (slide.layout) {
      case 'TITLE_COVER':
        return (
          <div className="h-full flex flex-col items-center justify-center text-center p-12">
            {slide.showTitle !== false && renderEditableTitle(
              "text-6xl font-bold mb-6 outline-none w-full text-center",
              titleStyle
            )}
            {slide.showContent !== false && renderEditableContent(
              "text-xl opacity-90 max-w-3xl outline-none w-full text-center",
              contentStyle
            )}
          </div>
        )

      case 'TEXT_IMAGE_LEFT':
        return (
          <div className="h-full flex">
            <div className="w-1/2 p-8">
              {renderImage('w-full h-full rounded-lg')}
            </div>
            <div className="w-1/2 p-8 flex flex-col justify-center">
              {slide.showTitle !== false && renderEditableTitle(
                "text-4xl font-bold mb-6 outline-none w-full",
                titleStyle
              )}
              {slide.showContent !== false && renderEditableContent(
                "text-lg leading-relaxed outline-none w-full",
                contentStyle
              )}
            </div>
          </div>
        )

      case 'TEXT_IMAGE_RIGHT':
        return (
          <div className="h-full flex">
            <div className="w-1/2 p-8 flex flex-col justify-center">
              {slide.showTitle !== false && renderEditableTitle(
                "text-4xl font-bold mb-6 outline-none w-full",
                titleStyle
              )}
              {slide.showContent !== false && renderEditableContent(
                "text-lg leading-relaxed outline-none w-full",
                contentStyle
              )}
            </div>
            <div className="w-1/2 p-8">
              {renderImage('w-full h-full rounded-lg')}
            </div>
          </div>
        )

      case 'IMAGE_FULL':
        return (
          <div className="h-full relative">
            {renderImage('w-full h-full')}
            {slide.title && (
              <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 p-6">
                {slide.showTitle !== false && renderEditableTitle(
                  "text-3xl font-bold text-white outline-none w-full",
                  { color: 'white' }
                )}
              </div>
            )}
          </div>
        )

      case 'BULLETS_IMAGE':
        return (
          <div className="h-full flex">
            <div className="w-2/3 p-8">
              {slide.showTitle !== false && renderEditableTitle(
                "text-4xl font-bold mb-8 outline-none w-full",
                titleStyle
              )}
              {slide.showContent !== false && renderEditableContent(
                "text-lg leading-relaxed outline-none w-full",
                contentStyle
              )}
            </div>
            <div className="w-1/3 p-8">
              {renderImage('w-full h-full rounded-lg')}
            </div>
          </div>
        )

      case 'TWO_COLUMN':
        return (
          <div className="h-full p-8">
            {slide.showTitle !== false && renderEditableTitle(
              "text-4xl font-bold mb-8 text-center outline-none w-full",
              titleStyle
            )}
            <div className="flex gap-12 h-full">
              <div className="w-1/2">
                {slide.showContent !== false && renderEditableContent(
                  "text-lg leading-relaxed outline-none w-full h-full",
                  contentStyle
                )}
              </div>
              <div className="w-1/2">
                <div
                  className="text-lg leading-relaxed outline-none w-full h-full"
                  style={contentStyle}
                  dangerouslySetInnerHTML={{ __html: parseMarkdownToHtml(slide.content) }}
                />
              </div>
            </div>
          </div>
        )

      case 'TITLE_ONLY':
        return (
          <div className="h-full flex items-center justify-center text-center p-12">
            {slide.showTitle !== false && renderEditableTitle(
              "text-6xl font-bold outline-none w-full text-center",
              titleStyle
            )}
          </div>
        )

      case 'QUOTE_LARGE':
        return (
          <div className="h-full flex flex-col items-center justify-center text-center p-16">
            <div className="max-w-4xl">
              <div className="text-6xl text-gray-300 mb-6">&quot;</div>
              {slide.showContent !== false && renderEditableContent(
                "text-3xl font-light italic mb-8 outline-none w-full text-center leading-relaxed",
                contentStyle
              )}
              {slide.showTitle !== false && renderEditableTitle(
                "text-xl font-semibold outline-none w-full text-center",
                titleStyle
              )}
            </div>
          </div>
        )

      case 'TIMELINE':
        return (
          <div className="h-full p-8">
            {slide.showTitle !== false && renderEditableTitle(
              "text-4xl font-bold mb-8 text-center outline-none w-full",
              titleStyle
            )}
            <div className="relative">
              <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-blue-500"></div>
              <div className="space-y-8 ml-16">
                {slide.content.split('\n').filter(item => item.trim()).map((item, index) => (
                  <div key={index} className="relative">
                    <div className="absolute -left-16 top-2 w-4 h-4 bg-blue-500 rounded-full border-4 border-white"></div>
                    <div 
                      className="text-lg leading-relaxed outline-none"
                      style={contentStyle}
                      dangerouslySetInnerHTML={{ __html: parseMarkdownToHtml(item) }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )

      case 'IMAGE_BACKGROUND':
        return (
          <div className="h-full relative flex items-center justify-center text-center p-12">
            <div className="relative z-10">
              {slide.showTitle !== false && renderEditableTitle(
                "text-5xl font-bold mb-6 drop-shadow-lg outline-none w-full text-center",
                { color: 'white' }
              )}
              {slide.showContent !== false && renderEditableContent(
                "text-xl drop-shadow-md outline-none w-full text-center",
                { color: 'white' }
              )}
            </div>
            <div className="absolute inset-0 bg-black bg-opacity-40 rounded-xl"></div>
          </div>
        )

      default: // TEXT_ONLY
        const isNewSlide = slide.title === 'New Slide' && slide.content === 'Click to edit content'
        
        return (
          <div className="h-full p-8 flex flex-col relative">
            {/* AI Generate overlay for new slides */}
            {isNewSlide && !isEditMode && (
              <div className="absolute top-4 right-4">
                <button
                  onClick={handleAIGenerate}
                  className="flex items-center gap-2 px-3 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors text-sm font-medium"
                >
                  <Sparkles className="w-4 h-4" />
                  Generate with AI
                </button>
              </div>
            )}
            
            {slide.showTitle !== false && renderEditableTitle(
              "text-4xl font-bold mb-8 outline-none w-full",
              titleStyle
            )}
            {slide.showContent !== false && renderEditableContent(
              "text-lg leading-relaxed flex-1 outline-none w-full",
              contentStyle
            )}
          </div>
        )
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="relative mb-8"
    >
      {/* Slide Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-gray-500">
            Slide {slide.order}
          </span>
          <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
            {slide.slideType.replace('_', ' ')}
          </span>
          
        </div>

        <div className="flex items-center gap-2">
          {/* Edit Mode Toggle */}
          {isEditMode ? (
            <div className="flex items-center gap-2">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors bg-green-600 text-white hover:bg-green-700"
              >
                {isSaving ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                    />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Save
                  </>
                )}
              </button>
              <button
                onClick={handleCancelEdit}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors bg-gray-600 text-white hover:bg-gray-700"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={enterEditMode}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors bg-blue-600 text-white hover:bg-blue-700"
              >
                <Edit3 className="w-4 h-4" />
                Edit
              </button>
              
              {onOpenNotes && (
                <button
                  onClick={onOpenNotes}
                  className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                  title="Speaker Notes"
                >
                  <MessageSquare className="w-4 h-4" />
                </button>
              )}
              
              {onOpenSettings && (
                <button
                  onClick={onOpenSettings}
                  className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                  title="Design Settings"
                >
                  <Settings className="w-4 h-4" />
                </button>
              )}

              {onOpenLayout && (
                <button
                  onClick={onOpenLayout}
                  className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                  title="Layout Templates"
                >
                  <Layout className="w-4 h-4" />
                </button>
              )}

              {onOpenImage && (
                <button
                  onClick={onOpenImage}
                  className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                  title="Image Options"
                >
                  <ImageIcon className="w-4 h-4" />
                </button>
              )}

              {onOpenContent && (
                <button
                  onClick={onOpenContent}
                  className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                  title="Content Visibility"
                >
                  <FileText className="w-4 h-4" />
                </button>
              )}
              
              <button
                onClick={() => onRegenerate(slide.id)}
                className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                title="Regenerate with AI"
              >
                <Sparkles className="w-4 h-4" />
              </button>
              
              <button
                onClick={() => onDuplicate(slide.id)}
                className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                title="Duplicate Slide"
              >
                <Copy className="w-4 h-4" />
              </button>
              
              <button
                onClick={() => setIsAnnotationMode(!isAnnotationMode)}
                className={`p-2 rounded-lg transition-colors ${
                  isAnnotationMode 
                    ? 'bg-blue-500 text-white' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
                title="Annotation Mode"
              >
                <PenTool className="w-4 h-4" />
              </button>
              
              <button
                onClick={() => onRequestDelete(slide.id)}
                className="p-2 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                title="Delete Slide"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Slide */}
      <motion.div
        ref={slideRef}
        className={`w-full aspect-[16/9] rounded-xl shadow-lg overflow-hidden cursor-pointer border-2 slide-transition ${
          isEditMode 
            ? 'slide-edit-mode border-blue-500 shadow-xl' 
            : isActive 
              ? 'border-blue-500 shadow-xl' 
              : 'border-gray-200 hover:border-gray-300'
        }`}
        style={getSlideBackground()}
        onClick={!isEditMode ? onActivate : undefined}
        whileHover={!isEditMode ? { scale: 1.01 } : {}}
        transition={{ duration: 0.2 }}
      >
        {renderSlideContent()}
        
        {/* Annotation Overlay */}
        {isAnnotationMode && (
          <AnnotationOverlay
            slideId={slide.id}
            initialAnnotations={editAnnotations}
            isEditMode={true}
            onAnnotationsChange={(annotations) => {
              setEditAnnotations(annotations)
              setHasUnsavedAnnotations(true)
            }}
            onSave={async (annotations) => {
              await onSave({
                ...slide,
                annotations
              })
              setHasUnsavedAnnotations(false)
            }}
          />
        )}
        
        {/* Edit Mode Indicator */}
        {isEditMode && (
          <div className="absolute top-2 left-2 z-10">
            <div className="flex items-center gap-2 bg-blue-600 text-white px-3 py-1 rounded-lg shadow-lg text-xs font-medium">
              <Edit3 className="w-3 h-3" />
              <span>Editing Mode - Click text to edit</span>
            </div>
          </div>
        )}
        
        {/* Annotation Mode Indicator */}
        {isAnnotationMode && (
          <div className="absolute top-2 right-2 z-10">
            <div className="flex items-center gap-2 bg-purple-600 text-white px-3 py-1 rounded-lg shadow-lg text-xs font-medium">
              <PenTool className="w-3 h-3" />
              <span>Annotation Mode - Draw on slide</span>
            </div>
          </div>
        )}
      </motion.div>


      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        className="hidden"
      />


      {/* Image Prompt Modal */}
      <ImagePromptModal
        isOpen={showImagePrompt}
        onClose={() => setShowImagePrompt(false)}
        onGenerate={handleImageGenerate}
        isLoading={isLoading}
      />
    </motion.div>
  )
}
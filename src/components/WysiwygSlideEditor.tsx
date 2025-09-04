'use client'

import { useState, useRef, useCallback } from 'react'
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
  Settings
} from 'lucide-react'
import LayoutSelector, { SlideLayoutType } from './LayoutSelector'
import BackgroundSettings from './BackgroundSettings'
import ImagePromptModal from './ImagePromptModal'
import { parseMarkdownToHtml, htmlToPlainText } from '@/lib/markdown-utils'

interface Slide {
  id: string
  title: string
  content: string
  slideType: string
  layout: SlideLayoutType
  order: number
  imageUrl?: string
  backgroundColor?: string
  textColor?: string
  headingColor?: string
  textAlign?: 'LEFT' | 'CENTER' | 'RIGHT' | 'JUSTIFY'
  customStyles?: string
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
  onRegenerate: (slideId: string) => Promise<void>
  onUpdatePresentation: (updates: Partial<Presentation>) => Promise<void>
  onApplyThemeToAllSlides?: (themeUpdates: { backgroundColor?: string, textColor?: string, headingColor?: string }) => Promise<void>
  applyToAllSlides: boolean
  onApplyToAllChange: (apply: boolean) => void
  isActive: boolean
  onActivate: () => void
}

export default function WysiwygSlideEditor({ 
  slide, 
  presentation,
  onSave, 
  onDelete, 
  onRegenerate,
  onUpdatePresentation,
  onApplyThemeToAllSlides,
  applyToAllSlides,
  onApplyToAllChange,
  isActive,
  onActivate
}: WysiwygSlideEditorProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [isEditingContent, setIsEditingContent] = useState(false)
  const [editTitle, setEditTitle] = useState(slide.title)
  const [editContent, setEditContent] = useState(slide.content)
  const [showImageOptions, setShowImageOptions] = useState(false)
  const [showLayoutSelector, setShowLayoutSelector] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showImagePrompt, setShowImagePrompt] = useState(false)
  
  const slideRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const getSlideBackground = () => {
    if (slide.backgroundColor) {
      return { backgroundColor: slide.backgroundColor }
    }
    
    switch (slide.layout) {
      case 'TITLE_COVER':
        return { 
          background: `linear-gradient(135deg, ${presentation.primaryColor}, ${presentation.secondaryColor})` 
        }
      case 'IMAGE_BACKGROUND':
        return { 
          backgroundImage: slide.imageUrl ? `url(${slide.imageUrl})` : `linear-gradient(135deg, ${presentation.primaryColor}20, ${presentation.secondaryColor}20)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }
      default:
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

  const handleSaveTitle = async () => {
    setIsLoading(true)
    setIsSaving(true)
    try {
      await onSave({
        ...slide,
        title: editTitle.trim() || slide.title
      })
      setIsEditingTitle(false)
      setHasUnsavedChanges(false)
    } catch (error) {
      console.error('Error saving title:', error)
      setEditTitle(slide.title) // Revert on error
    } finally {
      setIsLoading(false)
      setIsSaving(false)
    }
  }

  const handleSaveContent = async () => {
    setIsLoading(true)
    setIsSaving(true)
    try {
      await onSave({
        ...slide,
        content: editContent.trim() || slide.content
      })
      setIsEditingContent(false)
      setHasUnsavedChanges(false)
    } catch (error) {
      console.error('Error saving content:', error)
      setEditContent(slide.content) // Revert on error
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
        content: editContent || slide.content
      })
      setHasUnsavedChanges(false)
    } catch (error) {
      console.error('Error saving slide:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancelEdit = (type: 'title' | 'content') => {
    if (type === 'title') {
      setEditTitle(slide.title)
      setIsEditingTitle(false)
    } else {
      setEditContent(slide.content)
      setIsEditingContent(false)
    }
    setHasUnsavedChanges(false)
  }

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
        
        setShowImageOptions(false)
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
      setShowImageOptions(false)
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
      setShowImageOptions(false)
    } catch (error) {
      console.error('Error removing image:', error)
    }
  }

  const handleLayoutChange = async (newLayout: SlideLayoutType) => {
    try {
      await onSave({
        ...slide,
        layout: newLayout
      })
    } catch (error) {
      console.error('Error updating layout:', error)
    }
    setShowLayoutSelector(false)
  }

  const renderPlaceholderImage = (className: string = '') => (
    <div 
      className={`bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors ${className}`}
      onClick={() => setShowImageOptions(true)}
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
          onClick={() => setShowImageOptions(true)}
        />
      )
    }
    return renderPlaceholderImage(className)
  }

  const renderEditableText = (
    text: string, 
    isEditing: boolean, 
    editValue: string, 
    setEditValue: (value: string) => void, 
    onSave: () => void, 
    onCancel: () => void,
    className: string,
    style: React.CSSProperties,
    isTextarea: boolean = false
  ) => {
    if (isEditing) {
      return (
        <div className="relative">
          {isTextarea ? (
            <textarea
              value={editValue}
              onChange={(e) => {
                setEditValue(e.target.value)
                setHasUnsavedChanges(true)
              }}
              className={`${className} border-2 border-blue-500 rounded-md p-2 resize-none bg-white`}
              style={style}
              rows={6}
              autoFocus
            />
          ) : (
            <input
              type="text"
              value={editValue}
              onChange={(e) => {
                setEditValue(e.target.value)
                setHasUnsavedChanges(true)
              }}
              className={`${className} border-2 border-blue-500 rounded-md p-2 bg-white`}
              style={style}
              autoFocus
            />
          )}
          <div className="absolute -right-2 -top-2 flex gap-1">
            <button
              onClick={onSave}
              className="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center hover:bg-green-700 text-xs"
            >
              <Check className="w-3 h-3" />
            </button>
            <button
              onClick={onCancel}
              className="w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center hover:bg-red-700 text-xs"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      )
    }

    return (
      <div className="relative group">
        <div
          className={`${className} cursor-pointer`}
          style={style}
          dangerouslySetInnerHTML={{ __html: parseMarkdownToHtml(text) }}
        />
        <button
          onClick={() => isTextarea ? setIsEditingContent(true) : setIsEditingTitle(true)}
          className="absolute -right-2 -top-2 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-blue-700"
        >
          <Edit3 className="w-3 h-3" />
        </button>
      </div>
    )
  }

  const renderSlideContent = () => {
    const titleStyle = getTextStyle(true)
    const contentStyle = getTextStyle()

    switch (slide.layout) {
      case 'TITLE_COVER':
        return (
          <div className="h-full flex flex-col items-center justify-center text-center p-12">
            {renderEditableText(
              slide.title,
              isEditingTitle,
              editTitle,
              setEditTitle,
              handleSaveTitle,
              () => handleCancelEdit('title'),
              "text-6xl font-bold mb-6 outline-none w-full text-center",
              titleStyle,
              false
            )}
            {renderEditableText(
              slide.content,
              isEditingContent,
              editContent,
              setEditContent,
              handleSaveContent,
              () => handleCancelEdit('content'),
              "text-xl opacity-90 max-w-3xl outline-none w-full text-center",
              contentStyle,
              true
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
              {renderEditableText(
                slide.title,
                isEditingTitle,
                editTitle,
                setEditTitle,
                handleSaveTitle,
                () => handleCancelEdit('title'),
                "text-4xl font-bold mb-6 outline-none w-full",
                titleStyle,
                false
              )}
              {renderEditableText(
                slide.content,
                isEditingContent,
                editContent,
                setEditContent,
                handleSaveContent,
                () => handleCancelEdit('content'),
                "text-lg leading-relaxed outline-none w-full",
                contentStyle,
                true
              )}
            </div>
          </div>
        )

      case 'TEXT_IMAGE_RIGHT':
        return (
          <div className="h-full flex">
            <div className="w-1/2 p-8 flex flex-col justify-center">
              {renderEditableText(
                slide.title,
                isEditingTitle,
                editTitle,
                setEditTitle,
                handleSaveTitle,
                () => handleCancelEdit('title'),
                "text-4xl font-bold mb-6 outline-none w-full",
                titleStyle,
                false
              )}
              {renderEditableText(
                slide.content,
                isEditingContent,
                editContent,
                setEditContent,
                handleSaveContent,
                () => handleCancelEdit('content'),
                "text-lg leading-relaxed outline-none w-full",
                contentStyle,
                true
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
                {renderEditableText(
                  slide.title,
                  isEditingTitle,
                  editTitle,
                  setEditTitle,
                  handleSaveTitle,
                  () => handleCancelEdit('title'),
                  "text-3xl font-bold text-white outline-none w-full",
                  { color: 'white' },
                  false
                )}
              </div>
            )}
          </div>
        )

      case 'BULLETS_IMAGE':
        return (
          <div className="h-full flex">
            <div className="w-2/3 p-8">
              {renderEditableText(
                slide.title,
                isEditingTitle,
                editTitle,
                setEditTitle,
                handleSaveTitle,
                () => handleCancelEdit('title'),
                "text-4xl font-bold mb-8 outline-none w-full",
                titleStyle,
                false
              )}
              {renderEditableText(
                slide.content,
                isEditingContent,
                editContent,
                setEditContent,
                handleSaveContent,
                () => handleCancelEdit('content'),
                "text-lg leading-relaxed outline-none w-full",
                contentStyle,
                true
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
            {renderEditableText(
              slide.title,
              isEditingTitle,
              editTitle,
              setEditTitle,
              handleSaveTitle,
              () => handleCancelEdit('title'),
              "text-4xl font-bold mb-8 text-center outline-none w-full",
              titleStyle,
              false
            )}
            <div className="flex gap-12 h-full">
              <div className="w-1/2">
                {renderEditableText(
                  slide.content,
                  isEditingContent,
                  editContent,
                  setEditContent,
                  handleSaveContent,
                  () => handleCancelEdit('content'),
                  "text-lg leading-relaxed outline-none w-full h-full",
                  contentStyle,
                  true
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

      case 'IMAGE_BACKGROUND':
        return (
          <div className="h-full relative flex items-center justify-center text-center p-12">
            <div className="relative z-10">
              {renderEditableText(
                slide.title,
                isEditingTitle,
                editTitle,
                setEditTitle,
                handleSaveTitle,
                () => handleCancelEdit('title'),
                "text-5xl font-bold mb-6 drop-shadow-lg outline-none w-full text-center",
                { color: 'white' },
                false
              )}
              {renderEditableText(
                slide.content,
                isEditingContent,
                editContent,
                setEditContent,
                handleSaveContent,
                () => handleCancelEdit('content'),
                "text-xl drop-shadow-md outline-none w-full text-center",
                { color: 'white' },
                true
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
            {isNewSlide && (
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
            
            {renderEditableText(
              slide.title,
              isEditingTitle,
              editTitle,
              setEditTitle,
              handleSaveTitle,
              () => handleCancelEdit('title'),
              "text-4xl font-bold mb-8 outline-none w-full",
              titleStyle,
              false
            )}
            {renderEditableText(
              slide.content,
              isEditingContent,
              editContent,
              setEditContent,
              handleSaveContent,
              () => handleCancelEdit('content'),
              "text-lg leading-relaxed flex-1 outline-none w-full",
              contentStyle,
              true
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
          
          <div className="relative">
            <button
              onClick={() => setShowLayoutSelector(!showLayoutSelector)}
              className="flex items-center gap-2 px-3 py-1 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
            >
              <Layout className="w-4 h-4" />
              {slide.layout.replace('_', ' ').toLowerCase()}
            </button>
            
            {showLayoutSelector && (
              <div className="absolute top-full left-0 mt-1 z-50">
                <LayoutSelector 
                  currentLayout={slide.layout} 
                  onLayoutChange={handleLayoutChange}
                />
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleQuickSave}
            disabled={isSaving || (!hasUnsavedChanges && !isEditingTitle && !isEditingContent)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              hasUnsavedChanges || isEditingTitle || isEditingContent
                ? 'bg-blue-600 text-white hover:bg-blue-700' 
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
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
                {hasUnsavedChanges || isEditingTitle || isEditingContent ? 'Save' : 'Saved'}
              </>
            )}
          </button>
          
          <button
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors font-medium"
          >
            <Settings className="w-4 h-4" />
            Design
          </button>
          
          <div className="w-px h-6 bg-gray-300" />
          
          <button
            onClick={() => onRegenerate(slide.id)}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-1 text-sm text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded-md transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Regenerate
          </button>
          
          <button
            onClick={() => onDelete(slide.id)}
            className="flex items-center gap-2 px-3 py-1 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      </div>

      {/* Main Slide */}
      <motion.div
        ref={slideRef}
        className={`w-full aspect-[16/9] rounded-xl shadow-lg overflow-hidden cursor-pointer border-2 transition-all ${
          isActive ? 'border-blue-500 shadow-xl' : 'border-gray-200 hover:border-gray-300'
        }`}
        style={getSlideBackground()}
        onClick={onActivate}
        whileHover={{ scale: 1.01 }}
        transition={{ duration: 0.2 }}
      >
        {renderSlideContent()}
      </motion.div>

      {/* Image Options Modal */}
      <AnimatePresence>
        {showImageOptions && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={() => setShowImageOptions(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl p-6 max-w-md w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold mb-4">Add or Replace Image</h3>
              
              <div className="space-y-3">
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Upload className="w-5 h-5 text-blue-600" />
                  <div className="text-left">
                    <div className="font-medium">Upload Image</div>
                    <div className="text-sm text-gray-500">Choose from your device</div>
                  </div>
                </button>
                
                <button 
                  onClick={() => setShowImagePrompt(true)}
                  className="w-full flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Sparkles className="w-5 h-5 text-purple-600" />
                  <div className="text-left">
                    <div className="font-medium">Generate with AI</div>
                    <div className="text-sm text-gray-500">Create image from description</div>
                  </div>
                </button>

                {slide.imageUrl && (
                  <button 
                    onClick={handleRemoveImage}
                    className="w-full flex items-center gap-3 p-4 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                    <div className="text-left">
                      <div className="font-medium">Remove Image</div>
                      <div className="text-sm text-red-400">Delete current image</div>
                    </div>
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        className="hidden"
      />

      {/* Background Settings Panel */}
      <BackgroundSettings
        presentation={presentation}
        slide={slide}
        onUpdatePresentation={onUpdatePresentation}
        onUpdateSlide={async (updates) => {
          await onSave({ ...slide, ...updates })
        }}
        onApplyThemeToAllSlides={onApplyThemeToAllSlides}
        applyToAllSlides={applyToAllSlides}
        onApplyToAllChange={onApplyToAllChange}
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
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
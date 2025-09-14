'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { X, MessageSquare, Sparkles, Palette, Type, Layout, Upload, Image as ImageIcon, Trash2, FileText } from 'lucide-react'
import WysiwygSlideEditor from '@/components/WysiwygSlideEditor'
import AddSlideButton from '@/components/AddSlideButton'
import DeleteConfirmationModal from '@/components/DeleteConfirmationModal'
import { SlideLayoutType } from '@/components/LayoutSelector'
import { updateSlide, deleteSlide, duplicateSlide, updatePresentation, applyThemeToAllSlides, reorderSlides, getPresentation, regenerateSlide } from '@/lib/actions'
import { SlideContent } from '@/lib/ai-service'

interface Slide {
  id: string
  title: string
  content: string
  narration?: string
  annotations?: string
  slideType: string
  layout: 'TEXT_ONLY' | 'TITLE_COVER' | 'TITLE_ONLY' | 'TEXT_IMAGE_LEFT' | 'TEXT_IMAGE_RIGHT' | 'IMAGE_FULL' | 'BULLETS_IMAGE' | 'TWO_COLUMN' | 'IMAGE_BACKGROUND' | 'TIMELINE' | 'QUOTE_LARGE' | 'STATISTICS_GRID' | 'IMAGE_OVERLAY' | 'SPLIT_CONTENT' | 'COMPARISON'
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
  title: string
  description: string | null
  prompt: string
  primaryColor: string
  secondaryColor: string
  fontFamily: string
  slides: Slide[]
}

export default function PresentationPage() {
  const params = useParams()
  const [presentation, setPresentation] = useState<Presentation | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeSlideId, setActiveSlideId] = useState<string | null>(null)
  const [applyToAllSlides, setApplyToAllSlides] = useState(false)
  const [draggedSlideId, setDraggedSlideId] = useState<string | null>(null)
  const [dragOverSlideId, setDragOverSlideId] = useState<string | null>(null)
  const [showNotesSidebar, setShowNotesSidebar] = useState(false)
  const [showSettingsSidebar, setShowSettingsSidebar] = useState(false)
  const [showLayoutSidebar, setShowLayoutSidebar] = useState(false)
  const [showImageSidebar, setShowImageSidebar] = useState(false)
  const [showContentSidebar, setShowContentSidebar] = useState(false)
  const [editingNotes, setEditingNotes] = useState('')
  const [hasNotesChanged, setHasNotesChanged] = useState(false)
  const [loadingNotes, setLoadingNotes] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [slideToDelete, setSlideToDelete] = useState<string | null>(null)

  const fetchPresentation = useCallback(async () => {
    try {
      const data = await getPresentation(params.id as string)
      if (!data) {
        throw new Error('Presentation not found')
      }
      setPresentation(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [params.id])

  useEffect(() => {
    fetchPresentation()
  }, [fetchPresentation])

  // Sync editing notes when active slide changes (but not when there are unsaved changes)
  useEffect(() => {
    if (activeSlideId && presentation && showNotesSidebar && !hasNotesChanged) {
      const activeSlide = presentation.slides.find(s => s.id === activeSlideId)
      if (activeSlide) {
        setEditingNotes(activeSlide.narration || '')
      }
    }
  }, [activeSlideId, presentation, showNotesSidebar, hasNotesChanged])

  const handleSaveSlide = async (slide: Slide) => {
    try {
      const formData = new FormData()
      formData.append('slideId', slide.id)
      formData.append('title', slide.title)
      formData.append('content', slide.content)
      if (slide.narration) formData.append('narration', slide.narration)
      if (slide.annotations) formData.append('annotations', slide.annotations)
      formData.append('layout', slide.layout)
      if (slide.imageUrl) formData.append('imageUrl', slide.imageUrl)
      if (slide.backgroundColor) formData.append('backgroundColor', slide.backgroundColor)
      if (slide.textColor) formData.append('textColor', slide.textColor)
      if (slide.headingColor) formData.append('headingColor', slide.headingColor)
      if (slide.textAlign) formData.append('textAlign', slide.textAlign)
      formData.append('showTitle', (slide.showTitle !== false).toString())
      formData.append('showContent', (slide.showContent !== false).toString())

      const result = await updateSlide(formData)
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to save slide')
      }

      await fetchPresentation()
    } catch (error) {
      console.error('Error saving slide:', error)
      throw error
    }
  }

  const handleRequestDelete = (slideId: string) => {
    setSlideToDelete(slideId)
    setShowDeleteModal(true)
  }

  const handleDeleteSlide = async (slideId: string) => {
    try {
      const result = await deleteSlide(slideId)
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete slide')
      }

      await fetchPresentation()
    } catch (error) {
      console.error('Error deleting slide:', error)
    }
  }

  const handleDuplicateSlide = async (slideId: string) => {
    try {
      const result = await duplicateSlide(slideId)
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to duplicate slide')
      }

      await fetchPresentation()
    } catch (error) {
      console.error('Error duplicating slide:', error)
    }
  }

  const handleConfirmDelete = () => {
    if (slideToDelete) {
      handleDeleteSlide(slideToDelete)
      setSlideToDelete(null)
    }
  }

  const handleRegenerateSlide = async (slideId: string) => {
    try {
      const result = await regenerateSlide(slideId)
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to regenerate slide')
      }

      // Store comparison data in localStorage and navigate to comparison page
      localStorage.setItem('slideComparison', JSON.stringify(result))
      window.location.href = `/presentations/${params.id}/compare/${slideId}`
    } catch (error) {
      console.error('Error regenerating slide:', error)
    }
  }

  const handleSplitSlide = async (slideId: string, splitSlides: SlideContent[]) => {
    try {
      // Delete the original slide
      const deleteResult = await deleteSlide(slideId)
      if (!deleteResult.success) {
        throw new Error(deleteResult.error || 'Failed to delete original slide')
      }

      // Create new slides from the split content
      // Note: This would need a createSlide server action - for now using the existing pattern
      for (const slideContent of splitSlides) {
        // This functionality might need to be implemented as a server action
        console.log('Split slide creation needed:', slideContent)
      }

      // Refresh the presentation
      await fetchPresentation()
    } catch (error) {
      console.error('Error splitting slide:', error)
      throw error
    }
  }

  const handleApplyThemeToAllSlides = async (themeUpdates: { backgroundColor?: string, textColor?: string, headingColor?: string }) => {
    if (!presentation) return
    
    try {
      const result = await applyThemeToAllSlides(presentation.id, themeUpdates)
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to apply theme to all slides')
      }
      
      await fetchPresentation()
    } catch (error) {
      console.error('Error applying theme to all slides:', error)
    }
  }

  const handleUpdatePresentation = async (updates: Partial<Presentation>) => {
    try {
      const formData = new FormData()
      formData.append('presentationId', params.id as string)
      
      if (updates.title) formData.append('title', updates.title)
      if (updates.description) formData.append('description', updates.description)
      if (updates.primaryColor) formData.append('primaryColor', updates.primaryColor)
      if (updates.secondaryColor) formData.append('secondaryColor', updates.secondaryColor)
      if (updates.fontFamily) formData.append('fontFamily', updates.fontFamily)

      const result = await updatePresentation(formData)
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to update presentation')
      }

      await fetchPresentation()
    } catch (error) {
      console.error('Error updating presentation:', error)
    }
  }

  const handleDragStart = (e: React.DragEvent, slideId: string) => {
    setDraggedSlideId(slideId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, slideId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverSlideId(slideId)
  }

  const handleDragLeave = () => {
    setDragOverSlideId(null)
  }

  const handleDrop = async (e: React.DragEvent, targetSlideId: string) => {
    e.preventDefault()
    
    if (!draggedSlideId || draggedSlideId === targetSlideId) {
      setDraggedSlideId(null)
      setDragOverSlideId(null)
      return
    }

    if (!presentation) return

    const draggedSlide = presentation.slides.find(s => s.id === draggedSlideId)
    const targetSlide = presentation.slides.find(s => s.id === targetSlideId)

    if (!draggedSlide || !targetSlide) return

    try {
      const result = await reorderSlides(presentation.id, draggedSlideId, targetSlide.order)
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to reorder slides')
      }

      await fetchPresentation()
    } catch (error) {
      console.error('Error reordering slides:', error)
    }

    setDraggedSlideId(null)
    setDragOverSlideId(null)
  }

  const handleGenerateNotes = async (slide: Slide) => {
    setLoadingNotes(true)
    try {
      // This would need to be implemented as a server action
      // For now, just show a placeholder
      setEditingNotes('AI-generated speaker notes would appear here...')
      setHasNotesChanged(true)
    } catch (error) {
      console.error('Failed to generate notes:', error)
    }
    setLoadingNotes(false)
  }

  const handleSaveNotes = async (slide: Slide) => {
    if (!hasNotesChanged) return
    
    try {
      const formData = new FormData()
      formData.append('slideId', slide.id)
      formData.append('title', slide.title)
      formData.append('content', slide.content)
      formData.append('narration', editingNotes)
      formData.append('layout', slide.layout)
      if (slide.imageUrl) formData.append('imageUrl', slide.imageUrl)
      if (slide.backgroundColor) formData.append('backgroundColor', slide.backgroundColor)
      if (slide.textColor) formData.append('textColor', slide.textColor)
      if (slide.headingColor) formData.append('headingColor', slide.headingColor)
      if (slide.textAlign) formData.append('textAlign', slide.textAlign)
      formData.append('showTitle', (slide.showTitle !== false).toString())
      formData.append('showContent', (slide.showContent !== false).toString())

      const result = await updateSlide(formData)
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to save notes')
      }

      setHasNotesChanged(false)
      await fetchPresentation()
    } catch (error) {
      console.error('Error saving notes:', error)
    }
  }

  const handleLayoutChange = async (newLayout: SlideLayoutType, slideId?: string) => {
    const targetSlideId = slideId || activeSlideId
    
    if (!targetSlideId || !presentation) return

    const targetSlide = presentation.slides.find(s => s.id === targetSlideId)
    if (!targetSlide) return

    try {
      const formData = new FormData()
      formData.append('slideId', targetSlide.id)
      formData.append('title', targetSlide.title)
      formData.append('content', targetSlide.content)
      if (targetSlide.narration) formData.append('narration', targetSlide.narration)
      formData.append('layout', newLayout)
      
      // For image-based layouts, ensure we add a placeholder image if none exists
      const imageLayouts = ['TEXT_IMAGE_LEFT', 'TEXT_IMAGE_RIGHT', 'IMAGE_FULL', 'BULLETS_IMAGE', 'IMAGE_BACKGROUND', 'IMAGE_OVERLAY', 'SPLIT_CONTENT', 'COMPARISON']
      if (imageLayouts.includes(newLayout) && !targetSlide.imageUrl) {
        formData.append('imageUrl', 'https://images.unsplash.com/photo-1557804506-669a67965ba0?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&h=800&q=80')
      } else if (targetSlide.imageUrl) {
        formData.append('imageUrl', targetSlide.imageUrl)
      }
      
      if (targetSlide.backgroundColor) formData.append('backgroundColor', targetSlide.backgroundColor)
      if (targetSlide.textColor) formData.append('textColor', targetSlide.textColor)
      if (targetSlide.headingColor) formData.append('headingColor', targetSlide.headingColor)
      if (targetSlide.textAlign) formData.append('textAlign', targetSlide.textAlign)

      const result = await updateSlide(formData)
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to update layout')
      }

      await fetchPresentation()
    } catch (error) {
      console.error('Error updating layout:', error)
    }
  }

  const handleThemeChange = async (field: string, value: string, slideId: string) => {
    if (!presentation) return

    const targetSlide = presentation.slides.find(s => s.id === slideId)
    if (!targetSlide) return

    try {
      const formData = new FormData()
      formData.append('slideId', targetSlide.id)
      formData.append('title', targetSlide.title)
      formData.append('content', targetSlide.content)
      if (targetSlide.narration) formData.append('narration', targetSlide.narration)
      formData.append('layout', targetSlide.layout)
      if (targetSlide.imageUrl) formData.append('imageUrl', targetSlide.imageUrl)
      
      // Apply the theme change
      formData.append(field, value)
      
      // Keep existing theme values
      if (field !== 'backgroundColor' && targetSlide.backgroundColor) formData.append('backgroundColor', targetSlide.backgroundColor)
      if (field !== 'textColor' && targetSlide.textColor) formData.append('textColor', targetSlide.textColor)
      if (field !== 'headingColor' && targetSlide.headingColor) formData.append('headingColor', targetSlide.headingColor)
      if (field !== 'textAlign' && targetSlide.textAlign) formData.append('textAlign', targetSlide.textAlign)

      const result = await updateSlide(formData)
      
      if (!result.success) {
        throw new Error(result.error || `Failed to update ${field}`)
      }

      await fetchPresentation()
    } catch (error) {
      console.error(`Error updating ${field}:`, error)
    }
  }

  const handleToggleChange = async (field: 'showTitle' | 'showContent', value: boolean, slideId: string) => {
    if (!presentation) return

    const targetSlide = presentation.slides.find(s => s.id === slideId)
    if (!targetSlide) return

    try {
      const formData = new FormData()
      formData.append('slideId', targetSlide.id)
      formData.append('title', targetSlide.title)
      formData.append('content', targetSlide.content)
      if (targetSlide.narration) formData.append('narration', targetSlide.narration)
      formData.append('layout', targetSlide.layout)
      if (targetSlide.imageUrl) formData.append('imageUrl', targetSlide.imageUrl)
      if (targetSlide.backgroundColor) formData.append('backgroundColor', targetSlide.backgroundColor)
      if (targetSlide.textColor) formData.append('textColor', targetSlide.textColor)
      if (targetSlide.headingColor) formData.append('headingColor', targetSlide.headingColor)
      if (targetSlide.textAlign) formData.append('textAlign', targetSlide.textAlign)
      
      // Add the specific toggle field
      formData.append(field, value.toString())

      const result = await updateSlide(formData)
      
      if (!result.success) {
        throw new Error(result.error || `Failed to update ${field}`)
      }

      await fetchPresentation()
    } catch (error) {
      console.error(`Error updating ${field}:`, error)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-background p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="min-h-screen bg-background p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-destructive mb-4">Error</h1>
            <p className="text-muted-foreground">{error}</p>
            <Link href="/" className="mt-4 inline-block bg-primary text-primary-foreground px-4 py-2 rounded hover:bg-primary/90">
              Go Home
            </Link>
          </div>
        </div>
      </main>
    )
  }

  if (!presentation) {
    return (
      <main className="min-h-screen bg-background p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-4">Presentation not found</h1>
            <Link href="/" className="bg-primary text-primary-foreground px-4 py-2 rounded hover:bg-primary/90">
              Go Home
            </Link>
          </div>
        </div>
      </main>
    )
  }

  return (
    <motion.main 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-background"
    >
      <div className={`flex transition-all duration-300 ${
        (showNotesSidebar + showSettingsSidebar + showLayoutSidebar + showImageSidebar + showContentSidebar >= 2) ? 'mr-[768px]' : 
        (showNotesSidebar || showSettingsSidebar || showLayoutSidebar || showImageSidebar || showContentSidebar) ? 'mr-96' : ''
      }`}>
        <div className="flex-1 p-8">
          <div className="max-w-6xl mx-auto">
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                {presentation.title}
              </h1>
              {presentation.description && (
                <p className="text-muted-foreground">{presentation.description}</p>
              )}
            </div>
            <div className="flex space-x-3">
              <motion.a
                href={`/presentations/${presentation.id}/view`}
                className="bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-3 rounded-lg hover:from-green-700 hover:to-green-800 transition-all shadow-lg hover:shadow-xl font-medium"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Present
              </motion.a>
              <motion.a
                href="/presentations"
                className="bg-background text-foreground px-6 py-3 rounded-lg hover:bg-muted transition-colors border border-border shadow-sm hover:shadow-md font-medium"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Back to Presentations
              </motion.a>
            </div>
          </div>
          
          <div className="text-sm text-muted-foreground">
            {presentation.slides.length} slide{presentation.slides.length !== 1 ? 's' : ''}
          </div>
        </motion.div>

        <div className="space-y-6">
          {presentation.slides.map((slide, index) => (
            <motion.div 
              key={slide.id}
              draggable
              onDragStart={(e) => handleDragStart(e, slide.id)}
              onDragOver={(e) => handleDragOver(e, slide.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, slide.id)}
              className={`group relative transition-all duration-200 ${
                draggedSlideId === slide.id ? 'opacity-50 scale-95' : ''
              } ${
                dragOverSlideId === slide.id && draggedSlideId !== slide.id
                  ? 'ring-2 ring-blue-500 ring-opacity-50 bg-blue-50'
                  : ''
              }`}
              whileHover={{ scale: 1.01 }}
              layout
            >
              <div className="absolute -left-12 top-1/2 -translate-y-1/2 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-grab active:cursor-grabbing">
                <div className="flex flex-col items-center justify-center w-8 h-12 bg-gradient-to-b from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 rounded-lg shadow-lg border border-gray-300 group">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-gray-600 group-hover:text-gray-800 transition-colors">
                    <circle cx="9" cy="6" r="1.5" fill="currentColor"/>
                    <circle cx="15" cy="6" r="1.5" fill="currentColor"/>
                    <circle cx="9" cy="12" r="1.5" fill="currentColor"/>
                    <circle cx="15" cy="12" r="1.5" fill="currentColor"/>
                    <circle cx="9" cy="18" r="1.5" fill="currentColor"/>
                    <circle cx="15" cy="18" r="1.5" fill="currentColor"/>
                  </svg>
                </div>
              </div>
              
              <WysiwygSlideEditor
                slide={slide}
                presentation={presentation}
                onSave={handleSaveSlide}
                onDelete={handleDeleteSlide}
                onRequestDelete={handleRequestDelete}
                onDuplicate={handleDuplicateSlide}
                onRegenerate={handleRegenerateSlide}
                onUpdatePresentation={handleUpdatePresentation}
                onApplyThemeToAllSlides={handleApplyThemeToAllSlides}
                applyToAllSlides={applyToAllSlides}
                onApplyToAllChange={setApplyToAllSlides}
                isActive={activeSlideId === slide.id}
                onActivate={() => setActiveSlideId(slide.id)}
                onOpenNotes={() => {
                  setActiveSlideId(slide.id)
                  setShowSettingsSidebar(false) // Close settings panel
                  setShowLayoutSidebar(false) // Close layout panel
                  setShowImageSidebar(false) // Close image panel
                  setShowContentSidebar(false) // Close content panel
                  setShowNotesSidebar(true)
                  // editingNotes will be synced by useEffect
                }}
                onOpenSettings={() => {
                  setActiveSlideId(slide.id)
                  setShowNotesSidebar(false) // Close notes panel  
                  setShowLayoutSidebar(false) // Close layout panel
                  setShowImageSidebar(false) // Close image panel
                  setShowContentSidebar(false) // Close content panel
                  setShowSettingsSidebar(true)
                }}
                onOpenLayout={() => {
                  setActiveSlideId(slide.id)
                  setShowNotesSidebar(false) // Close notes panel
                  setShowSettingsSidebar(false) // Close settings panel
                  setShowImageSidebar(false) // Close image panel
                  setShowContentSidebar(false) // Close content panel
                  setShowLayoutSidebar(true)
                }}
                onOpenImage={() => {
                  setActiveSlideId(slide.id)
                  setShowNotesSidebar(false) // Close notes panel
                  setShowSettingsSidebar(false) // Close settings panel
                  setShowLayoutSidebar(false) // Close layout panel
                  setShowContentSidebar(false) // Close content panel
                  setShowImageSidebar(true)
                }}
                onOpenContent={() => {
                  setActiveSlideId(slide.id)
                  setShowNotesSidebar(false) // Close notes panel
                  setShowSettingsSidebar(false) // Close settings panel
                  setShowLayoutSidebar(false) // Close layout panel
                  setShowImageSidebar(false) // Close image panel
                  setShowContentSidebar(true)
                }}
              />
              
              <AddSlideButton
                presentationId={presentation.id}
                afterOrder={slide.order}
                onSlideAdded={fetchPresentation}
                presentation={presentation}
                applyToAllSlides={applyToAllSlides}
                currentSlideTheme={activeSlideId ? (() => {
                  const activeSlide = presentation.slides.find(s => s.id === activeSlideId)
                  return activeSlide ? {
                    backgroundColor: activeSlide.backgroundColor,
                    textColor: activeSlide.textColor,
                    headingColor: activeSlide.headingColor
                  } : undefined
                })() : undefined}
              />
            </motion.div>
          ))}
        </div>

        {presentation.slides.length === 0 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              No slides found
            </h2>
            <p className="text-gray-600 mb-6">
              This presentation doesn&apos;t have any slides yet.
            </p>
            <AddSlideButton
              presentationId={presentation.id}
              afterOrder={0}
              onSlideAdded={fetchPresentation}
              presentation={presentation}
              applyToAllSlides={applyToAllSlides}
            />
          </motion.div>
        )}
        </div>
        </div>

        {/* Notes Sidebar */}
        {showNotesSidebar && (
          <motion.div
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="fixed right-0 top-0 h-screen w-96 bg-background border-l border-border shadow-lg z-50 flex flex-col"
          >
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h3 className="text-lg font-semibold text-foreground">
                Speaker Notes
              </h3>
              <button
                onClick={() => setShowNotesSidebar(false)}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              {activeSlideId && presentation ? (
                (() => {
                  const activeSlide = presentation.slides.find(s => s.id === activeSlideId)
                  return activeSlide ? (
                    <div className="space-y-6">
                      <div className="p-3 bg-muted rounded-lg">
                        <h4 className="font-medium text-muted-foreground text-sm mb-2">Current Slide:</h4>
                        <p className="text-sm font-semibold text-foreground">{activeSlide.title}</p>
                      </div>
                      
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <label className="text-sm font-medium text-foreground">Speaker Notes</label>
                          <button
                            onClick={() => handleGenerateNotes(activeSlide)}
                            className="flex items-center gap-1 px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition-colors"
                            disabled={loadingNotes}
                          >
                            <Sparkles className="w-3 h-3" />
                            {loadingNotes ? 'Generating...' : 'Generate'}
                          </button>
                        </div>
                        <textarea
                          key={activeSlide.id}
                          value={editingNotes}
                          onChange={(e) => {
                            setEditingNotes(e.target.value)
                            setHasNotesChanged(true)
                          }}
                          className="w-full h-64 p-3 border border-input bg-background text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                          placeholder="Add speaker notes for this slide..."
                        />
                        {hasNotesChanged && (
                          <div className="mt-3 flex justify-end space-x-2">
                            <button
                              onClick={() => {
                                const slide = presentation.slides.find(s => s.id === activeSlideId)
                                if (slide) {
                                  setEditingNotes(slide.narration || '')
                                  setHasNotesChanged(false)
                                }
                              }}
                              className="px-3 py-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleSaveNotes(activeSlide)}
                              className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
                            >
                              Save Notes
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : null
                })()
              ) : (
                <div className="text-center py-12">
                  <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Select a slide to add speaker notes</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Settings Sidebar */}
        {showSettingsSidebar && (
          <motion.div
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="fixed right-0 top-0 h-screen w-96 bg-background border-l border-border shadow-lg z-50 flex flex-col"
          >
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h3 className="text-lg font-semibold text-foreground">
                Design Settings
              </h3>
              <button
                onClick={() => setShowSettingsSidebar(false)}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              {activeSlideId && presentation ? (
                (() => {
                  const activeSlide = presentation.slides.find(s => s.id === activeSlideId)
                  return activeSlide ? (
                    <div className="space-y-6">
                      <div className="p-3 bg-muted rounded-lg">
                        <h4 className="font-medium text-muted-foreground text-sm mb-2">Current Slide:</h4>
                        <p className="text-sm font-semibold text-foreground">{activeSlide.title}</p>
                      </div>
                      
                      <div className="space-y-6">
                        <div className="space-y-4">
                          <h4 className="text-sm font-medium text-foreground">Presentation Theme</h4>
                          <p className="text-xs text-muted-foreground">Apply styling changes that will be visible throughout your presentation</p>
                        </div>
                        
                        {/* Theme Presets */}
                        <div className="space-y-4">
                          <div className="flex items-center gap-2">
                            <Palette className="w-4 h-4" />
                            <h5 className="text-sm font-medium">Quick Themes</h5>
                          </div>
                          
                          <div className="grid grid-cols-1 gap-3">
                            {[
                              { name: 'Light', primary: '#3B82F6', secondary: '#1E40AF', bg: '#FFFFFF', text: '#1F2937', heading: '#111827' },
                              { name: 'Dark', primary: '#60A5FA', secondary: '#93C5FD', bg: '#1F2937', text: '#F3F4F6', heading: '#FFFFFF' },
                              { name: 'Professional', primary: '#3B82F6', secondary: '#1E40AF', bg: '#FFFFFF', text: '#1F2937', heading: '#3B82F6' },
                              { name: 'Warm', primary: '#F59E0B', secondary: '#D97706', bg: '#FEF3C7', text: '#92400E', heading: '#D97706' },
                              { name: 'Cool', primary: '#10B981', secondary: '#059669', bg: '#ECFDF5', text: '#065F46', heading: '#10B981' }
                            ].map((themePreset) => (
                              <button
                                key={themePreset.name}
                                onClick={async () => {
                                  if (applyToAllSlides) {
                                    await handleUpdatePresentation({
                                      primaryColor: themePreset.primary,
                                      secondaryColor: themePreset.secondary
                                    })
                                    await handleApplyThemeToAllSlides({
                                      backgroundColor: themePreset.bg,
                                      textColor: themePreset.text,
                                      headingColor: themePreset.heading
                                    })
                                  } else {
                                    await handleSaveSlide({
                                      ...activeSlide,
                                      backgroundColor: themePreset.bg,
                                      textColor: themePreset.text,
                                      headingColor: themePreset.heading
                                    })
                                  }
                                }}
                                className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted transition-colors text-left"
                              >
                                <div 
                                  className="w-8 h-8 rounded-full border"
                                  style={{ backgroundColor: themePreset.bg }}
                                />
                                <div>
                                  <div className="text-sm font-medium text-foreground">{themePreset.name}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {applyToAllSlides ? 'Apply to all slides' : 'Apply to current slide'}
                                  </div>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Custom Colors */}
                        <div className="space-y-4">
                          <div className="flex items-center gap-2">
                            <Layout className="w-4 h-4" />
                            <h5 className="text-sm font-medium">Custom Colors</h5>
                          </div>
                          
                          <div className="space-y-3">
                            <div>
                              <label className="text-xs font-medium text-muted-foreground">Primary Color</label>
                              <input
                                type="color"
                                value={presentation.primaryColor}
                                onChange={(e) => handleUpdatePresentation({ primaryColor: e.target.value })}
                                className="w-full h-10 rounded border border-border"
                              />
                            </div>
                            
                            <div>
                              <label className="text-xs font-medium text-muted-foreground">Secondary Color</label>
                              <input
                                type="color"
                                value={presentation.secondaryColor}
                                onChange={(e) => handleUpdatePresentation({ secondaryColor: e.target.value })}
                                className="w-full h-10 rounded border border-border"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Font Family */}
                        <div className="space-y-4">
                          <div className="flex items-center gap-2">
                            <Type className="w-4 h-4" />
                            <h5 className="text-sm font-medium">Font Family</h5>
                          </div>
                          
                          <select
                            value={presentation.fontFamily}
                            onChange={(e) => handleUpdatePresentation({ fontFamily: e.target.value })}
                            className="w-full p-2 rounded border border-border bg-background text-foreground"
                          >
                            <option value="Inter">Inter</option>
                            <option value="Georgia">Georgia</option>
                            <option value="Arial">Arial</option>
                            <option value="Times New Roman">Times New Roman</option>
                            <option value="Helvetica">Helvetica</option>
                          </select>
                        </div>

                        {/* Apply to All Toggle */}
                        <div className="flex items-center justify-between p-3 border border-border rounded-lg">
                          <div>
                            <div className="text-sm font-medium">Apply to All Slides</div>
                            <div className="text-xs text-muted-foreground">Changes affect all slides</div>
                          </div>
                          <button
                            onClick={() => setApplyToAllSlides(!applyToAllSlides)}
                            className={`w-12 h-6 rounded-full transition-colors ${
                              applyToAllSlides ? 'bg-primary' : 'bg-muted'
                            }`}
                          >
                            <div
                              className={`w-5 h-5 rounded-full bg-white transition-transform ${
                                applyToAllSlides ? 'translate-x-6' : 'translate-x-0.5'
                              }`}
                            />
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : null
                })()
              ) : (
                <div className="text-center py-12">
                  <Palette className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Select a slide to customize its design</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Layout Sidebar */}
        {showLayoutSidebar && (
          <motion.div
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="fixed right-0 top-0 h-screen w-96 bg-background border-l border-border shadow-lg z-50 flex flex-col"
          >
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h3 className="text-lg font-semibold text-foreground">
                Layout Templates
              </h3>
              <button
                onClick={() => setShowLayoutSidebar(false)}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              {activeSlideId && presentation ? (
                (() => {
                  const activeSlide = presentation.slides.find(s => s.id === activeSlideId)
                  return activeSlide ? (
                    <div className="space-y-6">
                      <div className="p-3 bg-muted rounded-lg">
                        <h4 className="font-medium text-muted-foreground text-sm mb-2">Current Slide:</h4>
                        <p className="text-sm font-semibold text-foreground">{activeSlide.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Current layout: {activeSlide.layout.replace('_', ' ').toLowerCase()}
                        </p>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium text-foreground mb-4">Choose Layout</h4>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { id: 'TEXT_ONLY', name: 'Text Only', description: 'Simple text-based slide', preview: 'bg-gradient-to-br from-gray-100 to-gray-200' },
                            { id: 'TITLE_COVER', name: 'Title Cover', description: 'Large title slide with subtitle', preview: 'bg-gradient-to-br from-blue-500 to-purple-600' },
                            { id: 'TITLE_ONLY', name: 'Title Only', description: 'Clean title slide without subtitle', preview: 'bg-gradient-to-br from-emerald-500 to-teal-600' },
                            { id: 'TEXT_IMAGE_LEFT', name: 'Text + Image Left', description: 'Image on left, text on right', preview: 'bg-gradient-to-r from-green-200 to-blue-200' },
                            { id: 'TEXT_IMAGE_RIGHT', name: 'Text + Image Right', description: 'Text on left, image on right', preview: 'bg-gradient-to-r from-blue-200 to-green-200' },
                            { id: 'IMAGE_FULL', name: 'Full Image', description: 'Image covers entire slide', preview: 'bg-gradient-to-br from-purple-400 to-pink-400' },
                            { id: 'BULLETS_IMAGE', name: 'Bullets + Image', description: 'Bullet points with supporting image', preview: 'bg-gradient-to-br from-orange-300 to-red-300' },
                            { id: 'TWO_COLUMN', name: 'Two Columns', description: 'Side-by-side content layout', preview: 'bg-gradient-to-r from-teal-200 to-cyan-200' },
                            { id: 'IMAGE_BACKGROUND', name: 'Image Background', description: 'Text over background image', preview: 'bg-gradient-to-br from-indigo-400 to-purple-500' },
                            { id: 'TIMELINE', name: 'Timeline', description: 'Sequential timeline layout', preview: 'bg-gradient-to-r from-amber-300 to-orange-400' },
                            { id: 'QUOTE_LARGE', name: 'Large Quote', description: 'Prominent quote or testimonial', preview: 'bg-gradient-to-br from-rose-300 to-pink-400' },
                            { id: 'STATISTICS_GRID', name: 'Statistics Grid', description: 'Grid layout for stats and numbers', preview: 'bg-gradient-to-br from-cyan-300 to-blue-400' },
                            { id: 'IMAGE_OVERLAY', name: 'Image Overlay', description: 'Text overlaid on image with effects', preview: 'bg-gradient-to-br from-violet-400 to-purple-500' },
                            { id: 'SPLIT_CONTENT', name: 'Split Content', description: 'Asymmetrical content split', preview: 'bg-gradient-to-r from-lime-300 to-green-400' },
                            { id: 'COMPARISON', name: 'Comparison', description: 'Side-by-side comparison layout', preview: 'bg-gradient-to-r from-red-300 to-yellow-300' }
                          ].map((option) => (
                            <button
                              key={option.id}
                              onClick={() => handleLayoutChange(option.id as SlideLayoutType, activeSlide.id)}
                              className={`p-2 rounded-lg border-2 transition-all hover:border-blue-300 ${
                                activeSlide.layout === option.id 
                                  ? 'border-blue-500 bg-blue-50' 
                                  : 'border-gray-200 hover:bg-gray-50'
                              }`}
                            >
                              <div className={`w-full h-12 rounded ${option.preview} mb-2 flex items-center justify-center`}>
                                <div className="text-white/80">
                                  <Layout className="w-4 h-4" />
                                </div>
                              </div>
                              <div className="text-left">
                                <div className="text-xs font-medium text-gray-900 mb-1">
                                  {option.name}
                                </div>
                                <div className="text-xs text-gray-500 leading-tight">
                                  {option.description}
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Image Options for Image-Based Layouts */}
                      {(['TEXT_IMAGE_LEFT', 'TEXT_IMAGE_RIGHT', 'IMAGE_FULL', 'BULLETS_IMAGE', 'IMAGE_BACKGROUND', 'IMAGE_OVERLAY', 'SPLIT_CONTENT', 'COMPARISON'] as const).includes(activeSlide.layout) && (
                        <div className="space-y-4">
                          <h4 className="text-sm font-medium text-foreground">Image Options</h4>
                          {activeSlide.imageUrl && (
                            <div className="space-y-2">
                              <img 
                                src={activeSlide.imageUrl} 
                                alt="Slide image" 
                                className="w-full h-24 object-cover rounded-lg border border-border"
                              />
                            </div>
                          )}
                          <div className="flex flex-col gap-2">
                            <button
                              onClick={() => {
                                // This would open a file picker or image upload modal
                                // For now, show a placeholder message
                                alert('Image upload functionality will be implemented here')
                              }}
                              className="flex items-center gap-2 px-3 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                            >
                              <Upload className="w-4 h-4" />
                              Upload Image
                            </button>
                            <button
                              onClick={() => {
                                // This would open an AI image generation modal
                                // For now, show a placeholder message
                                alert('AI image generation functionality will be implemented here')
                              }}
                              className="flex items-center gap-2 px-3 py-2 text-sm bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
                            >
                              <Sparkles className="w-4 h-4" />
                              Generate with AI
                            </button>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Upload your own image or generate one using AI for this slide layout.
                          </p>
                        </div>
                      )}
                    </div>
                  ) : null
                })()
              ) : (
                <div className="text-center py-12">
                  <Layout className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Select a slide to change its layout</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Image Sidebar */}
        {showImageSidebar && (
          <motion.div
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="fixed right-0 top-0 h-screen w-96 bg-background border-l border-border shadow-lg z-50 flex flex-col"
          >
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h3 className="text-lg font-semibold text-foreground">
                Image Options
              </h3>
              <button
                onClick={() => setShowImageSidebar(false)}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              {activeSlideId && presentation ? (
                (() => {
                  const activeSlide = presentation.slides.find(s => s.id === activeSlideId)
                  return activeSlide ? (
                    <div className="space-y-6">
                      <div className="p-3 bg-muted rounded-lg">
                        <h4 className="font-medium text-muted-foreground text-sm mb-2">Current Slide:</h4>
                        <p className="text-sm font-semibold text-foreground">{activeSlide.title}</p>
                      </div>

                      {/* Current Image */}
                      {activeSlide.imageUrl && (
                        <div className="space-y-3">
                          <h4 className="text-sm font-medium text-foreground">Current Image</h4>
                          <img 
                            src={activeSlide.imageUrl} 
                            alt="Current slide image" 
                            className="w-full h-32 object-cover rounded-lg border border-border"
                          />
                        </div>
                      )}

                      {/* Image Actions */}
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium text-foreground">Image Actions</h4>
                        
                        <button
                          onClick={() => {
                            // Placeholder for upload functionality
                            alert('Image upload functionality will be implemented')
                          }}
                          className="w-full flex items-center gap-3 p-3 border border-border rounded-lg hover:bg-muted transition-colors"
                        >
                          <Upload className="w-5 h-5 text-primary" />
                          <div className="text-left">
                            <div className="font-medium text-sm">Upload Image</div>
                            <div className="text-xs text-muted-foreground">Choose from your device</div>
                          </div>
                        </button>

                        <button
                          onClick={() => {
                            // Placeholder for AI generation
                            alert('AI image generation will be implemented')
                          }}
                          className="w-full flex items-center gap-3 p-3 border border-border rounded-lg hover:bg-muted transition-colors"
                        >
                          <Sparkles className="w-5 h-5 text-purple-600" />
                          <div className="text-left">
                            <div className="font-medium text-sm">Generate with AI</div>
                            <div className="text-xs text-muted-foreground">Create image from description</div>
                          </div>
                        </button>

                        {activeSlide.imageUrl && (
                          <button
                            onClick={() => {
                              // Placeholder for remove functionality
                              alert('Image removal functionality will be implemented')
                            }}
                            className="w-full flex items-center gap-3 p-3 border border-destructive/20 text-destructive rounded-lg hover:bg-destructive/5 transition-colors"
                          >
                            <Trash2 className="w-5 h-5" />
                            <div className="text-left">
                              <div className="font-medium text-sm">Remove Image</div>
                              <div className="text-xs text-destructive/70">Delete current image</div>
                            </div>
                          </button>
                        )}
                      </div>

                      {/* AI Style Prompt */}
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium text-foreground">AI Style Settings</h4>
                        <p className="text-xs text-muted-foreground">
                          Set your brand style that will be included with AI image generation requests.
                        </p>
                        
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-foreground">Brand Style Prompt</label>
                          <textarea
                            placeholder="e.g., Corporate minimalist style, blue and white colors, professional photography, clean backgrounds..."
                            className="w-full h-20 p-3 text-sm border border-border bg-background text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                          />
                          <button className="w-full px-3 py-2 text-xs bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">
                            Save Style Settings
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : null
                })()
              ) : (
                <div className="text-center py-12">
                  <ImageIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Select a slide to manage its images</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Content Sidebar */}
        {showContentSidebar && (
          <motion.div
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="fixed right-0 top-0 h-screen w-96 bg-background border-l border-border shadow-lg z-50 flex flex-col"
          >
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h3 className="text-lg font-semibold text-foreground">
                Content Visibility
              </h3>
              <button
                onClick={() => setShowContentSidebar(false)}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              {activeSlideId && presentation ? (
                (() => {
                  const activeSlide = presentation.slides.find(s => s.id === activeSlideId)
                  return activeSlide ? (
                    <div className="space-y-6">
                      <div className="p-3 bg-muted rounded-lg">
                        <h4 className="font-medium text-muted-foreground text-sm mb-2">Current Slide:</h4>
                        <p className="text-sm font-semibold text-foreground">{activeSlide.title}</p>
                      </div>

                      <div className="space-y-4">
                        <h4 className="text-sm font-medium text-foreground">Toggle Content Elements</h4>
                        <p className="text-xs text-muted-foreground">
                          Control which content elements are displayed on this slide.
                        </p>
                        
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <label className="text-sm font-medium text-foreground">Show Title</label>
                              <p className="text-xs text-muted-foreground">Display the slide title</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={activeSlide.showTitle !== false}
                                onChange={(e) => handleToggleChange('showTitle', e.target.checked, activeSlide.id)}
                                className="sr-only peer"
                              />
                              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                            </label>
                          </div>

                          <div className="flex items-center justify-between">
                            <div>
                              <label className="text-sm font-medium text-foreground">Show Content</label>
                              <p className="text-xs text-muted-foreground">Display the slide content</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={activeSlide.showContent !== false}
                                onChange={(e) => handleToggleChange('showContent', e.target.checked, activeSlide.id)}
                                className="sr-only peer"
                              />
                              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                            </label>
                          </div>
                        </div>

                        <div className="mt-6 p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <p className="text-xs text-blue-700">
                            <strong>Note:</strong> These settings only affect this specific slide. Changes will be visible in both edit and presentation modes.
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : null
                })()
              ) : (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Select a slide to manage its content visibility</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>

      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false)
          setSlideToDelete(null)
        }}
        onConfirm={handleConfirmDelete}
        title="Delete Slide"
        description="Are you sure you want to delete this slide? This action cannot be undone."
      />
    </motion.main>
  )
}
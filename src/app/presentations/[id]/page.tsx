'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { X, MessageSquare, Sparkles, Palette, Type, Layout } from 'lucide-react'
import WysiwygSlideEditor from '@/components/WysiwygSlideEditor'
import AddSlideButton from '@/components/AddSlideButton'
import DeleteConfirmationModal from '@/components/DeleteConfirmationModal'
import { updateSlide, deleteSlide, updatePresentation, applyThemeToAllSlides, reorderSlides } from '@/lib/actions'
import { SlideContent } from '@/lib/ai-service'

interface Slide {
  id: string
  title: string
  content: string
  narration?: string
  slideType: string
  layout: 'TEXT_ONLY' | 'TITLE_COVER' | 'TEXT_IMAGE_LEFT' | 'TEXT_IMAGE_RIGHT' | 'IMAGE_FULL' | 'BULLETS_IMAGE' | 'TWO_COLUMN' | 'IMAGE_BACKGROUND'
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
  const [editingNotes, setEditingNotes] = useState('')
  const [hasNotesChanged, setHasNotesChanged] = useState(false)
  const [loadingNotes, setLoadingNotes] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [slideToDelete, setSlideToDelete] = useState<string | null>(null)

  const fetchPresentation = useCallback(async () => {
    try {
      const response = await fetch(`/api/presentations/${params.id}`)
      if (!response.ok) {
        throw new Error('Failed to fetch presentation')
      }
      const data = await response.json()
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
      formData.append('layout', slide.layout)
      if (slide.imageUrl) formData.append('imageUrl', slide.imageUrl)
      if (slide.backgroundColor) formData.append('backgroundColor', slide.backgroundColor)
      if (slide.textColor) formData.append('textColor', slide.textColor)
      if (slide.headingColor) formData.append('headingColor', slide.headingColor)
      if (slide.textAlign) formData.append('textAlign', slide.textAlign)

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

  const handleConfirmDelete = () => {
    if (slideToDelete) {
      handleDeleteSlide(slideToDelete)
      setSlideToDelete(null)
    }
  }

  const handleRegenerateSlide = async (slideId: string) => {
    try {
      const response = await fetch(`/api/slides/${slideId}/regenerate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      })

      if (!response.ok) {
        throw new Error('Failed to regenerate slide')
      }

      const data = await response.json()
      
      // Navigate to comparison page
      const comparisonData = {
        original: data.original,
        regenerated: data.regenerated,
        presentationId: params.id
      }
      
      localStorage.setItem('slideComparison', JSON.stringify(comparisonData))
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
      for (const slideContent of splitSlides) {
        const formData = new FormData()
        formData.append('presentationId', params.id as string)
        formData.append('title', slideContent.title)
        formData.append('content', slideContent.content)
        formData.append('slideType', slideContent.slideType)
        formData.append('layout', slideContent.layout)
        formData.append('order', slideContent.order.toString())

        const response = await fetch('/api/slides', {
          method: 'POST',
          body: formData
        })

        if (!response.ok) {
          throw new Error('Failed to create split slide')
        }
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
      
      // The apply-to-all logic for theme colors is now handled in BackgroundSettings
      // This function only updates presentation-level settings
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

  const handleGenerateNotes = async (slide: Slide) => {
    setLoadingNotes(true)
    try {
      const response = await fetch('/api/ai/generate-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: slide.title,
          content: slide.content,
          slideType: slide.slideType,
          prompt: presentation?.prompt
        })
      })
      
      if (response.ok) {
        const { notes } = await response.json()
        setEditingNotes(notes)
        setHasNotesChanged(true)
      }
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

      await updateSlide(formData)
      setHasNotesChanged(false)
      await fetchPresentation()
    } catch (error) {
      console.error('Failed to save notes:', error)
    }
  }

  const handleDrop = async (e: React.DragEvent, targetSlideId: string) => {
    e.preventDefault()
    
    if (!draggedSlideId || !presentation || draggedSlideId === targetSlideId) {
      setDraggedSlideId(null)
      setDragOverSlideId(null)
      return
    }

    const slides = [...presentation.slides].sort((a, b) => a.order - b.order)
    const draggedIndex = slides.findIndex(s => s.id === draggedSlideId)
    const targetIndex = slides.findIndex(s => s.id === targetSlideId)
    
    if (draggedIndex === -1 || targetIndex === -1) return

    // Reorder the slides array
    const reorderedSlides = [...slides]
    const [draggedSlide] = reorderedSlides.splice(draggedIndex, 1)
    reorderedSlides.splice(targetIndex, 0, draggedSlide)

    // Create new order assignments
    const slideOrders = reorderedSlides.map((slide, index) => ({
      id: slide.id,
      order: index + 1
    }))

    try {
      const result = await reorderSlides(presentation.id, slideOrders)
      if (result.success) {
        await fetchPresentation()
      }
    } catch (error) {
      console.error('Error reordering slides:', error)
    }

    setDraggedSlideId(null)
    setDragOverSlideId(null)
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
        showNotesSidebar && showSettingsSidebar ? 'mr-[768px]' : 
        (showNotesSidebar || showSettingsSidebar) ? 'mr-96' : ''
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
                href="/"
                className="bg-background text-foreground px-6 py-3 rounded-lg hover:bg-muted transition-colors border border-border shadow-sm hover:shadow-md font-medium"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Back to Home
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
                onRegenerate={handleRegenerateSlide}
                onSplitSlide={handleSplitSlide}
                onUpdatePresentation={handleUpdatePresentation}
                onApplyThemeToAllSlides={handleApplyThemeToAllSlides}
                applyToAllSlides={applyToAllSlides}
                onApplyToAllChange={setApplyToAllSlides}
                isActive={activeSlideId === slide.id}
                onActivate={() => setActiveSlideId(slide.id)}
                onOpenNotes={() => {
                  setActiveSlideId(slide.id)
                  setShowSettingsSidebar(false) // Close settings panel
                  setShowNotesSidebar(true)
                  // editingNotes will be synced by useEffect
                }}
                onOpenSettings={() => {
                  setActiveSlideId(slide.id)
                  setShowNotesSidebar(false) // Close notes panel  
                  setShowSettingsSidebar(true)
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
                          onBlur={() => handleSaveNotes(activeSlide)}
                          placeholder="Add speaker notes for this slide..."
                          className="w-full h-64 p-3 border border-border rounded-lg bg-background text-foreground resize-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                        <div className="flex justify-between items-center mt-2">
                          <p className="text-xs text-muted-foreground">
                            Notes are saved automatically when you click away
                          </p>
                          {hasNotesChanged && (
                            <span className="text-xs text-blue-600">Unsaved changes</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>Select a slide to view its notes</p>
                    </div>
                  )
                })()
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Select a slide to view its notes</p>
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
            className={`fixed top-0 h-screen w-96 bg-background border-l border-border shadow-lg z-50 flex flex-col ${
              showNotesSidebar ? 'right-96' : 'right-0'
            }`}
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
              {activeSlideId && presentation && (
                (() => {
                  const activeSlide = presentation.slides.find(s => s.id === activeSlideId)
                  return activeSlide ? (
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
                                  const activeSlide = presentation?.slides.find(s => s.id === activeSlideId)
                                  if (activeSlide) {
                                    await handleSaveSlide({
                                      ...activeSlide,
                                      backgroundColor: themePreset.bg,
                                      textColor: themePreset.text,
                                      headingColor: themePreset.heading
                                    })
                                  }
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
                  ) : null
                })()
              )}
            </div>
          </motion.div>
        )}

        {/* Delete Confirmation Modal */}
        <DeleteConfirmationModal
          isOpen={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false)
            setSlideToDelete(null)
          }}
          onConfirm={handleConfirmDelete}
        />
      </div>
    </motion.main>
  )
}
'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import WysiwygSlideEditor from '@/components/WysiwygSlideEditor'
import AddSlideButton from '@/components/AddSlideButton'
import { updateSlide, deleteSlide, updatePresentation, applyThemeToAllSlides, reorderSlides } from '@/lib/actions'

interface Slide {
  id: string
  title: string
  content: string
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

  useEffect(() => {
    fetchPresentation()
  }, [params.id])

  const fetchPresentation = async () => {
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
  }

  const handleSaveSlide = async (slide: Slide) => {
    try {
      const formData = new FormData()
      formData.append('slideId', slide.id)
      formData.append('title', slide.title)
      formData.append('content', slide.content)
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

  const handleDeleteSlide = async (slideId: string) => {
    if (!confirm('Are you sure you want to delete this slide?')) {
      return
    }

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
      <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
            <p className="text-gray-600">{error}</p>
            <a href="/" className="mt-4 inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
              Go Home
            </a>
          </div>
        </div>
      </main>
    )
  }

  if (!presentation) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Presentation not found</h1>
            <a href="/" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
              Go Home
            </a>
          </div>
        </div>
      </main>
    )
  }

  return (
    <motion.main 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-gray-50 p-8"
    >
      <div className="max-w-6xl mx-auto">
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {presentation.title}
              </h1>
              {presentation.description && (
                <p className="text-gray-600">{presentation.description}</p>
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
                className="bg-white text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-50 transition-colors border border-gray-200 shadow-sm hover:shadow-md font-medium"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Back to Home
              </motion.a>
            </div>
          </div>
          
          <div className="text-sm text-gray-500">
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
                onRegenerate={handleRegenerateSlide}
                onUpdatePresentation={handleUpdatePresentation}
                onApplyThemeToAllSlides={handleApplyThemeToAllSlides}
                applyToAllSlides={applyToAllSlides}
                onApplyToAllChange={setApplyToAllSlides}
                isActive={activeSlideId === slide.id}
                onActivate={() => setActiveSlideId(slide.id)}
              />
              
              <AddSlideButton
                presentationId={presentation.id}
                afterOrder={slide.order}
                onSlideAdded={fetchPresentation}
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
              This presentation doesn't have any slides yet.
            </p>
            <AddSlideButton
              presentationId={presentation.id}
              afterOrder={0}
              onSlideAdded={fetchPresentation}
            />
          </motion.div>
        )}
      </div>
    </motion.main>
  )
}
'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import WysiwygSlideEditor from '@/components/WysiwygSlideEditor'
import AddSlideButton from '@/components/AddSlideButton'

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
      const response = await fetch(`/api/slides/${slide.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: slide.title,
          content: slide.content,
          layout: slide.layout,
          imageUrl: slide.imageUrl,
          backgroundColor: slide.backgroundColor,
          textColor: slide.textColor,
          headingColor: slide.headingColor,
          textAlign: slide.textAlign,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save slide')
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
      const response = await fetch(`/api/slides/${slideId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete slide')
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
      const slideUpdatePromises = presentation.slides.map(slide => 
        fetch(`/api/slides/${slide.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: slide.title,
            content: slide.content,
            layout: slide.layout,
            imageUrl: slide.imageUrl,
            backgroundColor: themeUpdates.backgroundColor,
            textColor: themeUpdates.textColor,
            headingColor: themeUpdates.headingColor,
            textAlign: slide.textAlign,
          }),
        })
      )
      
      await Promise.all(slideUpdatePromises)
      await fetchPresentation()
    } catch (error) {
      console.error('Error applying theme to all slides:', error)
    }
  }

  const handleUpdatePresentation = async (updates: Partial<Presentation>) => {
    try {
      const response = await fetch(`/api/presentations/${params.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      })

      if (!response.ok) {
        throw new Error('Failed to update presentation')
      }

      await fetchPresentation()
      
      // The apply-to-all logic for theme colors is now handled in BackgroundSettings
      // This function only updates presentation-level settings
    } catch (error) {
      console.error('Error updating presentation:', error)
    }
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
          <AddSlideButton
            presentationId={presentation.id}
            afterOrder={0}
            onSlideAdded={fetchPresentation}
          />
          
          {presentation.slides.map((slide, index) => (
            <div key={slide.id}>
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
            </div>
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
            <p className="text-gray-600">
              This presentation doesn't have any slides yet.
            </p>
          </motion.div>
        )}
      </div>

    </motion.main>
  )
}
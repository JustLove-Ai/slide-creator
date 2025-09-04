'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import PresentationViewer from '@/components/PresentationViewer'

interface Slide {
  id: string
  title: string
  content: string
  slideType: string
  layout: 'TEXT_ONLY' | 'TITLE_COVER' | 'TEXT_IMAGE_LEFT' | 'TEXT_IMAGE_RIGHT' | 'IMAGE_FULL' | 'BULLETS_IMAGE' | 'TWO_COLUMN' | 'IMAGE_BACKGROUND'
  order: number
  imageUrl?: string
  backgroundColor?: string
  textAlign?: 'LEFT' | 'CENTER' | 'RIGHT' | 'JUSTIFY'
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

export default function ViewPage() {
  const params = useParams()
  const [presentation, setPresentation] = useState<Presentation | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="text-gray-600">Loading presentation...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <a href="/" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
            Go Home
          </a>
        </div>
      </div>
    )
  }

  if (!presentation || presentation.slides.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">No slides found</h1>
          <p className="text-gray-600 mb-4">This presentation doesn't have any slides to display.</p>
          <a href={`/presentations/${params.id}`} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
            Back to Editor
          </a>
        </div>
      </div>
    )
  }

  return (
    <PresentationViewer
      slides={presentation.slides}
      presentation={presentation}
      presentationId={presentation.id}
    />
  )
}
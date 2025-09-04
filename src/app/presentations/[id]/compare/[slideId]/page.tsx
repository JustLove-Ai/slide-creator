'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import SlideComparison from '@/components/SlideComparison'

interface Slide {
  id?: string
  title: string
  content: string
  slideType: string
  order: number
}

interface ComparisonData {
  original: Slide
  regenerated: Slide
  presentationId: string
}

export default function ComparePage() {
  const params = useParams()
  const [comparisonData, setComparisonData] = useState<ComparisonData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const data = localStorage.getItem('slideComparison')
    if (data) {
      try {
        const parsed = JSON.parse(data)
        setComparisonData(parsed)
      } catch (error) {
        console.error('Error parsing comparison data:', error)
      }
    }
    setLoading(false)
  }, [])

  const handleKeepOriginal = async () => {
    // Keep the original slide as-is, just navigate back
    window.location.href = `/presentations/${params.id}`
  }

  const handleKeepRegenerated = async () => {
    if (!comparisonData) return

    try {
      const response = await fetch(`/api/slides/${params.slideId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: comparisonData.regenerated.title,
          content: comparisonData.regenerated.content,
        }),
      })

      if (response.ok) {
        localStorage.removeItem('slideComparison')
        window.location.href = `/presentations/${params.id}`
      }
    } catch (error) {
      console.error('Error updating slide:', error)
    }
  }

  const handleKeepBoth = async () => {
    if (!comparisonData) return

    try {
      // First, get the current presentation to find the next order number
      const presentationResponse = await fetch(`/api/presentations/${params.id}`)
      const presentation = await presentationResponse.json()
      
      const originalSlideOrder = comparisonData.original.order
      const nextOrder = originalSlideOrder + 1

      // Update all slides after the original to make room for the new slide
      await fetch('/api/slides/reorder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          presentationId: params.id,
          fromOrder: nextOrder,
          increment: 1,
        }),
      })

      // Create the new slide with the regenerated content
      await fetch('/api/slides', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          presentationId: params.id,
          title: comparisonData.regenerated.title,
          content: comparisonData.regenerated.content,
          slideType: comparisonData.regenerated.slideType,
          order: nextOrder,
        }),
      })

      localStorage.removeItem('slideComparison')
      window.location.href = `/presentations/${params.id}`
    } catch (error) {
      console.error('Error keeping both slides:', error)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </main>
    )
  }

  if (!comparisonData) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">No comparison data found</h1>
          <a href={`/presentations/${params.id}`} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
            Back to Presentation
          </a>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <SlideComparison
        original={comparisonData.original}
        regenerated={comparisonData.regenerated}
        presentationId={params.id as string}
        slideId={params.slideId as string}
        onKeepOriginal={handleKeepOriginal}
        onKeepRegenerated={handleKeepRegenerated}
        onKeepBoth={handleKeepBoth}
      />
    </main>
  )
}
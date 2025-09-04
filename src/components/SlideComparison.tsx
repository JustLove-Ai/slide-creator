'use client'

import { useState } from 'react'

interface Slide {
  id?: string
  title: string
  content: string
  slideType: string
  order: number
}

interface SlideComparisonProps {
  original: Slide
  regenerated: Slide
  presentationId: string
  slideId: string
  onKeepOriginal: () => void
  onKeepRegenerated: () => void
  onKeepBoth: () => void
}

export default function SlideComparison({
  original,
  regenerated,
  presentationId,
  slideId,
  onKeepOriginal,
  onKeepRegenerated,
  onKeepBoth,
}: SlideComparisonProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleKeepOriginal = async () => {
    setIsLoading(true)
    try {
      await onKeepOriginal()
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeepRegenerated = async () => {
    setIsLoading(true)
    try {
      await onKeepRegenerated()
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeepBoth = async () => {
    setIsLoading(true)
    try {
      await onKeepBoth()
    } finally {
      setIsLoading(false)
    }
  }

  const getSlideTypeColor = (type: string) => {
    switch (type) {
      case 'TITLE': return 'bg-purple-100 text-purple-800'
      case 'INTRO': return 'bg-blue-100 text-blue-800'
      case 'CONTENT': return 'bg-green-100 text-green-800'
      case 'CONCLUSION': return 'bg-orange-100 text-orange-800'
      case 'NEXT_STEPS': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Compare Slide Versions
        </h1>
        <p className="text-gray-600">
          Choose which version to keep, or keep both slides
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 bg-blue-50 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="text-sm font-medium text-blue-700">
                  Original Version
                </span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSlideTypeColor(original.slideType)}`}>
                  {original.slideType.replace('_', ' ')}
                </span>
              </div>
              <span className="text-sm text-blue-600 font-medium">
                Slide {original.order}
              </span>
            </div>
          </div>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {original.title}
            </h3>
            <div className="prose prose-sm max-w-none">
              <pre className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed bg-gray-50 p-4 rounded">
                {original.content}
              </pre>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 bg-green-50 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="text-sm font-medium text-green-700">
                  AI Regenerated Version
                </span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSlideTypeColor(regenerated.slideType)}`}>
                  {regenerated.slideType.replace('_', ' ')}
                </span>
              </div>
              <span className="text-sm text-green-600 font-medium">
                Slide {regenerated.order}
              </span>
            </div>
          </div>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {regenerated.title}
            </h3>
            <div className="prose prose-sm max-w-none">
              <pre className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed bg-gray-50 p-4 rounded">
                {regenerated.content}
              </pre>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-center gap-4 max-w-2xl mx-auto">
        <button
          onClick={handleKeepOriginal}
          disabled={isLoading}
          className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Processing...' : 'Keep Original'}
        </button>
        
        <button
          onClick={handleKeepRegenerated}
          disabled={isLoading}
          className="flex-1 bg-green-600 text-white px-6 py-3 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Processing...' : 'Keep Regenerated'}
        </button>
        
        <button
          onClick={handleKeepBoth}
          disabled={isLoading}
          className="flex-1 bg-purple-600 text-white px-6 py-3 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Processing...' : 'Keep Both'}
        </button>
      </div>

      <div className="text-center mt-6">
        <a
          href={`/presentations/${presentationId}`}
          className="text-gray-600 hover:text-gray-800 font-medium"
        >
          ← Back to Presentation
        </a>
      </div>
    </div>
  )
}